import { useState, useEffect, useRef, useCallback } from 'react';
import { LobbyScreen } from './components/LobbyScreen';
import { GameScreen } from './components/GameScreen';
import { SettlementScreen } from './components/SettlementScreen';
import { MailModal } from './components/MailModal';
import { TasksModal } from './components/TasksModal';
import { SignInModal } from './components/SignInModal';
import { BagModal } from './components/BagModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { RedeemModal } from './components/RedeemModal';
import { RewardShowcaseModal } from './components/RewardShowcaseModal';
import { RewardFlightProvider } from './components/flight/RewardFlightProvider';
import { ProfileModal } from './components/ProfileModal';
import { ShopModal } from './components/ShopModal';
import { PreviewViewport } from './components/dev/PreviewViewport';
import { getGameConfig } from './config/runtimeConfig';
import { mapRewardKindToItemType, type ConfigRewardGrant } from './config/gameConfig';
import { PlayerInfo, ItemInventory, MailMessage, DailyTask, LeaderboardEntry, ItemType, ModalType } from './types';
import { activeGame, type ActiveGameSnapshot, type ActiveMissionEvent } from './games/registry';
import {
  collectClaims, mergeWalletBalancesFromClaims, applyClientLocalClaims,
  summarizeNewlyClaimedRewards, normalizeMailSummary, pickMailList,
} from './scaffold/rewards';
import { createInventoryStore, nextIdempotencyKey, InventoryStore } from './scaffold/storage';
import { createInitialGameFlow, finishRound, leaveToLobby, resumeRound, startNewRound } from './framework/gameFlow';

// ─── env / constants ────────────────────────────────────────────────────────
const SCAFFOLD_BASE_URL = (import.meta.env.VITE_SCAFFOLD_BASE_URL as string) || 'https://api.uggamer.com/scaffold-sdk';
const SCAFFOLD_CHANNEL_ID = (import.meta.env.VITE_SCAFFOLD_CHANNEL_ID as string) || 'demo_channel';
const SCAFFOLD_DEV_USER_ID = (import.meta.env.VITE_SCAFFOLD_DEV_USER_ID as string) || 'demo_user_verify';
const SCAFFOLD_DEV_TOKEN = (import.meta.env.VITE_SCAFFOLD_DEV_TOKEN as string) || 'dev';
const DEFAULT_COUNTRY = 'CN';
const RANK_TYPE = 'score';
const RANK_PAGE_SIZE = 10;
const SAVED_GAME_SNAPSHOT_KEY = activeGame.saveSnapshotKey;
const LEGACY_SAVED_BOARD_KEY = activeGame.legacyBoardKey;

function normalizeLegacyNickname(nickname: string): string {
  return nickname === '小栗子' ? 'Sample User' : nickname;
}

// ─── SDK setup resolution ────────────────────────────────────────────────────
function resolveScaffoldSetup() {
  if (typeof window === 'undefined') return { options: null, profile: { nickname: '', country: DEFAULT_COUNTRY } };
  const params = new URLSearchParams(window.location.search);
  const hasUgGame = typeof (window as any).UgGame?.on === 'function';
  const hasUgGameBridge = typeof (window as any).UgGameBridge !== 'undefined';
  const isNativeUgGame = hasUgGame || hasUgGameBridge;
  const isLocalOrigin = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  const isLocalBrowserDebug = isLocalOrigin && !isNativeUgGame &&
    (Boolean(import.meta.env.DEV) || Boolean(params.get('userId')) || Boolean(params.get('devToken')));
  const paramBaseURL = params.get('baseURL');
  const paramChannelId = params.get('channelId');
  const paramUserId = params.get('userId');
  const paramDevToken = params.get('devToken');
  const paramNickname = params.get('nickname');
  const country = params.get('country') || DEFAULT_COUNTRY;
  const baseURL = isLocalBrowserDebug && paramBaseURL ? paramBaseURL : SCAFFOLD_BASE_URL;
  const channelId = isLocalBrowserDebug ? (paramChannelId || SCAFFOLD_CHANNEL_ID) : SCAFFOLD_CHANNEL_ID;
  const options: Record<string, unknown> = { baseURL, retryDelay: 100, debug: true };
  if (channelId) options.channelId = channelId;
  if (isLocalBrowserDebug) {
    options.userId = paramUserId || SCAFFOLD_DEV_USER_ID;
    options.devToken = paramDevToken || SCAFFOLD_DEV_TOKEN;
  }
  const storedNickname = normalizeLegacyNickname(localStorage.getItem('2048_nickname') || '');
  const nickname = normalizeLegacyNickname((paramNickname || storedNickname).trim().slice(0, 24));
  return { options, profile: { nickname, country } };
}

// ─── SDK → UI type adapters ──────────────────────────────────────────────────
function parseRewardSnapshot(snapshot: unknown): { coins: number; diamonds: number; items: { type: ItemType; count: number }[] } {
  const rawItems = (snapshot as any)?.items || [];
  let coins = 0, diamonds = 0;
  const bagItems: { type: ItemType; count: number }[] = [];
  const itemCodeMap: Record<string, ItemType> = { booster_undo: 'undo', booster_shuffle: 'shuffle', booster_hint: 'hint', booster_wild: 'upgrade' };
  for (const item of rawItems) {
    const amount = Number(item.amount || 0);
    if (item.kind === 'currency' && item.fulfillment === 'scaffold_wallet') {
      if (item.currency_code === 'coin') coins += amount;
      else if (item.currency_code === 'gem') diamonds += amount;
    } else if (item.kind === 'item' && item.fulfillment === 'client_local') {
      const t = itemCodeMap[item.item_code];
      if (t) bagItems.push({ type: t, count: amount || 1 });
    }
  }
  return { coins, diamonds, items: bagItems };
}

function formatMailTime(raw: string): string {
  if (!raw) return '';
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (diffDays === 0) return `今天 ${hh}:${mm}`;
  if (diffDays === 1) return `昨天 ${hh}:${mm}`;
  if (diffDays < 7) return `${diffDays}天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function sdkMailToMailMessage(mail: Record<string, unknown>): MailMessage {
  const mailStatus = String(mail.mail_status || '');
  const attachmentStatus = String(mail.attachment_status || '');
  const reward = parseRewardSnapshot(mail.reward_snapshot);
  return {
    id: String(mail.id || ''),
    title: String(mail.title || '(无标题)'),
    content: String(mail.content || mail.body || ''),
    coins: reward.coins,
    diamonds: reward.diamonds,
    items: reward.items.length > 0 ? reward.items : undefined,
    isRead: mailStatus !== 'unread',
    isClaimed: attachmentStatus === 'claimed' || attachmentStatus === 'none' || attachmentStatus === '',
    time: formatMailTime(String(mail.created_at || mail.send_time || '')),
  };
}

function sdkSlotToDailyTask(slot: Record<string, unknown>): DailyTask {
  const target = Number(slot.target_value || 1);
  const current = Number(slot.progress_value || 0);
  const reward = parseRewardSnapshot(slot.reward_snapshot);
  const status = String(slot.status || '');
  return {
    id: String(slot.id || slot.detail_id || ''),
    title: String(slot.mission_name || slot.title || slot.description || slot.mission_code || ''),
    description: String(slot.description || ''),
    target,
    current: Math.min(current, target),
    coins: reward.coins,
    diamonds: reward.diamonds,
    isClaimed: status === 'claimed',
    isLocked: !Boolean(slot.opened) || status === 'locked' || status === 'ad_locked',
    category: activeGame.missions.normalizeCategory(slot as any),
  };
}

function sdkRankToLeaderboardEntry(entry: Record<string, unknown>, myUserId: string, rank: number): LeaderboardEntry {
  const extra = (entry.extra || {}) as Record<string, unknown>;
  const nickname = String(extra.nickname || entry.nickname || entry.user_id || '玩家');
  return {
    rank,
    nickname,
    score: Number(entry.score || 0),
    avatarId: 'player',
    isPlayer: String(entry.user_id || '') === myUserId,
  };
}

function sdkCheckinToSignInState(status: unknown): { signInDays: boolean[]; claimedToday: boolean; todayCheckDay: number } {
  const records: Record<string, unknown>[] = (status as any)?.records || [];
  const signInDays = [false, false, false, false, false, false, false];
  let claimedToday = false;
  const todayStr = new Date().toISOString().split('T')[0];
  let todayCheckDay = 0;

  for (const record of records) {
    const day = Number(record.check_day || 0);
    const isRewarded = Number(record.is_rewarded) === 1;
    if (day >= 1 && day <= 7) {
      signInDays[day - 1] = isRewarded;
    }
    const checkDate = String(record.check_date || '').split('T')[0];
    if (checkDate === todayStr) {
      todayCheckDay = day;
      if (isRewarded) claimedToday = true;
    }
  }

  // 如果今天还没有签到记录，todayCheckDay 从已有记录推算（最大 check_day + 1）
  if (todayCheckDay === 0 && records.length > 0) {
    const maxDay = Math.max(...records.map(r => Number(r.check_day || 0)));
    todayCheckDay = Math.min(maxDay + 1, 7);
  }

  return { signInDays, claimedToday, todayCheckDay };
}

function pickRankRecords(page: unknown): Record<string, unknown>[] {
  if (!page || typeof page !== 'object') return [];
  const p = page as Record<string, unknown>;
  return (p.records || p.items || p.list || p.data || []) as Record<string, unknown>[];
}

// ─── fallback mock data (used when SDK unavailable) ──────────────────────────
const DEFAULT_PLAYER_INFO: PlayerInfo = {
  nickname: 'Sample User', avatarId: 'player', level: 1,
  coins: 0, diamonds: 0, score: 0, highScore: 0,
  signInDays: [false, false, false, false, false, false, false],
  lastSignInDate: null, claimedToday: false,
};
const DEFAULT_INVENTORY: ItemInventory = { undo: 3, shuffle: 1, hint: 5, upgrade: 2 };
function summarizeConfigRewards(rewards: ConfigRewardGrant[]) {
  let coins = 0;
  let diamonds = 0;
  const items: { type: ItemType; count: number }[] = [];
  for (const reward of rewards) {
    if (reward.kind === 'coins') {
      coins += reward.count;
      continue;
    }
    if (reward.kind === 'diamonds') {
      diamonds += reward.count;
      continue;
    }
    const itemType = mapRewardKindToItemType(reward.kind);
    if (itemType) items.push({ type: itemType, count: reward.count });
  }
  return { coins, diamonds, items };
}

const DEFAULT_MAILS = (): MailMessage[] => {
  const fallbackSeeds = getGameConfig().mail.fallbackSeeds;
  const mapped = fallbackSeeds.map((seed, index) => {
    const summary = summarizeConfigRewards(seed.rewards);
    return {
      id: seed.id,
      title: seed.title,
      content: seed.content,
      coins: summary.coins,
      diamonds: summary.diamonds,
      items: summary.items.length > 0 ? summary.items : undefined,
      isRead: false,
      isClaimed: false,
      time: `2026-05-22 09:0${Math.min(index + 1, 9)}`,
    };
  });

  return mapped.length > 0 ? mapped : [
    { id: 'msg_welcome', title: '欢迎使用', content: '这是一个可继续扩展的游戏流程壳，已预置示例资源与账户状态。', coins: 100, diamonds: 2, isRead: false, isClaimed: false, time: '2026-05-22 09:08' },
  ];
};

const DEFAULT_TASKS = (): DailyTask[] => {
  const fallbackMissions = getGameConfig().missions.fallbackDaily;
  const mapped = fallbackMissions.map((mission) => {
    const summary = summarizeConfigRewards(mission.rewards);
    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      category: mission.category,
      target: mission.target,
      current: 0,
      coins: summary.coins,
      diamonds: summary.diamonds,
      items: summary.items.length > 0 ? summary.items : undefined,
      isClaimed: false,
      isLocked: false,
    };
  });

  return mapped.length > 0 ? mapped : [
    { id: '2048_merge_128', title: '达成 128 里程碑', description: '在当前示例局面中产出一个 128 格', category: 'merge_tile', target: 128, current: 0, coins: 80, diamonds: 0, isClaimed: false, isLocked: false },
  ];
};
const DEFAULT_LEADERBOARD = (): LeaderboardEntry[] => [
  { rank: 1, nickname: '狐狸阿皮', score: 12800, avatarId: 'fox' },
  { rank: 2, nickname: '小熊墩墩', score: 9600, avatarId: 'bear' },
  { rank: 3, nickname: '仓鼠米粒', score: 9200, avatarId: 'hamster' },
  { rank: 4, nickname: 'Sample User', score: 8960, avatarId: 'player', isPlayer: true },
  { rank: 5, nickname: '兔兔果冻', score: 6400, avatarId: 'rabbit' },
];

interface SettlementSummary {
  outcome: 'won' | 'lost';
  score: number;
  bestTile: number;
  moves: number;
}

interface RewardItemGrant {
  type: ItemType;
  count: number;
}

interface ClaimedRewardState {
  coins: number;
  diamonds: number;
  items?: RewardItemGrant[];
}

function normalizeLoadedPlayerInfo(input: PlayerInfo): PlayerInfo {
  return {
    ...input,
    nickname: normalizeLegacyNickname(input.nickname),
  };
}

function normalizeLoadedMails(input: MailMessage[]): MailMessage[] {
  return input.map(mail => ({
    ...mail,
    title: mail.title === '今日奖励' ? '每日资源' : mail.title === '挑战礼包' ? '测试礼包' : mail.title,
    content:
      mail.content === '亲爱的玩家，欢迎回到森林数字奇幻乐园！'
        ? '这是一个可继续扩展的游戏流程壳，已预置示例资源与账户状态。'
        : mail.content === '每日登录奖励已送达！'
          ? '每日示例奖励已发放。'
          : mail.content === '感谢你完成上周的挑战！'
            ? '感谢你完成上一轮流程验证。'
            : mail.content,
  }));
}

function normalizeLoadedTasks(input: DailyTask[]): DailyTask[] {
  const defaultsById = new Map(DEFAULT_TASKS().map(task => [task.id, task]));
  return input.map(task => {
    const fallback = defaultsById.get(task.id);
    if (!fallback) return task;
    return {
      ...task,
      title: fallback.title,
      description: fallback.description,
    };
  });
}

function normalizeLoadedLeaderboard(input: LeaderboardEntry[]): LeaderboardEntry[] {
  return input.map(entry => ({
    ...entry,
    nickname: normalizeLegacyNickname(entry.nickname),
  }));
}

// ─── main App component ──────────────────────────────────────────────────────
export default function App() {
  const sdkRef = useRef<any>(null);
  const scaffoldSetup = useRef(resolveScaffoldSetup()).current;
  const missionGroupRef = useRef<any>(null);
  const missionFinishInFlightRef = useRef(new Set<string>());
  const inventoryStoreRef = useRef<InventoryStore | null>(null);
  const lastReportedScoreRef = useRef(0);
  const totalMovesRef = useRef(0); // cumulative across all rounds for move_count missions
  const roundMetricsRef = useRef({ moves: 0, bestTile: 0, finished: false, itemsUsed: 0 });
  const gamesPlayedRef = useRef(0);
  const processMissionEventRef = useRef<(e: ActiveMissionEvent) => void>(() => {});
  const finalizeCurrentRoundRef = useRef<(g: any) => void>(() => {});
  const reportScoreRef = useRef<(score: number, reason: string) => void>(() => {});
  const refreshMailSummaryRef = useRef<() => Promise<void>>(async () => {});
  const refreshMailListRef = useRef<() => Promise<void>>(async () => {});
  const activeModalRef = useRef<ModalType>(null);
  const claimedRewardResolverRef = useRef<(() => void) | null>(null);
  const claimedRewardApplyRef = useRef<(() => Promise<void> | void) | null>(null);

  // ── navigation ──
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // ── SDK status ──
  const [sdkStatus, setSdkStatus] = useState<'initializing' | 'ready' | 'error' | 'unavailable'>('initializing');
  const [walletLoaded, setWalletLoaded] = useState(false);

  // ── player / game state ──
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>(() => {
    const local = localStorage.getItem('2048_player_infov2');
    return local ? normalizeLoadedPlayerInfo(JSON.parse(local)) : DEFAULT_PLAYER_INFO;
  });
  const [inventory, setInventory] = useState<ItemInventory>(() => {
    const local = localStorage.getItem('2048_inventoryv2');
    return local ? JSON.parse(local) : DEFAULT_INVENTORY;
  });
  const [mailList, setMailList] = useState<MailMessage[]>(() => {
    const local = localStorage.getItem('2048_mail_listv2');
    return local ? normalizeLoadedMails(JSON.parse(local)) : DEFAULT_MAILS();
  });
  const [tasks, setTasks] = useState<DailyTask[]>(() => {
    const local = localStorage.getItem('2048_task_listv2');
    return local ? normalizeLoadedTasks(JSON.parse(local)) : DEFAULT_TASKS();
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const local = localStorage.getItem('2048_leaderboardv2');
    return local ? normalizeLoadedLeaderboard(JSON.parse(local)) : DEFAULT_LEADERBOARD();
  });
  const [savedGameSnapshot, setSavedGameSnapshot] = useState<ActiveGameSnapshot | null>(() => activeGame.loadSnapshot(playerInfo.score));
  const [claimedReward, setClaimedReward] = useState<ClaimedRewardState | null>(null);
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary | null>(null);
  const hasSavedRound = !!savedGameSnapshot && savedGameSnapshot.board.length > 0;
  const [gameFlow, setGameFlow] = useState(() => createInitialGameFlow(hasSavedRound));

  // keep activeModal ref in sync for SDK event handlers
  useEffect(() => { activeModalRef.current = activeModal; }, [activeModal]);

  // Normalize already-mounted legacy state so HMR or stale runtime state stops showing old shell branding.
  useEffect(() => {
    setPlayerInfo(prev => {
      const next = normalizeLoadedPlayerInfo(prev);
      return next.nickname === prev.nickname ? prev : next;
    });
    setMailList(prev => {
      const next = normalizeLoadedMails(prev);
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
    setTasks(prev => {
      const next = normalizeLoadedTasks(prev);
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
    setLeaderboard(prev => {
      const next = normalizeLoadedLeaderboard(prev);
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });

    const storedNickname = localStorage.getItem('2048_nickname');
    if (storedNickname) {
      const normalizedNickname = normalizeLegacyNickname(storedNickname);
      if (normalizedNickname !== storedNickname) {
        localStorage.setItem('2048_nickname', normalizedNickname);
      }
    }
  }, []);

  // persist to localStorage
  useEffect(() => { localStorage.setItem('2048_player_infov2', JSON.stringify(playerInfo)); }, [playerInfo]);
  useEffect(() => { localStorage.setItem('2048_inventoryv2', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('2048_mail_listv2', JSON.stringify(mailList)); }, [mailList]);
  useEffect(() => { localStorage.setItem('2048_task_listv2', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('2048_leaderboardv2', JSON.stringify(leaderboard)); }, [leaderboard]);
  useEffect(() => { activeGame.persistSnapshot(savedGameSnapshot); }, [savedGameSnapshot]);

  // ── SDK refresh helpers ──────────────────────────────────────────────────
  const refreshWallet = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk || sdkStatus !== 'ready') return;
    try {
      const wallet = await sdk.wallet.getBalances();
      const src = wallet?.balances && typeof wallet.balances === 'object' ? wallet.balances : wallet || {};
      const balances: Record<string, number> = {};
      Object.entries(src).forEach(([k, v]) => { const n = Number(v); if (Number.isFinite(n)) balances[k] = n; });
      // if SDK responded (even with empty balances), treat missing keys as 0
      const sdkResponded = wallet !== null && wallet !== undefined;
      setPlayerInfo(prev => ({
        ...prev,
        coins: sdkResponded ? (balances.coin ?? 0) : prev.coins,
        diamonds: sdkResponded ? (balances.gem ?? 0) : prev.diamonds,
      }));
      if (sdkResponded) setWalletLoaded(true);
    } catch (e) { console.error('[SDK] wallet:refresh_error', e); }
  }, [sdkStatus]);

  const refreshCheckin = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk || sdkStatus !== 'ready') return;
    try {
      const status = await sdk.checkin.getStatus();
      const { signInDays, claimedToday, todayCheckDay } = sdkCheckinToSignInState(status);
      setPlayerInfo(prev => ({ ...prev, signInDays, claimedToday, todayCheckDay }));
    } catch (e) { console.error('[SDK] checkin:refresh_error', e); }
  }, [sdkStatus]);

  const refreshMissions = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk || sdkStatus !== 'ready') return;
    try {
      const group = await sdk.mission.getGroup(activeGame.missionGroupCode, {});
      missionGroupRef.current = group || null;
      const slots: Record<string, unknown>[] = group?.slots || [];

      // For each slot that is not yet finished server-side but local progress has reached target,
      // call finishSlot so the server marks it done and the claim button becomes available.
      const localSnapshot = JSON.parse(localStorage.getItem('2048_task_listv2') || '[]') as DailyTask[];
      for (const slot of slots) {
        const slotStatus = String(slot.status || '');
        if (slotStatus === 'finished' || slotStatus === 'claimed') continue;
        const slotId = String(slot.id || slot.detail_id || '');
        if (!slotId) continue;
        const missionCode = String(slot.mission_code || '');
        const category = activeGame.missions.normalizeCategory(slot as any);
        const target = Number(slot.target_value || 0);
        const localTask = localSnapshot.find(t =>
          t.id === missionCode || t.id === slotId ||
          (category && t.category === category)
        );
        if (localTask && localTask.current >= localTask.target && localTask.target > 0) {
          try {
            const report = activeGame.missions.buildMissionReport(slot as any, {
              type: category, event: category, value: localTask.current,
              progress_value: localTask.current, score: 0,
            });
            await sdk.mission.finishSlot(slotId, report);
          } catch { /* already finished or not eligible — ignore */ }
        }
        void target; // suppress unused warning
      }

      // Re-fetch after potential finishSlot calls so UI reflects updated status
      const freshGroup = await sdk.mission.getGroup(activeGame.missionGroupCode, {});
      missionGroupRef.current = freshGroup || null;
      const freshSlots: Record<string, unknown>[] = freshGroup?.slots || [];

      setTasks(prev => {
        const sdkTasks = freshSlots.map(sdkSlotToDailyTask);
        return sdkTasks.map(sdkTask => {
          const localTask = prev.find(t =>
            t.id === sdkTask.id ||
            (sdkTask.category !== '' && t.category === sdkTask.category)
          );
          if (localTask && !sdkTask.isClaimed && localTask.current > sdkTask.current) {
            return { ...sdkTask, current: localTask.current };
          }
          return sdkTask;
        });
      });
    } catch (e) { console.error('[SDK] mission:refresh_error', e); }
  }, [sdkStatus]);

  const refreshMailSummary = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk || sdkStatus !== 'ready') return;
    try {
      const payload = await sdk.mail.getSummary();
      const summary = normalizeMailSummary(payload);
      // store badge count in playerInfo for LobbyScreen to use
      setPlayerInfo(prev => ({ ...prev, _mailBadge: Math.max(summary.unreadCount, summary.unclaimedCount) } as any));
    } catch (e) { console.error('[SDK] mail:summary_error', e); }
  }, [sdkStatus]);

  const refreshMailList = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk || sdkStatus !== 'ready') return;
    try {
      const payload = await sdk.mail.list({ page: 1, size: 20 });
      const list = pickMailList(payload) as Record<string, unknown>[];
      setMailList(list.map(sdkMailToMailMessage));
    } catch (e) { console.error('[SDK] mail:list_error', e); }
  }, [sdkStatus]);

  const refreshRank = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk || sdkStatus !== 'ready') return;
    try {
      const myUserId = sdk.getUserId?.() || '';
      const [page, minePayload] = await Promise.all([
        sdk.rank.get(RANK_TYPE, { dimension: scaffoldSetup.profile.country, page: 1, size: RANK_PAGE_SIZE }),
        sdk.rank.getMyRank(RANK_TYPE, { dimension: scaffoldSetup.profile.country }),
      ]);
      const records = pickRankRecords(page);
      const entries: LeaderboardEntry[] = records.map((r, i) => sdkRankToLeaderboardEntry(r, myUserId, i + 1));
      const myRecord = minePayload?.record || minePayload?.me || minePayload;
      const myRankNum = Number(myRecord?.rank || myRecord?.position || 0);
      const myRankScore = Number(myRecord?.score || 0);
      if (myRankNum > 0 && !entries.some(e => e.isPlayer)) {
        entries.push(sdkRankToLeaderboardEntry(myRecord, myUserId, myRankNum));
      }
      setLeaderboard(entries);
      // sync highScore from server rank record
      if (myRankScore > 0) {
        setPlayerInfo(prev => ({ ...prev, highScore: Math.max(prev.highScore, myRankScore) }));
      }
    } catch (e) { console.error('[SDK] rank:refresh_error', e); }
  }, [sdkStatus, scaffoldSetup.profile.country]);

  // keep refs in sync
  useEffect(() => { refreshMailSummaryRef.current = refreshMailSummary; }, [refreshMailSummary]);
  useEffect(() => { refreshMailListRef.current = refreshMailList; }, [refreshMailList]);

  const presentClaimedReward = useCallback(
    (
      rewards: ClaimedRewardState,
      applyRewards?: () => Promise<void> | void,
    ) =>
      new Promise<void>((resolve) => {
        claimedRewardResolverRef.current = resolve;
        claimedRewardApplyRef.current = applyRewards ?? null;
        setClaimedReward(rewards);
      }),
    [],
  );

  const handleClaimedRewardComplete = useCallback(async () => {
    const applyRewards = claimedRewardApplyRef.current;
    const resolve = claimedRewardResolverRef.current;

    claimedRewardApplyRef.current = null;
    claimedRewardResolverRef.current = null;

    if (applyRewards) {
      await applyRewards();
    }

    setClaimedReward(null);
    resolve?.();
  }, []);

  // ── reward claims handler ────────────────────────────────────────────────
  const handleRewardClaims = useCallback(async (result: unknown) => {
    const claims = collectClaims(result);
    if (claims.length === 0) return;

    const walletPatch = mergeWalletBalancesFromClaims(claims);
    const newlyClaimed = summarizeNewlyClaimedRewards(claims);
    const itemCodeMap: Record<string, ItemType> = {
      booster_undo: 'undo',
      booster_shuffle: 'shuffle',
      booster_hint: 'hint',
      booster_wild: 'upgrade',
    };

    const applyRewards = async () => {
      if (walletPatch.coin !== undefined || walletPatch.gem !== undefined) {
        setPlayerInfo(prev => ({
          ...prev,
          coins: walletPatch.coin !== undefined ? walletPatch.coin : prev.coins,
          diamonds: walletPatch.gem !== undefined ? walletPatch.gem : prev.diamonds,
        }));
      }

      if (inventoryStoreRef.current) {
        const applied = applyClientLocalClaims(claims, inventoryStoreRef.current);
        if (applied.changed) {
          const inv = inventoryStoreRef.current.inventory;
          setInventory(prev => {
            const next = { ...prev };
            for (const [code, type] of Object.entries(itemCodeMap)) {
              if (inv[code] !== undefined) next[type] = inv[code];
            }
            return next;
          });
        }
      }
    };

    if (newlyClaimed.length > 0) {
      let coins = 0;
      let diamonds = 0;
      const items: RewardItemGrant[] = [];

      for (const reward of newlyClaimed) {
        if (reward.label === 'coin') coins += reward.amount;
        else if (reward.label === 'gem') diamonds += reward.amount;
        else if (itemCodeMap[reward.label]) items.push({ type: itemCodeMap[reward.label], count: reward.amount });
      }

      await presentClaimedReward(
        { coins, diamonds, items },
        applyRewards,
      );
    } else {
      await applyRewards();
    }

    const hasWalletClaim = claims.some(c => c.items?.some(i => i.kind === 'currency' && i.fulfillment === 'scaffold_wallet'));
    if (hasWalletClaim && Object.keys(walletPatch).length === 0) {
      await refreshWallet();
    }
  }, [presentClaimedReward, refreshWallet]);

  // ── mission processing ───────────────────────────────────────────────────
  const processMissionEvent = useCallback(async (event: ActiveMissionEvent) => {
    const sdk = sdkRef.current;
    if (!sdk || sdkStatus !== 'ready' || !event) return;
    const slots = missionGroupRef.current?.slots || [];
    const completable = activeGame.missions.findCompletableMissionSlots(slots, event);
    if (completable.length < 1) return;
    for (const slot of completable) {
      const slotId = String((slot as any)?.id || (slot as any)?.detail_id || '');
      if (!slotId || missionFinishInFlightRef.current.has(slotId)) continue;
      missionFinishInFlightRef.current.add(slotId);
      try {
        const report = activeGame.missions.buildMissionReport(slot, event);
        // finishSlot marks the slot as done server-side; rewardSlot is called separately on manual claim
        await sdk.mission.finishSlot(slotId, report);
      } catch (e) { console.error('[SDK] mission:finish_error', e); } finally {
        missionFinishInFlightRef.current.delete(slotId);
      }
    }
    await refreshMissions();
  }, [refreshMissions, sdkStatus]);

  const finalizeCurrentRound = useCallback((currentGame: any) => {
    if (roundMetricsRef.current.finished) return;
    roundMetricsRef.current.finished = true;
    gamesPlayedRef.current += 1;
    const score = Number(currentGame?.score || 0);
    processMissionEvent(activeGame.missions.createGameFinishedEvent({
      gamesPlayed: gamesPlayedRef.current,
      score,
      bestTile: roundMetricsRef.current.bestTile,
      moves: roundMetricsRef.current.moves,
    }));
    // 本地进度 fallback，和其他任务类型保持一致
    setTasks(prev => prev.map(t =>
      (t.category === 'games_played')
        ? { ...t, current: Math.min(t.target, t.current + 1) }
        : t
    ));
  }, [processMissionEvent]);

  const reportScore = useCallback(async (score: number, reason: string) => {
    const sdk = sdkRef.current;
    if (!sdk || sdkStatus !== 'ready' || score <= 0) return;
    if (reason !== 'manual' && score <= lastReportedScoreRef.current) return;
    const extra = {
      nickname: playerInfo.nickname || 'player',
      country: scaffoldSetup.profile.country,
      game: activeGame.displayName,
    };
    try {
      await sdk.rank.updateAndWait(RANK_TYPE, score, extra, { timeout: 8000 });
      lastReportedScoreRef.current = Math.max(lastReportedScoreRef.current, score);
      processMissionEvent({ type: 'rank_submit', event: 'rank_submit', value: 1, progress_value: 1, score });
      // local progress: rank_submit_1 counts submissions; rank_score_X tracks score value
      setTasks(prev => prev.map(t => {
        if (t.category !== 'rank_submit') return t;
        // rank_submit_1: count submissions (target=1); rank_score_X: track best score
        const next = t.id === '2048_rank_submit_1' ? t.current + 1 : Math.max(t.current, score);
        return { ...t, current: Math.min(t.target, next) };
      }));
      await refreshRank();
    } catch { /* silent */ }
  }, [playerInfo.nickname, processMissionEvent, refreshRank, scaffoldSetup.profile.country]);

  // keep refs in sync
  useEffect(() => { processMissionEventRef.current = processMissionEvent; }, [processMissionEvent]);
  useEffect(() => { finalizeCurrentRoundRef.current = finalizeCurrentRound; }, [finalizeCurrentRound]);
  useEffect(() => { reportScoreRef.current = reportScore; }, [reportScore]);

  // ── SDK init effect ──────────────────────────────────────────────────────
  useEffect(() => {
    const sdk = (window as any).ScaffoldSDK;
    if (!sdk || typeof sdk.init !== 'function') {
      setSdkStatus('unavailable');
      setWalletLoaded(true); // no SDK — show 0 immediately, don't leave UI in loading state
      return;
    }
    sdkRef.current = sdk;
    if (!scaffoldSetup.options) { setSdkStatus('unavailable'); setWalletLoaded(true); return; }

    let active = true;
    const unsubs: (() => void)[] = [];
    const sub = (event: string, handler: (p: any) => void) => {
      const off = sdk.on(event, (p: any) => { if (active) handler(p); });
      unsubs.push(off);
    };

    sub('auth:ready', (event: any) => {
      const userId = event?.userId || sdk.getUserId() || 'unknown';
      const channelId = event?.channelId || sdk.getChannelId() || SCAFFOLD_CHANNEL_ID;
      console.log('[App] auth:ready fired, userId:', userId, 'setting sdkStatus to ready');
      setSdkStatus('ready');
      inventoryStoreRef.current = createInventoryStore({ channelId, userId });
      setPlayerInfo(prev => ({
        ...prev,
        nickname: prev.nickname || userId,
      }));
    });

    sub('auth:error', () => { setSdkStatus('error'); });

    sub('system:notice', (event: any) => {
      const noticeType = event?.notice_type || event?.noticeType;
      if (noticeType === 'mail') {
        // 刷新列表让 LobbyScreen 红点实时更新（红点从 mailList 计算）
        refreshMailSummaryRef.current();
        refreshMailListRef.current();
      }
    });

    sub('config:changed', () => {
      refreshWallet(); refreshCheckin(); refreshMissions();
      refreshMailSummaryRef.current();
      if (activeModalRef.current === 'mail') refreshMailListRef.current();
      refreshRank();
    });

    sub('rank:update_result', () => { refreshRank(); });

    sdk.init(scaffoldSetup.options)
      .then(() => {
        if (!active) return;
        const userId = sdk.getUserId();
        if (userId) {
          setSdkStatus('ready');
          const channelId = sdk.getChannelId() || SCAFFOLD_CHANNEL_ID;
          inventoryStoreRef.current = createInventoryStore({ channelId, userId });
        }
      })
      .catch((error: any) => {
        console.error('[App] sdk.init failed:', error?.code, error?.message, error);
        if (active) setSdkStatus('error');
      });

    return () => {
      active = false;
      unsubs.forEach(off => typeof off === 'function' && off());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── load all data when SDK ready ─────────────────────────────────────────
  useEffect(() => {
    console.log('[App] sdkStatus changed:', sdkStatus);
    if (sdkStatus !== 'ready') return;
    console.log('[App] SDK ready, loading all data...');
    refreshWallet();
    refreshCheckin();
    refreshMailSummary();
    refreshMailList();
    refreshMissions();
    refreshRank();
  }, [sdkStatus, refreshWallet, refreshCheckin, refreshMailSummary, refreshMailList, refreshMissions, refreshRank]);

  // ── refresh mail when mail modal opens ───────────────────────────────────
  useEffect(() => {
    if (activeModal === 'mail' && sdkStatus === 'ready') {
      refreshMailSummary();
      refreshMailList();
    }
  }, [activeModal, sdkStatus, refreshMailSummary, refreshMailList]);


  // ── UI action handlers ───────────────────────────────────────────────────
  const handleModifyCurrency = (type: 'coins' | 'diamonds', amount: number) => {
    setPlayerInfo(prev => ({ ...prev, [type]: prev[type] + amount }));
  };

  const handleBuyItem = (itemType: ItemType, priceInCoins: number) => {
    if (playerInfo.coins < priceInCoins) return;
    setPlayerInfo(prev => ({ ...prev, coins: Math.max(0, prev.coins - priceInCoins) }));
    setInventory(prev => ({ ...prev, [itemType]: prev[itemType] + 1 }));
    // track cumulative coins spent on items for exchange missions
    const dateKey = new Date().toISOString().split('T')[0];
    const storageKey = `2048_exchange_total_${dateKey}`;
    const prevTotal = Number(localStorage.getItem(storageKey) || 0);
    const newTotal = prevTotal + priceInCoins;
    localStorage.setItem(storageKey, String(newTotal));
    processMissionEventRef.current({
      type: 'exchange', event: 'exchange', value: 1, progress_value: 1,
      exchange_amount: priceInCoins, exchange_amount_total: newTotal,
    });
    setTasks(prev => prev.map(t => {
      if (t.category !== 'exchange') return t;
      const next = t.target === 1 ? t.current + 1 : newTotal;
      return { ...t, current: Math.min(t.target, next) };
    }));
  };

  const handleExchangeGems = (gemsCost: number, coinsGain: number) => {
    if (playerInfo.diamonds < gemsCost) return;
    setPlayerInfo(prev => ({ ...prev, diamonds: Math.max(0, prev.diamonds - gemsCost), coins: prev.coins + coinsGain }));
  };

  const handleBuyDiamonds = (amount: number) => {
    setPlayerInfo(prev => ({ ...prev, diamonds: prev.diamonds + amount }));
  };

  const handleBuyNoAds = () => {
    setPlayerInfo(prev => ({ ...prev, hasNoAds: true, coins: prev.coins + 2000, diamonds: prev.diamonds + 20 }));
  };

  const handleUpdateProfile = (nickname: string, avatarId: string) => {
    setPlayerInfo(prev => ({ ...prev, nickname, avatarId }));
    if (nickname) localStorage.setItem('2048_nickname', nickname);
    setLeaderboard(prev => prev.map(e => e.isPlayer ? { ...e, nickname, avatarId } : e));
  };

  const handleResetRound = () => {
    roundMetricsRef.current = { moves: 0, bestTile: 0, finished: false, itemsUsed: 0 };
  };

  const handleStartGame = (isNew: boolean) => {
    if (isNew) {
      setSavedGameSnapshot(null);
      setSettlementSummary(null);
      setPlayerInfo(prev => ({ ...prev, score: 0 }));
      roundMetricsRef.current = { moves: 0, bestTile: 0, finished: false, itemsUsed: 0 };
      setGameFlow(prev => startNewRound(prev));
      return;
    }
    setSettlementSummary(null);
    setGameFlow(prev => resumeRound(prev));
  };

  const handleSaveGameState = (snapshot: ActiveGameSnapshot) => {
    setSavedGameSnapshot(snapshot);
    setPlayerInfo(prev => ({ ...prev, score: snapshot.score, highScore: Math.max(prev.highScore, snapshot.score) }));
  };

  const handleRecordMove = (moves: number, score: number, bestTile: number) => {
    roundMetricsRef.current.moves = moves;
    roundMetricsRef.current.bestTile = Math.max(roundMetricsRef.current.bestTile, bestTile);
    totalMovesRef.current += 1;
    const totalMoves = totalMovesRef.current;
    processMissionEventRef.current(activeGame.missions.createMoveEvent({ moves: totalMoves, score, bestTile }));
    setTasks(prev => prev.map(t =>
      t.category === 'move_count' ? { ...t, current: Math.min(t.target, totalMoves) } : t
    ));
  };

  const handleRecordMerge = (value: number, score: number, bestTile: number, moves: number) => {
    processMissionEventRef.current(activeGame.missions.createMergeEvent(value, { score, bestTile, moves }));
    setTasks(prev => prev.map(t => {
      if (t.category === 'merge_tile') {
        return { ...t, current: Math.min(t.target, Math.max(t.current, value)) };
      }
      return t;
    }));
  };

  const handleRecordScore = (score: number, bestTile: number, moves: number) => {
    processMissionEventRef.current(activeGame.missions.createScoreEvent(score, { bestTile, moves }));
    setTasks(prev => prev.map(t =>
      t.category === 'score_single' ? { ...t, current: Math.min(t.target, Math.max(t.current, score)) } : t
    ));
  };

  const handleRecordItemUsed = (itemCode: string, count: number, score: number, bestTile: number, moves: number) => {
    processMissionEventRef.current(activeGame.missions.createItemUsedEvent(itemCode, { count, score, bestTile, moves }));
    setTasks(prev => prev.map(t =>
      t.category === 'use_item' ? { ...t, current: Math.min(t.target, count) } : t
    ));
  };

  const handleGameOver = (score: number, bestTile: number, moves: number) => {
    finalizeCurrentRoundRef.current({ score });
    reportScoreRef.current(score, 'game_over');
    roundMetricsRef.current.bestTile = bestTile;
    roundMetricsRef.current.moves = moves;
    setPlayerInfo(prev => ({ ...prev, score, highScore: Math.max(prev.highScore, score) }));
    setSavedGameSnapshot(null);
    setSettlementSummary({
      outcome: activeGame.resolveRoundOutcome(bestTile),
      score,
      bestTile,
      moves,
    });
    setGameFlow(prev => finishRound(prev, activeGame.resolveRoundOutcome(bestTile)));
  };

  // ── mail handlers ────────────────────────────────────────────────────────
  const handleClaimMail = async (mailId: string) => {
    const sdk = sdkRef.current;
    if (sdk && sdkStatus === 'ready') {
      try {
        const result = await sdk.mail.claim(mailId);
        await handleRewardClaims(result?.claim ? { claim: result.claim } : result);
        await Promise.all([refreshWallet(), refreshMailSummary(), refreshMailList()]);
        return;
      } catch { /* fall through to local */ }
    }
    // local fallback
    const target = mailList.find(m => m.id === mailId);
    if (!target || target.isClaimed) return;
    await presentClaimedReward(
      { coins: target.coins, diamonds: target.diamonds, items: target.items || [] },
      () => {
        handleModifyCurrency('coins', target.coins);
        handleModifyCurrency('diamonds', target.diamonds);
        if (target.items) {
          setInventory(prev => {
            const next = { ...prev };
            target.items?.forEach(item => { next[item.type] = next[item.type] + item.count; });
            return next;
          });
        }
        setMailList(prev => prev.map(m => m.id === mailId ? { ...m, isRead: true, isClaimed: true } : m));
      },
    );
  };

  const handleClaimAllMails = async () => {
    const sdk = sdkRef.current;
    const unclaimed = mailList.filter(m => !m.isClaimed);
    if (sdk && sdkStatus === 'ready') {
      for (const mail of unclaimed) {
        try {
          const result = await sdk.mail.claim(mail.id);
          await handleRewardClaims(result?.claim ? { claim: result.claim } : result);
        } catch { /* continue */ }
      }
      await Promise.all([refreshWallet(), refreshMailSummary(), refreshMailList()]);
      return;
    }
    // local fallback
    let extraCoins = 0, extraDiamonds = 0;
    const itemGrants: Record<ItemType, number> = { undo: 0, shuffle: 0, hint: 0, upgrade: 0 };
    const updated = mailList.map(m => {
      if (!m.isClaimed) {
        extraCoins += m.coins; extraDiamonds += m.diamonds;
        m.items?.forEach(it => { itemGrants[it.type] += it.count; });
        return { ...m, isRead: true, isClaimed: true };
      }
      return m;
    });
    const items: { type: ItemType; count: number }[] = (Object.keys(itemGrants) as ItemType[]).filter(t => itemGrants[t] > 0).map(t => ({ type: t, count: itemGrants[t] }));
    if (extraCoins > 0 || extraDiamonds > 0 || items.length > 0) {
      await presentClaimedReward(
        { coins: extraCoins, diamonds: extraDiamonds, items },
        () => {
          handleModifyCurrency('coins', extraCoins);
          handleModifyCurrency('diamonds', extraDiamonds);
          setInventory(prev => ({
            undo: prev.undo + itemGrants.undo,
            shuffle: prev.shuffle + itemGrants.shuffle,
            hint: prev.hint + itemGrants.hint,
            upgrade: prev.upgrade + itemGrants.upgrade,
          }));
          setMailList(updated);
        },
      );
    }
  };

  const handleDeleteAllReadMails = async () => {
    const sdk = sdkRef.current;
    const toDelete = mailList.filter(m => m.isRead && m.isClaimed);
    if (sdk && sdkStatus === 'ready') {
      for (const mail of toDelete) {
        try { await sdk.mail.delete(mail.id); } catch { /* continue */ }
      }
      await refreshMailList();
      return;
    }
    setMailList(prev => prev.filter(m => !m.isRead || !m.isClaimed));
  };

  const handleDeleteMail = async (mailId: string) => {
    const sdk = sdkRef.current;
    if (sdk && sdkStatus === 'ready') {
      try { await sdk.mail.delete(mailId); await refreshMailList(); return; } catch { /* fall through */ }
    }
    setMailList(prev => prev.filter(m => m.id !== mailId));
  };

  const handleReadMail = async (mailId: string) => {
    const sdk = sdkRef.current;
    if (sdk && sdkStatus === 'ready') {
      try { await sdk.mail.markRead(mailId); await refreshMailList(); return; } catch { /* fall through */ }
    }
    setMailList(prev => prev.map(m => m.id === mailId ? { ...m, isRead: true } : m));
  };

  // ── task handlers ────────────────────────────────────────────────────────
  const handleClaimTask = async (taskId: string) => {
    const sdk = sdkRef.current;
    const target = tasks.find(t => t.id === taskId);
    if (!target || target.isClaimed || target.current < target.target) return;
    if (sdk && sdkStatus === 'ready') {
      try {
        // finishSlot first (idempotent — safe to call even if already finished)
        try { await sdk.mission.finishSlot(taskId, {}); } catch { /* already finished is ok */ }
        const result = await sdk.mission.rewardSlot(taskId);
        await handleRewardClaims(result);
        await refreshMissions();
        return;
      } catch { /* fall through */ }
    }
    await presentClaimedReward(
      { coins: target.coins, diamonds: target.diamonds, items: target.items || [] },
      () => {
        handleModifyCurrency('coins', target.coins);
        handleModifyCurrency('diamonds', target.diamonds);
        if (target.items) {
          setInventory(prev => {
            const next = { ...prev };
            target.items!.forEach(item => { next[item.type] = next[item.type] + item.count; });
            return next;
          });
        }
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isClaimed: true } : t));
      },
    );
  };

  const handleTriggerLeaderboardTask = () => {
    setActiveModal(null);
    setTimeout(() => setActiveModal('leaderboard'), 150);
    setTasks(prev => prev.map(t =>
      t.category === 'rank_submit' && t.target === 1 ? { ...t, current: 1 } : t
    ));
  };

  // ── sign-in handlers ─────────────────────────────────────────────────────
  const handleClaimSignIn = async () => {
    if (playerInfo.claimedToday) return;
    const sdk = sdkRef.current;
    if (sdk && sdkStatus === 'ready') {
      try {
        // check() 返回今日签到 record，直接用其 id 领奖
        const record = await sdk.checkin.check();
        if (record?.id) {
          const rewardResult = await sdk.checkin.reward(record.id);
          await handleRewardClaims(rewardResult);
        }
        await Promise.all([refreshCheckin(), refreshWallet()]);
        return;
      } catch (e) { console.error('[SDK] checkin:claim_error', e); }
    }
    // local fallback
    const currentIdx = playerInfo.signInDays.findIndex(c => !c);
    if (currentIdx === -1) return;
    const signRewardConfigs = getGameConfig().activities.signIn7d.map((item) => item.rewards);
    let extraCoins = 0, extraDiamonds = 0;
    const itemGrants: Record<ItemType, number> = { undo: 0, shuffle: 0, hint: 0, upgrade: 0 };
    for (const reward of signRewardConfigs[currentIdx]) {
      if (reward.kind === 'coins') extraCoins += reward.count;
      else if (reward.kind === 'diamonds') extraDiamonds += reward.count;
      else if (reward.kind === 'chest') {
        itemGrants.upgrade += 2;
        itemGrants.shuffle += 1;
      } else {
        const t = mapRewardKindToItemType(reward.kind);
        if (t) itemGrants[t] += reward.count;
      }
    }
    const itemsToShow: RewardItemGrant[] = (Object.keys(itemGrants) as ItemType[])
      .filter(type => itemGrants[type] > 0)
      .map(type => ({ type, count: itemGrants[type] }));
    const updatedClaims = [...playerInfo.signInDays];
    updatedClaims[currentIdx] = true;
    await presentClaimedReward(
      { coins: extraCoins, diamonds: extraDiamonds, items: itemsToShow },
      () => {
        if (extraCoins > 0) handleModifyCurrency('coins', extraCoins);
        if (extraDiamonds > 0) handleModifyCurrency('diamonds', extraDiamonds);
        if (itemsToShow.length > 0) {
          setInventory(prev => ({
            undo: prev.undo + itemGrants.undo,
            shuffle: prev.shuffle + itemGrants.shuffle,
            hint: prev.hint + itemGrants.hint,
            upgrade: prev.upgrade + itemGrants.upgrade,
          }));
        }
        setPlayerInfo(prev => ({
          ...prev,
          signInDays: updatedClaims,
          claimedToday: true,
          lastSignInDate: new Date().toISOString().split('T')[0],
        }));
      },
    );
  };

  const handleMakeup = async (dayNumber: number) => {
    const sdk = sdkRef.current;
    if (sdk && sdkStatus === 'ready') {
      try {
        const record = await sdk.checkin.makeup(dayNumber);
        if (record?.id) {
          const rewardResult = await sdk.checkin.reward(record.id);
          await handleRewardClaims(rewardResult);
        }
        await Promise.all([refreshCheckin(), refreshWallet()]);
      } catch (e) { console.error('[SDK] checkin:makeup_error', e); }
    }
  };

  const handleRedeemReward = (rewards: { coins: number; diamonds: number; undo?: number; shuffle?: number; hint?: number; upgrade?: number }) => {
    handleModifyCurrency('coins', rewards.coins);
    handleModifyCurrency('diamonds', rewards.diamonds);
    setInventory(prev => ({ undo: prev.undo + (rewards.undo || 0), shuffle: prev.shuffle + (rewards.shuffle || 0), hint: prev.hint + (rewards.hint || 0), upgrade: prev.upgrade + (rewards.upgrade || 0) }));
  };

  const handleUseItemFromModal = (type: ItemType) => {
    if (inventory[type] <= 0) return;
    setActiveModal(null);
    setSettlementSummary(null);
    setGameFlow(prev => (hasSavedRound ? resumeRound(prev) : startNewRound(prev)));
  };

  const handleUseItemFromGame = (type: ItemType, callback: () => boolean): void => {
    if (inventory[type] <= 0) { alert('存货不足，快去签到或邮箱里领取些福利吧！'); return; }
    const success = callback();
    if (success) {
      setInventory(prev => ({ ...prev, [type]: prev[type] - 1 }));
      // 注意：任务事件已在 GameScreen 的 onRecordItemUsed 里上报，这里不重复上报
    }
  };

  // ── render ───────────────────────────────────────────────────────────────
  const appFrame = (
    <RewardFlightProvider>
      <div className="w-full h-full relative overflow-hidden">
        {gameFlow.phase === 'lobby' ? (
          <LobbyScreen
            playerInfo={playerInfo}
            mailList={mailList}
            tasks={tasks}
            onOpenModal={type => setActiveModal(type)}
            onStartGame={handleStartGame}
            hasSavedGame={hasSavedRound}
            onModifyCurrency={handleModifyCurrency}
            walletLoaded={walletLoaded}
          />
        ) : gameFlow.phase === 'settlement' && settlementSummary ? (
          <SettlementScreen
            outcome={settlementSummary.outcome}
            score={settlementSummary.score}
            bestScore={Math.max(playerInfo.highScore, settlementSummary.score)}
            bestTile={settlementSummary.bestTile}
            moves={settlementSummary.moves}
            onPlayAgain={() => handleStartGame(true)}
            onReturnToLobby={() => {
              setSettlementSummary(null);
              setGameFlow(prev => leaveToLobby(prev, false));
            }}
          />
        ) : (
          <GameScreen
            playerInfo={playerInfo}
            inventory={inventory}
            onGoBack={() => setGameFlow(prev => leaveToLobby(prev, hasSavedRound))}
            onUpdateScore={s => setPlayerInfo(p => ({ ...p, score: s, highScore: Math.max(p.highScore, s) }))}
            onUseItemFromGame={handleUseItemFromGame}
            onModifyCurrency={handleModifyCurrency}
            savedSnapshot={savedGameSnapshot}
            onSaveGameState={handleSaveGameState}
            onRecordMove={handleRecordMove}
            onRecordMerge={handleRecordMerge}
            onRecordScore={handleRecordScore}
            onRecordItemUsed={handleRecordItemUsed}
            onGameOver={handleGameOver}
            onResetRound={handleResetRound}
          />
        )}

        <MailModal isOpen={activeModal === 'mail'} onClose={() => setActiveModal(null)} mailList={mailList} onClaimMail={handleClaimMail} onClaimAll={handleClaimAllMails} onDeleteAllRead={handleDeleteAllReadMails} onDeleteMail={handleDeleteMail} onReadMail={handleReadMail} />
        <RewardShowcaseModal isOpen={claimedReward !== null} onConfirm={handleClaimedRewardComplete} rewards={claimedReward} />
        <TasksModal isOpen={activeModal === 'tasks'} onClose={() => setActiveModal(null)} tasks={tasks} onClaimTask={handleClaimTask} onTriggerLeaderboardTask={handleTriggerLeaderboardTask} />
        <SignInModal isOpen={activeModal === 'signin'} onClose={() => setActiveModal(null)} playerInfo={playerInfo} onClaimSignIn={handleClaimSignIn} onMakeup={handleMakeup} />
        <BagModal isOpen={activeModal === 'bag'} onClose={() => setActiveModal(null)} inventory={inventory} onUseItem={handleUseItemFromModal} />
        <LeaderboardModal isOpen={activeModal === 'leaderboard'} onClose={() => setActiveModal(null)} entries={leaderboard} playerScore={playerInfo.highScore} />
        <RedeemModal isOpen={activeModal === 'redeem'} onClose={() => setActiveModal(null)} onRedeemReward={handleRedeemReward} />
        <ProfileModal isOpen={activeModal === 'profile'} onClose={() => setActiveModal(null)} playerInfo={playerInfo} onUpdateProfile={handleUpdateProfile} />
        <ShopModal isOpen={activeModal === 'shop'} onClose={() => setActiveModal(null)} playerInfo={playerInfo} inventory={inventory} onBuyItem={handleBuyItem} onExchangeGems={handleExchangeGems} onBuyDiamonds={handleBuyDiamonds} onBuyNoAds={handleBuyNoAds} />
      </div>
    </RewardFlightProvider>
  );

  return (
    <PreviewViewport>
      {appFrame}
    </PreviewViewport>
  );
}
