import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sdkPath = path.join(__dirname, process.env.SDK_FILE || 'scaffold-sdk.js');

function createFetchMock(responses) {
  const calls = [];
  const fetchMock = async (url, options = {}) => {
    calls.push({
      url: String(url),
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
    });
    const response = responses.shift();
    if (!response) {
      throw new Error(`unexpected fetch: ${url}`);
    }
    if (response.throw) {
      throw response.throw;
    }
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      text: async () => JSON.stringify(response.body),
    };
  };
  fetchMock.calls = calls;
  return fetchMock;
}

function createWebSocketMock() {
  const instances = [];
  class WebSocketMock {
    constructor(url) {
      this.url = url;
      this.readyState = WebSocketMock.CONNECTING;
      this.sent = [];
      instances.push(this);
    }

    open() {
      this.readyState = WebSocketMock.OPEN;
      if (typeof this.onopen === 'function') this.onopen();
    }

    receive(payload) {
      if (typeof this.onmessage === 'function') this.onmessage({ data: payload });
    }

    close(code = 1000, reason = '') {
      this.readyState = WebSocketMock.CLOSED;
      if (typeof this.onclose === 'function') this.onclose({ code, reason });
    }

    send(payload) {
      this.sent.push(payload);
    }
  }
  WebSocketMock.CONNECTING = 0;
  WebSocketMock.OPEN = 1;
  WebSocketMock.CLOSING = 2;
  WebSocketMock.CLOSED = 3;
  WebSocketMock.instances = instances;
  return WebSocketMock;
}

function loadSDK({ url, fetchMock, ugGame, ugGameBridge, localStorageData, WebSocketMock, timers, consoleMock } = {}) {
  const source = fs.readFileSync(sdkPath, 'utf8');
  const storage = new Map(Object.entries(localStorageData || {}));
  const sandbox = {
    console: consoleMock || console,
    fetch: fetchMock,
    setTimeout: timers?.setTimeout || ((fn) => {
      fn();
      return 0;
    }),
    clearTimeout: timers?.clearTimeout || (() => {}),
    URLSearchParams,
    location: { search: new URL(url || 'https://game.example/').search },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
  };
  if (WebSocketMock) sandbox.WebSocket = WebSocketMock;
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  if (ugGame) sandbox.UgGame = ugGame;
  if (ugGameBridge) sandbox.UgGameBridge = ugGameBridge;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: sdkPath });
  return sandbox;
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

function flushAsync() {
  return new Promise((resolve) => setImmediate(resolve));
}

await test('logs in from browser URL fallback and authorizes API requests', async () => {
  const fetchMock = createFetchMock([
    {
      body: {
        code: 200,
        message: 'ok',
        data: { token: 'jwt-browser', expires_in: 86400, user_id: 'dev_user' },
      },
    },
    {
      body: {
        code: 200,
        message: 'ok',
        data: { records: [], round: 1 },
      },
    },
  ]);

  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=browser_channel&userId=dev_user&devToken=dev_token',
    fetchMock,
  });

  assert.equal(typeof sandbox.ScaffoldSDK.init, 'function');
  await sandbox.ScaffoldSDK.init({ baseURL: 'https://api.example.com', retryDelay: 0 });
  const status = await sandbox.ScaffoldSDK.checkin.getStatus();

  assert.deepEqual(JSON.parse(fetchMock.calls[0].body), {
    channel_id: 'browser_channel',
    sdk_user_id: 'dev_user',
    sdk_game_token: 'dev_token',
  });
  assert.equal(fetchMock.calls[0].url, 'https://api.example.com/api/v1/auth/login');
  assert.equal(status.round, 1);
  assert.equal(fetchMock.calls[1].url, 'https://api.example.com/api/v1/checkin/status');
  assert.equal(fetchMock.calls[1].headers.Authorization, 'Bearer jwt-browser');
});

await test('waits for UgGame onLoginSuccess and uses configured channel id', async () => {
  const handlers = {};
  const fetchMock = createFetchMock([
    {
      body: {
        code: 200,
        message: 'ok',
        data: { token: 'jwt-app', expires_in: 86400, user_id: 'ug_user' },
      },
    },
  ]);

  const sandbox = loadSDK({
    fetchMock,
    ugGame: {
      on(event, callback) {
        handlers[event] = callback;
      },
    },
  });

  const ready = sandbox.ScaffoldSDK.init({
    baseURL: 'https://api.example.com/',
    channelId: 'game_channel_001',
    retryDelay: 0,
  });
  handlers.onLoginSuccess({ gameUserId: 'ug_user', accessToken: 'ug_token' });
  await ready;

  assert.deepEqual(JSON.parse(fetchMock.calls[0].body), {
    channel_id: 'game_channel_001',
    sdk_user_id: 'ug_user',
    sdk_game_token: 'ug_token',
  });
});

await test('prefers UgGameBridge channel id over demo init options in App WebView', async () => {
  const handlers = {};
  const fetchMock = createFetchMock([
    {
      body: {
        code: 200,
        message: 'ok',
        data: { token: 'jwt-app', expires_in: 86400, user_id: 'ug_user' },
      },
    },
  ]);

  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=demo_channel',
    fetchMock,
    ugGame: {
      on(event, callback) {
        handlers[event] = callback;
      },
    },
    ugGameBridge: {
      getCommonParams() {
        return 'channelId=real_ug_channel';
      },
    },
    localStorageData: {
      scaffold_channel_id: 'cached_demo_channel',
    },
  });

  const ready = sandbox.ScaffoldSDK.init({
    baseURL: 'https://api.example.com/',
    channelId: 'demo_channel',
    retryDelay: 0,
  });
  handlers.onLoginSuccess({ gameUserId: 'ug_user', accessToken: 'ug_token' });
  await ready;

  assert.deepEqual(JSON.parse(fetchMock.calls[0].body), {
    channel_id: 'real_ug_channel',
    sdk_user_id: 'ug_user',
    sdk_game_token: 'ug_token',
  });
});

await test('refreshes channel id from UgGameBridge before login when bridge appears after init', async () => {
  const handlers = {};
  const fetchMock = createFetchMock([
    {
      body: {
        code: 200,
        message: 'ok',
        data: { token: 'jwt-app', expires_in: 86400, user_id: 'ug_user' },
      },
    },
  ]);

  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=demo_channel',
    fetchMock,
    ugGame: {
      on(event, callback) {
        handlers[event] = callback;
      },
    },
  });

  const ready = sandbox.ScaffoldSDK.init({
    baseURL: 'https://api.example.com/',
    channelId: 'demo_channel',
    retryDelay: 0,
  });

  sandbox.UgGameBridge = {
    getCommonParams() {
      return 'channelId=late_real_ug_channel';
    },
  };
  handlers.onLoginSuccess({ gameUserId: 'ug_user', accessToken: 'ug_token' });
  await ready;

  assert.deepEqual(JSON.parse(fetchMock.calls[0].body), {
    channel_id: 'late_real_ug_channel',
    sdk_user_id: 'ug_user',
    sdk_game_token: 'ug_token',
  });
});

await test('parses JSON UgGameBridge common params and logs raw value in debug mode', async () => {
  const handlers = {};
  const logs = [];
  const fetchMock = createFetchMock([
    {
      body: {
        code: 200,
        message: 'ok',
        data: { token: 'jwt-app', expires_in: 86400, user_id: 'ug_user' },
      },
    },
  ]);

  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=demo_channel',
    fetchMock,
    consoleMock: {
      log(...args) {
        logs.push(args);
      },
      warn(...args) {
        logs.push(args);
      },
      error(...args) {
        logs.push(args);
      },
    },
    ugGame: {
      on(event, callback) {
        handlers[event] = callback;
      },
    },
    ugGameBridge: {
      getCommonParams() {
        return JSON.stringify({ channelId: 'json_ug_channel', locale: 'zh-CN' });
      },
    },
  });

  const ready = sandbox.ScaffoldSDK.init({
    baseURL: 'https://api.example.com/',
    channelId: 'demo_channel',
    retryDelay: 0,
    debug: true,
  });
  handlers.onLoginSuccess({ gameUserId: 'ug_user', accessToken: 'ug_token' });
  await ready;

  assert.deepEqual(JSON.parse(fetchMock.calls[0].body), {
    channel_id: 'json_ug_channel',
    sdk_user_id: 'ug_user',
    sdk_game_token: 'ug_token',
  });
  assert.equal(
    logs.some((args) => String(args[0]).includes('UgGameBridge.getCommonParams raw')),
    true,
  );
});

await test('maps checkin mission rank wallet and reward methods to backend routes', async () => {
  const fetchMock = createFetchMock([
    { body: { code: 200, message: 'ok', data: { token: 'jwt', expires_in: 86400, user_id: 'u1' } } },
    { body: { code: 200, message: 'ok', data: { id: 'rec1' } } },
    { body: { code: 200, message: 'ok', data: true } },
    { body: { code: 200, message: 'ok', data: { claim_id: 'claim-checkin' } } },
    { body: { code: 200, message: 'ok', data: [{ group_code: 'main_daily' }] } },
    { body: { code: 200, message: 'ok', data: { group_code: 'main_daily', slots: [{ detail_id: 'd1' }] } } },
    { body: { code: 200, message: 'ok', data: { group_code: 'main_daily', opened: true } } },
    { body: { code: 200, message: 'ok', data: { detail: { detail_id: 'd1', status: 'opened' }, claims: [] } } },
    { body: { code: 200, message: 'ok', data: { detail: { detail_id: 'd1', status: 'finished' }, claims: [] } } },
    { body: { code: 200, message: 'ok', data: { detail: { detail_id: 'd1', reward_status: 'claimed' }, claims: [{ claim_id: 'claim-mission' }] } } },
    { body: { code: 200, message: 'ok', data: { detail: { detail_id: 'd1' }, claims: [] } } },
    { body: { code: 200, message: 'ok', data: { detail: { detail_id: 'd1' }, claims: [] } } },
    { body: { code: 200, message: 'ok', data: { stat: { finished: 1 }, unrewarded_count: 0 } } },
    { body: { code: 200, message: 'ok', data: { balances: { coin: 100 } } } },
    { body: { code: 200, message: 'ok', data: [{ rule_code: 'coin_to_gem' }] } },
    { body: { code: 200, message: 'ok', data: { rule_code: 'coin_to_gem', from_amount: 100, to_amount: 1 } } },
    { body: { code: 200, message: 'ok', data: { order_id: 'ex_1', from_amount: 100, to_amount: 1 } } },
    { body: { code: 200, message: 'ok', data: { list: [], total: 0, page: 1, size: 20 } } },
    { body: { code: 200, message: 'ok', data: { claim_id: 'claim-checkin', status: 'issued_to_client' } } },
    { body: { code: 200, message: 'ok', data: { accepted: true, mode: 'sync' } } },
    { body: { code: 200, message: 'ok', data: null } },
    { body: { code: 200, message: 'ok', data: { list: [], total: 0, my_rank: null } } },
    { body: { code: 200, message: 'ok', data: null } },
    { body: { code: 200, message: 'ok', data: ['CN'] } },
  ]);
  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=c1&userId=u1&devToken=t1',
    fetchMock,
  });

  await sandbox.ScaffoldSDK.init({ baseURL: 'https://api.example.com', retryDelay: 0 });
  await sandbox.ScaffoldSDK.checkin.makeup(3);
  await sandbox.ScaffoldSDK.checkin.watchAd('rec1');
  const checkinClaim = await sandbox.ScaffoldSDK.checkin.reward('rec1');
  await sandbox.ScaffoldSDK.mission.listGroups({ disabledCategories: ['ad', ' level '] });
  await sandbox.ScaffoldSDK.mission.getGroup('main_daily', { disabled_categories: ['ad'] });
  await sandbox.ScaffoldSDK.mission.openGroup('main_daily', { disabledCategories: ['battle'] });
  await sandbox.ScaffoldSDK.mission.openSlot('d1');
  await sandbox.ScaffoldSDK.mission.finishSlot('d1', { score: 120 });
  const missionRewardResult = await sandbox.ScaffoldSDK.mission.rewardSlot('d1');
  await sandbox.ScaffoldSDK.mission.refreshSlot('d1', { disabledCategories: ['ad'] });
  await sandbox.ScaffoldSDK.mission.undoRefreshSlot('d1');
  await sandbox.ScaffoldSDK.mission.getStat();
  await sandbox.ScaffoldSDK.wallet.getBalances();
  await sandbox.ScaffoldSDK.wallet.listExchangeRules();
  await sandbox.ScaffoldSDK.wallet.quoteExchange({ ruleCode: 'coin_to_gem', fromAmount: 100 });
  await sandbox.ScaffoldSDK.wallet.exchange({ rule_code: 'coin_to_gem', from_amount: 100, idempotency_key: 'k1' });
  await sandbox.ScaffoldSDK.wallet.getLedger({ currencyCode: 'coin', page: 1, size: 20 });
  await sandbox.ScaffoldSDK.reward.getClaim('claim-checkin');
  await sandbox.ScaffoldSDK.rank.update('score', 99, { nickname: 'P1' });
  await sandbox.ScaffoldSDK.rank.update('level', { level: 101, extra: { nickname: 'P1' } });
  await sandbox.ScaffoldSDK.rank.get('score', { dimension: 'CN', period: 'weekly', page: 2, size: 10 });
  await sandbox.ScaffoldSDK.rank.getMyRank('score', { dimension: 'CN', period: 'daily' });
  await sandbox.ScaffoldSDK.rank.getDimensions('score', { period: 'alltime' });

  assert.equal(checkinClaim.claim_id, 'claim-checkin');
  assert.equal(missionRewardResult.claims[0].claim_id, 'claim-mission');
  assert.equal(fetchMock.calls[1].url, 'https://api.example.com/api/v1/checkin/makeup');
  assert.deepEqual(JSON.parse(fetchMock.calls[1].body), { day: 3 });
  assert.equal(fetchMock.calls[2].url, 'https://api.example.com/api/v1/checkin/ad');
  assert.deepEqual(JSON.parse(fetchMock.calls[2].body), { record_id: 'rec1' });
  assert.equal(fetchMock.calls[3].url, 'https://api.example.com/api/v1/checkin/reward');
  assert.deepEqual(JSON.parse(fetchMock.calls[3].body), { record_id: 'rec1' });
  assert.equal(fetchMock.calls[4].url, 'https://api.example.com/api/v1/mission/groups?disabled_categories=ad%2Clevel');
  assert.equal(fetchMock.calls[5].url, 'https://api.example.com/api/v1/mission/groups/main_daily?disabled_categories=ad');
  assert.equal(fetchMock.calls[6].url, 'https://api.example.com/api/v1/mission/groups/main_daily/open?disabled_categories=battle');
  assert.equal(fetchMock.calls[7].url, 'https://api.example.com/api/v1/mission/slots/d1/open');
  assert.equal(fetchMock.calls[8].url, 'https://api.example.com/api/v1/mission/slots/d1/finish');
  assert.deepEqual(JSON.parse(fetchMock.calls[8].body), { report: { score: 120 } });
  assert.equal(fetchMock.calls[9].url, 'https://api.example.com/api/v1/mission/slots/d1/reward');
  assert.equal(fetchMock.calls[10].url, 'https://api.example.com/api/v1/mission/slots/d1/refresh?disabled_categories=ad');
  assert.equal(fetchMock.calls[11].url, 'https://api.example.com/api/v1/mission/slots/d1/undo-refresh');
  assert.equal(fetchMock.calls[12].url, 'https://api.example.com/api/v1/mission/stat');
  assert.equal(fetchMock.calls[13].url, 'https://api.example.com/api/v1/wallet/balances');
  assert.equal(fetchMock.calls[14].url, 'https://api.example.com/api/v1/wallet/exchange/rules');
  assert.equal(fetchMock.calls[15].url, 'https://api.example.com/api/v1/wallet/exchange/quote');
  assert.deepEqual(JSON.parse(fetchMock.calls[15].body), { rule_code: 'coin_to_gem', from_amount: 100 });
  assert.equal(fetchMock.calls[16].url, 'https://api.example.com/api/v1/wallet/exchange');
  assert.deepEqual(JSON.parse(fetchMock.calls[16].body), { rule_code: 'coin_to_gem', from_amount: 100, idempotency_key: 'k1' });
  assert.equal(fetchMock.calls[17].url, 'https://api.example.com/api/v1/wallet/ledger?currency_code=coin&page=1&size=20');
  assert.equal(fetchMock.calls[18].url, 'https://api.example.com/api/v1/reward/claims/claim-checkin');
  assert.equal(fetchMock.calls[19].url, 'https://api.example.com/api/v1/rank/score/update');
  assert.deepEqual(JSON.parse(fetchMock.calls[19].body), { score: 99, extra: { nickname: 'P1' } });
  assert.equal(fetchMock.calls[20].url, 'https://api.example.com/api/v1/rank/level/update');
  assert.deepEqual(JSON.parse(fetchMock.calls[20].body), { level: 101, extra: { nickname: 'P1' } });
  assert.equal(fetchMock.calls[21].url, 'https://api.example.com/api/v1/rank/score?dimension=CN&period=weekly&page=2&size=10');
  assert.equal(fetchMock.calls[21].body, undefined);
  assert.equal(fetchMock.calls[21].headers['Content-Type'], undefined);
  assert.equal(fetchMock.calls[22].url, 'https://api.example.com/api/v1/rank/score/me?dimension=CN&period=daily');
  assert.equal(fetchMock.calls[22].body, undefined);
  assert.equal(fetchMock.calls[22].headers['Content-Type'], undefined);
  assert.equal(fetchMock.calls[23].url, 'https://api.example.com/api/v1/rank/score/dimensions?period=alltime');
});

await test('rejects backend business errors as code and message objects', async () => {
  const fetchMock = createFetchMock([
    { body: { code: 200, message: 'ok', data: { token: 'jwt', expires_in: 86400, user_id: 'u1' } } },
    { body: { code: 400, message: 'already checked in' } },
  ]);
  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=c1&userId=u1&devToken=t1',
    fetchMock,
  });

  await sandbox.ScaffoldSDK.init({ baseURL: 'https://api.example.com', retryDelay: 0 });
  await assert.rejects(
    () => sandbox.ScaffoldSDK.checkin.check(),
    (error) => error.code === 400 && error.message === 'already checked in',
  );
});

await test('maps reward grant inbox methods to backend routes', async () => {
  const fetchMock = createFetchMock([
    { body: { code: 200, message: 'ok', data: { token: 'jwt', expires_in: 86400, user_id: 'u1' } } },
    { body: { code: 200, message: 'ok', data: { list: [{ id: 'grant-1' }], total: 1, page: 1, size: 20 } } },
    { body: { code: 200, message: 'ok', data: { list: [{ id: 'grant-2' }], total: 1, page: 1, size: 20 } } },
    { body: { code: 200, message: 'ok', data: { grant: { id: 'grant-1', status: 'claimed' }, claim: { claim_id: 'claim-1' } } } },
  ]);
  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=c1&userId=u1&devToken=t1',
    fetchMock,
  });

  await sandbox.ScaffoldSDK.init({ baseURL: 'https://api.example.com', retryDelay: 0 });
  const pending = await sandbox.ScaffoldSDK.reward.listPendingGrants({ page: 1, size: 20 });
  const claimed = await sandbox.ScaffoldSDK.reward.listGrants({ status: 'claimed', page: 1, size: 20 });
  const claimResult = await sandbox.ScaffoldSDK.reward.claimGrant('grant-1');

  assert.equal(pending.list[0].id, 'grant-1');
  assert.equal(claimed.list[0].id, 'grant-2');
  assert.equal(claimResult.claim.claim_id, 'claim-1');
  assert.equal(fetchMock.calls[1].url, 'https://api.example.com/api/v1/reward/grants?status=pending&page=1&size=20');
  assert.equal(fetchMock.calls[2].url, 'https://api.example.com/api/v1/reward/grants?status=claimed&page=1&size=20');
  assert.equal(fetchMock.calls[3].url, 'https://api.example.com/api/v1/reward/grants/grant-1/claim');
  assert.equal(fetchMock.calls[3].method, 'POST');
  await assert.rejects(
    () => sandbox.ScaffoldSDK.reward.claimGrant(''),
    (error) => error.code === 400 && error.message === 'grantId is required',
  );
});

await test('maps mail inbox methods to backend routes', async () => {
  const fetchMock = createFetchMock([
    { body: { code: 200, message: 'ok', data: { token: 'jwt', expires_in: 86400, user_id: 'u1' } } },
    { body: { code: 200, message: 'ok', data: { unread_count: 1, unclaimed_count: 1 } } },
    { body: { code: 200, message: 'ok', data: { list: [{ id: 'mail-1' }], total: 1, page: 1, size: 20 } } },
    { body: { code: 200, message: 'ok', data: { id: 'mail-1' } } },
    { body: { code: 200, message: 'ok', data: { id: 'mail-1', mail_status: 'read' } } },
    { body: { code: 200, message: 'ok', data: { id: 'mail-1', mail_status: 'deleted' } } },
    { body: { code: 200, message: 'ok', data: { mail: { id: 'mail-1' }, claim: { claim_id: 'claim-1' } } } },
    { body: { code: 200, message: 'ok', data: { claims: [{ claim_id: 'claim-2' }], success_count: 1, failure_count: 0 } } },
  ]);
  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=c1&userId=u1&devToken=t1',
    fetchMock,
  });
  await sandbox.ScaffoldSDK.init({ baseURL: 'https://api.example.com', retryDelay: 0 });
  const summary = await sandbox.ScaffoldSDK.mail.getSummary();
  const list = await sandbox.ScaffoldSDK.mail.list({ status: 'unread', page: 1, size: 20 });
  const detail = await sandbox.ScaffoldSDK.mail.get('mail-1');
  await sandbox.ScaffoldSDK.mail.markRead('mail-1');
  await sandbox.ScaffoldSDK.mail.delete('mail-1');
  const claim = await sandbox.ScaffoldSDK.mail.claim('mail-1');
  const claimAll = await sandbox.ScaffoldSDK.mail.claimAll();

  assert.equal(summary.unread_count, 1);
  assert.equal(list.list[0].id, 'mail-1');
  assert.equal(detail.id, 'mail-1');
  assert.equal(claim.claim.claim_id, 'claim-1');
  assert.equal(claimAll.claims[0].claim_id, 'claim-2');
  assert.equal(fetchMock.calls[1].url, 'https://api.example.com/api/v1/mail/summary');
  assert.equal(fetchMock.calls[2].url, 'https://api.example.com/api/v1/mail?status=unread&page=1&size=20');
  assert.equal(fetchMock.calls[3].url, 'https://api.example.com/api/v1/mail/mail-1');
  assert.equal(fetchMock.calls[4].url, 'https://api.example.com/api/v1/mail/mail-1/read');
  assert.equal(fetchMock.calls[5].url, 'https://api.example.com/api/v1/mail/mail-1/delete');
  assert.equal(fetchMock.calls[6].url, 'https://api.example.com/api/v1/mail/mail-1/claim');
  assert.equal(fetchMock.calls[7].url, 'https://api.example.com/api/v1/mail/claim-all');
  assert.equal(fetchMock.calls[7].method, 'POST');
  await assert.rejects(
    () => sandbox.ScaffoldSDK.mail.get(''),
    (error) => error.code === 400 && error.message === 'mailId is required',
  );
});

await test('auto-connects realtime websocket with ticket and dispatches rank events', async () => {
  const WebSocketMock = createWebSocketMock();
  const fetchMock = createFetchMock([
    { body: { code: 200, message: 'ok', data: { token: 'jwt', expires_in: 86400, user_id: 'u1' } } },
    { body: { code: 200, message: 'ok', data: { ticket: 'ticket-1', expires_in: 60, ws_url: 'wss://api.example.com/ws/v1' } } },
  ]);
  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=c1&userId=u1&devToken=t1',
    fetchMock,
    WebSocketMock,
    timers: { setTimeout, clearTimeout },
  });

  const events = [];
  sandbox.ScaffoldSDK.on('rank:update_result', (event) => events.push(event));
  await sandbox.ScaffoldSDK.init({
    baseURL: 'https://api.example.com',
    retryDelay: 0,
    realtime: { enabled: true, autoConnect: true, heartbeatInterval: 0, reconnect: { enabled: false } },
  });
  await flushAsync();
  assert.equal(fetchMock.calls[1].url, 'https://api.example.com/api/v1/realtime/ticket');
  assert.equal(fetchMock.calls[1].headers.Authorization, 'Bearer jwt');
  assert.equal(WebSocketMock.instances.length, 1);
  assert.equal(WebSocketMock.instances[0].url, 'wss://api.example.com/ws/v1?ticket=ticket-1');

  WebSocketMock.instances[0].open();
  assert.deepEqual(JSON.parse(WebSocketMock.instances[0].sent[0]), {
    type: 'client.hello',
    version: 1,
    data: { sdk_version: '0.1.0', last_event_id: '', subscriptions: [] },
  });

  WebSocketMock.instances[0].receive(JSON.stringify({
    id: 'evt-1',
    type: 'rank.update_result',
    version: 1,
    ts: 1777460000,
    channel_id: 'c1',
    user_id: 'u1',
    data: { job_id: 'job-1', status: 'applied', rank: 3 },
  }));

  assert.equal(events.length, 1);
  assert.equal(events[0].id, 'evt-1');
  assert.equal(events[0].ts, 1777460000);
  assert.equal(events[0].job_id, 'job-1');
  assert.equal(events[0].status, 'applied');
  assert.equal(events[0].rank, 3);
  assert.deepEqual(JSON.parse(WebSocketMock.instances[0].sent[1]), {
    type: 'client.ack',
    version: 1,
    data: { event_id: 'evt-1' },
  });
  assert.equal(sandbox.ScaffoldSDK.realtime.isConnected(), true);
});

await test('dispatches system notice and config changed realtime aliases', async () => {
  const WebSocketMock = createWebSocketMock();
  const fetchMock = createFetchMock([
    { body: { code: 200, message: 'ok', data: { token: 'jwt', expires_in: 86400, user_id: 'u1' } } },
    { body: { code: 200, message: 'ok', data: { ticket: 'ticket-1', expires_in: 60, ws_url: 'wss://api.example.com/ws/v1' } } },
  ]);
  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=c1&userId=u1&devToken=t1',
    fetchMock,
    WebSocketMock,
    timers: { setTimeout, clearTimeout },
  });

  const notices = [];
  const changes = [];
  sandbox.ScaffoldSDK.on('system:notice', (event) => notices.push(event));
  sandbox.ScaffoldSDK.on('config:changed', (event) => changes.push(event));
  await sandbox.ScaffoldSDK.init({
    baseURL: 'https://api.example.com',
    retryDelay: 0,
    realtime: { enabled: true, autoConnect: true, heartbeatInterval: 0, reconnect: { enabled: false } },
  });
  await flushAsync();
  WebSocketMock.instances[0].open();

  WebSocketMock.instances[0].receive(JSON.stringify({
    id: 'evt-notice',
    type: 'system.notice',
    version: 1,
    ts: 1777460002,
    channel_id: 'c1',
    user_id: 'u1',
    data: { notice_type: 'reward_grant', grant_id: 'grant-1', action: 'open_reward_inbox' },
  }));
  WebSocketMock.instances[0].receive(JSON.stringify({
    id: 'evt-config',
    type: 'config.changed',
    version: 1,
    ts: 1777460003,
    channel_id: 'c1',
    data: { scope: 'mission', changed_keys: ['mission_groups'], version: 123 },
  }));

  assert.equal(notices.length, 1);
  assert.equal(notices[0].grant_id, 'grant-1');
  assert.equal(changes.length, 1);
  assert.equal(changes[0].scope, 'mission');
  assert.deepEqual(Array.from(changes[0].changed_keys), ['mission_groups']);
});

await test('rank.updateAndWait resolves when realtime result arrives', async () => {
  const WebSocketMock = createWebSocketMock();
  const fetchMock = createFetchMock([
    { body: { code: 200, message: 'ok', data: { token: 'jwt', expires_in: 86400, user_id: 'u1' } } },
    { body: { code: 200, message: 'ok', data: { ticket: 'ticket-1', expires_in: 60, ws_url: 'wss://api.example.com/ws/v1' } } },
    { body: { code: 200, message: 'ok', data: { accepted: true, mode: 'async', job_id: 'job-1' } } },
  ]);
  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=c1&userId=u1&devToken=t1',
    fetchMock,
    WebSocketMock,
    timers: { setTimeout, clearTimeout },
  });

  await sandbox.ScaffoldSDK.init({
    baseURL: 'https://api.example.com',
    retryDelay: 0,
    realtime: { enabled: true, autoConnect: true, heartbeatInterval: 0, reconnect: { enabled: false } },
  });
  await flushAsync();
  WebSocketMock.instances[0].open();

  const waiting = sandbox.ScaffoldSDK.rank.updateAndWait('score', 123, { nickname: 'P1' }, { timeout: 1000 });
  await flushAsync();
  WebSocketMock.instances[0].receive(JSON.stringify({
    id: 'evt-2',
    type: 'rank.update_result',
    version: 1,
    ts: 1777460001,
    channel_id: 'c1',
    user_id: 'u1',
    data: { job_id: 'job-1', status: 'applied', rank: 1 },
  }));
  const result = await waiting;
  assert.equal(result.job_id, 'job-1');
  assert.equal(result.status, 'applied');
  assert.equal(result.rank, 1);
});

await test('maps redemption redeem method to backend route and validates blank code', async () => {
  const fetchMock = createFetchMock([
    { body: { code: 200, message: 'ok', data: { token: 'jwt', expires_in: 86400, user_id: 'u1' } } },
    { body: { code: 200, message: 'ok', data: { code_mask: 'DEM***26', campaign_id: 'camp1', record_id: 'rec1', claim: { claim_id: 'claim1' } } } },
  ]);
  const sandbox = loadSDK({
    url: 'https://game.example/?channelId=c1&userId=u1&devToken=t1',
    fetchMock,
  });
  await sandbox.ScaffoldSDK.init({ baseURL: 'https://api.example.com', retryDelay: 0 });
  const res = await sandbox.ScaffoldSDK.redemption.redeem(' demo-2026 ');
  assert.equal(fetchMock.calls[1].url, 'https://api.example.com/api/v1/redemption/redeem');
  assert.deepEqual(JSON.parse(fetchMock.calls[1].body), { code: 'demo-2026' });
  assert.equal(res.record_id, 'rec1');
  await assert.rejects(
    () => sandbox.ScaffoldSDK.redemption.redeem('   '),
    (error) => error.code === 400 && error.message === 'code is required',
  );
});
