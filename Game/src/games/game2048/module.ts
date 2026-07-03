import type { GameActionResult, GameModule, RoundOutcome } from '../../framework/gameModule';
import type { Tile } from '../../types';

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

export interface Game2048HistoryEntry {
  board: Tile[];
  score: number;
}

export interface Game2048Snapshot {
  board: Tile[];
  score: number;
  history?: Game2048HistoryEntry[];
}

export interface Game2048State {
  board: Tile[];
  score: number;
  history: Game2048HistoryEntry[];
  status: RoundOutcome;
}

export type Game2048Action =
  | { type: 'move'; direction: MoveDirection }
  | { type: 'undo' }
  | { type: 'shuffle' }
  | { type: 'upgrade'; tileId: string };

export interface Game2048Metrics {
  score: number;
  bestTile: number;
  mergedValues: number[];
  status: RoundOutcome;
}

const GRID_SIZE = 4;
const MAX_HISTORY = 5;

function randomId() {
  return Math.random().toString(36).slice(2, 11);
}

function cloneTiles(board: Tile[]): Tile[] {
  return board.map(tile => ({ ...tile }));
}

function normalizeTiles(board: Tile[]): Tile[] {
  return board.map(tile => ({
    ...tile,
    isNew: false,
    isMerged: false,
  }));
}

function cloneHistory(history: Game2048HistoryEntry[] = []): Game2048HistoryEntry[] {
  return history.map(entry => ({
    board: normalizeTiles(entry.board),
    score: entry.score,
  }));
}

function createRandomTile(existing: Tile[]): Tile | null {
  const emptyCells: { row: number; col: number }[] = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (!existing.some(tile => tile.row === row && tile.col === col)) {
        emptyCells.push({ row, col });
      }
    }
  }

  if (emptyCells.length === 0) return null;
  const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  return {
    id: randomId(),
    value: Math.random() < 0.9 ? 2 : 4,
    row: cell.row,
    col: cell.col,
    isNew: true,
    isMerged: false,
  };
}

function createFreshBoard(): Tile[] {
  const first = createRandomTile([]);
  if (!first) return [];
  const second = createRandomTile([first]);
  return second ? [first, second] : [first];
}

function getBestTile(board: Tile[]) {
  return board.reduce((maxValue, tile) => Math.max(maxValue, tile.value), 0);
}

function hasWinningTile(board: Tile[]) {
  return board.some(tile => tile.value >= 2048);
}

function isGameOver(board: Tile[]) {
  if (board.length < GRID_SIZE * GRID_SIZE) return false;

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const tile = board.find(entry => entry.row === row && entry.col === col);
      if (!tile) return false;

      const right = board.find(entry => entry.row === row && entry.col === col + 1);
      if (right && right.value === tile.value) return false;

      const down = board.find(entry => entry.row === row + 1 && entry.col === col);
      if (down && down.value === tile.value) return false;
    }
  }

  return true;
}

function resolveStatus(board: Tile[]): RoundOutcome {
  if (hasWinningTile(board)) return 'won';
  if (isGameOver(board)) return 'lost';
  return 'playing';
}

function createMetrics(board: Tile[], score: number, mergedValues: number[] = []): Game2048Metrics {
  return {
    score,
    bestTile: getBestTile(board),
    mergedValues,
    status: resolveStatus(board),
  };
}

function unchangedResult(state: Game2048State): GameActionResult<Game2048State, Game2048Metrics> {
  return {
    state,
    changed: false,
    metrics: createMetrics(state.board, state.score),
  };
}

function createStateFromSnapshot(snapshot?: Game2048Snapshot): Game2048State {
  if (snapshot && snapshot.board.length > 0) {
    const board = normalizeTiles(snapshot.board);
    return {
      board,
      score: snapshot.score || 0,
      history: cloneHistory(snapshot.history || []),
      status: resolveStatus(board),
    };
  }

  const board = createFreshBoard();
  return {
    board,
    score: 0,
    history: [],
    status: resolveStatus(board),
  };
}

function dispatchMove(state: Game2048State, direction: MoveDirection): GameActionResult<Game2048State, Game2048Metrics> {
  if (state.status !== 'playing') return unchangedResult(state);

  const currentBoard = normalizeTiles(cloneTiles(state.board));
  const previousEntry: Game2048HistoryEntry = {
    board: cloneTiles(state.board),
    score: state.score,
  };
  let hasMoved = false;
  let nextScore = state.score;
  const mergedValues: number[] = [];
  const isVertical = direction === 'up' || direction === 'down';
  const isForward = direction === 'down' || direction === 'right';

  for (let index = 0; index < GRID_SIZE; index += 1) {
    const lineTiles = currentBoard.filter(tile => (isVertical ? tile.col === index : tile.row === index));
    lineTiles.sort((left, right) => {
      const leftValue = isVertical ? left.row : left.col;
      const rightValue = isVertical ? right.row : right.col;
      return isForward ? rightValue - leftValue : leftValue - rightValue;
    });

    const newLine: Tile[] = [];
    for (let cursor = 0; cursor < lineTiles.length; cursor += 1) {
      const current = lineTiles[cursor];
      const next = lineTiles[cursor + 1];

      if (next && current.value === next.value) {
        const newValue = current.value * 2;
        const linePosition = isForward ? GRID_SIZE - 1 - newLine.length : newLine.length;
        newLine.push({
          id: current.id,
          value: newValue,
          row: isVertical ? linePosition : index,
          col: isVertical ? index : linePosition,
          isMerged: true,
          isNew: false,
        });
        nextScore += newValue;
        mergedValues.push(newValue);
        cursor += 1;
        hasMoved = true;
        continue;
      }

      const targetRow = isVertical ? (isForward ? GRID_SIZE - 1 - newLine.length : newLine.length) : index;
      const targetCol = isVertical ? index : (isForward ? GRID_SIZE - 1 - newLine.length : newLine.length);
      if (current.row !== targetRow || current.col !== targetCol) {
        hasMoved = true;
      }
      newLine.push({
        ...current,
        row: targetRow,
        col: targetCol,
        isNew: false,
        isMerged: false,
      });
    }

    for (const tile of lineTiles) {
      const matchedIndex = currentBoard.findIndex(entry => entry.id === tile.id);
      if (matchedIndex !== -1) currentBoard.splice(matchedIndex, 1);
    }
    currentBoard.push(...newLine);
  }

  if (!hasMoved) return unchangedResult(state);

  const spawnedTile = createRandomTile(currentBoard);
  if (spawnedTile) currentBoard.push(spawnedTile);

  const metrics = createMetrics(currentBoard, nextScore, mergedValues);
  return {
    state: {
      board: currentBoard,
      score: nextScore,
      history: [previousEntry, ...state.history.slice(0, MAX_HISTORY - 1)],
      status: metrics.status,
    },
    changed: true,
    metrics,
  };
}

function dispatchUndo(state: Game2048State): GameActionResult<Game2048State, Game2048Metrics> {
  if (state.history.length === 0) return unchangedResult(state);
  const [previousEntry, ...restHistory] = state.history;
  const board = normalizeTiles(previousEntry.board);
  const metrics = createMetrics(board, previousEntry.score);
  return {
    state: {
      board,
      score: previousEntry.score,
      history: restHistory,
      status: metrics.status,
    },
    changed: true,
    metrics,
  };
}

function dispatchShuffle(state: Game2048State): GameActionResult<Game2048State, Game2048Metrics> {
  if (state.board.length === 0) return unchangedResult(state);

  const positions = state.board.map(tile => ({ row: tile.row, col: tile.col }));
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = positions[index];
    positions[index] = positions[swapIndex];
    positions[swapIndex] = temp;
  }

  const board = state.board.map((tile, index) => ({
    ...tile,
    row: positions[index].row,
    col: positions[index].col,
    isNew: false,
    isMerged: true,
  }));
  const metrics = createMetrics(board, state.score);
  return {
    state: {
      ...state,
      board,
      status: metrics.status,
    },
    changed: true,
    metrics,
  };
}

function dispatchUpgrade(state: Game2048State, tileId: string): GameActionResult<Game2048State, Game2048Metrics> {
  if (!state.board.some(tile => tile.id === tileId)) return unchangedResult(state);

  const board = state.board.map(tile => {
    if (tile.id !== tileId) {
      return {
        ...tile,
        isNew: false,
        isMerged: false,
      };
    }
    return {
      ...tile,
      value: tile.value * 2,
      isNew: false,
      isMerged: true,
    };
  });
  const metrics = createMetrics(board, state.score);
  return {
    state: {
      ...state,
      board,
      status: metrics.status,
    },
    changed: true,
    metrics,
  };
}

export function getBestMoveSuggestion(board: Tile[]): MoveDirection | null {
  const directions: MoveDirection[] = ['up', 'down', 'left', 'right'];
  let bestDirection: MoveDirection | null = null;
  let maxMerges = -1;

  directions.forEach(direction => {
    let merges = 0;
    for (let index = 0; index < GRID_SIZE; index += 1) {
      const cells = board.filter(tile => (direction === 'up' || direction === 'down' ? tile.col === index : tile.row === index));
      cells.sort((left, right) => {
        if (direction === 'up') return left.row - right.row;
        if (direction === 'down') return right.row - left.row;
        if (direction === 'left') return left.col - right.col;
        return right.col - left.col;
      });
      for (let cursor = 0; cursor < cells.length - 1; cursor += 1) {
        if (cells[cursor].value === cells[cursor + 1].value) merges += 1;
      }
    }
    if (merges > maxMerges) {
      maxMerges = merges;
      bestDirection = direction;
    }
  });

  return bestDirection;
}

export function getBoardBestTile(board: Tile[]) {
  return getBestTile(board);
}

export const game2048Module: GameModule<Game2048State, Game2048Snapshot, Game2048Action, Game2048Metrics> = {
  id: 'game-2048',
  createInitialState: createStateFromSnapshot,
  toSnapshot(state) {
    return {
      board: normalizeTiles(state.board),
      score: state.score,
      history: cloneHistory(state.history),
    };
  },
  dispatch(state, action) {
    switch (action.type) {
      case 'move':
        return dispatchMove(state, action.direction);
      case 'undo':
        return dispatchUndo(state);
      case 'shuffle':
        return dispatchShuffle(state);
      case 'upgrade':
        return dispatchUpgrade(state, action.tileId);
      default:
        return unchangedResult(state);
    }
  },
};
