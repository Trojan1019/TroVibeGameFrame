import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, RotateCw } from 'lucide-react';

import { activeGame, type ActiveGameSnapshot, type ActiveGameState } from '../games/registry';
import { buildAimPreviewPath, getActivePet } from '../games/pinballPet/module';
import { AIM_MAX, AIM_MIN } from '../games/pinballPet/board';
import { createDynamicLaunchPlan, createPinballBoardLayout, type PinballRuntimeFrame, type PinballRuntimePlan } from '../games/pinballPet/runtime';
import type { ItemInventory, ItemType, PlayerInfo } from '../types';
import { AlertModal } from './AlertModal';
import { RoundStatusPanel } from './RoundStatusPanel';
import { usePreviewViewport } from './dev/PreviewViewport';
import { GameResourceIcon } from './shell/GameResourceIcon';

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
  onGameOver: (summary: { outcome: 'won' | 'lost'; score: number; bestTile: number; moves: number }) => void;
  onResetRound: () => void;
}

interface StatusMessage {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'warning';
}

interface PointerGestureState {
  pointerId: number;
}

const FRAME_MS = 1000 / 60;
const TUTORIAL_STORAGE_KEY = 'pinball_pet_launch_tutorial_v1';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('button, input, select, textarea, a, [role="button"]'));
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
  const { width: viewportWidth, height: viewportHeight, layoutMode, isPortrait } = usePreviewViewport();
  const isCompact = layoutMode === 'compact';
  const isTall = layoutMode === 'tall';
  const isLandscape = layoutMode === 'landscape';
  const prefersLayeredStage = activeGame.id === 'pinball-pet';
  const boardSize = useMemo(() => {
    if (prefersLayeredStage) {
      if (!isPortrait) {
        return clamp(viewportWidth - 24, 320, 520);
      }
      return clamp(viewportWidth - 12, 332, 430);
    }

    if (!isPortrait) {
      return clamp(Math.min(viewportHeight - 260, viewportWidth * 0.42), 250, 390);
    }
    if (layoutMode === 'tablet') {
      return clamp(Math.min(viewportWidth - 46, viewportHeight * 0.42), 340, 500);
    }
    if (isTall) {
      return clamp(Math.min(viewportWidth - 28, viewportHeight * 0.35), 310, 430);
    }
    if (isCompact) {
      return clamp(Math.min(viewportWidth - 20, viewportHeight * 0.42), 270, 360);
    }
    return clamp(Math.min(viewportWidth - 24, viewportHeight * 0.38), 290, 400);
  }, [isCompact, isPortrait, isTall, layoutMode, prefersLayeredStage, viewportHeight, viewportWidth]);
  const boardHeight = useMemo(() => {
    if (prefersLayeredStage) {
      if (!isPortrait) {
        return clamp(viewportHeight - 24, 360, 700);
      }
      if (layoutMode === 'tablet') {
        return clamp(viewportHeight - 18, 720, 1080);
      }
      if (isTall) {
        return clamp(viewportHeight - 12, 740, 980);
      }
      if (isCompact) {
        return clamp(viewportHeight - 10, 620, 860);
      }
      return clamp(viewportHeight - 12, 680, 920);
    }

    return createPinballBoardLayout(boardSize).boardHeight;
  }, [boardSize, isCompact, isPortrait, isTall, layoutMode, prefersLayeredStage, viewportHeight]);

  const [roundState, setRoundState] = useState<ActiveGameState>(() => {
    return activeGame.module.createInitialState(activeGame.hasSavedSnapshot(savedSnapshot) ? savedSnapshot : undefined);
  });
  const [aimAngle, setAimAngle] = useState(roundState.aimAngle);
  const [hintAngle, setHintAngle] = useState<number | null>(null);
  const [runtimeFrame, setRuntimeFrame] = useState<PinballRuntimeFrame | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    if (activeGame.hasSavedSnapshot(savedSnapshot)) return false;
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'done';
  });

  const boardRef = useRef<HTMLDivElement>(null);
  const scoreAnchorRef = useRef<HTMLDivElement>(null);
  const pointerGestureRef = useRef<PointerGestureState | null>(null);
  const gameOverHandledRef = useRef(false);
  const itemUseCountRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const runtimeRunRef = useRef<{ plan: PinballRuntimePlan; startMs: number; rafId: number | null } | null>(null);

  const isSimulating = runtimeRunRef.current !== null;
  const previewPath = useMemo(
    () => (runtimeFrame ? [] : buildAimPreviewPath(aimAngle, boardSize, boardHeight)),
    [aimAngle, boardHeight, boardSize, runtimeFrame],
  );
  const hintPreviewPath = useMemo(
    () => buildAimPreviewPath(hintAngle ?? aimAngle, boardSize, boardHeight),
    [aimAngle, boardHeight, boardSize, hintAngle],
  );
  const displayedScore = runtimeFrame?.score ?? roundState.score;
  const activePet = useMemo(() => getActivePet(roundState), [roundState]);

  const queueTimer = useCallback((callback: () => void, delayMs: number) => {
    const timer = window.setTimeout(callback, delayMs);
    timersRef.current.push(timer);
  }, []);

  const pushStatusMessage = useCallback(
    (text: string, tone: StatusMessage['tone'] = 'info', durationMs = 1500) => {
      const id = Date.now() + Math.random();
      setStatusMessage({ id, text, tone });
      queueTimer(() => {
        setStatusMessage((current) => (current?.id === id ? null : current));
      }, durationMs);
    },
    [queueTimer],
  );

  const persistPlayingState = useCallback(
    (state: ActiveGameState) => {
      onSaveGameState(activeGame.module.toSnapshot(state));
      onUpdateScore(state.score);
    },
    [onSaveGameState, onUpdateScore],
  );

  const finishRoundOnce = useCallback(
    (state: ActiveGameState, outcome: 'won' | 'lost') => {
      if (gameOverHandledRef.current) return;
      gameOverHandledRef.current = true;
      onGameOver({
        outcome,
        score: state.score,
        bestTile: state.bestCombo,
        moves: state.roundIndex,
      });
    },
    [onGameOver],
  );

  const clearRuntimeRun = useCallback(() => {
    const activeRun = runtimeRunRef.current;
    if (!activeRun) return;
    if (activeRun.rafId !== null) {
      window.cancelAnimationFrame(activeRun.rafId);
    }
    runtimeRunRef.current = null;
    setRuntimeFrame(null);
  }, []);

  const resetRound = useCallback(() => {
    clearRuntimeRun();
    const nextState = activeGame.module.createInitialState();
    gameOverHandledRef.current = false;
    itemUseCountRef.current = 0;
    setHintAngle(null);
    setAimAngle(nextState.aimAngle);
    setRoundState(nextState);
    onResetRound();
    persistPlayingState(nextState);
    pushStatusMessage('已重置为新的波次战场', 'info');
  }, [clearRuntimeRun, onResetRound, persistPlayingState, pushStatusMessage]);

  const completeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'done');
    setShowTutorial(false);
  }, []);

  const resolveAngleFromPointer = useCallback((clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const layout = createPinballBoardLayout(boardSize, boardHeight);
    const originX = rect.left + layout.launchX;
    const originY = rect.top + layout.launchSocketY;
    const radians = Math.atan2(clientY - originY, clientX - originX);
    const angle = (radians * 180) / Math.PI;
    return clamp(angle, AIM_MIN, AIM_MAX);
  }, [boardHeight, boardSize]);

  const applyRoundState = useCallback(
    (nextState: ActiveGameState) => {
      setRoundState(nextState);
      setAimAngle(nextState.aimAngle);
      onUpdateScore(nextState.score);
      if (nextState.status === 'playing') {
        persistPlayingState(nextState);
      }
    },
    [onUpdateScore, persistPlayingState],
  );

  const completeDynamicPlan = useCallback(
    (plan: PinballRuntimePlan) => {
      clearRuntimeRun();
      setHintAngle(null);
      applyRoundState(plan.finalState);
      onRecordMove(plan.metrics.rounds, plan.metrics.score, plan.metrics.bestCombo);
      onRecordMerge(plan.metrics.bestCombo, plan.metrics.score, plan.metrics.bestCombo, plan.metrics.rounds);
      onRecordScore(plan.metrics.score, plan.metrics.bestCombo, plan.metrics.rounds);

      if (plan.metrics.status === 'won') {
        pushStatusMessage('Boss 波次已被清空', 'success');
        finishRoundOnce(plan.finalState, 'won');
        return;
      }
      if (plan.metrics.status === 'lost') {
        pushStatusMessage('敌群突破防线，本轮结束', 'warning');
        finishRoundOnce(plan.finalState, 'lost');
        return;
      }
      if (plan.metrics.defeatedEnemies > 0) {
        pushStatusMessage(`击破 ${plan.metrics.defeatedEnemies} 个目标，最高连击 ${plan.metrics.bestCombo}`, 'success');
      } else if (plan.metrics.gainedBalls > 0) {
        pushStatusMessage(`回收弹球 +${plan.metrics.gainedBalls}`, 'info');
      } else {
        pushStatusMessage('弹球已回收，敌群准备下压', 'info');
      }
    },
    [applyRoundState, clearRuntimeRun, finishRoundOnce, onRecordMerge, onRecordMove, onRecordScore, pushStatusMessage],
  );

  const startDynamicLaunch = useCallback(
    (angle: number) => {
      if (runtimeRunRef.current || roundState.status !== 'playing') return false;

      const plan = createDynamicLaunchPlan(roundState, angle, boardSize, boardHeight);
      if (plan.frames.length === 0) return false;

      if (showTutorial) completeTutorial();

      runtimeRunRef.current = {
        plan,
        startMs: 0,
        rafId: null,
      };
      setRuntimeFrame(plan.frames[0]);
      setHintAngle(null);

      const step = (timestamp: number) => {
        const activeRun = runtimeRunRef.current;
        if (!activeRun) return;
        if (activeRun.startMs === 0) {
          activeRun.startMs = timestamp;
        }

        const elapsedMs = timestamp - activeRun.startMs;
        const frameIndex = Math.min(activeRun.plan.frames.length - 1, Math.floor(elapsedMs / FRAME_MS));
        setRuntimeFrame(activeRun.plan.frames[frameIndex]);

        if (frameIndex >= activeRun.plan.frames.length - 1) {
          completeDynamicPlan(activeRun.plan);
          return;
        }

        activeRun.rafId = window.requestAnimationFrame(step);
      };

      runtimeRunRef.current.rafId = window.requestAnimationFrame(step);
      return true;
    },
    [boardHeight, boardSize, completeDynamicPlan, completeTutorial, roundState, showTutorial],
  );

  const applyAction = useCallback(
    (
      action:
        | { type: 'use-item'; item: 'undo' | 'shuffle' | 'upgrade' }
        | { type: 'switch-active-pet' }
        | { type: 'use-skill' }
        | { type: 'debug-force-win' }
        | { type: 'debug-force-lose' },
      options?: { itemCode?: string; successMessage?: string; emptyMessage?: string },
    ) => {
      if (runtimeRunRef.current && action.type !== 'debug-force-win' && action.type !== 'debug-force-lose') {
        if (options?.emptyMessage) pushStatusMessage(options.emptyMessage, 'warning');
        return false;
      }

      const result = activeGame.module.dispatch(roundState, action);
      if (!result.changed) {
        if (options?.emptyMessage) pushStatusMessage(options.emptyMessage, 'warning');
        return false;
      }

      if (options?.itemCode) {
        itemUseCountRef.current += 1;
        onRecordItemUsed(
          options.itemCode,
          itemUseCountRef.current,
          result.metrics.score,
          result.metrics.bestCombo,
          result.metrics.rounds,
        );
      }

      if (action.type === 'debug-force-win' || action.type === 'debug-force-lose') {
        clearRuntimeRun();
      }

      if (options?.successMessage) {
        pushStatusMessage(options.successMessage, 'info');
      }

      setHintAngle(null);
      applyRoundState(result.state);

      if (result.metrics.status === 'won' || result.metrics.status === 'lost') {
        finishRoundOnce(result.state, activeGame.resolveRoundOutcome(result.metrics.status));
      }

      return true;
    },
    [applyRoundState, clearRuntimeRun, finishRoundOnce, onRecordItemUsed, pushStatusMessage, roundState],
  );

  const handleLaunch = useCallback(
    (angle: number) => {
      return startDynamicLaunch(angle);
    },
    [startDynamicLaunch],
  );

  const handleQuickOutcome = useCallback(
    (outcome: 'won' | 'lost') => {
      applyAction(
        { type: outcome === 'won' ? 'debug-force-win' : 'debug-force-lose' },
        { successMessage: outcome === 'won' ? '已走胜利结算' : '已走失败结算' },
      );
    },
    [applyAction],
  );

  const guardSimulation = useCallback(() => {
    if (!runtimeRunRef.current) return false;
    pushStatusMessage('弹球仍在回收，请等本轮结束', 'warning');
    return true;
  }, [pushStatusMessage]);

  const handleUndo = useCallback(() => {
    if (guardSimulation()) return;
    onUseItemFromGame('undo', () =>
      applyAction(
        { type: 'use-item', item: 'undo' },
        {
          itemCode: 'booster_undo',
          successMessage: '已回溯上一轮发射结果',
          emptyMessage: '当前没有可回溯的上一轮记录',
        },
      ),
    );
  }, [applyAction, guardSimulation, onUseItemFromGame]);

  const handleShuffle = useCallback(() => {
    if (guardSimulation()) return;
    onUseItemFromGame('shuffle', () =>
      applyAction(
        { type: 'use-item', item: 'shuffle' },
        {
          itemCode: 'booster_shuffle',
          successMessage: '敌方站位已被打乱',
          emptyMessage: '当前无法洗位',
        },
      ),
    );
  }, [applyAction, guardSimulation, onUseItemFromGame]);

  const handleHint = useCallback(() => {
    if (guardSimulation()) return;
    if (roundState.status !== 'playing') {
      pushStatusMessage('本轮已经结束，无法继续预判', 'warning');
      return;
    }

    onUseItemFromGame('hint', () => {
      const bestAngle = activeGame.getBestLaunchAngle(roundState);
      itemUseCountRef.current += 1;
      setHintAngle(bestAngle);
      onRecordItemUsed(
        'booster_hint',
        itemUseCountRef.current,
        roundState.score,
        roundState.bestCombo,
        roundState.roundIndex,
      );
      pushStatusMessage(`推荐角度 ${bestAngle}°，拖拽瞄准线后松手发射`, 'info', 2200);
      return true;
    });
  }, [guardSimulation, onRecordItemUsed, onUseItemFromGame, pushStatusMessage, roundState]);

  const handleUpgrade = useCallback(() => {
    if (guardSimulation()) return;
    onUseItemFromGame('upgrade', () =>
      applyAction(
        { type: 'use-item', item: 'upgrade' },
        {
          itemCode: 'booster_wild',
          successMessage: '下次发射已切换为过载模式',
          emptyMessage: '过载已准备完毕',
        },
      ),
    );
  }, [applyAction, guardSimulation, onUseItemFromGame]);

  const handleSwitchActivePet = useCallback(() => {
    if (guardSimulation()) return;
    applyAction(
      { type: 'switch-active-pet' },
      {
        successMessage: `已切换为 ${activePet?.id === roundState.activePetId ? (roundState.pets.find((pet) => pet.id !== roundState.activePetId)?.name ?? '另一只精灵') : '另一只精灵'}`,
        emptyMessage: '当前无法切换出战精灵',
      },
    );
  }, [activePet?.id, applyAction, guardSimulation, roundState.activePetId, roundState.pets]);

  const handleSkill = useCallback(() => {
    if (guardSimulation()) return;
    if (roundState.energy < 3) {
      pushStatusMessage('能量不足 3，暂时无法释放队长技能', 'warning');
      return;
    }
    applyAction(
      { type: 'use-skill' },
      {
        successMessage: `${activePet?.skillName ?? '主动技'} 已蓄力，下一轮发射强化生效`,
        emptyMessage: '当前无法释放技能',
      },
    );
  }, [activePet?.skillName, applyAction, guardSimulation, pushStatusMessage, roundState.energy]);

  useEffect(() => {
    persistPlayingState(roundState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      clearRuntimeRun();
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, [clearRuntimeRun]);

  useEffect(() => {
    const boardElement = boardRef.current;
    if (!boardElement) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (roundState.status !== 'playing' || runtimeRunRef.current) return;
      if (isInteractiveTarget(event.target)) return;
      const angle = resolveAngleFromPointer(event.clientX, event.clientY);
      if (angle === null) return;
      pointerGestureRef.current = { pointerId: event.pointerId };
      boardElement.setPointerCapture(event.pointerId);
      setHintAngle(null);
      setAimAngle(angle);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (pointerGestureRef.current?.pointerId !== event.pointerId) return;
      const angle = resolveAngleFromPointer(event.clientX, event.clientY);
      if (angle === null) return;
      setAimAngle(angle);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (pointerGestureRef.current?.pointerId !== event.pointerId) return;
      const angle = resolveAngleFromPointer(event.clientX, event.clientY) ?? aimAngle;
      pointerGestureRef.current = null;
      if (boardElement.hasPointerCapture(event.pointerId)) {
        boardElement.releasePointerCapture(event.pointerId);
      }
      handleLaunch(angle);
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (pointerGestureRef.current?.pointerId !== event.pointerId) return;
      pointerGestureRef.current = null;
      if (boardElement.hasPointerCapture(event.pointerId)) {
        boardElement.releasePointerCapture(event.pointerId);
      }
    };

    boardElement.addEventListener('pointerdown', handlePointerDown);
    boardElement.addEventListener('pointermove', handlePointerMove);
    boardElement.addEventListener('pointerup', handlePointerUp);
    boardElement.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      boardElement.removeEventListener('pointerdown', handlePointerDown);
      boardElement.removeEventListener('pointermove', handlePointerMove);
      boardElement.removeEventListener('pointerup', handlePointerUp);
      boardElement.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [aimAngle, handleLaunch, resolveAngleFromPointer, roundState.status]);

  const statusBanner = showTutorial ? (
    <span className="max-w-[84%] rounded-full border border-[rgba(255,255,255,0.72)] bg-[rgba(61,39,19,0.9)] px-3.5 py-1 text-[10px] font-black text-[#fff3d8] shadow-[0_12px_24px_rgba(27,17,8,0.24)]">
      从顶部发射口向下拖拽瞄准，松手后释放整串弹球
    </span>
  ) : runtimeFrame ? (
    <span className="max-w-[84%] rounded-full border border-[rgba(255,255,255,0.5)] bg-[rgba(61,39,19,0.88)] px-3.5 py-1 text-[10px] font-black text-[#fff3d8] shadow-[0_12px_24px_rgba(27,17,8,0.24)]">
      弹球回收中，剩余 {runtimeFrame.balls.length} 颗在场
    </span>
  ) : hintAngle !== null ? (
    <span className="max-w-[84%] rounded-full border border-[rgba(92,141,246,0.18)] bg-[rgba(238,244,255,0.96)] px-3.5 py-1 text-[10px] font-black text-[var(--shell-accent)] shadow-[0_12px_24px_rgba(38,54,72,0.12)]">
      推荐轨迹 {hintAngle}°，虚线为预判路径
    </span>
  ) : statusMessage ? (
    <span
      key={statusMessage.id}
      className="max-w-[84%] rounded-full border px-3.5 py-1 text-[10px] font-black shadow-[0_12px_24px_rgba(38,54,72,0.12)]"
      style={{
        background:
          statusMessage.tone === 'warning'
            ? '#ffd8d3'
            : statusMessage.tone === 'success'
              ? '#e6f8dc'
              : '#e3f5ff',
        color:
          statusMessage.tone === 'warning'
            ? '#9d352f'
            : statusMessage.tone === 'success'
              ? '#3f6d29'
              : '#265f8a',
        borderColor: statusMessage.tone === 'warning' ? '#d16e66' : '#78350F',
      }}
    >
      {statusMessage.text}
    </span>
  ) : null;

  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden font-sans ${prefersLayeredStage ? 'bg-[#0c1220] p-1.5' : `bg-[#FFE8C2] ${isLandscape ? 'p-3' : isCompact ? 'p-3' : 'p-4'}`}`}>
      <div className={`pointer-events-none absolute inset-x-2 top-2 z-30 flex items-start justify-between ${isCompact ? 'gap-2' : 'gap-3'}`}>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => {
              clearRuntimeRun();
              onGoBack();
            }}
            className="rounded-[18px] border border-[rgba(83,101,122,0.14)] bg-white p-2 text-[var(--shell-ink)] shadow-[0_10px_18px_rgba(38,54,72,0.08)] transition-all active:scale-[0.99]"
            id="game-back-btn"
          >
            <ArrowLeft className="h-5 w-5 stroke-[3]" />
          </button>
          <button
            onClick={resetRound}
            className="rounded-[18px] border border-[rgba(83,101,122,0.14)] bg-white p-2 text-[var(--shell-ink)] shadow-[0_10px_18px_rgba(38,54,72,0.08)] transition-all active:scale-[0.99]"
            id="game-reset-btn"
            title="重新开局"
          >
            <RotateCw className="h-5 w-5 stroke-[3]" />
          </button>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <RoundStatusPanel
            scoreAnchorRef={scoreAnchorRef}
            score={displayedScore}
            highScore={Math.max(playerInfo.highScore, displayedScore)}
            coins={playerInfo.coins}
            diamonds={playerInfo.diamonds}
            disabled={roundState.status !== 'playing' || isSimulating}
            onQuickWin={() => handleQuickOutcome('won')}
            onQuickLose={() => handleQuickOutcome('lost')}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <activeGame.view
          boardRef={boardRef}
          boardSize={boardSize}
          boardHeight={boardHeight}
          state={roundState}
          statusBanner={statusBanner}
          inventory={inventory}
          aimAngle={aimAngle}
          previewPath={previewPath}
          hintPreviewPath={hintPreviewPath}
          hintAngle={hintAngle}
          runtimeFrame={runtimeFrame}
          isSimulating={isSimulating}
          onTriggerUndo={handleUndo}
          onTriggerShuffle={handleShuffle}
          onTriggerHint={handleHint}
          onTriggerUpgrade={handleUpgrade}
          onTriggerSkill={handleSkill}
          onSwitchActivePet={handleSwitchActivePet}
        />
      </div>

      <AlertModal
        isOpen={alertModal !== null}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title ?? ''}
        message={alertModal?.message ?? ''}
      />
    </div>
  );
};
