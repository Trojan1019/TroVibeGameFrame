import React, { useMemo, useRef, useState } from 'react';
import { Gift } from 'lucide-react';

import { ItemType } from '../types';
import {
  useRewardFlight,
  type RewardFlightSizePreset,
  type RewardFlightTargetId,
} from './flight/RewardFlightProvider';
import {
  GameResourceIcon,
  getGameResourceLabel,
  type GameResourceKind,
} from './shell/GameResourceIcon';
import { ShellModal } from './shell/ShellModal';

interface RewardShowcaseModalProps {
  isOpen: boolean;
  onConfirm: () => Promise<void> | void;
  rewards: {
    coins: number;
    diamonds: number;
    items?: { type: ItemType; count: number }[];
  } | null;
}

interface RewardEntry {
  key: string;
  kind: GameResourceKind;
  amount: number;
  sizePreset: RewardFlightSizePreset;
  accentClassName: string;
  amountClassName: string;
}

function resolveRewardTarget(
  kind: GameResourceKind,
  getFlightTargetElement: (targetId: RewardFlightTargetId) => HTMLElement | null,
): RewardFlightTargetId {
  if (kind === 'coins') return 'wallet-coins';
  if (kind === 'diamonds') return 'wallet-diamonds';

  const toolTarget = `tool-${kind}` as RewardFlightTargetId;
  return getFlightTargetElement(toolTarget) ? toolTarget : 'inventory-bag';
}

export const RewardShowcaseModal: React.FC<RewardShowcaseModalProps> = ({
  isOpen,
  onConfirm,
  rewards,
}) => {
  const { launchRewardFlightGroup, getFlightTargetElement } = useRewardFlight();
  const [isAnimating, setIsAnimating] = useState(false);
  const sourceRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const rewardEntries = useMemo<RewardEntry[]>(() => {
    if (!rewards) return [];

    return [
      rewards.coins > 0
        ? {
            key: 'coins',
            kind: 'coins',
            amount: rewards.coins,
            sizePreset: 'default',
            accentClassName: 'bg-[#f8fbff]',
            amountClassName: 'text-[#5c8df6]',
          }
        : null,
      rewards.diamonds > 0
        ? {
            key: 'diamonds',
            kind: 'diamonds',
            amount: rewards.diamonds,
            sizePreset: 'default',
            accentClassName: 'bg-[#fff7fb]',
            amountClassName: 'text-[#d85f9f]',
          }
        : null,
      ...(rewards.items ?? []).map((item, index) => ({
        key: `${item.type}-${index}`,
        kind: item.type,
        amount: item.count,
        sizePreset: 'prop' as const,
        accentClassName: 'bg-[#f8fbff]',
        amountClassName: 'text-[#4d9463]',
      })),
    ].filter(Boolean) as RewardEntry[];
  }, [rewards]);

  if (!isOpen || !rewards) return null;

  const hasMultiple = rewardEntries.length > 1;

  const handleConfirm = async () => {
    if (isAnimating) return;

    setIsAnimating(true);
    try {
      await Promise.all(
        rewardEntries.map((entry) =>
          launchRewardFlightGroup({
            source: sourceRefs.current[entry.key],
            target: resolveRewardTarget(entry.kind, getFlightTargetElement),
            iconKind: entry.kind,
            itemCount: entry.amount,
            sizePreset: entry.sizePreset,
          }),
        ),
      );

      await onConfirm();
    } finally {
      setIsAnimating(false);
    }
  };

  return (
    <ShellModal zIndex={100} backdropClassName="bg-black/68" containerClassName="select-none">
      <div className="relative flex w-full max-w-[300px] flex-col items-center overflow-hidden rounded-[28px] border border-[rgba(83,101,122,0.16)] bg-[rgba(255,255,255,0.98)] p-5 text-center shadow-[0_24px_48px_rgba(38,54,72,0.16)] backdrop-blur-sm animate-scale-up">
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4fb] text-[var(--shell-accent)]">
          <Gift className="h-5 w-5 stroke-[2.2]" />
        </span>

        <h2 className="text-[19px] font-black text-[var(--shell-ink)]">资源到账</h2>
        <p className="mt-1 text-[11px] font-bold tracking-[0.04em] text-[var(--shell-ink-soft)]">
          {hasMultiple ? '奖励将飞入当前账户与库存' : '奖励将飞入当前进度'}
        </p>

        <div className="mt-5 flex w-full flex-wrap justify-center gap-2">
          {rewardEntries.map((entry) => (
            <div
              key={entry.key}
              className={`flex h-[78px] w-[78px] shrink-0 flex-col items-center justify-between rounded-[20px] border border-[rgba(83,101,122,0.12)] ${entry.accentClassName} p-2 shadow-[0_10px_20px_rgba(38,54,72,0.06)]`}
            >
              <div className="flex flex-col items-center gap-1">
                <div
                  ref={(element) => {
                    sourceRefs.current[entry.key] = element;
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                >
                  <GameResourceIcon kind={entry.kind} size={24} />
                </div>
                <span className="text-[9px] font-black text-[var(--shell-ink-soft)]">
                  {getGameResourceLabel(entry.kind)}
                </span>
              </div>
              <span className={`text-[10px] font-black ${entry.amountClassName}`}>
                +{entry.amount}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={isAnimating}
          className="mt-5 w-full rounded-[18px] bg-[var(--shell-accent)] px-4 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(92,141,246,0.24)] transition-all hover:brightness-[1.03] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
        >
          {isAnimating ? '奖励飞行中…' : '收下奖励'}
        </button>
      </div>
    </ShellModal>
  );
};

