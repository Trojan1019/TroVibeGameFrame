export type ConfigRewardKind =
  | 'coins'
  | 'diamonds'
  | 'undo'
  | 'shuffle'
  | 'hint'
  | 'upgrade'
  | 'chest';

export interface ConfigRewardGrant {
  kind: ConfigRewardKind;
  count: number;
}

export interface SpinePresetConfig {
  key: string;
  label: string;
  skeleton: string;
  atlas: string;
  animation: string;
  skin?: string;
  interactive: boolean;
  showControls: boolean;
}

export interface SignInDayConfig {
  day: number;
  label: string;
  rewards: ConfigRewardGrant[];
}

export interface MissionTemplateConfig {
  id: string;
  title: string;
  description: string;
  category: string;
  target: number;
  rewards: ConfigRewardGrant[];
}

export interface MailSeedConfig {
  id: string;
  title: string;
  content: string;
  rewards: ConfigRewardGrant[];
}

export interface GameConfig {
  gameplay: {
    winThreshold: number;
    missionGroupCode: string;
  };
  spine: {
    presets: SpinePresetConfig[];
  };
  activities: {
    signIn7d: SignInDayConfig[];
  };
  missions: {
    fallbackDaily: MissionTemplateConfig[];
  };
  mail: {
    fallbackSeeds: MailSeedConfig[];
  };
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gameplay: {
    winThreshold: 6,
    missionGroupCode: 'main_daily',
  },
  spine: {
    presets: [
      {
        key: 'spineboyDemo',
        label: 'Spine Demo 示例',
        skeleton: 'https://esotericsoftware.com/files/examples/4.3/spineboy/export/spineboy-pro.json',
        atlas: 'https://esotericsoftware.com/files/examples/4.3/spineboy/export/spineboy-pma.atlas',
        animation: 'idle',
        interactive: true,
        showControls: true,
      },
      {
        key: 'lobbyGuide',
        label: 'Lobby 引导角色',
        skeleton: '/spine/lobby-hostess/lobby-hostess.json',
        atlas: '/spine/lobby-hostess/lobby-hostess.atlas',
        animation: 'idle',
        interactive: false,
        showControls: false,
      },
    ],
  },
  activities: {
    signIn7d: [
      { day: 1, label: '第 1 天', rewards: [{ kind: 'coins', count: 100 }] },
      { day: 2, label: '第 2 天', rewards: [{ kind: 'diamonds', count: 2 }] },
      {
        day: 3,
        label: '第 3 天',
        rewards: [
          { kind: 'hint', count: 1 },
          { kind: 'coins', count: 50 },
        ],
      },
      { day: 4, label: '第 4 天', rewards: [{ kind: 'coins', count: 200 }] },
      {
        day: 5,
        label: '第 5 天',
        rewards: [
          { kind: 'shuffle', count: 1 },
          { kind: 'diamonds', count: 1 },
        ],
      },
      {
        day: 6,
        label: '第 6 天',
        rewards: [
          { kind: 'diamonds', count: 3 },
          { kind: 'coins', count: 100 },
        ],
      },
      {
        day: 7,
        label: '第 7 天',
        rewards: [
          { kind: 'chest', count: 1 },
          { kind: 'diamonds', count: 5 },
          { kind: 'coins', count: 500 },
        ],
      },
    ],
  },
  missions: {
    fallbackDaily: [
      {
        id: 'pinball_combo_8',
        title: '打出 8 连击',
        description: '单局内任意一次发射打出 8 连击',
        category: 'merge_tile',
        target: 8,
        rewards: [{ kind: 'coins', count: 80 }],
      },
      {
        id: 'pinball_combo_15',
        title: '打出 15 连击',
        description: '单局内任意一次发射打出 15 连击',
        category: 'merge_tile',
        target: 15,
        rewards: [
          { kind: 'coins', count: 180 },
          { kind: 'hint', count: 1 },
        ],
      },
      {
        id: 'pinball_finish_3',
        title: '完成 3 次远征',
        description: '累计完成 3 局弹球远征',
        category: 'games_played',
        target: 3,
        rewards: [
          { kind: 'coins', count: 160 },
          { kind: 'undo', count: 1 },
        ],
      },
      {
        id: 'pinball_exchange_1500',
        title: '累计消费 1500 金币',
        description: '累计完成 1500 金币的补给采购',
        category: 'exchange',
        target: 1500,
        rewards: [{ kind: 'diamonds', count: 2 }],
      },
    ],
  },
  mail: {
    fallbackSeeds: [
      {
        id: 'msg_welcome',
        title: '远征准备完成',
        content: '弹球小队已经集结，新的远征战场和初始补给已送达。',
        rewards: [
          { kind: 'coins', count: 100 },
          { kind: 'diamonds', count: 2 },
        ],
      },
      {
        id: 'msg_daily',
        title: '每日补给',
        content: '今日补给箱已送达，记得补足预判和过载道具。',
        rewards: [
          { kind: 'coins', count: 200 },
          { kind: 'hint', count: 1 },
        ],
      },
    ],
  },
};

export function cloneGameConfig(config: GameConfig = DEFAULT_GAME_CONFIG): GameConfig {
  return structuredClone(config);
}

export function mapRewardKindToItemType(kind: ConfigRewardKind) {
  if (kind === 'undo' || kind === 'shuffle' || kind === 'hint' || kind === 'upgrade') return kind;
  return null;
}

export function mapRewardKindToSignRewardType(kind: ConfigRewardKind) {
  if (kind === 'coins') return 'gold';
  if (kind === 'diamonds') return 'diamond';
  return kind;
}
