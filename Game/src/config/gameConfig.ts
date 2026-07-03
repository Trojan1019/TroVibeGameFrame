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
    winThreshold: 2048,
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
        id: '2048_merge_128',
        title: '达成 128 里程碑',
        description: '在当前示例局面中产出一个 128 格',
        category: 'merge_tile',
        target: 128,
        rewards: [{ kind: 'coins', count: 80 }],
      },
      {
        id: '2048_merge_512',
        title: '达成 512 里程碑',
        description: '在当前示例局面中产出一个 512 格',
        category: 'merge_tile',
        target: 512,
        rewards: [
          { kind: 'coins', count: 180 },
          { kind: 'hint', count: 1 },
        ],
      },
      {
        id: '2048_finish_3',
        title: '完成 3 次示例',
        description: '累计完成 3 局流程',
        category: 'games_played',
        target: 3,
        rewards: [
          { kind: 'coins', count: 160 },
          { kind: 'undo', count: 1 },
        ],
      },
      {
        id: '2048_exchange_1500',
        title: '累计消费 1500 金币',
        description: '累计完成 1500 金币的道具支出',
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
        title: '欢迎使用',
        content: '这是一个可继续扩展的游戏流程壳，已预置示例资源与账户状态。',
        rewards: [
          { kind: 'coins', count: 100 },
          { kind: 'diamonds', count: 2 },
        ],
      },
      {
        id: 'msg_daily',
        title: '每日资源',
        content: '每日示例奖励已发放。',
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
