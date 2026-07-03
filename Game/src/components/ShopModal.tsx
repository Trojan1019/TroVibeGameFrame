import React, { useState } from 'react';
import { Check, ShieldCheck, Sparkles, X } from 'lucide-react';
import { PlayerInfo, ItemInventory, ItemType } from '../types';
import { DragScrollArea } from './shell/DragScrollArea';
import { GameResourceIcon } from './shell/GameResourceIcon';
import { ShellModal } from './shell/ShellModal';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerInfo: PlayerInfo;
  inventory: ItemInventory;
  onBuyItem: (itemType: ItemType, priceInCoins: number) => void;
  onExchangeGems: (gemsCost: number, coinsGain: number) => void;
  onBuyDiamonds: (amount: number) => void;
  onBuyNoAds: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  playerInfo,
  inventory,
  onBuyItem,
  onExchangeGems,
  onBuyDiamonds,
  onBuyNoAds,
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleActionWithFeedback = (msg: string, action: () => void) => {
    action();
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 1500);
  };

  const items = [
    {
      id: 'hint' as ItemType,
      name: '提示道具',
      price: 1000,
      stock: inventory.hint,
    },
    {
      id: 'undo' as ItemType,
      name: '撤销道具',
      price: 1500,
      stock: inventory.undo,
    },
    {
      id: 'shuffle' as ItemType,
      name: '洗牌道具',
      price: 2000,
      stock: inventory.shuffle,
    },
    {
      id: 'upgrade' as ItemType,
      name: '升级道具',
      price: 3000,
      stock: inventory.upgrade,
    },
  ];

  // Horizontally scrollable hot exchange / topup items
  const hotDeals = [
    {
      type: 'exchange',
      gems: 10,
      coins: 1000,
      label: '10 钻石 换 1000金',
      action: () => onExchangeGems(10, 1000),
      canAfford: playerInfo.diamonds >= 10,
      rewardKind: 'coins' as const,
    },
    {
      type: 'exchange',
      gems: 50,
      coins: 6000,
      label: '50 钻石 换 6000金',
      action: () => onExchangeGems(50, 6000),
      canAfford: playerInfo.diamonds >= 50,
      rewardKind: 'coins' as const,
      badge: '超值',
    },
    {
      type: 'topup',
      gems: 60,
      price: 6,
      label: '充值 60 钻石',
      action: () => onBuyDiamonds(60),
      canAfford: true,
      rewardKind: 'diamonds' as const,
    },
    {
      type: 'topup',
      gems: 330,
      price: 30,
      label: '充值 330 钻石',
      action: () => onBuyDiamonds(330),
      canAfford: true,
      rewardKind: 'diamonds' as const,
      badge: '+30钻石',
    },
  ];

  return (
    <ShellModal containerClassName="font-sans">
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] border border-[rgba(83,101,122,0.16)] bg-[rgba(255,255,255,0.98)] flex flex-col shadow-[0_24px_48px_rgba(38,54,72,0.16)] backdrop-blur-sm animate-scale-up">
        
        {/* Header styling */}
        <div className="flex items-center justify-between border-b border-[rgba(83,101,122,0.12)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4fb] text-[var(--shell-accent)]">
              <Sparkles className="h-4.5 w-4.5 stroke-[2.4]" />
            </span>
            <div>
              <h2 className="text-[20px] font-black text-[var(--shell-ink)]">道具商店</h2>
              <p className="text-[11px] font-bold text-[var(--shell-ink-soft)]">资源兑换、库存补充与免广告测试</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(83,101,122,0.12)] bg-white text-[var(--shell-ink-soft)] shadow-[0_8px_16px_rgba(38,54,72,0.08)] transition-all text-xs"
            id="close-shop-btn"
          >
            <X className="h-4.5 w-4.5 stroke-[2.8]" />
          </button>
        </div>

        {/* Dynamic Balance Tracker */}
        <div className="px-4 py-3 bg-[#f9fbfe] border-b border-[rgba(83,101,122,0.10)] flex items-center justify-between text-[11px] font-black text-[var(--shell-ink)] select-none">
          <div className="flex items-center gap-1">
            <GameResourceIcon kind="coins" size={16} />
            <span>金币: <span className="text-amber-700">{playerInfo.coins.toLocaleString()}</span></span>
          </div>
          <div className="flex items-center gap-1">
            <GameResourceIcon kind="diamonds" size={16} />
            <span>宝石: <span className="text-cyan-600">{playerInfo.diamonds}</span></span>
          </div>
        </div>

        {/* Scrollable Single Body Panel */}
        <DragScrollArea axis="y" className="px-4 py-3 flex-1 flex flex-col gap-3 max-h-[350px] overflow-y-auto overscroll-contain scrollbar-none bg-[#f8fbff] select-none">
          
          {/* Action Feedback Overlay / Banner */}
          {feedbackMsg && (
            <div className="py-1 px-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black rounded-lg text-center animate-fade-in flex items-center justify-center gap-1 max-w-full shrink-0 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#4d9463]" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* 1. TOP PREMIUM BANNER (免广告卡) */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 border-2 border-[#78350F] flex items-center justify-between p-2 shadow-sm min-h-[52px]">
            <div className="absolute inset-x-0 bottom-0 top-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
            
            <div className="flex items-center gap-1.5 z-10">
              <div className="w-7 h-7 rounded-lg bg-white/30 border border-[#78350F]/15 flex items-center justify-center shrink-0 shadow-inner">
                <ShieldCheck className="w-4.5 h-4.5 text-amber-950 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[10px] font-black text-amber-950 tracking-tight flex items-center gap-1">
                  <span>终身免广告金卡</span>
                  <span className="text-[7.5px] bg-amber-950 text-amber-300 font-extrabold px-1 rounded scale-90 origin-left">永久</span>
                </h3>
                <div className="flex items-center gap-1 mt-0.5 select-none font-bold text-[8px] text-amber-950/80">
                  <span>送</span>
                  <GameResourceIcon kind="coins" size={14} />
                  <span className="font-extrabold text-amber-950">2000</span>
                  <span>+</span>
                  <GameResourceIcon kind="diamonds" size={14} />
                  <span className="font-extrabold text-amber-950">20</span>
                </div>
              </div>
            </div>

            {playerInfo.hasNoAds ? (
              <div className="z-10 bg-emerald-100 border border-emerald-400 text-emerald-700 rounded-lg px-2 py-1 text-[8px] font-black flex items-center gap-0.5 shadow-sm">
                <Check className="w-2.5 h-2.5 stroke-[4.5]" />
                <span>已开通</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleActionWithFeedback('恭喜解锁免广告终身特权！获取礼包：金币+2000, 宝石+20', onBuyNoAds)
                }
                className="z-10 rounded-[14px] bg-[#ff6f91] px-3 py-1.5 text-[9px] font-black leading-none text-white shadow-[0_10px_18px_rgba(255,111,145,0.24)] transition-all active:scale-[0.99] flex flex-col items-center justify-center"
              >
                <span>立即开通</span>
                <span className="text-[7.5px] font-black text-rose-100 mt-0.5">¥12</span>
              </button>
            )}
          </div>

          {/* 2. MIDDLE GRID: utility items */}
          <div className="flex flex-col gap-1.5">
            {/* Styled Wood sign header icon */}
            <div className="flex items-center gap-1 text-[10px] font-black text-[var(--shell-ink-soft)] select-none pb-0.5 border-b border-[rgba(83,101,122,0.08)]">
              <span className="w-1.5 h-3 rounded-sm bg-[var(--shell-accent)]" />
              <span>局内辅助道具</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {items.map((opt) => {
                const canAfford = playerInfo.coins >= opt.price;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!canAfford}
                    onClick={() =>
                      handleActionWithFeedback(`成功解锁 1个 ${opt.name}!`, () =>
                        onBuyItem(opt.id, opt.price)
                      )
                    }
                    className={`relative h-24 shrink-0 rounded-[22px] border border-[rgba(83,101,122,0.12)] bg-white p-2 text-center shadow-[0_10px_20px_rgba(38,54,72,0.06)] transition-all select-none focus:outline-none ${
                      canAfford
                        ? 'hover:bg-[#f8fbff] cursor-pointer active:scale-[0.99]'
                        : 'opacity-75 cursor-not-allowed'
                    }`}
                  >
                    {/* Icon wrapper */}
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f8fb] p-1 shadow-inner">
                      <GameResourceIcon kind={opt.id} size={20} framed={false} />
                    </div>

                    {/* Title */}
                    <span className="text-[10px] font-black text-[var(--shell-ink)] leading-none tracking-wide">
                      {opt.name}
                    </span>

                    {/* Price button-like badge with styled yellow Coin */}
                    <div className={`mt-0.5 flex w-full items-center justify-center gap-0.5 rounded-full px-1 py-1 text-[9px] font-black transition-colors ${
                      canAfford
                        ? 'bg-[#eef4ff] text-[var(--shell-accent)]'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <GameResourceIcon kind="coins" size={14} className={canAfford ? '' : 'grayscale opacity-60'} />
                      <span>{opt.price}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. BOTTOM SLIDER: GEMS & COINS HOT DEALS (宝石/充值横向滚动) */}
          <div className="flex flex-col gap-1.5 mt-0.5">
            <div className="flex items-center gap-1 text-[10px] font-black text-[var(--shell-ink-soft)] select-none pb-0.5 border-b border-[rgba(83,101,122,0.08)]">
              <span className="w-1.5 h-3 rounded-sm bg-[#25b4d6]" />
              <span>宝石兑换 & 充值</span>
            </div>

            {/* Horizontal deck */}
            <DragScrollArea axis="x" className="flex gap-2.5 overflow-x-auto py-1 px-0.5 custom-scrollbar scrollbar-none snap-x overflow-y-hidden">
              {hotDeals.map((deal, idx) => {
                const canPress = deal.canAfford;
                return (
                  <div
                    key={idx}
                    className={`relative w-[92px] shrink-0 rounded-[22px] border border-[rgba(83,101,122,0.12)] p-2 flex flex-col items-center text-center justify-between shadow-[0_10px_20px_rgba(38,54,72,0.06)] snap-start select-none ${
                      deal.type === 'exchange'
                        ? 'bg-[#fffdfa]'
                        : 'bg-[#fbfdff]'
                    }`}
                  >
                    {deal.badge && (
                      <span className="absolute -top-1.5 -right-1 rounded-full bg-[#ff8aa6] px-1.5 py-0.5 text-[7px] font-black text-white scale-90 origin-right animate-pulse">
                        {deal.badge}
                      </span>
                    )}

                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f8fb] shrink-0">
                      <GameResourceIcon kind={deal.rewardKind} size={20} />
                    </div>

                    <div className="flex flex-col items-center my-1 select-none">
                      <span className="text-[8px] font-bold text-[var(--shell-ink-soft)] leading-none whitespace-nowrap scale-95 scale-x-90">
                        {deal.type === 'exchange' ? '可换金币' : '充值送宝石'}
                      </span>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {deal.type === 'exchange' ? (
                          <>
                            <GameResourceIcon kind="coins" size={16} />
                            <span className="text-[9.5px] font-black text-[var(--shell-ink)] leading-none">
                              {deal.coins}
                            </span>
                          </>
                        ) : (
                          <>
                            <GameResourceIcon kind="diamonds" size={16} />
                            <span className="text-[9.5px] font-black text-[var(--shell-ink)] leading-none">
                              {deal.gems}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canPress}
                      onClick={() =>
                        handleActionWithFeedback(
                          deal.type === 'exchange'
                            ? `成功兑换 ${deal.coins} 金币!`
                            : `成功充值 ${deal.gems} 钻石!`,
                          deal.action
                        )
                      }
                      className={`w-full rounded-full py-1.5 text-[9.5px] font-black transition-all flex items-center justify-center gap-0.5 ${
                        canPress
                          ? deal.type === 'exchange'
                            ? 'bg-[#eef4ff] text-[var(--shell-accent)] cursor-pointer active:scale-[0.99]'
                            : 'bg-[var(--shell-accent)] text-white cursor-pointer shadow-[0_10px_18px_rgba(92,141,246,0.24)] active:scale-[0.99]'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {deal.type === 'exchange' ? (
                        <>
                          <GameResourceIcon kind="diamonds" size={12} className={deal.canAfford ? '' : 'grayscale opacity-60'} />
                          <span>{deal.gems}</span>
                        </>
                      ) : (
                        <span>¥ {deal.price}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </DragScrollArea>
          </div>

        </DragScrollArea>

        {/* Footer static hint overlay text */}
        <div className="px-4 py-3 flex justify-center items-center bg-[#f9fbfe] border-t border-[rgba(83,101,122,0.10)] text-[9px] font-black text-[var(--shell-ink-soft)]">
          <span>每日完成日常任务或开启新信件均可获得额外资源</span>
        </div>

      </div>
    </ShellModal>
  );
};
