import React from 'react';
import { Check, CheckCircle2, Lock, X } from 'lucide-react';

import { DailyTask } from '../types';
import { DragScrollArea } from './shell/DragScrollArea';
import { GameResourceIcon, getGameResourceLabel } from './shell/GameResourceIcon';
import { ShellModal } from './shell/ShellModal';

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: DailyTask[];
  onClaimTask: (taskId: string) => void;
  onTriggerLeaderboardTask: () => void;
}

export const TasksModal: React.FC<TasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onClaimTask,
  onTriggerLeaderboardTask,
}) => {
  if (!isOpen) return null;

  return (
    <ShellModal>
      <div className="relative flex w-full max-w-[360px] flex-col overflow-hidden rounded-[28px] border border-[rgba(83,101,122,0.16)] bg-[rgba(255,255,255,0.98)] font-sans shadow-[0_24px_48px_rgba(38,54,72,0.16)] backdrop-blur-sm animate-scale-up">
        <div className="flex items-center justify-between border-b border-[rgba(83,101,122,0.12)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4fb] text-[var(--shell-accent)]">
              <CheckCircle2 className="h-4.5 w-4.5 stroke-[2.4]" />
            </span>
            <div>
              <h2 className="text-[20px] font-black text-[var(--shell-ink)]">每日任务</h2>
              <p className="text-[11px] font-bold text-[var(--shell-ink-soft)]">领取奖励并验证流程反馈</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(83,101,122,0.12)] bg-white text-[var(--shell-ink-soft)] shadow-[0_8px_16px_rgba(38,54,72,0.08)]"
            id="close-tasks-btn"
          >
            <X className="h-4.5 w-4.5 stroke-[2.8]" />
          </button>
        </div>

        <DragScrollArea axis="y" className="flex max-h-[380px] flex-1 flex-col gap-3 overflow-y-auto bg-[#f8fbff] p-4">
          {tasks.map((task) => {
            const isFinished = task.current >= task.target;
            return (
              <div
                key={task.id}
                className="relative flex flex-col rounded-[24px] border border-[rgba(83,101,122,0.12)] bg-white p-4 shadow-[0_10px_20px_rgba(38,54,72,0.06)]"
              >
                {isFinished && !task.isClaimed ? (
                  <span className="absolute right-4 top-4 rounded-full bg-[#eef6ff] px-2 py-0.5 text-[10px] font-black text-[var(--shell-accent)]">
                    可领取
                  </span>
                ) : null}

                <div className="mb-2 pr-16">
                  <h3 className="text-[14px] font-black text-[var(--shell-ink)]">{task.title}</h3>
                  <p className="mt-1 text-[11px] font-bold leading-relaxed text-[var(--shell-ink-soft)]">{task.description}</p>
                </div>

                <div className="relative mb-3 h-3 overflow-hidden rounded-full bg-[#eef2f6]">
                  <div
                    className={isFinished ? 'h-full bg-[#5c8df6]' : 'h-full bg-[#b6c7dc]'}
                    style={{ width: `${Math.min(100, (task.current / task.target) * 100)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-[var(--shell-ink)]">
                    {task.current}/{task.target}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[rgba(83,101,122,0.10)] pt-3">
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {task.coins > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-black text-[var(--shell-ink-soft)]">
                        <GameResourceIcon kind="coins" size={16} />
                        <span>x{task.coins}</span>
                      </div>
                    )}
                    {task.diamonds > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-black text-[var(--shell-ink-soft)]">
                        <GameResourceIcon kind="diamonds" size={16} />
                        <span>x{task.diamonds}</span>
                      </div>
                    )}
                    {task.items?.map((item, i) => (
                      <div key={i} className="flex items-center gap-1 text-[10px] font-black text-[var(--shell-ink-soft)]">
                        <GameResourceIcon kind={item.type} size={14} />
                        <span>{getGameResourceLabel(item.type)} x{item.count}</span>
                      </div>
                    ))}
                  </div>

                  {task.isLocked ? (
                    <div className="flex items-center gap-1 rounded-full bg-[#f3f6f9] px-3 py-2 text-[10px] font-black text-[#9aa8b8]">
                      <Lock className="h-3 w-3 stroke-[2.5]" />
                      <span>未解锁</span>
                    </div>
                  ) : task.isClaimed ? (
                    <div className="flex items-center gap-1 rounded-full bg-[#eefaf2] px-3 py-2 text-[10px] font-black text-[#4d9463]">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>已领取</span>
                    </div>
                  ) : isFinished ? (
                    <button
                      onClick={() => onClaimTask(task.id)}
                      className="rounded-full bg-[var(--shell-accent)] px-4 py-2 text-[11px] font-black text-white shadow-[0_10px_18px_rgba(92,141,246,0.24)] transition-all hover:brightness-[1.03] active:scale-[0.99]"
                    >
                      领取
                    </button>
                  ) : task.category === 'rank_submit' ? (
                    <button
                      onClick={onTriggerLeaderboardTask}
                      className="rounded-full bg-[#eef4fb] px-4 py-2 text-[11px] font-black text-[var(--shell-accent)]"
                    >
                      前往完成
                    </button>
                  ) : (
                    <div className="rounded-full bg-[#f3f6f9] px-4 py-2 text-[11px] font-black text-[#9aa8b8]">
                      进行中
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </DragScrollArea>

        <div className="border-t border-[rgba(83,101,122,0.10)] bg-[#f9fbfe] px-4 py-3 text-[11px] font-bold text-[var(--shell-ink-soft)]">
          任务层只保留状态、进度和奖励，不再附加卡通装饰说明。
        </div>
      </div>
    </ShellModal>
  );
};
