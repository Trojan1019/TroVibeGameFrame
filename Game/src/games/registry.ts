import { Game2048ModuleView } from '../components/Game2048ModuleView';
import { getGameConfig } from '../config/runtimeConfig';
import type { Tile } from '../types';
import { game2048Module, getBoardBestTile, getBestMoveSuggestion, type Game2048Snapshot, type Game2048State, type MoveDirection } from './game2048/module';
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

export type ActiveGameSnapshot = Game2048Snapshot;
export type ActiveGameState = Game2048State;
export type ActiveGameMoveDirection = MoveDirection;
export type ActiveMissionEvent = MissionEvent;

export const activeGame = {
  id: 'game-2048',
  displayName: 'number-merge-sample',
  get missionGroupCode() {
    return getGameConfig().gameplay.missionGroupCode;
  },
  saveSnapshotKey: '2048_saved_game_snapshotv1',
  legacyBoardKey: '2048_saved_board_statev2',
  legacyHistoryKey: '2048_game_history',
  get winThreshold() {
    return getGameConfig().gameplay.winThreshold;
  },
  module: game2048Module,
  view: Game2048ModuleView,
  getBoardBestTile,
  getBestMoveSuggestion,
  loadSnapshot(currentScore: number): ActiveGameSnapshot | null {
    const snapshotLocal = localStorage.getItem(this.saveSnapshotKey);
    if (snapshotLocal) {
      try {
        return JSON.parse(snapshotLocal) as ActiveGameSnapshot;
      } catch {
        localStorage.removeItem(this.saveSnapshotKey);
      }
    }

    const legacyBoard = localStorage.getItem(this.legacyBoardKey);
    if (!legacyBoard) return null;

    try {
      const board = JSON.parse(legacyBoard) as Tile[] | null;
      if (!board || board.length === 0) return null;
      const history = JSON.parse(localStorage.getItem(this.legacyHistoryKey) || '[]');
      return {
        board,
        score: currentScore,
        history,
      };
    } catch {
      return null;
    }
  },
  persistSnapshot(snapshot: ActiveGameSnapshot | null) {
    if (snapshot) {
      localStorage.setItem(this.saveSnapshotKey, JSON.stringify(snapshot));
    } else {
      localStorage.removeItem(this.saveSnapshotKey);
    }
    localStorage.removeItem(this.legacyBoardKey);
    localStorage.removeItem(this.legacyHistoryKey);
  },
  resolveRoundOutcome(bestTile: number): 'won' | 'lost' {
    return bestTile >= this.winThreshold ? 'won' : 'lost';
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
