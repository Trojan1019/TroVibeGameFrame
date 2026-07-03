import type { RoundOutcome } from './gameModule';

export type GameFlowPhase = 'lobby' | 'playing' | 'settlement';
export type RoundIntent = 'new' | 'resume';
export type CompletedRoundOutcome = Exclude<RoundOutcome, 'playing'>;

export interface GameFlowState {
  phase: GameFlowPhase;
  roundIntent: RoundIntent;
  lastCompletedRound: CompletedRoundOutcome | null;
}

export function createInitialGameFlow(hasSavedRound: boolean): GameFlowState {
  return {
    phase: 'lobby',
    roundIntent: hasSavedRound ? 'resume' : 'new',
    lastCompletedRound: null,
  };
}

export function startNewRound(flow: GameFlowState): GameFlowState {
  return {
    ...flow,
    phase: 'playing',
    roundIntent: 'new',
    lastCompletedRound: null,
  };
}

export function resumeRound(flow: GameFlowState): GameFlowState {
  return {
    ...flow,
    phase: 'playing',
    roundIntent: 'resume',
    lastCompletedRound: null,
  };
}

export function leaveToLobby(flow: GameFlowState, hasSavedRound: boolean): GameFlowState {
  return {
    ...flow,
    phase: 'lobby',
    roundIntent: hasSavedRound ? 'resume' : 'new',
    lastCompletedRound: null,
  };
}

export function finishRound(flow: GameFlowState, outcome: CompletedRoundOutcome): GameFlowState {
  return {
    ...flow,
    phase: 'settlement',
    lastCompletedRound: outcome,
  };
}
