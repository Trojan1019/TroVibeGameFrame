;(function (root) {
  'use strict';

  var VERSION = '0.1.0';
  var DEFAULT_RETRIES = 2;
  var DEFAULT_RETRY_DELAY = 300;

  var state = {
    baseURL: '',
    channelId: '',
    token: '',
    userId: '',
    expiresAt: 0,
    retry: DEFAULT_RETRIES,
    retryDelay: DEFAULT_RETRY_DELAY,
    loginPromise: null,
    initialized: false,
    debug: false,
  };

  var realtime = {
    enabled: true,
    autoConnect: true,
    ticketPath: '/realtime/ticket',
    wsPath: '/ws/v1',
    heartbeatInterval: 25000,
    reconnectEnabled: true,
    reconnectMinDelay: 1000,
    reconnectMaxDelay: 30000,
    reconnectFactor: 2,
    reconnectJitter: 0.2,
    reconnectMaxAttempts: 0,
    socket: null,
    state: 'idle',
    manualClose: false,
    reconnectAttempts: 0,
    reconnectTimer: null,
    heartbeatTimer: null,
    lastEventId: '',
    connectionId: '',
    pendingRankJobs: {},
  };

  var listeners = {};

  function createError(code, message, extra) {
    var error = new Error(message || 'request failed');
    error.code = code || 500;
    if (extra) {
      for (var key in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, key)) {
          error[key] = extra[key];
        }
      }
    }
    return error;
  }

  function normalizeBaseURL(baseURL) {
    if (!baseURL || typeof baseURL !== 'string') {
      throw createError(400, 'baseURL is required');
    }
    return baseURL.replace(/\/+$/, '');
  }

  function getSearch() {
    if (root.location && typeof root.location.search === 'string') {
      return root.location.search;
    }
    return '';
  }

  function getURLParam(name) {
    var search = getSearch();
    if (!search) return '';
    if (typeof root.URLSearchParams === 'function') {
      return new root.URLSearchParams(search).get(name) || '';
    }
    var query = search.charAt(0) === '?' ? search.slice(1) : search;
    var pairs = query.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      if (decodeURIComponent(pair[0] || '') === name) {
        return decodeURIComponent(pair[1] || '');
      }
    }
    return '';
  }

  function getLocalStorage(key) {
    try {
      if (root.localStorage && typeof root.localStorage.getItem === 'function') {
        return root.localStorage.getItem(key) || '';
      }
    } catch (error) {
      return '';
    }
    return '';
  }

  function parseQueryString(value) {
    var result = {};
    if (!value || typeof value !== 'string') return result;
    var query = value.charAt(0) === '?' ? value.slice(1) : value;
    query.split('&').forEach(function (part) {
      if (!part) return;
      var index = part.indexOf('=');
      var rawKey = index >= 0 ? part.slice(0, index) : part;
      var rawValue = index >= 0 ? part.slice(index + 1) : '';
      var key = decodeURIComponent(rawKey || '');
      if (key) {
        result[key] = decodeURIComponent(rawValue || '');
      }
    });
    return result;
  }

  function parseCommonParams(value) {
    if (!value || typeof value !== 'string') return {};
    var trimmed = value.trim();
    if (!trimmed) return {};
    if (trimmed.charAt(0) === '{') {
      try {
        var parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (error) {
        return {};
      }
    }
    return parseQueryString(trimmed);
  }

  function debugLog() {
    if (!state.debug && !root.__SCAFFOLD_SDK_DEBUG__) return;
    if (!root.console || typeof root.console.log !== 'function') return;
    root.console.log.apply(root.console, arguments);
  }

  function getBridgeChannelId() {
    var bridge = root.UgGameBridge;
    if (!bridge || typeof bridge.getCommonParams !== 'function') {
      return '';
    }
    try {
      var raw = bridge.getCommonParams();
      debugLog('[ScaffoldSDK] UgGameBridge.getCommonParams raw:', raw);
      var params = parseCommonParams(raw);
      debugLog('[ScaffoldSDK] UgGameBridge.getCommonParams parsed:', params);
      return params.channelId || params.channel_id || params.channel || '';
    } catch (error) {
      debugLog('[ScaffoldSDK] UgGameBridge.getCommonParams error:', error);
      return '';
    }
  }

  function resolveChannelId(options) {
    return (
      getBridgeChannelId() ||
      options.channelId ||
      getURLParam('channelId') ||
      getURLParam('channel_id') ||
      getURLParam('channel') ||
      getLocalStorage('scaffold_channel_id')
    );
  }

  function refreshChannelIdFromBridge() {
    var bridgeChannelId = getBridgeChannelId();
    if (bridgeChannelId) {
      state.channelId = bridgeChannelId;
    }
    return state.channelId;
  }

  function normalizeCredentials(data) {
    data = data || {};
    return {
      gameUserId: data.gameUserId || data.sdkUserId || data.sdk_user_id || data.userId || data.user_id || '',
      accessToken: data.accessToken || data.sdkGameToken || data.sdk_game_token || data.token || data.devToken || '',
    };
  }

  function getBrowserCredentials(options) {
    return normalizeCredentials({
      gameUserId: options.userId || options.devUserId || getURLParam('userId') || getURLParam('user_id'),
      accessToken: options.devToken || options.accessToken || getURLParam('devToken') || getURLParam('accessToken'),
    });
  }

  function emit(eventName, payload) {
    var list = listeners[eventName];
    if (!list || !list.length) return;
    list.slice().forEach(function (handler) {
      try {
        handler(payload);
      } catch (error) {
        setTimeout(function () {
          throw error;
        }, 0);
      }
    });
  }

  function on(eventName, handler) {
    if (!eventName || typeof handler !== 'function') {
      throw createError(400, 'event name and handler are required');
    }
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(handler);
    return function unsubscribe() {
      off(eventName, handler);
    };
  }

  function off(eventName, handler) {
    var list = listeners[eventName];
    if (!list || !list.length) return;
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i] === handler) {
        list.splice(i, 1);
      }
    }
  }

  function sleep(ms) {
    if (!ms) return Promise.resolve();
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function shouldRetry(error, attempt) {
    if (attempt >= state.retry) return false;
    if (error && error.code && error.code < 500) return false;
    return true;
  }

  function parseResponse(response) {
    return response.text().then(function (text) {
      var body = {};
      if (text) {
        try {
          body = JSON.parse(text);
        } catch (error) {
          throw createError(response.status || 500, 'invalid JSON response', { retryable: false });
        }
      }

      if (!response.ok) {
        throw createError(response.status || 500, body.message || 'http request failed');
      }

      var code = typeof body.code === 'number' ? body.code : 200;
      if (code !== 200) {
        throw createError(code, body.message || 'request failed');
      }
      return body.data;
    });
  }

  function requestWithRetry(url, options) {
    var attempt = 0;

    function run() {
      if (typeof root.fetch !== 'function') {
        return Promise.reject(createError(500, 'fetch is not available'));
      }

      return root.fetch(url, options).then(parseResponse).catch(function (error) {
        var normalized = error && typeof error.code !== 'undefined'
          ? error
          : createError(500, error && error.message ? error.message : 'network request failed');
        if (!shouldRetry(normalized, attempt)) {
          throw normalized;
        }
        var delay = state.retryDelay * Math.pow(2, attempt);
        attempt++;
        return sleep(delay).then(run);
      });
    }

    return run();
  }

  function buildURL(path, query) {
    var url = state.baseURL + '/api/v1' + path;
    var parts = [];
    query = query || {};
    Object.keys(query).forEach(function (key) {
      var value = query[key];
      if (value === undefined || value === null || value === '') return;
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
    });
    return parts.length ? url + '?' + parts.join('&') : url;
  }

  function makeHeaders(hasBody, includeAuth) {
    var headers = { Accept: 'application/json' };
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }
    if (includeAuth) {
      headers.Authorization = 'Bearer ' + state.token;
    }
    return headers;
  }

  function rawRequest(method, path, body, query, includeAuth) {
    var hasBody = body !== undefined && body !== null;
    return requestWithRetry(buildURL(path, query), {
      method: method,
      headers: makeHeaders(hasBody, includeAuth),
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  }

  function loginWithCredentials(input) {
    var credentials = normalizeCredentials(input);
    var channelId = refreshChannelIdFromBridge();
    if (!channelId) {
      return Promise.reject(createError(400, 'channelId is required'));
    }
    if (!credentials.gameUserId || !credentials.accessToken) {
      return Promise.reject(createError(401, 'login credentials are required'));
    }

    return rawRequest('POST', '/auth/login', {
      channel_id: channelId,
      sdk_user_id: credentials.gameUserId,
      sdk_game_token: credentials.accessToken,
    }, null, false).then(function (data) {
      state.token = data && data.token ? data.token : '';
      state.userId = data && data.user_id ? data.user_id : credentials.gameUserId;
      state.expiresAt = data && data.expires_in ? Date.now() + data.expires_in * 1000 : 0;
      if (!state.token) {
        throw createError(500, 'login response missing token');
      }
      emit('auth:ready', { userId: state.userId, channelId: state.channelId });
      if (realtime.enabled && realtime.autoConnect) {
        connectRealtime().catch(function (error) {
          emit('realtime:error', error);
        });
      }
      return api;
    }).catch(function (error) {
      emit('auth:error', error);
      throw error;
    });
  }

  function waitForLogin(options) {
    return new Promise(function (resolve, reject) {
      var ugGame = root.UgGame;
      if (ugGame && typeof ugGame.on === 'function') {
        ugGame.on('onLoginSuccess', function (payload) {
          loginWithCredentials(payload).then(resolve, reject);
        });
        return;
      }

      var credentials = getBrowserCredentials(options);
      if (credentials.gameUserId && credentials.accessToken) {
        loginWithCredentials(credentials).then(resolve, reject);
        return;
      }

      reject(createError(401, 'UgGame login is unavailable and dev credentials were not provided'));
    });
  }

  function ensureReady() {
    if (!state.initialized || !state.loginPromise) {
      return Promise.reject(createError(400, 'ScaffoldSDK.init must be called first'));
    }
    if (state.token) {
      return Promise.resolve(api);
    }
    return state.loginPromise;
  }

  function authedRequest(method, path, body, query) {
    return ensureReady().then(function () {
      return rawRequest(method, path, body, query, true);
    });
  }

  function normalizeMissionOptions(options) {
    options = options || {};
    var categories = options.disabled_categories || options.disabledCategories;
    if (!Array.isArray(categories) || categories.length === 0) return {};
    var cleaned = [];
    categories.forEach(function (item) {
      if (item === undefined || item === null) return;
      var value = String(item).trim();
      if (value) cleaned.push(value);
    });
    if (cleaned.length === 0) return {};
    return { disabled_categories: cleaned.join(',') };
  }

  function normalizeRealtimeOptions(value) {
    var options = value || {};
    if (value === false) options = { enabled: false };
    if (value === true) options = { enabled: true };
    var reconnect = options.reconnect || {};
    return {
      enabled: options.enabled !== false,
      autoConnect: options.autoConnect !== false,
      ticketPath: options.ticketPath || '/realtime/ticket',
      wsPath: options.wsPath || '/ws/v1',
      heartbeatInterval: typeof options.heartbeatInterval === 'number' ? options.heartbeatInterval : 25000,
      reconnectEnabled: reconnect.enabled !== false,
      reconnectMinDelay: typeof reconnect.minDelay === 'number' ? reconnect.minDelay : 1000,
      reconnectMaxDelay: typeof reconnect.maxDelay === 'number' ? reconnect.maxDelay : 30000,
      reconnectFactor: typeof reconnect.factor === 'number' ? reconnect.factor : 2,
      reconnectJitter: typeof reconnect.jitter === 'number' ? reconnect.jitter : 0.2,
      reconnectMaxAttempts: typeof reconnect.maxAttempts === 'number' ? reconnect.maxAttempts : 0,
    };
  }

  function configureRealtime(options) {
    var normalized = normalizeRealtimeOptions(options);
    realtime.enabled = normalized.enabled;
    realtime.autoConnect = normalized.autoConnect;
    realtime.ticketPath = normalized.ticketPath;
    realtime.wsPath = normalized.wsPath;
    realtime.heartbeatInterval = normalized.heartbeatInterval;
    realtime.reconnectEnabled = normalized.reconnectEnabled;
    realtime.reconnectMinDelay = normalized.reconnectMinDelay;
    realtime.reconnectMaxDelay = normalized.reconnectMaxDelay;
    realtime.reconnectFactor = normalized.reconnectFactor;
    realtime.reconnectJitter = normalized.reconnectJitter;
    realtime.reconnectMaxAttempts = normalized.reconnectMaxAttempts;
    realtime.state = realtime.enabled ? 'idle' : 'disabled';
    realtime.manualClose = false;
    realtime.reconnectAttempts = 0;
    realtime.lastEventId = '';
    realtime.connectionId = '';
    clearRealtimeTimers();
    realtime.socket = null;
    realtime.pendingRankJobs = {};
  }

  function clearRealtimeTimers() {
    if (realtime.reconnectTimer) {
      root.clearTimeout(realtime.reconnectTimer);
      realtime.reconnectTimer = null;
    }
    if (realtime.heartbeatTimer) {
      root.clearTimeout(realtime.heartbeatTimer);
      realtime.heartbeatTimer = null;
    }
  }

  function resolveWebSocketURL(ticketData) {
    var url = ticketData && ticketData.ws_url ? ticketData.ws_url : realtime.wsPath;
    if (!/^wss?:\/\//i.test(url)) {
      url = state.baseURL.replace(/^http/i, 'ws') + (url.charAt(0) === '/' ? url : '/' + url);
    }
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'ticket=' + encodeURIComponent(ticketData.ticket);
  }

  function sendRealtimeMessage(message) {
    var socket = realtime.socket;
    if (!socket || socket.readyState !== 1) return false;
    socket.send(JSON.stringify(message));
    return true;
  }

  function sendClientHello() {
    sendRealtimeMessage({
      type: 'client.hello',
      version: 1,
      data: {
        sdk_version: VERSION,
        last_event_id: realtime.lastEventId || '',
        subscriptions: [],
      },
    });
  }

  function sendClientAck(eventId) {
    if (!eventId) return;
    sendRealtimeMessage({
      type: 'client.ack',
      version: 1,
      data: { event_id: eventId },
    });
  }

  function scheduleHeartbeat() {
    if (!realtime.heartbeatInterval || realtime.heartbeatInterval <= 0) return;
    if (realtime.heartbeatTimer) root.clearTimeout(realtime.heartbeatTimer);
    realtime.heartbeatTimer = root.setTimeout(function () {
      if (realtime.state === 'connected') {
        sendRealtimeMessage({ type: 'client.ping', version: 1, data: { ts: Date.now() } });
        scheduleHeartbeat();
      }
    }, realtime.heartbeatInterval);
  }

  function normalizeRealtimeEvent(message) {
    var data = message.data || {};
    var event = { id: message.id || '', ts: message.ts || 0 };
    Object.keys(data).forEach(function (key) {
      event[key] = data[key];
    });
    return event;
  }

  function sdkEventName(type) {
    switch (type) {
      case 'server.ready':
        return 'realtime:connected';
      case 'rank.update_result':
        return 'rank:update_result';
      case 'rank.changed':
        return 'rank:changed';
      case 'checkin.reward_result':
        return 'checkin:reward_result';
      case 'mission.reward_result':
        return 'mission:reward_result';
      case 'system.notice':
        return 'system:notice';
      case 'config.changed':
        return 'config:changed';
      default:
        return type ? type.replace('.', ':') : '';
    }
  }

  function settleRankWait(event) {
    if (!event || !event.job_id) return;
    var pending = realtime.pendingRankJobs[event.job_id];
    if (!pending) return;
    delete realtime.pendingRankJobs[event.job_id];
    if (pending.timer) root.clearTimeout(pending.timer);
    pending.resolve(event);
  }

  function handleRealtimeMessage(raw) {
    var message;
    try {
      message = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(String(raw));
    } catch (error) {
      emit('realtime:error', createError(500, 'invalid realtime message'));
      return;
    }
    if (!message || !message.type) return;
    if (message.id) realtime.lastEventId = message.id;
    if (message.type === 'server.ready') {
      realtime.connectionId = message.data && message.data.connection_id ? message.data.connection_id : '';
    }
    if (message.type === 'server.pong') return;
    var event = normalizeRealtimeEvent(message);
    if (message.type === 'rank.update_result') {
      settleRankWait(event);
      sendClientAck(message.id);
    }
    var name = sdkEventName(message.type);
    if (name) emit(name, event);
  }

  function scheduleReconnect() {
    if (!realtime.enabled || !realtime.reconnectEnabled || realtime.manualClose) return;
    if (realtime.reconnectMaxAttempts > 0 && realtime.reconnectAttempts >= realtime.reconnectMaxAttempts) return;
    var base = Math.min(
      realtime.reconnectMaxDelay,
      realtime.reconnectMinDelay * Math.pow(realtime.reconnectFactor, realtime.reconnectAttempts),
    );
    var jitter = base * realtime.reconnectJitter * (Math.random() * 2 - 1);
    var delay = Math.max(0, Math.round(base + jitter));
    realtime.reconnectAttempts++;
    realtime.state = 'reconnecting';
    emit('realtime:reconnecting', { attempts: realtime.reconnectAttempts, delay: delay });
    realtime.reconnectTimer = root.setTimeout(function () {
      connectRealtime().catch(function (error) {
        emit('realtime:error', error);
        scheduleReconnect();
      });
    }, delay);
  }

  function connectRealtime() {
    if (!realtime.enabled) {
      realtime.state = 'disabled';
      return Promise.resolve(false);
    }
    if (typeof root.WebSocket !== 'function') {
      realtime.state = 'disabled';
      return Promise.resolve(false);
    }
    if (realtime.socket && (realtime.socket.readyState === 0 || realtime.socket.readyState === 1)) {
      return Promise.resolve(true);
    }
    realtime.manualClose = false;
    realtime.state = realtime.reconnectAttempts > 0 ? 'reconnecting' : 'connecting';
    emit('realtime:connecting', { attempts: realtime.reconnectAttempts });
    return authedRequest('POST', realtime.ticketPath, {}).then(function (ticketData) {
      if (!ticketData || !ticketData.ticket) throw createError(500, 'realtime ticket missing');
      var socket = new root.WebSocket(resolveWebSocketURL(ticketData));
      realtime.socket = socket;
      socket.onopen = function () {
        realtime.state = 'connected';
        realtime.reconnectAttempts = 0;
        sendClientHello();
        scheduleHeartbeat();
      };
      socket.onmessage = function (event) {
        handleRealtimeMessage(event.data);
      };
      socket.onerror = function () {
        emit('realtime:error', createError(500, 'realtime socket error'));
      };
      socket.onclose = function (event) {
        clearRealtimeTimers();
        realtime.socket = null;
        if (!realtime.manualClose) {
          emit('realtime:disconnected', { code: event && event.code, reason: event && event.reason });
          scheduleReconnect();
        } else {
          realtime.state = 'closed';
        }
      };
      return true;
    });
  }

  function disconnectRealtime() {
    realtime.manualClose = true;
    clearRealtimeTimers();
    if (realtime.socket) {
      realtime.socket.close(1000, 'client disconnect');
      realtime.socket = null;
    }
    realtime.state = realtime.enabled ? 'closed' : 'disabled';
  }

  function waitForRankJob(jobID, timeout) {
    return new Promise(function (resolve, reject) {
      var timer = null;
      if (timeout && timeout > 0) {
        timer = root.setTimeout(function () {
          delete realtime.pendingRankJobs[jobID];
          reject(createError(408, 'rank update result timeout', { job_id: jobID }));
        }, timeout);
      }
      realtime.pendingRankJobs[jobID] = { resolve: resolve, reject: reject, timer: timer };
    });
  }

  function segment(value) {
    if (value === undefined || value === null || value === '') {
      throw createError(400, 'rankType is required');
    }
    return encodeURIComponent(String(value));
  }

  function init(options) {
    options = options || {};
    state.baseURL = normalizeBaseURL(options.baseURL);
    state.channelId = resolveChannelId(options);
    state.token = '';
    state.userId = '';
    state.expiresAt = 0;
    state.retry = typeof options.retry === 'number' ? options.retry : DEFAULT_RETRIES;
    state.retryDelay = typeof options.retryDelay === 'number' ? options.retryDelay : DEFAULT_RETRY_DELAY;
    state.debug = !!options.debug;
    configureRealtime(options.realtime);
    state.initialized = true;
    state.loginPromise = waitForLogin(options);
    return state.loginPromise;
  }

  var api = {
    version: VERSION,
    init: init,
    ready: function () {
      return ensureReady();
    },
    login: function (credentials) {
      state.loginPromise = loginWithCredentials(credentials);
      return state.loginPromise;
    },
    on: on,
    off: off,
    getToken: function () {
      return state.token;
    },
    getUserId: function () {
      return state.userId;
    },
    getChannelId: function () {
      return state.channelId;
    },
    checkin: {
      getStatus: function () {
        return authedRequest('GET', '/checkin/status');
      },
      check: function () {
        return authedRequest('POST', '/checkin/check');
      },
      makeup: function (day) {
        return authedRequest('POST', '/checkin/makeup', { day: day });
      },
      reward: function (recordId) {
        return authedRequest('POST', '/checkin/reward', { record_id: recordId });
      },
      watchAd: function (recordId) {
        return authedRequest('POST', '/checkin/ad', { record_id: recordId });
      },
    },
    mission: {
      listGroups: function (options) {
        return authedRequest('GET', '/mission/groups', undefined, normalizeMissionOptions(options));
      },
      getGroup: function (groupCode, options) {
        return authedRequest('GET', '/mission/groups/' + encodeURIComponent(String(groupCode)), undefined, normalizeMissionOptions(options));
      },
      openGroup: function (groupCode, options) {
        return authedRequest('POST', '/mission/groups/' + encodeURIComponent(String(groupCode)) + '/open', undefined, normalizeMissionOptions(options));
      },
      openSlot: function (detailId) {
        return authedRequest('POST', '/mission/slots/' + encodeURIComponent(String(detailId)) + '/open');
      },
      finishSlot: function (detailId, report) {
        return authedRequest('POST', '/mission/slots/' + encodeURIComponent(String(detailId)) + '/finish', {
          report: report || {},
        });
      },
      rewardSlot: function (detailId) {
        return authedRequest('POST', '/mission/slots/' + encodeURIComponent(String(detailId)) + '/reward');
      },
      refreshSlot: function (detailId, options) {
        return authedRequest('POST', '/mission/slots/' + encodeURIComponent(String(detailId)) + '/refresh', undefined, normalizeMissionOptions(options));
      },
      undoRefreshSlot: function (detailId) {
        return authedRequest('POST', '/mission/slots/' + encodeURIComponent(String(detailId)) + '/undo-refresh');
      },
      getStat: function () {
        return authedRequest('GET', '/mission/stat');
      },
    },
    wallet: {
      getBalances: function () {
        return authedRequest('GET', '/wallet/balances');
      },
      listExchangeRules: function () {
        return authedRequest('GET', '/wallet/exchange/rules');
      },
      quoteExchange: function (input) {
        input = input || {};
        return authedRequest('POST', '/wallet/exchange/quote', {
          rule_code: input.ruleCode || input.rule_code,
          from_amount: input.fromAmount == null ? input.from_amount : input.fromAmount,
        });
      },
      exchange: function (input) {
        input = input || {};
        return authedRequest('POST', '/wallet/exchange', {
          rule_code: input.ruleCode || input.rule_code,
          from_amount: input.fromAmount == null ? input.from_amount : input.fromAmount,
          idempotency_key: input.idempotencyKey || input.idempotency_key,
        });
      },
      getLedger: function (options) {
        options = options || {};
        return authedRequest('GET', '/wallet/ledger', undefined, {
          currency_code: options.currencyCode || options.currency_code,
          page: options.page,
          size: options.size,
        });
      },
    },
    reward: {
      listGrants: function (options) {
        options = options || {};
        return authedRequest('GET', '/reward/grants', undefined, {
          status: options.status,
          page: options.page,
          size: options.size,
        });
      },
      listPendingGrants: function (options) {
        options = options || {};
        return api.reward.listGrants({
          status: options.status || 'pending',
          page: options.page,
          size: options.size,
        });
      },
      claimGrant: function (grantId) {
        if (!grantId && grantId !== 0) {
          return Promise.reject(createError(400, 'grantId is required'));
        }
        return authedRequest('POST', '/reward/grants/' + encodeURIComponent(String(grantId)) + '/claim');
      },
      getClaim: function (claimId) {
        if (!claimId && claimId !== 0) {
          throw createError(400, 'claimId is required');
        }
        return authedRequest('GET', '/reward/claims/' + encodeURIComponent(String(claimId)));
      },
    },
    mail: {
      getSummary: function () {
        return authedRequest('GET', '/mail/summary');
      },
      list: function (options) {
        options = options || {};
        return authedRequest('GET', '/mail', undefined, {
          status: options.status,
          page: options.page,
          size: options.size,
        });
      },
      get: function (mailId) {
        if (!mailId && mailId !== 0) {
          return Promise.reject(createError(400, 'mailId is required'));
        }
        return authedRequest('GET', '/mail/' + encodeURIComponent(String(mailId)));
      },
      markRead: function (mailId) {
        if (!mailId && mailId !== 0) {
          return Promise.reject(createError(400, 'mailId is required'));
        }
        return authedRequest('POST', '/mail/' + encodeURIComponent(String(mailId)) + '/read');
      },
      delete: function (mailId) {
        if (!mailId && mailId !== 0) {
          return Promise.reject(createError(400, 'mailId is required'));
        }
        return authedRequest('POST', '/mail/' + encodeURIComponent(String(mailId)) + '/delete');
      },
      claim: function (mailId) {
        if (!mailId && mailId !== 0) {
          return Promise.reject(createError(400, 'mailId is required'));
        }
        return authedRequest('POST', '/mail/' + encodeURIComponent(String(mailId)) + '/claim');
      },
    },
    rank: {
      get: function (rankType, options) {
        options = options || {};
        return authedRequest('GET', '/rank/' + segment(rankType), undefined, {
          dimension: options.dimension,
          page: options.page,
          size: options.size,
        });
      },
      getMyRank: function (rankType, options) {
        options = options || {};
        return authedRequest('GET', '/rank/' + segment(rankType) + '/me', undefined, {
          dimension: options.dimension,
        });
      },
      update: function (rankType, scoreOrPayload, extra) {
        var body =
          scoreOrPayload && typeof scoreOrPayload === 'object' && !Array.isArray(scoreOrPayload) && extra === undefined
            ? scoreOrPayload
            : { score: scoreOrPayload, extra: extra || {} };
        return authedRequest('POST', '/rank/' + segment(rankType) + '/update', body);
      },
      updateAndWait: function (rankType, scoreOrPayload, extra, options) {
        options = options || {};
        return api.rank.update(rankType, scoreOrPayload, extra).then(function (result) {
          if (!result || result.mode !== 'async' || !result.job_id) {
            return result;
          }
          if (!api.realtime.isConnected()) {
            result.wait_skipped = true;
            return result;
          }
          return waitForRankJob(result.job_id, options.timeout || 0).then(function (event) {
            for (var key in result) {
              if (Object.prototype.hasOwnProperty.call(result, key) && typeof event[key] === 'undefined') {
                event[key] = result[key];
              }
            }
            return event;
          });
        });
      },
      getDimensions: function (rankType) {
        return authedRequest('GET', '/rank/' + segment(rankType) + '/dimensions');
      },
    },
    realtime: {
      connect: connectRealtime,
      disconnect: disconnectRealtime,
      isConnected: function () {
        return !!(realtime.socket && realtime.socket.readyState === 1 && realtime.state === 'connected');
      },
      getState: function () {
        return {
          enabled: realtime.enabled,
          state: realtime.state,
          connectionId: realtime.connectionId,
          lastEventId: realtime.lastEventId,
          reconnectAttempts: realtime.reconnectAttempts,
        };
      },
    },
  };

  root.ScaffoldSDK = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
