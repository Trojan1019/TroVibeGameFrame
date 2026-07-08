import type {
  GameConfig,
  MailSeedConfig,
  MissionTemplateConfig,
  SignInDayConfig,
  SpinePresetConfig,
} from './gameConfig';

export type StandardActivityEventType =
  | 'round_started'
  | 'round_finished'
  | 'score_reached'
  | 'combo_reached'
  | 'item_used'
  | 'currency_spent'
  | 'rank_submitted';

export type LobbyEntryId =
  | 'mail'
  | 'tasks'
  | 'signin'
  | 'bag'
  | 'leaderboard'
  | 'redeem'
  | 'profile'
  | 'shop';

export interface RuntimeModeManifest {
  modeId: string;
  activityPackId: string;
  shellLayoutId: string;
}

export interface GameplayModeConfig {
  id: string;
  displayName: string;
  gameplay: GameConfig['gameplay'];
  defaultSpinePresetKey?: string;
  supportedEvents: StandardActivityEventType[];
  quickActions?: {
    winLabel?: string;
    loseLabel?: string;
  };
}

export interface ActivityPackConfig {
  id: string;
  displayName: string;
  signIn7d?: SignInDayConfig[];
  fallbackDaily?: MissionTemplateConfig[];
  fallbackMailSeeds?: MailSeedConfig[];
  spinePresets?: SpinePresetConfig[];
}

export interface ShellLayoutConfig {
  id: string;
  displayName: string;
  lobby: {
    primaryEntries: LobbyEntryId[];
    floatingEntries?: LobbyEntryId[];
    hiddenEntries?: LobbyEntryId[];
  };
}

export interface RuntimeModeBundle {
  manifest: RuntimeModeManifest;
  mode: GameplayModeConfig;
  activityPack: ActivityPackConfig;
  shellLayout: ShellLayoutConfig;
}

function normalizeList<T>(input: T[] | undefined) {
  return Array.isArray(input) ? input : [];
}

export function buildGameConfigPatch(bundle: RuntimeModeBundle): Partial<GameConfig> {
  return {
    gameplay: bundle.mode.gameplay,
    spine: {
      presets: normalizeList(bundle.activityPack.spinePresets),
    },
    activities: {
      signIn7d: normalizeList(bundle.activityPack.signIn7d),
    },
    missions: {
      fallbackDaily: normalizeList(bundle.activityPack.fallbackDaily),
    },
    mail: {
      fallbackSeeds: normalizeList(bundle.activityPack.fallbackMailSeeds),
    },
  };
}
