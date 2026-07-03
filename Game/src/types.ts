/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ScreenType = 'lobby' | 'game' | 'settlement';

export type ModalType = 'mail' | 'tasks' | 'signin' | 'bag' | 'leaderboard' | 'redeem' | 'profile' | 'shop' | null;

export interface PlayerInfo {
  nickname: string;
  avatarId: string;
  level: number;
  coins: number;
  diamonds: number;
  score: number;
  highScore: number;
  signInDays: boolean[]; // 7 elements, true means claimed
  lastSignInDate: string | null; // ISO Date string
  claimedToday: boolean;
  todayCheckDay?: number; // SDK check_day for today (1-7), used to identify missed days
  hasNoAds?: boolean;
}

export type ItemType = 'undo' | 'shuffle' | 'hint' | 'upgrade';

export interface ItemInventory {
  undo: number;
  shuffle: number;
  hint: number;
  upgrade: number;
}

export interface MailMessage {
  id: string;
  title: string;
  content: string;
  coins: number;
  diamonds: number;
  items?: { type: ItemType; count: number }[];
  isRead: boolean;
  isClaimed: boolean;
  isUnreadAlert?: boolean; 
  time: string;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  coins: number;
  diamonds: number;
  items?: { type: ItemType; count: number }[];
  isClaimed: boolean;
  isLocked: boolean;
  category?: string;
}

export interface Tile {
  id: string;
  value: number;
  row: number;
  col: number;
  isMerged?: boolean;
  isNew?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string;
  score: number;
  avatarId: string;
  isPlayer?: boolean;
}
