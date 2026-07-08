import React from 'react';
import { Medal, Trophy, X } from 'lucide-react';

import { LeaderboardEntry } from '../types';
import { UniversalAvatar } from './AnimalAvatarsSvg';
import { DragScrollArea } from './shell/DragScrollArea';
import { ShellModal } from './shell/ShellModal';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  playerScore: number;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  entries,
  playerScore,
}) => {
  if (!isOpen) return null;

  const sortedEntries = [...entries]
    .map((e) => (e.isPlayer ? { ...e, score: Math.max(e.score, playerScore) } : e))
    .sort((a, b) => b.score - a.score)
    .map((e, index) => ({ ...e, rank: index + 1 }));

  const playerRankEntry = sortedEntries.find((e) => e.isPlayer);

  return (
    <ShellModal>
      <div className="relative flex w-full max-w-[360px] flex-col overflow-hidden rounded-[28px] border border-[rgba(83,101,122,0.16)] bg-[rgba(255,255,255,0.98)] font-sans shadow-[0_24px_48px_rgba(38,54,72,0.16)] backdrop-blur-sm animate-scale-up">
        <div className="flex items-center justify-between border-b border-[rgba(83,101,122,0.12)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4fb] text-[var(--shell-accent)]">
              <Trophy className="h-4.5 w-4.5 stroke-[2.3]" />
            </span>
            <div>
              <h2 className="text-[20px] font-black text-[var(--shell-ink)]">远征排行</h2>
              <p className="text-[11px] font-bold text-[var(--shell-ink-soft)]">按当前远征分数展示玩家位置</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(83,101,122,0.12)] bg-white text-[var(--shell-ink-soft)] shadow-[0_8px_16px_rgba(38,54,72,0.08)]"
            id="close-leaderboard-btn"
          >
            <X className="h-4.5 w-4.5 stroke-[2.8]" />
          </button>
        </div>

        <DragScrollArea axis="y" className="flex max-h-[420px] flex-1 flex-col gap-2 overflow-y-auto bg-[#f8fbff] p-4">
          {sortedEntries.map((item) => (
            <div
              key={`${item.nickname}-${item.rank}`}
              className={`flex items-center justify-between rounded-[22px] border p-3 shadow-[0_8px_18px_rgba(38,54,72,0.06)] ${
                item.isPlayer
                  ? 'border-[rgba(92,141,246,0.22)] bg-[#eef4ff]'
                  : 'border-[rgba(83,101,122,0.10)] bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f5fb] text-[var(--shell-ink)]">
                  {item.rank <= 3 ? (
                    <Medal
                      className={`h-5 w-5 stroke-[2.2] ${
                        item.rank === 1 ? 'fill-[#ffe8a8] text-[#d49839]' : item.rank === 2 ? 'fill-[#edf1f6] text-[#93a4b8]' : 'fill-[#ffe5cf] text-[#d68d58]'
                      }`}
                    />
                  ) : (
                    <span className="text-[11px] font-black text-[var(--shell-ink-soft)]">{item.rank}</span>
                  )}
                </div>

                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[rgba(83,101,122,0.12)] bg-white">
                  <div className="flex h-7 w-7 items-center justify-center">
                    <UniversalAvatar id={item.avatarId} />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="truncate text-[13px] font-black text-[var(--shell-ink)]">{item.nickname}</div>
                  <div className="text-[10px] font-bold text-[var(--shell-ink-soft)]">
                    {item.isPlayer ? '当前玩家' : `第 ${item.rank} 名`}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[15px] font-black text-[var(--shell-ink)]">{item.score}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--shell-ink-soft)]">score</div>
              </div>
            </div>
          ))}
        </DragScrollArea>

        <div className="border-t border-[rgba(83,101,122,0.10)] bg-[#f9fbfe] px-4 py-3">
          {playerRankEntry ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold text-[var(--shell-ink-soft)]">当前玩家</div>
                <div className="text-[14px] font-black text-[var(--shell-ink)]">{playerRankEntry.nickname}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-[var(--shell-ink-soft)]">当前位置</div>
                <div className="text-[14px] font-black text-[var(--shell-ink)]">第 {playerRankEntry.rank} 名</div>
              </div>
            </div>
          ) : (
            <p className="text-center text-[11px] font-bold text-[var(--shell-ink-soft)]">上报一次成绩后显示玩家名次</p>
          )}
        </div>
      </div>
    </ShellModal>
  );
};
