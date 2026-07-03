import React from 'react';
import { PlayerInfo } from '../types';
import { CalendarCheck2, X } from 'lucide-react';
import { DragScrollArea } from './shell/DragScrollArea';
import { GameResourceIcon, getGameResourceLabel, type GameResourceKind } from './shell/GameResourceIcon';
import { ShellModal } from './shell/ShellModal';

type SignRewardType = 'gold' | 'diamond' | 'hint' | 'shuffle' | 'chest';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerInfo: PlayerInfo;
  onClaimSignIn: () => void;
  onMakeup?: (dayNumber: number) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  playerInfo,
  onClaimSignIn,
  onMakeup,
}) => {
  if (!isOpen) return null;

  const [activeTooltipIdx, setActiveTooltipIdx] = React.useState<number | null>(null);

  const resolveRewardKind = (type: SignRewardType): GameResourceKind =>
    type === 'gold' ? 'coins' : type === 'diamond' ? 'diamonds' : type;

  const currentDayIndex = playerInfo.signInDays.findIndex((claimed) => !claimed);
  // 优先用 SDK 返回的今日 check_day 推算 activeDay（今天是第几天的 index）
  // todayCheckDay 是 1-based，转成 0-based index
  const activeDay = playerInfo.todayCheckDay
    ? playerInfo.todayCheckDay - 1
    : currentDayIndex === -1 ? 7 : currentDayIndex;

  // 过去的天、未签到 = 可补签
  const isMissed = (idx: number) => idx < activeDay && !playerInfo.signInDays[idx];

  // Reward dataset for the sample shell
  const signRewards: Array<{ day: number; label: string; rewards: Array<{ type: SignRewardType; count: number }> }> = [
    { 
      day: 1, 
      label: '第 1 天', 
      rewards: [
        { type: 'gold', count: 100 }
      ] 
    },
    { 
      day: 2, 
      label: '第 2 天', 
      rewards: [
        { type: 'diamond', count: 2 }
      ] 
    },
    { 
      day: 3, 
      label: '第 3 天', 
      rewards: [
        { type: 'hint', count: 1 },
        { type: 'gold', count: 50 }
      ] 
    },
    { 
      day: 4, 
      label: '第 4 天', 
      rewards: [
        { type: 'gold', count: 200 }
      ] 
    },
    { 
      day: 5, 
      label: '第 5 天', 
      rewards: [
        { type: 'shuffle', count: 1 },
        { type: 'diamond', count: 1 }
      ] 
    },
    { 
      day: 6, 
      label: '第 6 天', 
      rewards: [
        { type: 'diamond', count: 3 },
        { type: 'gold', count: 100 }
      ] 
    },
    { 
      day: 7, 
      label: '第 7 天', 
      rewards: [
        { type: 'chest', count: 1 },
        { type: 'diamond', count: 5 },
        { type: 'gold', count: 500 }
      ] 
    },
  ];

  return (
    <ShellModal>
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] border border-[rgba(83,101,122,0.16)] bg-[rgba(255,255,255,0.98)] flex flex-col font-sans shadow-[0_24px_48px_rgba(38,54,72,0.16)] backdrop-blur-sm animate-scale-up">
        
        {/* Header Ribbon / Ribbon Wood Banner exactly like Image 5 */}
        <div className="flex items-center justify-between border-b border-[rgba(83,101,122,0.12)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4fb] text-[var(--shell-accent)]">
              <CalendarCheck2 className="h-4.5 w-4.5 stroke-[2.4]" />
            </span>
            <div>
              <h2 className="text-[20px] font-black text-[var(--shell-ink)]">七日签到</h2>
              <p className="text-[11px] font-bold text-[var(--shell-ink-soft)]">签到、补签和奖励状态</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(83,101,122,0.12)] bg-white text-[var(--shell-ink-soft)] shadow-[0_8px_16px_rgba(38,54,72,0.08)]"
            id="close-signin-btn"
          >
            <X className="h-4.5 w-4.5 stroke-[2.8]" />
          </button>
        </div>

        {/* 7-Day path mapping - scrollable / padded nicely */}
        <DragScrollArea axis="y" className="p-3 bg-[#FFFDF9] flex-1 max-h-[380px] overflow-y-auto overflow-x-hidden overscroll-contain relative">
          
          <div className="space-y-0.5 relative z-10 p-0.5">
            {signRewards.map((item, idx) => {
              const isClaimed = playerInfo.signInDays[idx];
              const isToday = idx === activeDay && !playerInfo.claimedToday;
              const isFuture = idx > activeDay || (idx === activeDay && playerInfo.claimedToday);

              // Connector color logic exactly mapping to visual timeline
              const getLineColor = () => {
                const nextClaimed = idx + 1 < 7 && playerInfo.signInDays[idx + 1];
                if (isClaimed && nextClaimed) return '#82C529'; // Solid green from claim to claim
                if (idx === activeDay || idx + 1 === activeDay) return '#F59E0B'; // Warm gold to today
                return '#38BDF8'; // Future cyan
              };

              const rowHeight = item.day === 7 ? 104 : 68;
              const nextRowHeight = item.day === 6 ? 104 : 68;
              const distanceToNext = (rowHeight + nextRowHeight) / 2;

              return (
                <div key={item.day} className={`flex items-center gap-4 relative ${item.day === 7 ? 'h-[104px]' : 'h-[68px]'}`}>
                  
                  {/* Left Column: Progress Dot & Beautiful Curly Connection Line */}
                  <div className="w-12 -ml-3.5 shrink-0 relative h-full transition-all">
                    {/* Day index text above dot */}
                    <span className="absolute bottom-1/2 mb-3.5 left-1/2 -translate-x-1/2 text-[10px] font-black text-[#78350F]/75 leading-none tracking-tight select-none text-center whitespace-nowrap">
                      {item.label}
                    </span>

                    {/* SVG Connector Segment starting from current dot (center) to next dot (center) */}
                    {idx < 6 && (
                      <svg
                        className="absolute top-1/2 left-0 w-12 pointer-events-none z-0 overflow-visible"
                        style={{ height: `${distanceToNext}px` }}
                        viewBox={`0 0 48 ${distanceToNext}`}
                        fill="none"
                        preserveAspectRatio="none"
                      >
                        {/* Wavy bezier path ending exactly at next center */}
                        <path
                          d={idx % 2 === 0 
                            ? `M 24 0 Q 36 ${distanceToNext / 2} 24 ${distanceToNext}`  // curves right
                            : `M 24 0 Q 12 ${distanceToNext / 2} 24 ${distanceToNext}`  // curves left
                          }
                          stroke={getLineColor()}
                          strokeWidth="3"
                          strokeDasharray="4 3"
                          strokeLinecap="round"
                        />
                        {/* Beautiful small decorative node on the peak of the curve */}
                        <circle
                          cx={idx % 2 === 0 ? "30" : "18"}
                          cy={distanceToNext / 2}
                          r="2.5"
                          fill={getLineColor()}
                          className="opacity-75"
                        />
                        <circle
                          cx={idx % 2 === 0 ? "30" : "18"}
                          cy={distanceToNext / 2}
                          r="0.8"
                          fill="white"
                        />
                      </svg>
                    )}

                    {/* Node Dot itself (Perfect vertical center guaranteed via top-1/2) */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
                      {isClaimed ? (
                        /* Beautiful Green Completed Circle */
                        <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#78350F] shadow-[0_1.5px_0_#78350F] flex items-center justify-center text-white text-[10px] font-black animate-scale-in">
                          ✓
                        </div>
                      ) : isToday ? (
                        /* Shiny Pulsing Gold Active Circle */
                        <div className="relative flex items-center justify-center">
                          <span className="absolute inline-flex h-6 w-6 rounded-full bg-amber-400/30 animate-ping" />
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-[#F59E0B] border-2 border-[#78350F] shadow-[0_1.5px_0_#78350F] flex items-center justify-center text-white text-[9px] font-black">
                            ★
                          </div>
                        </div>
                      ) : (
                        /* Beautiful cyan blue future circle */
                        <div className="w-4 h-4 rounded-full bg-[#E0F2FE] border-2 border-[#78350F] shadow-[0_1px_0_#78350F] flex items-center justify-center" />
                      )}
                    </div>
                  </div>

                  {/* Right Column: Reward Card styled elegantly with a cute cartoon look */}
                  <div className="flex-1 min-w-0 relative">
                    <div
                      onMouseEnter={() => setActiveTooltipIdx(idx)}
                      onMouseLeave={() => setActiveTooltipIdx(null)}
                      onMouseDown={() => setActiveTooltipIdx(idx)}
                      onMouseUp={() => setActiveTooltipIdx(null)}
                      onTouchStart={() => setActiveTooltipIdx(idx)}
                      onTouchEnd={() => setActiveTooltipIdx(null)}
                      onTouchCancel={() => setActiveTooltipIdx(null)}
                      className={`w-full flex items-center justify-between ${
                        item.day === 7 ? 'h-[96px] pl-3 pr-4.5 py-4' : 'h-[52px] px-3'
                      } rounded-2xl border-2 border-[#78350F] transition-all cursor-pointer select-none active:scale-[0.99] relative ${
                        item.day === 7
                          ? isToday
                            ? 'bg-gradient-to-r from-[#FFF5D6] via-[#FFEEC2] to-[#FFDC66] shadow-[0_5px_0_#9E4E06] ring-2 ring-amber-400/60'
                            : isClaimed
                            ? 'bg-[#FCF8EC] border-[#78350F]/70 opacity-90'
                            : 'bg-gradient-to-r from-[#FFFDF2] via-[#FFECC2]/90 to-[#FEF3C7] shadow-[0_4px_0_#78350F]'
                          : isToday
                          ? 'bg-[#FFE8A3] shadow-[0_3px_0_#78350F] ring-2 ring-amber-400/50'
                          : isClaimed
                          ? 'bg-[#FCF8EC] border-[#78350F]/70 opacity-90'
                          : 'bg-white shadow-[0_2px_0_#78350F]'
                      }`}
                    >
                      {/* Left Side: Dynamic single/multiple reward item layout with a unified main icon slot */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Universal Prominent Main Icon Frame */}
                        <div className="w-9 h-9 rounded-xl bg-[#FFFDF5] border border-[#78350F]/15 flex items-center justify-center shadow-inner shrink-0 relative">
                          <GameResourceIcon kind={resolveRewardKind(item.rewards[0].type)} size={24} />
                          
                          {/* Elegant corner badge for the main item's count */}
                          <span className="absolute -bottom-1 -right-1.5 px-1 py-0.2 bg-[#FFEEC2] text-[#78350F] font-black text-[8px] leading-none rounded border border-[#78350F] shadow-sm select-none">
                            x{item.rewards[0].count}
                          </span>
                        </div>

                        {/* Title & Detailed items checklist */}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-black text-[#78350F] leading-tight select-none truncate">
                            {item.day === 7 
                              ? '高阶资源箱' 
                              : item.rewards.length > 1 
                              ? `${item.rewards[0].type === 'hint' ? '提示' : '洗牌'}组合` 
                              : (item.rewards[0].type === 'gold' ? '金币奖励' : '宝石奖励')}
                          </span>
                          
                          {/* Beautiful compact miniature list of auxiliary rewards (excluding the main item which is already prominent) */}
                          {item.rewards.length > 1 && (
                            <div className="flex items-center gap-1 text-[9px] font-extrabold text-[#78350F]/65 mt-0.5 leading-none select-none truncate">
                              {item.rewards.slice(1).map((r, rIdx) => (
                                <span key={rIdx} className="inline-flex items-center gap-0.5 bg-amber-500/5 px-1 py-0.5 rounded border border-[#78350F]/5">
                                  <GameResourceIcon kind={resolveRewardKind(r.type)} size={12} />
                                  <span className="font-extrabold text-[#9E4E06] ml-0.5">x{r.count}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side: Stamp Badge */}
                      <div className="shrink-0 ml-1">
                        {isClaimed ? (
                          <div className="rotate-3 text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-200 select-none">
                            已领取
                          </div>
                        ) : isToday ? (
                          <div className="-rotate-3 text-[10px] font-extrabold text-[#D97706] bg-[#FFFBEB] px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse select-none">
                            今日
                          </div>
                        ) : isMissed(idx) && onMakeup ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); onMakeup(item.day); }}
                            className="text-[9px] font-extrabold text-white bg-gradient-to-r from-rose-500 to-orange-500 px-2 py-0.5 rounded-lg border border-rose-400 shadow-[0_1.5px_0_#9f1239] active:translate-y-0.5 active:shadow-none transition-all select-none"
                          >
                            补签
                          </button>
                        ) : (
                          <div className="text-[9px] font-extrabold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 select-none font-sans">
                            {idx === activeDay + 1 && !playerInfo.claimedToday ? '明日' : '待达'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Floating Detailed Hover Tooltip Popup Row */}
                    {activeTooltipIdx === idx && (
                      <div 
                        className={`absolute z-30 left-1/2 -translate-x-1/2 w-max max-w-[230px] bg-[#FFFCE8] border-2 border-[#78350F] rounded-2xl shadow-[0_4px_0_#78350F] p-2.5 transition-all duration-200 origin-center animate-scale-in flex flex-col gap-1.5 min-w-[155px] pointer-events-none ${
                          idx === 6 ? 'bottom-[102px]' : idx < 2 ? 'top-[58px]' : 'bottom-[58px]'
                        }`}
                      >
                        {/* Heading changed dynamically to represent the accurate gift name */}
                        <div className="text-[10px] font-black text-[#78350F]/70 text-center border-b border-[#78350F]/15 pb-1 flex items-center justify-center gap-1 select-none">
                          <span>
                            {item.day === 7 
                              ? '高阶资源箱' 
                              : item.rewards.length > 1 
                              ? `${item.rewards[0].type === 'hint' ? '提示' : '洗牌'}组合` 
                              : `${item.rewards[0].type === 'gold' ? '金币奖励' : '宝石奖励'}`
                            }
                          </span>
                        </div>

                        {/* Items List */}
                        <div className="flex flex-col gap-1">
                          {item.rewards.map((r, rIdx) => (
                            <div key={rIdx} className="flex items-center justify-between gap-3 bg-[#FFFDF5] border border-[#78350F]/10 rounded-xl px-2 py-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="shrink-0">
                                  <GameResourceIcon kind={resolveRewardKind(r.type)} size={16} />
                                </span>
                                <span className="text-[9px] font-bold text-[#78350F] truncate">
                                  {r.type === 'hint' || r.type === 'shuffle'
                                    ? `${getGameResourceLabel(resolveRewardKind(r.type))}道具`
                                    : getGameResourceLabel(resolveRewardKind(r.type))}
                                </span>
                              </div>
                              <span className="text-[9px] font-black text-[#D97706] shrink-0">
                                x{r.count}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Little decorative arrow pointing to the node */}
                        <div className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#FFFCE8] rotate-45 border-[#78350F] ${
                          idx === 6
                            ? 'bottom-[-5px] border-r-2 border-b-2'
                            : idx < 2 
                            ? 'top-[5px] border-l-2 border-t-2' 
                            : 'bottom-[-5px] border-r-2 border-b-2'
                        }`} />
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </DragScrollArea>

        {/* Big Action button */}
        <div className="p-4 bg-[#FFEEC2] border-t-2 border-[#78350F] text-center">
          {playerInfo.claimedToday ? (
            <button
              disabled
              className="w-full py-3 bg-[#DCDCDC] text-gray-500 font-black text-sm rounded-2xl border-4 border-[#A9A9A9] shadow-inner cursor-not-allowed"
            >
              今日奖励已领取
            </button>
          ) : (
            <button
              onClick={onClaimSignIn}
              className="w-full py-3 bg-gradient-to-r from-[#F59E0B] to-[#F97316] select-none text-white hover:from-[#F97316] hover:to-[#EA580C] font-black text-sm rounded-2xl border-4 border-[#78350F] shadow-[0_4px_0_#9E4E06] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wide"
              id="claim-today-signin-btn"
            >
              领取今日奖励
            </button>
          )}
        </div>
      </div>
    </ShellModal>
  );
};
