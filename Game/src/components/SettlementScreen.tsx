import React from 'react';
import { ArrowLeft, Footprints, Frown, Sparkles, Star, Trophy } from 'lucide-react';

import { GameResourceIcon } from './shell/GameResourceIcon';
import { ShellButton, ShellPanel, ShellScreen, ShellStatCard, ShellTitle } from './shell/ShellPrimitives';
import { usePreviewViewport } from './dev/PreviewViewport';

interface SettlementScreenProps {
  outcome: 'won' | 'lost';
  score: number;
  bestScore: number;
  bestTile: number;
  moves: number;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export const SettlementScreen: React.FC<SettlementScreenProps> = ({
  outcome,
  score,
  bestScore,
  bestTile,
  moves,
  onPlayAgain,
  onReturnToLobby,
}) => {
  const isWin = outcome === 'won';
  const { layoutMode } = usePreviewViewport();
  const isCompact = layoutMode === 'compact';
  const isLandscape = layoutMode === 'landscape';

  return (
    <ShellScreen className={`select-none font-sans ${isCompact ? 'px-3 py-4' : 'px-5 py-6'}`}>
      <div className="flex h-full flex-col justify-between">
        <div className={`flex items-center justify-between ${isCompact ? 'gap-2' : 'gap-3'}`}>
          <ShellButton onClick={onReturnToLobby} variant="neutral" size="sm" className={isCompact ? 'h-10 w-10 rounded-[16px] px-0' : 'h-11 w-11 rounded-[18px] px-0'}>
            <ArrowLeft className="h-5 w-5 stroke-[3]" />
          </ShellButton>
          <ShellTitle className={`gap-2 ${isCompact ? 'px-3 py-1 text-[12px]' : 'px-4'}`}>
            {isWin ? <Sparkles className="h-4 w-4 text-[var(--shell-accent)]" /> : <Frown className="h-4 w-4 text-[#df6867]" />}
            <span>{isWin ? '结算成功' : '本局结算'}</span>
          </ShellTitle>
        </div>

        <div className={`flex flex-1 flex-col items-center justify-center text-center ${isCompact ? 'gap-3.5' : 'gap-5'}`}>
          <div className={`flex items-center justify-center rounded-full border border-[rgba(83,101,122,0.16)] shadow-[0_18px_32px_rgba(38,54,72,0.12)] ${isCompact ? 'h-20 w-20' : 'h-24 w-24'} ${isWin ? 'bg-[linear-gradient(180deg,#eef6ff_0%,#dce9ff_100%)]' : 'bg-[linear-gradient(180deg,#fff3f3_0%,#ffe1e1_100%)]'}`}>
            {isWin ? (
              <Trophy className={`${isCompact ? 'h-9 w-9' : 'h-11 w-11'} text-[var(--shell-accent)] stroke-[2.2]`} />
            ) : (
              <Frown className={`${isCompact ? 'h-9 w-9' : 'h-11 w-11'} text-[#df6867] stroke-[2.2]`} />
            )}
          </div>

          <div>
            <h1 className={`${isCompact ? 'text-[28px]' : 'text-3xl'} font-black text-[var(--shell-ink)]`}>
              {isWin ? '流程完成' : '本局结束'}
            </h1>
            <p className={`mt-2 font-bold text-[var(--shell-ink-soft)] ${isCompact ? 'text-[13px] leading-snug' : 'text-[15px]'}`}>
              {isWin ? '奖励、结算和回流已跑通，可以继续验证下一轮。' : '当前流程已经完成收尾，整理状态后可直接重开。'}
            </p>
          </div>

          <ShellPanel className={`w-full max-w-[340px] ${isCompact ? 'p-2.5' : 'p-3'}`}>
            <div className={`grid grid-cols-2 ${isCompact ? 'gap-2' : 'gap-3'}`}>
              <ShellStatCard label="本局分数" value={score} icon={<GameResourceIcon kind="coins" size={18} />} />
              <ShellStatCard label="历史最高" value={bestScore} icon={<Trophy className="h-5 w-5 text-[#4d9463] stroke-[2.2]" />} />
              <ShellStatCard label="最大方块" value={bestTile} icon={<Star className="h-5 w-5 fill-[#ffe8a8] text-[#d49839] stroke-[2]" />} />
              <ShellStatCard label="移动步数" value={moves} icon={<Footprints className="h-5 w-5 text-[#60758d] stroke-[2.3]" />} />
            </div>
          </ShellPanel>
        </div>

        <div className={`grid ${isLandscape ? 'grid-cols-2' : 'grid-cols-2'} ${isCompact ? 'gap-2' : 'gap-3'}`}>
          <ShellButton onClick={onReturnToLobby} variant="neutral" size="md" fullWidth>
            <ArrowLeft className="h-4.5 w-4.5 stroke-[2.6]" />
            回到大厅
          </ShellButton>
          <ShellButton onClick={onPlayAgain} variant="primary" size="md" fullWidth>
            <Sparkles className="h-4.5 w-4.5 stroke-[2.4]" />
            再来一局
          </ShellButton>
        </div>
      </div>
    </ShellScreen>
  );
};
