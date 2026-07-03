import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  GameResourceIcon,
  getGameResourceLabel,
  type GameResourceKind,
} from '../shell/GameResourceIcon';

type FlightPoint = { x: number; y: number };
type FlightSourceTarget = HTMLElement | DOMRect | FlightPoint | null;

export type RewardFlightTargetId =
  | 'wallet-coins'
  | 'wallet-diamonds'
  | 'inventory-bag'
  | 'tool-undo'
  | 'tool-shuffle'
  | 'tool-hint'
  | 'tool-upgrade';

export type RewardFlightSizePreset = 'default' | 'prop';

export interface RewardFlightConfig {
  gatherDuration: number;
  gatherHoldDuration: number;
  flyDuration: number;
  launchInterval: number;
  arcHeight: number;
  gatherScatterRadius: number;
  endScatterRadius: number;
  spawnScale: number;
  popScale: number;
  endScale: number;
  defaultIconSize: {
    width: number;
    height: number;
  };
  propIconSize: {
    width: number;
    height: number;
  };
}

export interface RewardFlightLaunchOptions {
  source: FlightSourceTarget;
  target: RewardFlightTargetId | HTMLElement | DOMRect | FlightPoint | null;
  iconKind: GameResourceKind;
  itemCount: number;
  sizePreset?: RewardFlightSizePreset;
  config?: Partial<RewardFlightConfig>;
  onFirstHit?: () => void;
  onComplete?: () => void;
  onLaunchAudio?: () => void;
}

interface RewardFlightSprite {
  id: string;
  groupId: string;
  iconKind: GameResourceKind;
  width: number;
  height: number;
  startAt: number;
  startPos: FlightPoint;
  gatherPos: FlightPoint;
  controlPos: FlightPoint;
  endPos: FlightPoint;
  config: RewardFlightConfig;
}

interface RewardFlightGroupRecord {
  targetEl: HTMLElement | null;
  targetId: RewardFlightTargetId | null;
  total: number;
  completed: number;
  firstHitTriggered: boolean;
  resolve: () => void;
  onFirstHit?: () => void;
  onComplete?: () => void;
}

interface RewardFlightContextValue {
  launchRewardFlightGroup: (options: RewardFlightLaunchOptions) => Promise<void>;
  registerFlightTarget: (targetId: RewardFlightTargetId, element: HTMLElement | null) => void;
  getFlightTargetElement: (targetId: RewardFlightTargetId) => HTMLElement | null;
}

const RewardFlightContext = createContext<RewardFlightContextValue | null>(null);

export const DEFAULT_REWARD_FLIGHT_CONFIG: RewardFlightConfig = {
  gatherDuration: 150,
  gatherHoldDuration: 100,
  flyDuration: 550,
  launchInterval: 50,
  arcHeight: 120,
  gatherScatterRadius: 80,
  endScatterRadius: 8,
  spawnScale: 0.72,
  popScale: 1.12,
  endScale: 0.7,
  defaultIconSize: {
    width: 30,
    height: 30,
  },
  propIconSize: {
    width: 30,
    height: 30,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomPointInRadius(radius: number) {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.sqrt(Math.random()) * radius;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  };
}

function mergeConfig(config?: Partial<RewardFlightConfig>): RewardFlightConfig {
  return {
    ...DEFAULT_REWARD_FLIGHT_CONFIG,
    ...config,
    defaultIconSize: {
      ...DEFAULT_REWARD_FLIGHT_CONFIG.defaultIconSize,
      ...config?.defaultIconSize,
    },
    propIconSize: {
      ...DEFAULT_REWARD_FLIGHT_CONFIG.propIconSize,
      ...config?.propIconSize,
    },
  };
}

function getIconCount(itemCount: number) {
  if (!Number.isFinite(itemCount) || itemCount <= 0) return 1;
  return clamp(Math.ceil(Math.sqrt(itemCount)), 1, 10);
}

function getOverlayPoint(
  target: FlightSourceTarget,
  overlayRect: DOMRect,
): FlightPoint | null {
  if (!target) return null;

  if (target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect();
    return {
      x: rect.left - overlayRect.left + rect.width / 2,
      y: rect.top - overlayRect.top + rect.height / 2,
    };
  }

  if (target instanceof DOMRect) {
    return {
      x: target.left - overlayRect.left + target.width / 2,
      y: target.top - overlayRect.top + target.height / 2,
    };
  }

  return target;
}

function getElementFromTarget(
  target: RewardFlightLaunchOptions['target'],
  targetMap: Map<RewardFlightTargetId, HTMLElement>,
) {
  if (!target) return null;
  if (target instanceof HTMLElement) return target;
  if (target instanceof DOMRect) return null;
  if (typeof (target as FlightPoint).x === 'number') return null;
  return targetMap.get(target as RewardFlightTargetId) ?? null;
}

function hasActiveTargetCounts(
  counts: Partial<Record<RewardFlightTargetId, number>>,
) {
  return Object.values(counts).some((count) => (count ?? 0) > 0);
}

function easeOutBack(t: number) {
  const overshoot = 1.70158;
  const shifted = t - 1;
  return 1 + (overshoot + 1) * shifted * shifted * shifted + overshoot * shifted * shifted;
}

function easeInQuad(t: number) {
  return t * t;
}

function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t);
}

function easeInCubic(t: number) {
  return t * t * t;
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function quadraticBezier(start: FlightPoint, control: FlightPoint, end: FlightPoint, t: number) {
  const oneMinus = 1 - t;
  return {
    x: oneMinus * oneMinus * start.x + 2 * oneMinus * t * control.x + t * t * end.x,
    y: oneMinus * oneMinus * start.y + 2 * oneMinus * t * control.y + t * t * end.y,
  };
}

function playTargetHitFeedback(target: HTMLElement | null) {
  if (!target) return;

  target.animate?.(
    [
      { transform: 'scale(1)', filter: 'brightness(1)', boxShadow: '0 0 0 rgba(92,141,246,0)' },
      {
        transform: 'scale(1.06)',
        filter: 'brightness(1.08)',
        boxShadow: '0 0 0 10px rgba(92,141,246,0.12)',
      },
      { transform: 'scale(1)', filter: 'brightness(1)', boxShadow: '0 0 0 rgba(92,141,246,0)' },
    ],
    {
      duration: 380,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  );
}

function getTargetIdFromLaunchTarget(
  target: RewardFlightLaunchOptions['target'],
): RewardFlightTargetId | null {
  if (!target || typeof target !== 'string') return null;
  return target;
}

function getTargetMirrorKind(targetId: RewardFlightTargetId): GameResourceKind {
  if (targetId === 'wallet-coins') return 'coins';
  if (targetId === 'wallet-diamonds') return 'diamonds';
  if (targetId === 'inventory-bag') return 'chest';
  if (targetId === 'tool-undo') return 'undo';
  if (targetId === 'tool-shuffle') return 'shuffle';
  if (targetId === 'tool-hint') return 'hint';
  return 'upgrade';
}

function getTargetMirrorLabel(targetId: RewardFlightTargetId) {
  if (targetId === 'wallet-coins') return '金币';
  if (targetId === 'wallet-diamonds') return '宝石';
  if (targetId === 'inventory-bag') return '背包';
  return getGameResourceLabel(getTargetMirrorKind(targetId));
}

function getTargetMirrorValue(targetId: RewardFlightTargetId, element: HTMLElement) {
  if (targetId !== 'wallet-coins' && targetId !== 'wallet-diamonds') return null;
  const rawText = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const match = rawText.match(/[0-9][0-9,]*|···/);
  return match?.[0] ?? null;
}

function getTargetMirrorFrameSize(
  targetId: RewardFlightTargetId,
  targetEl: HTMLElement | null,
) {
  if (targetId === 'wallet-coins' || targetId === 'wallet-diamonds') {
    const value = targetEl ? getTargetMirrorValue(targetId, targetEl) : null;
    const contentWidth = 76 + Math.max(value?.length ?? 0, 2) * 10;
    return {
      width: clamp(contentWidth, 112, 156),
      height: 38,
    };
  }

  return {
    width: 72,
    height: 34,
  };
}

function buildTargetMirrorFrames(
  orderedTargetIds: RewardFlightTargetId[],
  overlayRect: DOMRect,
  targetMap: Map<RewardFlightTargetId, HTMLElement>,
) {
  const leftInset = 18;
  const topInset = 18;
  const gap = 10;
  const rowGap = 10;
  const maxRowWidth = Math.max(overlayRect.width - leftInset * 2, 140);
  const frames = new Map<
    RewardFlightTargetId,
    { left: number; top: number; width: number; height: number }
  >();

  let cursorX = leftInset;
  let cursorY = topInset;
  let rowHeight = 0;

  orderedTargetIds.forEach((targetId) => {
    const size = getTargetMirrorFrameSize(targetId, targetMap.get(targetId) ?? null);

    if (cursorX > leftInset && cursorX + size.width > leftInset + maxRowWidth) {
      cursorX = leftInset;
      cursorY += rowHeight + rowGap;
      rowHeight = 0;
    }

    frames.set(targetId, {
      left: cursorX,
      top: cursorY,
      width: size.width,
      height: size.height,
    });

    cursorX += size.width + gap;
    rowHeight = Math.max(rowHeight, size.height);
  });

  return frames;
}

const RewardFlightTargetMirror: React.FC<{
  targetId: RewardFlightTargetId;
  targetEl: HTMLElement | null;
  frame: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  pulsing: boolean;
}> = ({ targetId, targetEl, frame, pulsing }) => {
  const kind = getTargetMirrorKind(targetId);
  const label = getTargetMirrorLabel(targetId);
  const value = targetEl ? getTargetMirrorValue(targetId, targetEl) : null;
  const isWallet = targetId === 'wallet-coins' || targetId === 'wallet-diamonds';

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: frame.left,
        top: frame.top,
        width: frame.width,
        height: frame.height,
      }}
    >
      <div
        className={`flex h-full w-full items-center rounded-full border border-[rgba(83,101,122,0.16)] bg-[rgba(255,255,255,0.98)] text-[var(--shell-ink)] shadow-[0_12px_28px_rgba(38,54,72,0.18)] ${
          isWallet ? 'gap-1.5 px-2.5 py-1.5' : 'justify-center gap-1.5 px-2'
        } ${pulsing ? 'reward-flight-target-pulse' : ''}`}
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-full ${
            targetId === 'wallet-diamonds'
              ? 'bg-[#fff0f7]'
              : targetId === 'inventory-bag'
                ? 'bg-[#f2f5fb]'
                : targetId === 'tool-shuffle'
                  ? 'bg-[#eff8f1]'
                  : targetId === 'tool-hint'
                    ? 'bg-[#fff7e8]'
                    : targetId === 'tool-upgrade'
                      ? 'bg-[#fff0ef]'
                      : 'bg-[#eef6ff]'
          }`}
          style={{
            width: isWallet ? Math.min(frame.height - 8, 24) : 22,
            height: isWallet ? Math.min(frame.height - 8, 24) : 22,
          }}
        >
          <GameResourceIcon kind={kind} size={isWallet ? 14 : 13} framed={false} />
        </span>
        {isWallet ? (
          <>
            <span className="min-w-0 truncate text-[12px] font-black text-[var(--shell-ink)]">
              {value ?? label}
            </span>
            <span className="rounded-full bg-[rgba(92,141,246,0.12)] px-2 py-0.5 text-[9px] font-black text-[var(--shell-accent)]">
              {label}
            </span>
          </>
        ) : (
          <span className="truncate text-[10px] font-black text-[var(--shell-ink)]">{label}</span>
        )}
      </div>
    </div>
  );
};

const RewardFlightSpriteNode: React.FC<{
  sprite: RewardFlightSprite;
  onArrive: (groupId: string) => void;
  onComplete: (spriteId: string, groupId: string) => void;
}> = ({ sprite, onArrive, onComplete }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const arrivedRef = useRef(false);

  React.useEffect(() => {
    let frameId = 0;
    const totalDuration =
      sprite.config.gatherDuration +
      sprite.config.gatherHoldDuration +
      sprite.config.flyDuration;
    const settleDuration = Math.max(
      1,
      totalDuration - Math.min(totalDuration, 120),
    );

    const animate = () => {
      const node = nodeRef.current;
      if (!node) return;

      const now = performance.now();
      const elapsed = now - sprite.startAt;

      if (elapsed < 0) {
        node.style.opacity = '0';
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      if (elapsed >= totalDuration) {
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          onArrive(sprite.groupId);
        }
        onComplete(sprite.id, sprite.groupId);
        return;
      }

      let point = sprite.startPos;
      if (elapsed <= sprite.config.gatherDuration) {
        const progress = easeOutQuad(elapsed / sprite.config.gatherDuration);
        point = {
          x: lerp(sprite.startPos.x, sprite.gatherPos.x, progress),
          y: lerp(sprite.startPos.y, sprite.gatherPos.y, progress),
        };
      } else if (elapsed <= sprite.config.gatherDuration + sprite.config.gatherHoldDuration) {
        point = sprite.gatherPos;
      } else {
        const flyElapsed =
          elapsed - sprite.config.gatherDuration - sprite.config.gatherHoldDuration;
        const progress = easeInCubic(flyElapsed / sprite.config.flyDuration);
        point = quadraticBezier(
          sprite.gatherPos,
          sprite.controlPos,
          sprite.endPos,
          progress,
        );
      }

      const popDuration = Math.min(120, totalDuration);
      const scale =
        elapsed <= popDuration
          ? lerp(
              sprite.config.spawnScale,
              sprite.config.popScale,
              easeOutBack(elapsed / popDuration),
            )
          : lerp(
              sprite.config.popScale,
              sprite.config.endScale,
              easeInQuad((elapsed - popDuration) / settleDuration),
            );

      const fadeStart = totalDuration - 90;
      const opacity = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / 90 : 1;

      node.style.opacity = String(clamp(opacity, 0, 1));
      node.style.transform = `translate3d(${point.x - sprite.width / 2}px, ${
        point.y - sprite.height / 2
      }px, 0) scale(${scale})`;
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [onArrive, onComplete, sprite]);

  const iconSize = Math.round(Math.min(sprite.width, sprite.height) * 0.42);
  const isProp = sprite.height > sprite.width;
  const accentTone =
    sprite.iconKind === 'coins'
      ? 'bg-[#eef6ff] text-[#5c8df6]'
      : sprite.iconKind === 'diamonds'
        ? 'bg-[#fff0f7] text-[#d85f9f]'
        : sprite.iconKind === 'shuffle'
          ? 'bg-[#eff8f1] text-[#4d9463]'
          : sprite.iconKind === 'hint'
            ? 'bg-[#fff7e8] text-[#d49839]'
            : sprite.iconKind === 'upgrade'
              ? 'bg-[#fff0ef] text-[#d66868]'
              : 'bg-[#edf5ff] text-[#5f87cc]';

  return (
    <div
      ref={nodeRef}
      className="absolute left-0 top-0 pointer-events-none"
      style={{ width: sprite.width, height: sprite.height, opacity: 0, willChange: 'transform, opacity' }}
    >
      <div
        className={`flex h-full w-full items-center justify-center rounded-[28px] border border-[rgba(83,101,122,0.14)] bg-[rgba(255,255,255,0.96)] shadow-[0_18px_32px_rgba(38,54,72,0.14)] ${
          isProp ? 'flex-col gap-3 px-3 py-4' : ''
        }`}
      >
        <span
          className={`flex items-center justify-center rounded-full ${accentTone}`}
          style={{
            width: isProp ? Math.round(sprite.width * 0.56) : Math.round(sprite.width * 0.52),
            height: isProp ? Math.round(sprite.width * 0.56) : Math.round(sprite.width * 0.52),
          }}
        >
          <GameResourceIcon kind={sprite.iconKind} size={iconSize} framed={false} />
        </span>
      </div>
    </div>
  );
};

export const RewardFlightProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const targetMapRef = useRef(new Map<RewardFlightTargetId, HTMLElement>());
  const groupMapRef = useRef(new Map<string, RewardFlightGroupRecord>());
  const pulseTimersRef = useRef<number[]>([]);
  const activeTargetCountsRef = useRef<Partial<Record<RewardFlightTargetId, number>>>({});
  const activeTargetOrderRef = useRef<RewardFlightTargetId[]>([]);
  const [sprites, setSprites] = useState<RewardFlightSprite[]>([]);
  const [activeTargetCounts, setActiveTargetCounts] = useState<
    Partial<Record<RewardFlightTargetId, number>>
  >({});
  const [activeTargetOrder, setActiveTargetOrder] = useState<RewardFlightTargetId[]>([]);
  const [pulsingTargets, setPulsingTargets] = useState<
    Partial<Record<RewardFlightTargetId, boolean>>
  >({});

  React.useEffect(() => {
    return () => {
      pulseTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      pulseTimersRef.current = [];
    };
  }, []);

  const registerFlightTarget = useCallback(
    (targetId: RewardFlightTargetId, element: HTMLElement | null) => {
      if (!element) {
        targetMapRef.current.delete(targetId);
        return;
      }
      targetMapRef.current.set(targetId, element);
    },
    [],
  );

  const getFlightTargetElement = useCallback((targetId: RewardFlightTargetId) => {
    return targetMapRef.current.get(targetId) ?? null;
  }, []);

  const syncActiveTargetState = useCallback(() => {
    setActiveTargetCounts({ ...activeTargetCountsRef.current });
    setActiveTargetOrder([...activeTargetOrderRef.current]);
  }, []);

  const previewTargetOrder = useCallback((targetId: RewardFlightTargetId) => {
    if (activeTargetOrderRef.current.includes(targetId)) {
      return [...activeTargetOrderRef.current];
    }

    return [...activeTargetOrderRef.current, targetId];
  }, []);

  const activateTargetMirror = useCallback((targetId: RewardFlightTargetId) => {
    activeTargetCountsRef.current = {
      ...activeTargetCountsRef.current,
      [targetId]: (activeTargetCountsRef.current[targetId] ?? 0) + 1,
    };

    if (!activeTargetOrderRef.current.includes(targetId)) {
      activeTargetOrderRef.current = [...activeTargetOrderRef.current, targetId];
    }

    syncActiveTargetState();
  }, [syncActiveTargetState]);

  const deactivateTargetMirror = useCallback((targetId: RewardFlightTargetId) => {
    const nextCounts = { ...activeTargetCountsRef.current };
    const nextCount = (nextCounts[targetId] ?? 1) - 1;
    if (nextCount <= 0) {
      delete nextCounts[targetId];
    } else {
      nextCounts[targetId] = nextCount;
    }
    activeTargetCountsRef.current = nextCounts;

    if (!hasActiveTargetCounts(nextCounts)) {
      activeTargetOrderRef.current = [];
    }

    syncActiveTargetState();
  }, [syncActiveTargetState]);

  const handleSpriteArrive = useCallback((groupId: string) => {
    const group = groupMapRef.current.get(groupId);
    if (!group || group.firstHitTriggered) return;
    group.firstHitTriggered = true;
    playTargetHitFeedback(group.targetEl);
    if (group.targetId) {
      setPulsingTargets((current) => ({ ...current, [group.targetId!]: true }));
      const timer = window.setTimeout(() => {
        setPulsingTargets((current) => ({ ...current, [group.targetId!]: false }));
      }, 420);
      pulseTimersRef.current.push(timer);
    }
    group.onFirstHit?.();
  }, []);

  const handleSpriteComplete = useCallback((spriteId: string, groupId: string) => {
    setSprites((current) => current.filter((sprite) => sprite.id !== spriteId));

    const group = groupMapRef.current.get(groupId);
    if (!group) return;

    group.completed += 1;
    if (group.completed < group.total) return;

    group.onComplete?.();
    group.resolve();
    if (group.targetId) {
      deactivateTargetMirror(group.targetId);
    }
    groupMapRef.current.delete(groupId);
  }, [deactivateTargetMirror]);

  const launchRewardFlightGroup = useCallback(
    (options: RewardFlightLaunchOptions) => {
      const overlay = overlayRef.current;
      if (!overlay) {
        options.onFirstHit?.();
        options.onComplete?.();
        return Promise.resolve();
      }

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) {
        const targetEl = getElementFromTarget(options.target, targetMapRef.current);
        playTargetHitFeedback(targetEl);
        options.onFirstHit?.();
        options.onComplete?.();
        return Promise.resolve();
      }

      const overlayRect = overlay.getBoundingClientRect();
      const targetElement = getElementFromTarget(options.target, targetMapRef.current);
      const resolvedTarget =
        targetElement ??
        (typeof options.target === 'string' ? null : options.target);
      const targetId = getTargetIdFromLaunchTarget(options.target);
      const projectedOrder = targetId ? previewTargetOrder(targetId) : activeTargetOrderRef.current;
      const projectedFrames = buildTargetMirrorFrames(
        projectedOrder,
        overlayRect,
        targetMapRef.current,
      );
      const startPos = getOverlayPoint(options.source, overlayRect);
      const mirrorFrame = targetId ? projectedFrames.get(targetId) : null;
      const endCenter = mirrorFrame
        ? {
            x: mirrorFrame.left + mirrorFrame.width / 2,
            y: mirrorFrame.top + mirrorFrame.height / 2,
          }
        : getOverlayPoint(resolvedTarget, overlayRect);

      if (!startPos || !endCenter) {
        options.onFirstHit?.();
        options.onComplete?.();
        return Promise.resolve();
      }

      const config = mergeConfig(options.config);
      const iconCount = getIconCount(options.itemCount);
      const sizePreset = options.sizePreset ?? 'default';
      const size =
        sizePreset === 'prop' ? config.propIconSize : config.defaultIconSize;
      const now = performance.now();
      const groupId = `reward-flight-group-${now}-${Math.random().toString(36).slice(2, 8)}`;

      options.onLaunchAudio?.();
      if (targetId) {
        activateTargetMirror(targetId);
      }

      const nextSprites: RewardFlightSprite[] = Array.from({ length: iconCount }, (_, index) => {
        const gatherOffset = randomPointInRadius(config.gatherScatterRadius);
        const endOffset = randomPointInRadius(config.endScatterRadius);
        const gatherPos = {
          x: startPos.x + gatherOffset.x,
          y: startPos.y + gatherOffset.y,
        };
        const endPos = {
          x: endCenter.x + endOffset.x,
          y: endCenter.y + endOffset.y,
        };
        const controlPos = {
          x: (gatherPos.x + endPos.x) / 2,
          y: (gatherPos.y + endPos.y) / 2 - config.arcHeight,
        };

        return {
          id: `${groupId}-sprite-${index}`,
          groupId,
          iconKind: options.iconKind,
          width: size.width,
          height: size.height,
          startAt: now + index * config.launchInterval,
          startPos,
          gatherPos,
          controlPos,
          endPos,
          config,
        };
      });

      const completionPromise = new Promise<void>((resolve) => {
        groupMapRef.current.set(groupId, {
          targetEl: targetElement,
          targetId,
          total: nextSprites.length,
          completed: 0,
          firstHitTriggered: false,
          resolve,
          onFirstHit: options.onFirstHit,
          onComplete: options.onComplete,
        });
      });

      setSprites((current) => [...current, ...nextSprites]);
      return completionPromise;
    },
    [activateTargetMirror, previewTargetOrder],
  );

  const contextValue = useMemo<RewardFlightContextValue>(
    () => ({
      launchRewardFlightGroup,
      registerFlightTarget,
      getFlightTargetElement,
    }),
    [getFlightTargetElement, launchRewardFlightGroup, registerFlightTarget],
  );

  const overlayRect = overlayRef.current?.getBoundingClientRect() ?? null;
  const activeTargetIds = activeTargetOrder.filter(
    (targetId) => (activeTargetCounts[targetId] ?? 0) > 0,
  );
  const mirrorFrames = overlayRect
    ? buildTargetMirrorFrames(activeTargetOrder, overlayRect, targetMapRef.current)
    : null;

  return (
    <RewardFlightContext.Provider value={contextValue}>
      {children}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 z-[220] overflow-visible"
      >
        {sprites.map((sprite) => (
          <RewardFlightSpriteNode
            key={sprite.id}
            sprite={sprite}
            onArrive={handleSpriteArrive}
            onComplete={handleSpriteComplete}
          />
        ))}
        {overlayRect && mirrorFrames
          ? activeTargetIds.map((targetId) => {
              const frame = mirrorFrames.get(targetId);
              if (!frame) return null;
              return (
                <RewardFlightTargetMirror
                  key={targetId}
                  targetId={targetId}
                  targetEl={targetMapRef.current.get(targetId) ?? null}
                  frame={frame}
                  pulsing={Boolean(pulsingTargets[targetId])}
                />
              );
            })
          : null}
      </div>
    </RewardFlightContext.Provider>
  );
};

export function useRewardFlight() {
  const context = useContext(RewardFlightContext);
  if (!context) {
    throw new Error('useRewardFlight must be used within RewardFlightProvider');
  }
  return context;
}

export function useRewardFlightTarget(targetId: RewardFlightTargetId) {
  const { registerFlightTarget } = useRewardFlight();

  return useCallback(
    (element: HTMLElement | null) => {
      registerFlightTarget(targetId, element);
    },
    [registerFlightTarget, targetId],
  );
}
