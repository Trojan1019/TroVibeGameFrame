import React, { useState } from 'react';
import { BarChart3, Bug, ChevronDown, ChevronUp, Target, Trophy } from 'lucide-react';

interface RoundStatusPanelProps {
  score: number;
  highScore: number;
  coins: number;
  diamonds: number;
  disabled?: boolean;
  scoreAnchorRef?: React.RefObject<HTMLDivElement | null>;
  onQuickWin: () => void;
  onQuickLose: () => void;
}

export const RoundStatusPanel: React.FC<RoundStatusPanelProps> = ({
  score,
  highScore,
  coins,
  diamonds,
  disabled = false,
  scoreAnchorRef,
  onQuickWin,
  onQuickLose,
}) => {
  const [debugOpen, setDebugOpen] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <div
          ref={scoreAnchorRef}
          className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(7,12,24,0.82)] px-3 py-2 text-center text-[#f6eddc] shadow-[0_10px_18px_rgba(0,0,0,0.22)]"
        >
          <span className="flex items-center justify-center gap-1 text-[10px] font-black leading-none text-[#aac3eb]">
            <BarChart3 className="h-3.5 w-3.5 text-[#6aa6ff]" />
            分数
          </span>
          <span className="mt-1 block text-[14px] font-black leading-none">{score}</span>
        </div>

        <div className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(7,12,24,0.82)] px-3 py-2 text-center text-[#f6eddc] shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
          <span className="flex items-center justify-center gap-1 text-[10px] font-black leading-none text-[#b9d8c1]">
            <Trophy className="h-3.5 w-3.5 text-[#81d48b]" />
            最高
          </span>
          <span className="mt-1 block text-[14px] font-black leading-none">{highScore}</span>
        </div>

        <button
          onClick={() => setDebugOpen((current) => !current)}
          className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(7,12,24,0.62)] px-2.5 py-2 text-[#dce9ff] shadow-[0_10px_18px_rgba(0,0,0,0.18)] transition-colors hover:bg-[rgba(7,12,24,0.78)]"
          title="调试面板"
        >
          {debugOpen ? <ChevronUp className="h-4 w-4" /> : <Bug className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(7,12,24,0.72)] px-3 py-1.5 text-[11px] font-black text-[#dce9ff] shadow-[0_8px_16px_rgba(0,0,0,0.18)]">
          金币 {coins.toLocaleString()}
        </div>
        <div className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(7,12,24,0.72)] px-3 py-1.5 text-[11px] font-black text-[#f1daff] shadow-[0_8px_16px_rgba(0,0,0,0.18)]">
          钻石 {diamonds}
        </div>
      </div>

      {debugOpen ? (
        <div className="w-[168px] rounded-[22px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(8,14,26,0.94)_0%,rgba(18,28,48,0.96)_100%)] p-2.5 text-[#eff6ff] shadow-[0_18px_28px_rgba(0,0,0,0.24)]">
          <div className="mb-2 flex items-center gap-1.5 rounded-full border border-[rgba(111,216,255,0.18)] bg-[rgba(111,216,255,0.08)] px-3 py-1 text-[10px] font-black tracking-[0.08em] text-[#b9dbff]">
            <Target className="h-3.5 w-3.5" />
            DEBUG FLOW
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onQuickWin}
              disabled={disabled}
              className="rounded-[16px] border border-[rgba(111,197,128,0.38)] bg-[linear-gradient(180deg,#d8f4dc_0%,#a8deb2_100%)] px-2 py-3 text-[11px] font-black leading-tight text-[#2b6237] shadow-[0_3px_0_#5f8d66] disabled:cursor-not-allowed disabled:opacity-50"
            >
              胜利结算
            </button>
            <button
              onClick={onQuickLose}
              disabled={disabled}
              className="rounded-[16px] border border-[rgba(224,120,120,0.38)] bg-[linear-gradient(180deg,#ffd9d9_0%,#f19393_100%)] px-2 py-3 text-[11px] font-black leading-tight text-[#922f2f] shadow-[0_3px_0_#a85050] disabled:cursor-not-allowed disabled:opacity-50"
            >
              失败结算
            </button>
          </div>
          <button
            onClick={() => setDebugOpen(false)}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-[#9fc2ea]"
          >
            收起
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
};
