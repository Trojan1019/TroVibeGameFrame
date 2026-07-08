import { PinballPetModuleView } from '../components/PinballPetModuleView';
import { getGameConfig } from '../config/runtimeConfig';
import type { RoundOutcome } from '../framework/gameModule';
import {
  getBestLaunchAngle,
  pinballPetModule,
  type PinballPetSnapshot,
  type PinballPetState,
} from './pinballPet/module';
import {
  buildMissionReport as buildBaseMissionReport,
  createGameFinishedEvent,
  createItemUsedEvent,
  createMergeEvent,
  createMoveEvent,
  createScoreEvent,
  findCompletableMissionSlots,
  normalizeCategory,
  type MissionEvent,
  type MissionSlot,
} from '../scaffold/missions2048';

export type ActiveGameSnapshot = PinballPetSnapshot;
export type ActiveGameState = PinballPetState;
export type ActiveMissionEvent = MissionEvent;

function isPinballSnapshot(snapshot: unknown): snapshot is ActiveGameSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const candidate = snapshot as Partial<ActiveGameSnapshot>;
  return (
    typeof candidate.stageId === 'string' &&
    typeof candidate.wave === 'number' &&
    typeof candidate.roundIndex === 'number' &&
    typeof candidate.score === 'number' &&
    typeof candidate.bestCombo === 'number' &&
    typeof candidate.status === 'string' &&
    Array.isArray(candidate.enemies) &&
    Array.isArray(candidate.pickups)
  );
}

export const activeGame = {
  id: 'pinball-pet',
  displayName: 'pinball-pet-mvp',
  get missionGroupCode() {
    return getGameConfig().gameplay.missionGroupCode;
  },
  saveSnapshotKey: 'pinball_pet_saved_game_snapshot_v1',
  legacyBoardKey: '2048_saved_board_statev2',
  legacyHistoryKey: '2048_game_history',
  module: pinballPetModule,
  view: PinballPetModuleView,
  getBestLaunchAngle,
  hasSavedSnapshot(snapshot: ActiveGameSnapshot | null) {
    return Boolean(snapshot && isPinballSnapshot(snapshot) && snapshot.status === 'playing');
  },
  loadSnapshot(_currentScore: number): ActiveGameSnapshot | null {
    const snapshotLocal = localStorage.getItem(this.saveSnapshotKey);
    if (snapshotLocal) {
      try {
        const parsed = JSON.parse(snapshotLocal) as unknown;
        if (this.hasSavedSnapshot(parsed as ActiveGameSnapshot | null)) {
          return parsed as ActiveGameSnapshot;
        }
        localStorage.removeItem(this.saveSnapshotKey);
      } catch {
        localStorage.removeItem(this.saveSnapshotKey);
      }
    }

    localStorage.removeItem(this.legacyBoardKey);
    localStorage.removeItem(this.legacyHistoryKey);
    return null;
  },
  persistSnapshot(snapshot: ActiveGameSnapshot | null) {
    if (this.hasSavedSnapshot(snapshot)) {
      localStorage.setItem(this.saveSnapshotKey, JSON.stringify(snapshot));
    } else {
      localStorage.removeItem(this.saveSnapshotKey);
    }
    localStorage.removeItem(this.legacyBoardKey);
    localStorage.removeItem(this.legacyHistoryKey);
  },
  resolveRoundOutcome(status: RoundOutcome): 'won' | 'lost' {
    return status === 'won' ? 'won' : 'lost';
  },
  missions: {
    normalizeCategory,
    findCompletableMissionSlots,
    buildMissionReport(slot: MissionSlot, event: MissionEvent) {
      return {
        ...buildBaseMissionReport(slot, event),
        source: activeGame.displayName,
      };
    },
    createMoveEvent,
    createMergeEvent,
    createScoreEvent,
    createGameFinishedEvent,
    createItemUsedEvent,
  },
} as const;
