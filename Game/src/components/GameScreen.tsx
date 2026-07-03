import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayerInfo, Tile, ItemType, ItemInventory } from '../types';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { AlertModal } from './AlertModal';
import { useRewardFlightTarget } from './flight/RewardFlightProvider';
import { RoundStatusPanel } from './RoundStatusPanel';
import { activeGame, type ActiveGameMoveDirection, type ActiveGameSnapshot, type ActiveGameState } from '../games/registry';
import { getBoardMetrics, type BoardFeedbackState } from './Game2048ModuleView';
import { GameResourceIcon } from './shell/GameResourceIcon';
import { usePreviewViewport } from './dev/PreviewViewport';

interface GameScreenProps {
  playerInfo: PlayerInfo;
  inventory: ItemInventory;
  onGoBack: () => void;
  onUpdateScore: (newScore: number) => void;
  onUseItemFromGame: (type: ItemType, callback: () => boolean) => void;
  onModifyCurrency: (type: 'coins' | 'diamonds', amount: number) => void;
  savedSnapshot: ActiveGameSnapshot | null;
  onSaveGameState: (snapshot: ActiveGameSnapshot) => void;
  onRecordMove: (moves: number, score: number, bestTile: number) => void;
  onRecordMerge: (value: number, score: number, bestTile: number, moves: number) => void;
  onRecordScore: (score: number, bestTile: number, moves: number) => void;
  onRecordItemUsed: (itemCode: string, count: number, score: number, bestTile: number, moves: number) => void;
  onGameOver: (score: number, bestTile: number, moves: number) => void;
  onResetRound: () => void;
}

type InputSource = 'pointer' | 'keyboard';
type FeedbackTone = 'guidance' | 'success' | 'invalid' | 'reward';

interface DirectionPreviewState {
  direction: ActiveGameMoveDirection;
  intensity: number;
  source: InputSource;
}

interface FeedbackChipState {
  id: number;
  text: string;
  tone: FeedbackTone;
}

interface HintMessageState {
  id: number;
  text: string;
}

interface RewardFlightState {
  id: number;
  value: number;
  fromX: number;
  fromY: number;
  midX: number;
  midY: number;
  toX: number;
  toY: number;
  delayMs: number;
}

interface PointerGestureState {
  pointerId: number;
  startX: number;
  startY: number;
  direction: ActiveGameMoveDirection | null;
}

interface FocusRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const GESTURE_THRESHOLD = 12;
const TUTORIAL_STORAGE_KEY = 'sample2048_swipe_tutorial_done_v1';

const DIRECTION_LABELS: Record<ActiveGameMoveDirection, string> = {
  up: '上',
  down: '下',
  left: '左',
  right: '右',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const GameScreen: React.FC<GameScreenProps> = ({
  playerInfo,
  inventory,
  onGoBack,
  onUpdateScore,
  onUseItemFromGame,
  onModifyCurrency: _onModifyCurrency,
  savedSnapshot,
  onSaveGameState,
  onRecordMove,
  onRecordMerge,
  onRecordScore,
  onRecordItemUsed,
  onGameOver,
  onResetRound,
}) => {
  const { width: viewportWidth, height: viewportHeight, layoutMode, isPortrait, renderScale } = usePreviewViewport();
  const [roundState, setRoundState] = useState<ActiveGameState>(() => {
    return activeGame.module.createInitialState(savedSnapshot || undefined);
  });
  const [activeItemMode, setActiveItemMode] = useState<ItemType | null>(null);
  const [hintMessage, setHintMessage] = useState<HintMessageState | null>(null);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const [boardFeedbackState, setBoardFeedbackState] = useState<BoardFeedbackState>('idle');
  const [directionPreview, setDirectionPreview] = useState<DirectionPreviewState | null>(null);
  const [feedbackChip, setFeedbackChip] = useState<FeedbackChipState | null>(null);
  const [rewardFlights, setRewardFlights] = useState<RewardFlightState[]>([]);
  const [showTutorial, setShowTutorial] = useState(() => {
    if (savedSnapshot && savedSnapshot.board.length > 0) return false;
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'done';
  });
  const [tutorialFocusRect, setTutorialFocusRect] = useState<FocusRect | null>(null);
  const isCompact = layoutMode === 'compact';
  const isTall = layoutMode === 'tall';
  const isLandscape = layoutMode === 'landscape';
  const boardSize = useMemo(() => {
    if (!isPortrait) {
      return clamp(Math.min(viewportHeight - 210, viewportWidth * 0.4), 240, 360);
    }

    if (layoutMode === 'tablet') {
      return clamp(Math.min(viewportWidth - 40, viewportHeight * 0.42), 320, 480);
    }

    if (isTall) {
      return clamp(Math.min(viewportWidth - 28, viewportHeight * 0.38), 300, 420);
    }

    if (isCompact) {
      return clamp(Math.min(viewportWidth - 18, viewportHeight * 0.48), 250, 340);
    }

    return clamp(Math.min(viewportWidth - 24, viewportHeight * 0.44), 280, 390);
  }, [isCompact, isPortrait, isTall, layoutMode, viewportHeight, viewportWidth]);

  const boardRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const scoreAnchorRef = useRef<HTMLDivElement>(null);
  const coinsTargetRef = useRewardFlightTarget('wallet-coins');
  const diamondsTargetRef = useRewardFlightTarget('wallet-diamonds');
  const initializedRef = useRef(false);
  const roundMetricsRef = useRef({ moves: 0, bestTile: 0, itemsUsed: 0 });
  const pointerGestureRef = useRef<PointerGestureState | null>(null);
  const timersRef = useRef<number[]>([]);
  const board = roundState.board;
  const score = roundState.score;
  const history = roundState.history;
  const isGameOver = roundState.status === 'lost';
  const isSuccess = roundState.status === 'won';

  const registerTimer = useCallback((timer: number) => {
    timersRef.current.push(timer);
    return timer;
  }, []);

  const queueTransientState = useCallback(
    (clear: () => void, delayMs: number) => {
      registerTimer(window.setTimeout(clear, delayMs));
    },
    [registerTimer],
  );

  const showFeedback = useCallback(
    (text: string, tone: FeedbackTone, durationMs = 980) => {
      const id = Date.now() + Math.random();
      setFeedbackChip({ id, text, tone });
      queueTransientState(() => {
        setFeedbackChip((current) => (current?.id === id ? null : current));
      }, durationMs);
    },
    [queueTransientState],
  );

  const pulseBoard = useCallback(
    (tone: BoardFeedbackState, durationMs = 320) => {
      setBoardFeedbackState(tone);
      queueTransientState(() => setBoardFeedbackState('idle'), durationMs);
    },
    [queueTransientState],
  );

  const clearDirectionPreviewSoon = useCallback(
    (delayMs = 160) => {
      queueTransientState(() => setDirectionPreview(null), delayMs);
    },
    [queueTransientState],
  );

  const completeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'done');
    setShowTutorial(false);
  }, []);

  const toLogicalRect = useCallback(
    (rect: DOMRect) => {
      const screenRect = screenRef.current?.getBoundingClientRect();
      if (!screenRect || renderScale <= 0) return null;

      return {
        left: (rect.left - screenRect.left) / renderScale,
        top: (rect.top - screenRect.top) / renderScale,
        width: rect.width / renderScale,
        height: rect.height / renderScale,
      };
    },
    [renderScale],
  );

  const toLogicalPoint = useCallback(
    (x: number, y: number) => {
      const screenRect = screenRef.current?.getBoundingClientRect();
      if (!screenRect || renderScale <= 0) return null;

      return {
        x: (x - screenRect.left) / renderScale,
        y: (y - screenRect.top) / renderScale,
      };
    },
    [renderScale],
  );

  const updateTutorialFocus = useCallback(() => {
    if (!showTutorial || !boardRef.current) return;
    const rect = toLogicalRect(boardRef.current.getBoundingClientRect());
    if (!rect) return;
    setTutorialFocusRect({
      left: rect.left - 10,
      top: rect.top - 10,
      width: rect.width + 20,
      height: rect.height + 20,
    });
  }, [showTutorial, toLogicalRect]);

  useEffect(() => {
    updateTutorialFocus();
    if (!showTutorial) return;

    const syncFocus = () => updateTutorialFocus();
    window.addEventListener('resize', syncFocus);
    window.addEventListener('scroll', syncFocus, true);
    return () => {
      window.removeEventListener('resize', syncFocus);
      window.removeEventListener('scroll', syncFocus, true);
    };
  }, [boardSize, board.length, showTutorial, updateTutorialFocus]);

  const launchRewardFlights = useCallback(
    (mergedTiles: Tile[]) => {
      const boardRect = boardRef.current?.getBoundingClientRect();
      const scoreRect = scoreAnchorRef.current?.getBoundingClientRect();
      if (!boardRect || !scoreRect || mergedTiles.length === 0) return;

      const boardLocalRect = toLogicalRect(boardRect);
      const scoreLocalPoint = toLogicalPoint(
        scoreRect.left + scoreRect.width / 2,
        scoreRect.top + scoreRect.height / 2,
      );
      if (!boardLocalRect || !scoreLocalPoint) return;

      const { border, padding, cellSize, gridSpacing } = getBoardMetrics(boardLocalRect.width);
      const toX = scoreLocalPoint.x;
      const toY = scoreLocalPoint.y;
      const flights = mergedTiles.slice(0, 3).map((tile, index) => {
        const fromX = boardLocalRect.left + border + padding + tile.col * gridSpacing + cellSize / 2;
        const fromY = boardLocalRect.top + border + padding + tile.row * gridSpacing + cellSize / 2;
        const midX = fromX + (toX - fromX) * 0.38;
        const midY = Math.min(fromY, toY) - Math.max(48, Math.abs(toX - fromX) * 0.1);
        const id = Date.now() + index + Math.random();

        return {
          id,
          value: tile.value,
          fromX,
          fromY,
          midX,
          midY,
          toX,
          toY,
          delayMs: index * 70,
        };
      });

      setRewardFlights((current) => [...current, ...flights]);
      flights.forEach((flight) => {
        queueTransientState(() => {
          setRewardFlights((current) => current.filter((item) => item.id !== flight.id));
        }, flight.delayMs + 780);
      });
    },
    [queueTransientState, toLogicalPoint, toLogicalRect],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  // Initialize Board — only once on mount
  useEffect(() => {
    if (savedSnapshot && savedSnapshot.board.length > 0 && !initializedRef.current) {
      initializedRef.current = true;
      const nextState = activeGame.module.createInitialState(savedSnapshot);
      roundMetricsRef.current.bestTile = activeGame.getBoardBestTile(nextState.board);
      setRoundState(nextState);
    } else if (!initializedRef.current) {
      initializedRef.current = true;
      resetGame();
    }
  }, []);

  // Keep save synced when board or score changes
  useEffect(() => {
    if (board.length > 0) {
      onSaveGameState(activeGame.module.toSnapshot(roundState));
    }
  }, [roundState, board.length]);

  const resetGame = () => {
    const nextState = activeGame.module.createInitialState();
    setRoundState(nextState);
    onUpdateScore(0);
    setHintMessage(null);
    setActiveItemMode(null);
    setDirectionPreview(null);
    setRewardFlights([]);
    setFeedbackChip(null);
    setBoardFeedbackState('idle');
    roundMetricsRef.current = { moves: 0, bestTile: 0, itemsUsed: 0 };
    onResetRound();
    if (localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'done') {
      setShowTutorial(true);
      queueTransientState(updateTutorialFocus, 60);
    }
  };

  const completeRoundQuickly = (outcome: 'won' | 'lost') => {
    if (roundState.status !== 'playing') return;

    const liveBestTile = Math.max(roundMetricsRef.current.bestTile, activeGame.getBoardBestTile(board));
    const finalBestTile = outcome === 'won'
      ? Math.max(liveBestTile, activeGame.winThreshold)
      : Math.min(liveBestTile || 128, activeGame.winThreshold / 2);

    roundMetricsRef.current.bestTile = finalBestTile;
    setHintMessage(null);
    setActiveItemMode(null);
    setDirectionPreview(null);
    setFeedbackChip(null);
    setRewardFlights([]);
    setBoardFeedbackState('idle');
    completeTutorial();
    onGameOver(score, finalBestTile, roundMetricsRef.current.moves);
  };

  const attemptMove = useCallback(
    (direction: ActiveGameMoveDirection, source: InputSource) => {
      if (roundState.status !== 'playing' || activeItemMode === 'upgrade') return;

      setHintMessage(null);
      setDirectionPreview({
        direction,
        intensity: source === 'pointer' ? 1 : 0.75,
        source,
      });

      const result = activeGame.module.dispatch(roundState, { type: 'move', direction });
      if (!result.changed) {
        pulseBoard('invalid', 360);
        showFeedback(`这一滑没有变化，试试向${direction === 'left' || direction === 'right' ? '上' : '左'}。`, 'invalid', 1120);
        clearDirectionPreviewSoon(220);
        return;
      }

      const previousBestTile = activeGame.getBoardBestTile(board);
      const mergedTiles = result.state.board.filter((tile) => tile.isMerged);
      const mergeScore = result.metrics.mergedValues.reduce((sum, value) => sum + value, 0);

      setRoundState(result.state);
      onUpdateScore(result.metrics.score);

      roundMetricsRef.current.moves += 1;
      roundMetricsRef.current.bestTile = Math.max(roundMetricsRef.current.bestTile, result.metrics.bestTile);
      const moves = roundMetricsRef.current.moves;

      onRecordMove(moves, result.metrics.score, roundMetricsRef.current.bestTile);
      result.metrics.mergedValues.forEach((value) =>
        onRecordMerge(value, result.metrics.score, roundMetricsRef.current.bestTile, moves),
      );
      onRecordScore(result.metrics.score, roundMetricsRef.current.bestTile, moves);

      pulseBoard('success', 240);
      clearDirectionPreviewSoon(180);
      if (mergedTiles.length > 0) {
        launchRewardFlights(mergedTiles);
      }

      if (result.metrics.bestTile > previousBestTile) {
        showFeedback(`解锁 ${result.metrics.bestTile} 方块`, 'reward', 1180);
      } else if (mergeScore > 0) {
        showFeedback(`+${mergeScore} 分，继续向${DIRECTION_LABELS[direction]}推进`, 'reward', 980);
      } else {
        showFeedback(`向${DIRECTION_LABELS[direction]}整理棋盘`, 'success', 760);
      }

      if (showTutorial) {
        completeTutorial();
      }

      if (result.metrics.status !== 'playing') {
        onGameOver(result.metrics.score, roundMetricsRef.current.bestTile, moves);
      }
    },
    [
      activeItemMode,
      board,
      clearDirectionPreviewSoon,
      completeTutorial,
      launchRewardFlights,
      onGameOver,
      onRecordMerge,
      onRecordMove,
      onRecordScore,
      onUpdateScore,
      pulseBoard,
      roundState,
      showFeedback,
      showTutorial,
    ],
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        attemptMove('up', 'keyboard');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        attemptMove('down', 'keyboard');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        attemptMove('left', 'keyboard');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        attemptMove('right', 'keyboard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attemptMove]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (roundState.status !== 'playing' || activeItemMode === 'upgrade') return;

      pointerGestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        direction: null,
      };
      el.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const gesture = pointerGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const diffX = event.clientX - gesture.startX;
      const diffY = event.clientY - gesture.startY;
      const distance = Math.max(Math.abs(diffX), Math.abs(diffY));

      if (distance < GESTURE_THRESHOLD) {
        setDirectionPreview(null);
        return;
      }

      const direction: ActiveGameMoveDirection =
        Math.abs(diffX) > Math.abs(diffY)
          ? diffX > 0
            ? 'right'
            : 'left'
          : diffY > 0
            ? 'down'
            : 'up';

      gesture.direction = direction;
      setDirectionPreview({
        direction,
        intensity: clamp(distance / 96, 0.35, 1),
        source: 'pointer',
      });
      event.preventDefault();
    };

    const finalizePointer = (event: PointerEvent) => {
      const gesture = pointerGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const direction = gesture.direction;
      pointerGestureRef.current = null;
      el.releasePointerCapture?.(event.pointerId);

      if (direction) {
        attemptMove(direction, 'pointer');
      } else {
        setDirectionPreview(null);
      }
    };

    const cancelPointer = () => {
      pointerGestureRef.current = null;
      setDirectionPreview(null);
    };

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', finalizePointer);
    el.addEventListener('pointercancel', cancelPointer);

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', finalizePointer);
      el.removeEventListener('pointercancel', cancelPointer);
    };
  }, [activeItemMode, attemptMove, roundState.status]);

  // Item 1: Undo Operation
  const triggerUndo = () => {
    onUseItemFromGame('undo', () => {
      if (history.length === 0) {
        setAlertModal({ title: '提示', message: '没有可以撤回的记录哦，先走几步再试试吧！' });
        return false;
      }
      const result = activeGame.module.dispatch(roundState, { type: 'undo' });
      if (!result.changed) return false;
      setRoundState(result.state);
      onUpdateScore(result.metrics.score);
      onRecordItemUsed('booster_undo', roundMetricsRef.current.itemsUsed + 1, result.metrics.score, roundMetricsRef.current.bestTile, roundMetricsRef.current.moves);
      roundMetricsRef.current.itemsUsed += 1;
      pulseBoard('success', 220);
      showFeedback('已撤回上一步', 'success', 880);
      return true;
    });
  };

  // Item 2: Shuffle Operation
  const triggerShuffle = () => {
    onUseItemFromGame('shuffle', () => {
      const result = activeGame.module.dispatch(roundState, { type: 'shuffle' });
      if (!result.changed) return false;
      setRoundState(result.state);
      roundMetricsRef.current.itemsUsed += 1;
      onRecordItemUsed('booster_shuffle', roundMetricsRef.current.itemsUsed, score, roundMetricsRef.current.bestTile, roundMetricsRef.current.moves);
      pulseBoard('success', 260);
      showFeedback('棋盘已重新洗牌', 'reward', 980);
      return true;
    });
  };

  // Item 3: Hint recommendation
  const triggerHint = () => {
    onUseItemFromGame('hint', () => {
      const bestMove = activeGame.getBestMoveSuggestion(board);
      const dirMap: Record<string, string> = { up: '向上 ↑', down: '向下 ↓', left: '向左 ←', right: '向右 →' };
      const id = Date.now() + Math.random();
      setHintMessage({ id, text: `建议优先尝试【${bestMove ? dirMap[bestMove] : '向上 ↑'}】。` });
      queueTransientState(() => {
        setHintMessage((current) => (current?.id === id ? null : current));
      }, 1480);
      roundMetricsRef.current.itemsUsed += 1;
      onRecordItemUsed('booster_hint', roundMetricsRef.current.itemsUsed, score, roundMetricsRef.current.bestTile, roundMetricsRef.current.moves);
      showFeedback('提示已更新到顶部', 'guidance', 820);
      return true;
    });
  };

  // Item 4: Upgrade Potion
  const triggerUpgradeMode = () => {
    if (activeItemMode === 'upgrade') {
      setActiveItemMode(null);
      setFeedbackChip(null);
      return;
    }
    setActiveItemMode('upgrade');
    showFeedback('选择一个方块，立即翻倍', 'guidance', 1200);
  };

  const handleTileClickForUpgrade = (clickedTile: Tile) => {
    if (activeItemMode !== 'upgrade') return;
    onUseItemFromGame('upgrade', () => {
      const result = activeGame.module.dispatch(roundState, { type: 'upgrade', tileId: clickedTile.id });
      if (!result.changed) return false;
      setRoundState(result.state);
      setActiveItemMode(null);
      roundMetricsRef.current.itemsUsed += 1;
      onRecordItemUsed('booster_wild', roundMetricsRef.current.itemsUsed, score, roundMetricsRef.current.bestTile, roundMetricsRef.current.moves);
      pulseBoard('success', 260);
      showFeedback(`${clickedTile.value} 已升级到 ${clickedTile.value * 2}`, 'reward', 1080);
      launchRewardFlights(
        result.state.board.filter((tile) => tile.id === clickedTile.id && tile.isMerged)
      );
      if (result.metrics.status !== 'playing') {
        roundMetricsRef.current.bestTile = Math.max(roundMetricsRef.current.bestTile, result.metrics.bestTile);
        onGameOver(result.metrics.score, roundMetricsRef.current.bestTile, roundMetricsRef.current.moves);
      }
      return true;
    });
  };

  return (
    <div ref={screenRef} className={`w-full h-full flex flex-col justify-between bg-[#FFE8C2] overflow-hidden select-none relative font-sans ${isLandscape ? 'p-3' : isCompact ? 'p-3' : 'p-4'}`}>
      
      {/* Top action row exactly like Frame 2 */}
      <div className={`flex items-start justify-between w-full z-10 ${isCompact ? 'gap-2' : 'gap-3'}`}>
        
        {/* Navigations buttons */}
        <div className="flex items-center gap-2">
          {/* Back btn */}
          <button
            onClick={onGoBack}
            className="rounded-[18px] border border-[rgba(83,101,122,0.14)] bg-white p-2 text-[var(--shell-ink)] shadow-[0_10px_18px_rgba(38,54,72,0.08)] transition-all hover:brightness-[1.02] active:scale-[0.99]"
            id="game-back-btn"
          >
            <ArrowLeft className="w-5 h-5 stroke-[3]" />
          </button>

          {/* Reset */}
          <button
            onClick={resetGame}
            className="rounded-[18px] border border-[rgba(83,101,122,0.14)] bg-white p-2 text-[var(--shell-ink)] shadow-[0_10px_18px_rgba(38,54,72,0.08)] transition-all hover:brightness-[1.02] active:scale-[0.99]"
            id="game-reset-btn"
            title="重新开局"
          >
            <RotateCw className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        <RoundStatusPanel
          scoreAnchorRef={scoreAnchorRef}
          score={score}
          highScore={Math.max(score, playerInfo.highScore)}
          disabled={roundState.status !== 'playing'}
          onQuickWin={() => completeRoundQuickly('won')}
          onQuickLose={() => completeRoundQuickly('lost')}
        />
      </div>

      {/* Currency panel */}
      <div className={`flex items-center justify-end select-none z-10 ${isCompact ? 'mt-1 gap-1.5' : 'mt-1.5 gap-2.5'}`}>
        <div ref={coinsTargetRef} className={`bg-white border border-[rgba(83,101,122,0.14)] rounded-full flex items-center gap-1.5 font-extrabold text-[var(--shell-ink)] shadow-[0_8px_16px_rgba(38,54,72,0.08)] ${isCompact ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1 text-[13px]'}`}>
          <GameResourceIcon kind="coins" size={isCompact ? 16 : 18} />
          <span>{playerInfo.coins.toLocaleString()}</span>
        </div>
        <div ref={diamondsTargetRef} className={`bg-white border border-[rgba(83,101,122,0.14)] rounded-full flex items-center gap-1.5 font-extrabold text-[var(--shell-ink)] shadow-[0_8px_16px_rgba(38,54,72,0.08)] ${isCompact ? 'px-2.5 py-1 text-[12px]' : 'px-3 py-1 text-[13px]'}`}>
          <GameResourceIcon kind="diamonds" size={isCompact ? 16 : 18} />
          <span>{playerInfo.diamonds}</span>
        </div>
      </div>

      <activeGame.view
        boardRef={boardRef}
        boardSize={boardSize}
        board={board}
        inventory={inventory}
        activeItemMode={activeItemMode}
        boardFeedbackState={boardFeedbackState}
        directionPreview={
          directionPreview
            ? { direction: directionPreview.direction, intensity: directionPreview.intensity }
            : null
        }
        showTutorial={showTutorial}
        statusBanner={
          activeItemMode === 'upgrade' ? (
            <span className="status-chip-pop max-w-[78%] rounded-full border border-[rgba(255,255,255,0.7)] bg-[rgba(226,55,68,0.96)] px-3.5 py-1 text-[10px] font-black text-white shadow-[0_12px_24px_rgba(113,22,31,0.22)] pulse-animation">
              点击任意方块，立即翻倍升级
            </span>
          ) : directionPreview ? (
            <span
              key={`${directionPreview.direction}-${directionPreview.source}`}
              className="status-chip-pop max-w-[78%] rounded-full border border-[rgba(83,101,122,0.12)] bg-[rgba(255,255,255,0.96)] px-3.5 py-1 text-[10px] font-black text-[var(--shell-ink)] shadow-[0_12px_24px_rgba(38,54,72,0.12)]"
            >
              准备向{DIRECTION_LABELS[directionPreview.direction]}滑动
            </span>
          ) : hintMessage ? (
            <span
              key={hintMessage.id}
              className="status-bubble-float-fade max-w-[82%] rounded-full border border-[rgba(92,141,246,0.18)] bg-[rgba(238,244,255,0.97)] px-3.5 py-1 text-[10px] font-black text-[var(--shell-accent)] shadow-[0_12px_24px_rgba(38,54,72,0.12)]"
            >
              {hintMessage.text}
            </span>
          ) : feedbackChip ? (
            <span
              key={feedbackChip.id}
              className="status-bubble-float-fade max-w-[82%] rounded-full border px-3.5 py-1 text-[10px] font-black shadow-[0_12px_24px_rgba(38,54,72,0.12)]"
              style={{
                background:
                  feedbackChip.tone === 'invalid'
                    ? '#ffd8d3'
                    : feedbackChip.tone === 'reward'
                      ? '#fff0b7'
                      : feedbackChip.tone === 'guidance'
                        ? '#e3f5ff'
                        : '#e6f8dc',
                color:
                  feedbackChip.tone === 'invalid'
                    ? '#9d352f'
                    : feedbackChip.tone === 'reward'
                      ? '#8a5a16'
                      : feedbackChip.tone === 'guidance'
                        ? '#265f8a'
                        : '#3f6d29',
                borderColor:
                  feedbackChip.tone === 'invalid'
                    ? '#d16e66'
                    : '#78350F',
              }}
            >
              {feedbackChip.text}
            </span>
          ) : null
        }
        onTileUpgrade={handleTileClickForUpgrade}
        onTriggerUndo={triggerUndo}
        onTriggerShuffle={triggerShuffle}
        onTriggerHint={triggerHint}
        onTriggerUpgradeMode={triggerUpgradeMode}
      />

      {showTutorial && tutorialFocusRect ? (
        <div className="pointer-events-none absolute inset-0 z-[70]">
          <div
            className="absolute rounded-[32px] border-2 border-[#fff7cf] bg-transparent shadow-[0_0_0_9999px_rgba(38,25,12,0.44)] tutorial-focus"
            style={tutorialFocusRect}
          />
          <div
            className="absolute max-w-[220px] rounded-[22px] border-2 border-[var(--shell-bark)] bg-[linear-gradient(180deg,#fff7dd_0%,#fff0bd_100%)] px-4 py-3 text-[12px] font-black leading-relaxed text-[var(--shell-ink)] shadow-[0_5px_0_var(--shell-shadow)]"
            style={{
              left: tutorialFocusRect.left,
              top: Math.max(18, tutorialFocusRect.top - 88),
            }}
          >
            先学一个动作：在棋盘上轻扫任意方向，先把方块推起来。
          </div>
        </div>
      ) : null}

      {rewardFlights.map((flight) => (
        <div
          key={flight.id}
          className="reward-flight z-[75]"
          style={
            {
              '--flight-delay': `${flight.delayMs}ms`,
              '--flight-duration': '720ms',
              '--from-x': `${flight.fromX}px`,
              '--from-y': `${flight.fromY}px`,
              '--mid-x': `${flight.midX}px`,
              '--mid-y': `${flight.midY}px`,
              '--to-x': `${flight.toX}px`,
              '--to-y': `${flight.toY}px`,
            } as React.CSSProperties
          }
        >
          <span className="rounded-full border-2 border-[var(--shell-bark)] bg-[linear-gradient(180deg,#fff2b7_0%,#ffc965_100%)] px-2.5 py-1 text-[11px] font-black text-[var(--shell-ink)] shadow-[0_3px_0_var(--shell-shadow)]">
            +{flight.value}
          </span>
        </div>
      ))}

      {/* Alert modal — replaces native alert() */}
      <AlertModal
        isOpen={alertModal !== null}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title ?? ''}
        message={alertModal?.message ?? ''}
      />

      {/* Success modal */}
      <AlertModal
        isOpen={isSuccess}
        title="目标达成"
        message="你已经完成这一轮示例目标。"
        actions={[
          { label: '回到首页', onClick: onGoBack, variant: 'secondary' },
          { label: '再来一局', onClick: resetGame, variant: 'primary' },
        ]}
      />

      {/* Game over modal */}
      <AlertModal
        isOpen={isGameOver && !isSuccess}
        title="本轮结束"
        message={`本轮得分：${score}`}
        actions={[
          ...(inventory.undo > 0 ? [{ label: `撤销 (x${inventory.undo})`, onClick: triggerUndo, variant: 'blue' as const }] : []),
          { label: '再来一局', onClick: resetGame, variant: 'primary' },
        ]}
      />
    </div>
  );
};
