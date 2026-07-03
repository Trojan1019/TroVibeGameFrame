import React from 'react';
import { ChevronsUp, Coins, Lightbulb, Package2, Shuffle, Sparkles, Undo2 } from 'lucide-react';

import type { ItemType } from '../../types';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export type CurrencyKind = 'coins' | 'diamonds';
export type GameResourceKind = CurrencyKind | ItemType | 'chest';

const RESOURCE_META: Record<
  GameResourceKind,
  {
    label: string;
    className: string;
    iconClassName: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }
> = {
  coins: {
    label: '金币',
    className: 'bg-[#eef6ff]',
    iconClassName: 'text-[#5c8df6]',
    icon: Coins,
  },
  diamonds: {
    label: '宝石',
    className: 'bg-[#fff0f7]',
    iconClassName: 'text-[#d85f9f]',
    icon: Sparkles,
  },
  undo: {
    label: '撤销',
    className: 'bg-[#edf5ff]',
    iconClassName: 'text-[#5f87cc]',
    icon: Undo2,
  },
  shuffle: {
    label: '洗牌',
    className: 'bg-[#eff8f1]',
    iconClassName: 'text-[#4d9463]',
    icon: Shuffle,
  },
  hint: {
    label: '提示',
    className: 'bg-[#fff7e8]',
    iconClassName: 'text-[#d49839]',
    icon: Lightbulb,
  },
  upgrade: {
    label: '升级',
    className: 'bg-[#fff0ef]',
    iconClassName: 'text-[#d66868]',
    icon: ChevronsUp,
  },
  chest: {
    label: '资源箱',
    className: 'bg-[#f2f5fb]',
    iconClassName: 'text-[#60758d]',
    icon: Package2,
  },
};

export function getGameResourceLabel(kind: GameResourceKind) {
  return RESOURCE_META[kind].label;
}

interface GameResourceIconProps {
  kind: GameResourceKind;
  size?: number;
  framed?: boolean;
  className?: string;
  alt?: string;
}

export const GameResourceIcon: React.FC<GameResourceIconProps> = ({
  kind,
  size = 18,
  framed = true,
  className,
  alt: _alt = '',
}) => {
  const meta = RESOURCE_META[kind];
  const Icon = meta.icon;
  const iconSize = framed ? Math.max(12, Math.round(size * 0.62)) : size;

  if (!framed) {
    return <Icon className={cx(meta.iconClassName, className)} style={{ width: iconSize, height: iconSize }} />;
  }

  return (
    <span
      className={cx(
        'inline-flex items-center justify-center rounded-full border border-[rgba(83,101,122,0.14)] shadow-inner',
        meta.className,
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Icon className={meta.iconClassName} style={{ width: iconSize, height: iconSize }} />
    </span>
  );
};
