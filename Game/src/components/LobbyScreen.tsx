import React, { useEffect, useRef, useState } from 'react';
import { Bell, CalendarCheck2, Gift, Layers3, Mail, Package2, Play, Sparkles, Ticket, Trophy, Wallet2 } from 'lucide-react';
import { PlayerInfo, MailMessage, DailyTask } from '../types';
import { useRewardFlightTarget } from './flight/RewardFlightProvider';
import { ShellButton, ShellIconAction, ShellPanel, ShellScreen, ShellWalletChip } from './shell/ShellPrimitives';
import { usePreviewViewport } from './dev/PreviewViewport';

interface LobbyScreenProps {
  playerInfo: PlayerInfo;
  mailList: MailMessage[];
  tasks: DailyTask[];
  onOpenModal: (type: 'mail' | 'tasks' | 'signin' | 'bag' | 'leaderboard' | 'redeem' | 'profile' | 'shop') => void;
  onStartGame: (isNew: boolean) => void;
  hasSavedGame: boolean;
  onModifyCurrency: (type: 'coins' | 'diamonds', amount: number) => void;
  walletLoaded?: boolean;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  playerInfo,
  mailList,
  tasks,
  onOpenModal,
  onStartGame,
  hasSavedGame,
  onModifyCurrency: _onModifyCurrency,
  walletLoaded = true,
}) => {
  const unreadMailsCount = mailList.filter((m) => !m.isRead).length;
  const pendingTasksCount = tasks.filter((t) => !t.isClaimed && !t.isLocked && t.current >= t.target).length;
  const { layoutMode, deviceWidth, deviceHeight } = usePreviewViewport();
  const isCompact = layoutMode === 'compact';
  const isTall = layoutMode === 'tall';
  const isLandscape = layoutMode === 'landscape';
  const isTablet = layoutMode === 'tablet';
  const titleSizeClass = isLandscape ? 'text-[38px]' : isTablet ? 'text-[66px]' : isTall ? 'text-[58px]' : isCompact ? 'text-[36px]' : 'text-[52px]';
  const railGapClass = isCompact ? 'gap-3' : isTall ? 'gap-5' : 'gap-4';
  const shellPaddingClass = isCompact ? 'px-2 py-3' : isTablet ? 'px-5 py-6' : 'px-4 py-5';
  const railGridClass = isLandscape
    ? 'grid-cols-[92px_minmax(0,1fr)_92px] gap-4 py-2'
    : isCompact
      ? 'grid-cols-[72px_minmax(0,1fr)_72px] gap-2 py-1'
      : 'grid-cols-[92px_minmax(0,1fr)_92px] gap-4 py-2';
  const activityOffsetClass = isLandscape ? '-mt-2' : isCompact ? 'mt-2' : 'mt-3';
  const titleTopClass = isCompact ? 'mt-1.5' : isTall ? 'mt-4' : 'mt-2';
  const subtitleWidth = isLandscape ? 'max-w-[620px]' : 'max-w-[520px]';
  const initial = (playerInfo.nickname || 'P').trim().slice(0, 1).toUpperCase();
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const leftRailRef = useRef<HTMLDivElement>(null);
  const rightRailRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const coinsTargetRef = useRewardFlightTarget('wallet-coins');
  const diamondsTargetRef = useRewardFlightTarget('wallet-diamonds');
  const bagTargetRef = useRewardFlightTarget('inventory-bag');
  const [layoutIssues, setLayoutIssues] = useState<string[]>([]);
  const isDevelopmentBaseline = deviceWidth === 750 && deviceHeight === 1624;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncLayoutCheck = (issues: string[], active: boolean) => {
      setLayoutIssues(issues);
      (
        window as typeof window & {
          __uiLayoutIssues?: Record<string, unknown>;
        }
      ).__uiLayoutIssues = {
        screen: 'lobby',
        baseline: '750x1624',
        active,
        checkedAt: new Date().toISOString(),
        issues,
      };
      window.dispatchEvent(new CustomEvent('ui-layout-check-updated'));
    };

    if (!isDevelopmentBaseline) {
      syncLayoutCheck([], false);
      return;
    }

    const collectIssues = () => {
      const titleRect = titleRef.current?.getBoundingClientRect();
      const subtitleRect = subtitleRef.current?.getBoundingClientRect();
      const leftRect = leftRailRef.current?.getBoundingClientRect();
      const rightRect = rightRailRef.current?.getBoundingClientRect();
      const ctaRect = ctaRef.current?.getBoundingClientRect();
      const nextIssues: string[] = [];

      const isOverlapping = (a?: DOMRect, b?: DOMRect) =>
        Boolean(
          a &&
            b &&
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top,
        );

      if (isOverlapping(subtitleRect, leftRect)) nextIssues.push('subtitle-left-rail');
      if (isOverlapping(subtitleRect, rightRect)) nextIssues.push('subtitle-right-rail');
      if (isOverlapping(titleRect, leftRect)) nextIssues.push('title-left-rail');
      if (isOverlapping(titleRect, rightRect)) nextIssues.push('title-right-rail');
      if (isOverlapping(leftRect, ctaRect)) nextIssues.push('left-rail-cta');
      if (isOverlapping(rightRect, ctaRect)) nextIssues.push('right-rail-cta');

      syncLayoutCheck(nextIssues, true);
    };

    let frameId = 0;
    const scheduleCollect = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(collectIssues);
    };

    scheduleCollect();
    frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(collectIssues);
    });

    const resizeObserver = new ResizeObserver(scheduleCollect);
    [
      titleRef.current,
      subtitleRef.current,
      leftRailRef.current,
      rightRailRef.current,
      ctaRef.current,
    ].forEach((element) => {
      if (element) resizeObserver.observe(element);
    });

    window.addEventListener('resize', scheduleCollect);
    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleCollect);
    };
  }, [deviceHeight, deviceWidth, isDevelopmentBaseline, layoutMode]);

  return (
    <ShellScreen className={`select-none font-sans ${shellPaddingClass}`}>
      <div className="flex h-full flex-col gap-4">
        <div className={`z-20 flex items-center justify-between ${isCompact ? 'gap-1.5' : 'gap-2'}`}>
          <button onClick={() => onOpenModal('profile')} className="min-w-0">
            <ShellPanel className={`flex items-center rounded-full ${isCompact ? 'gap-1.5 px-1 py-1 pr-2' : 'gap-2 px-1.5 py-1 pr-3'}`}>
              <div className={`flex items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[var(--shell-bark)] bg-[linear-gradient(180deg,#ffffff_0%,#eef3f9_100%)] text-[var(--shell-ink)] ${isCompact ? 'h-9 w-9 text-[15px]' : 'h-11 w-11 text-[18px]'}`}>
                <span className="font-black">{initial}</span>
              </div>
              <div className="min-w-0 text-left">
                <div className={`truncate font-black text-[var(--shell-ink)] ${isCompact ? 'text-[11px]' : 'text-[13px]'}`}>
                  {playerInfo.nickname}
                </div>
                <div className={`mt-0.5 font-black text-[#6d7f93] ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>Lv.{playerInfo.level}</div>
              </div>
            </ShellPanel>
          </button>

          <div className={`flex items-center ${isCompact ? 'gap-1' : 'gap-1.5'}`}>
            <ShellWalletChip
              ref={coinsTargetRef}
              onClick={() => onOpenModal('shop')}
              title="查看道具商店"
              icon={<Wallet2 size={isCompact ? 15 : 17} strokeWidth={2.4} />}
              value={walletLoaded ? playerInfo.coins.toLocaleString() : '···'}
              className={isCompact ? 'py-1 pl-1.5 pr-1 text-[12px]' : ''}
              showAdd={!isCompact}
            />
            <ShellWalletChip
              ref={diamondsTargetRef}
              onClick={() => onOpenModal('shop')}
              title="查看道具商店"
              accent="pink"
              icon={<Sparkles size={isCompact ? 15 : 17} strokeWidth={2.4} />}
              value={walletLoaded ? playerInfo.diamonds : '···'}
              className={isCompact ? 'py-1 pl-1.5 pr-1 text-[12px]' : ''}
              showAdd={!isCompact}
            />
          </div>

          <div className="relative shrink-0">
            <ShellButton
              onClick={() => onOpenModal('mail')}
              variant="neutral"
              size="sm"
              className={isCompact ? 'h-10 w-10 rounded-[16px] px-0' : 'h-11 w-11 rounded-[18px] px-0'}
              id="lobby-mail-btn"
            >
              <Mail size={isCompact ? 18 : 20} strokeWidth={2.6} />
            </ShellButton>
            {unreadMailsCount > 0 && (
              <span className={`absolute flex items-center justify-center rounded-full border border-white bg-[#ef5d5d] px-1 font-black text-white ${isCompact ? '-right-1.5 -top-1.5 h-5 min-w-5 text-[10px]' : '-right-2 -top-2 h-6 min-w-6 text-[11px]'}`}>
                {unreadMailsCount}
              </span>
            )}
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className={`flex flex-col items-center text-center ${titleTopClass}`}>
            <div ref={titleRef} className="relative max-w-full">
              <h1 className={`text-center font-black tracking-[0.03em] text-[var(--shell-ink)] ${titleSizeClass}`}>
                MERGE LAB
              </h1>
            </div>
            <p ref={subtitleRef} className={`mt-3 ${subtitleWidth} text-center font-bold text-[var(--shell-ink-soft)] ${isCompact ? 'text-[12px] leading-snug' : 'text-[15px] leading-relaxed'}`}>
              轻扫、合并、领奖励，用更清爽的流程壳验证这局示例
            </p>
          </div>

          <div className={`grid min-h-0 flex-1 content-start items-start ${railGridClass} ${activityOffsetClass}`}>
            <div ref={leftRailRef} className={`flex flex-col items-center ${railGapClass}`}>
              <ShellIconAction
                ref={bagTargetRef}
                onClick={() => onOpenModal('bag')}
                icon={<Package2 size={isCompact ? 22 : 24} strokeWidth={2.3} />}
                label="背包"
                tone="wood"
                className={isCompact ? '' : 'scale-[1.08]'}
                id="lobby-nav-bag"
              />
              <ShellIconAction
                onClick={() => onOpenModal('tasks')}
                icon={<Bell size={isCompact ? 22 : 24} strokeWidth={2.3} />}
                label="任务"
                tone="leaf"
                dot={pendingTasksCount > 0}
                className={isCompact ? '' : 'scale-[1.08]'}
                id="lobby-nav-tasks"
              />
              <ShellIconAction
                onClick={() => onOpenModal('signin')}
                icon={<CalendarCheck2 size={isCompact ? 22 : 24} strokeWidth={2.3} />}
                label="签到"
                tone="sun"
                dot={!playerInfo.claimedToday}
                className={isCompact ? '' : 'scale-[1.08]'}
                id="lobby-nav-signin"
              />
            </div>

            <div className="min-h-[180px]" aria-hidden="true" />

            <div ref={rightRailRef} className={`flex flex-col items-center ${railGapClass}`}>
              <ShellIconAction
                onClick={() => onOpenModal('leaderboard')}
                icon={<Trophy size={isCompact ? 22 : 24} strokeWidth={2.3} />}
                label="排行"
                tone="sea"
                className={isCompact ? '' : 'scale-[1.08]'}
                id="lobby-nav-leaderboard"
              />
              <ShellIconAction
                onClick={() => onOpenModal('redeem')}
                icon={<Ticket size={isCompact ? 21 : 23} strokeWidth={2.3} />}
                label="兑换"
                tone="sun"
                className={isCompact ? '' : 'scale-[1.08]'}
                id="lobby-nav-redeem"
              />
              <ShellIconAction
                onClick={() => onOpenModal('shop')}
                icon={<Gift size={isCompact ? 22 : 24} strokeWidth={2.3} />}
                label="商店"
                tone="rose"
                className={isCompact ? '' : 'scale-[1.08]'}
                id="lobby-nav-shop"
              />
            </div>
          </div>
        </div>

        <ShellPanel ref={ctaRef} className={`relative z-10 space-y-2.5 ${isCompact ? 'p-2.5' : 'p-3.5'}`}>
          <ShellButton
            onClick={() => onStartGame(true)}
            size="lg"
            fullWidth
            id="play-newgame-btn"
            className={isCompact ? 'min-h-12 text-[15px]' : 'min-h-[60px] text-[18px]'}
          >
            <Play size={isCompact ? 16 : 18} strokeWidth={2.8} />
            <span>开始示例</span>
          </ShellButton>
          <ShellButton
            onClick={() => onStartGame(false)}
            variant={hasSavedGame ? 'secondary' : 'neutral'}
            size="md"
            fullWidth
            disabled={!hasSavedGame}
            id="play-continue-btn"
            className={`${!hasSavedGame ? 'text-gray-400' : ''} ${isCompact ? 'min-h-11 text-[14px]' : 'min-h-[54px] text-[16px]'}`}
          >
            <Layers3 size={isCompact ? 15 : 17} strokeWidth={2.6} />
            <span>继续进度</span>
          </ShellButton>
        </ShellPanel>
      </div>
    </ShellScreen>
  );
};
