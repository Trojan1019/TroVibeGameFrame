export type RoundOutcome = 'playing' | 'won' | 'lost';

export interface GameActionResult<TState, TMetrics = undefined> {
  state: TState;
  changed: boolean;
  metrics: TMetrics;
}

export interface GameModule<TState, TSnapshot, TAction, TMetrics = undefined> {
  id: string;
  createInitialState(snapshot?: TSnapshot): TState;
  toSnapshot(state: TState): TSnapshot;
  dispatch(state: TState, action: TAction): GameActionResult<TState, TMetrics>;
}
