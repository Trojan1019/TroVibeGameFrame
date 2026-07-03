import React from 'react';
import { BarChart3, CheckCircle2, Target, XCircle } from 'lucide-react';

import { ShellButton, ShellPanel, ShellTitle } from './shell/ShellPrimitives';
import { usePreviewViewport } from './dev/PreviewViewport';

interface RoundStatusPanelProps {
  score: number;
  highScore: number;
  disabled?: boolean;
  scoreAnchorRef?: React.RefObject<HTMLDivElement | null>;
  onQuickWin: () => void;
  onQuickLose: () => void;
}

export const RoundStatusPanel: React.FC<RoundStatusPanelProps> = ({
  score,
  highScore,
  disabled = false,
  scoreAnchorRef,
  onQuickWin,
  onQuickLose,
}) => {
  const { layoutMode } = usePreviewViewport();
  const isCompact = layoutMode === 'compact' || layoutMode === 'landscape';

  return (
    <div className={`flex flex-col items-end ${isCompact ? 'gap-1.5' : 'gap-2'}`}>
      <div className={`flex ${isCompact ? 'gap-1.5' : 'gap-2'}`}>
        <ShellPanel ref={scoreAnchorRef} tone="paper" className={`${isCompact ? 'min-w-[72px] px-3 py-2' : 'min-w-[84px] px-4 py-2.5'} text-center`}>
          <span className={`flex items-center justify-center gap-1 font-black leading-none text-[var(--shell-ink-soft)] ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
            <BarChart3 className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
            <span>分数</span>
          </span>
          <span className={`mt-1 block font-black text-[var(--shell-ink)] ${isCompact ? 'text-[13px]' : 'text-sm'}`}>{score}</span>
        </ShellPanel>
        <ShellPanel tone="paper" className={`${isCompact ? 'min-w-[72px] px-3 py-2' : 'min-w-[84px] px-4 py-2.5'} text-center`}>
          <span className={`flex items-center justify-center gap-1 font-black leading-none text-[var(--shell-ink-soft)] ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
            <Target className="h-3.5 w-3.5 text-[#4d9463]" />
            <span>最高</span>
          </span>
          <span className={`mt-1 block font-black text-[var(--shell-ink)] ${isCompact ? 'text-[13px]' : 'text-sm'}`}>{highScore}</span>
        </ShellPanel>
      </div>

      <ShellPanel className={`${isCompact ? 'w-[178px] p-1.5' : 'w-[194px] p-2'}`}>
        <div className="px-1 pb-1.5">
          <ShellTitle className={`gap-1.5 ${isCompact ? 'px-2.5 py-1 text-[9px]' : 'px-3 py-1 text-[10px]'}`}>
            <Target className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
            <span>快速完成</span>
          </ShellTitle>
        </div>
        <div className={`grid grid-cols-2 ${isCompact ? 'gap-1' : 'gap-1.5'}`}>
          <ShellButton
            onClick={onQuickWin}
            disabled={disabled}
            variant="success"
            className={`${isCompact ? 'min-h-[40px] text-[9px]' : 'min-h-[46px] text-[10px]'} flex-col gap-0.5 px-1`}
            title="直接结算为关卡胜利"
          >
            <CheckCircle2 className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} stroke-[2.5]`} />
            <span className="leading-none">关卡胜利</span>
          </ShellButton>
          <ShellButton
            onClick={onQuickLose}
            disabled={disabled}
            variant="danger"
            className={`${isCompact ? 'min-h-[40px] text-[9px]' : 'min-h-[46px] text-[10px]'} flex-col gap-0.5 px-1`}
            title="直接结算为关卡失败"
          >
            <XCircle className={`${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} stroke-[2.5]`} />
            <span className="leading-none">关卡失败</span>
          </ShellButton>
        </div>
      </ShellPanel>
    </div>
  );
};
