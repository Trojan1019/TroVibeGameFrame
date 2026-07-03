import React from 'react';
import { Package2, X } from 'lucide-react';

import { ItemInventory, ItemType } from '../types';
import { GameResourceIcon } from './shell/GameResourceIcon';
import { ShellModal } from './shell/ShellModal';

interface BagModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: ItemInventory;
  onUseItem: (type: ItemType) => void;
}

export const BagModal: React.FC<BagModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onUseItem,
}) => {
  if (!isOpen) return null;

  const items = [
    { id: 'undo' as ItemType, name: '撤销', desc: '回退一步', count: inventory.undo, accent: 'text-[#5f87cc] bg-[#edf5ff]' },
    { id: 'shuffle' as ItemType, name: '洗牌', desc: '重排当前局面', count: inventory.shuffle, accent: 'text-[#4d9463] bg-[#eff8f1]' },
    { id: 'hint' as ItemType, name: '提示', desc: '推荐一步', count: inventory.hint, accent: 'text-[#d49839] bg-[#fff7e8]' },
    { id: 'upgrade' as ItemType, name: '升级', desc: '强化目标格', count: inventory.upgrade, accent: 'text-[#d66868] bg-[#fff0ef]' },
  ];

  return (
    <ShellModal>
      <div className="relative flex w-full max-w-[360px] flex-col overflow-hidden rounded-[28px] border border-[rgba(83,101,122,0.16)] bg-[rgba(255,255,255,0.98)] font-sans shadow-[0_24px_48px_rgba(38,54,72,0.16)] backdrop-blur-sm animate-scale-up">
        <div className="flex items-center justify-between border-b border-[rgba(83,101,122,0.12)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4fb] text-[var(--shell-accent)]">
              <Package2 className="h-4.5 w-4.5 stroke-[2.4]" />
            </span>
            <div>
              <h2 className="text-[20px] font-black tracking-[0.08em] text-[var(--shell-ink)]">背包</h2>
              <p className="text-[11px] font-bold text-[var(--shell-ink-soft)]">局内道具与测试库存</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(83,101,122,0.12)] bg-white text-[var(--shell-ink-soft)] shadow-[0_8px_16px_rgba(38,54,72,0.08)] transition-all hover:text-[var(--shell-ink)]"
            id="close-bag-btn"
          >
            <X className="h-4.5 w-4.5 stroke-[2.8]" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-[#f7fafc] p-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative flex flex-col items-center rounded-[24px] border border-[rgba(83,101,122,0.12)] bg-white p-4 text-center shadow-[0_10px_20px_rgba(38,54,72,0.06)]"
            >
              <span className="absolute right-3 top-3 rounded-full bg-[#edf3fb] px-2 py-0.5 text-[10px] font-black text-[var(--shell-ink-soft)]">
                x{item.count}
              </span>
              <div className={`mb-3 mt-1 flex h-14 w-14 items-center justify-center rounded-full ${item.accent}`}>
                <GameResourceIcon kind={item.id} size={28} framed={false} />
              </div>
              <h3 className="text-[15px] font-black text-[var(--shell-ink)]">{item.name}</h3>
              <p className="mt-1 text-[11px] font-bold text-[var(--shell-ink-soft)]">{item.desc}</p>
              <button
                onClick={() => item.count > 0 && onUseItem(item.id)}
                disabled={item.count === 0}
                className={`mt-4 w-full rounded-full px-3 py-2 text-[13px] font-black transition-all ${
                  item.count > 0
                    ? 'bg-[var(--shell-accent)] text-white shadow-[0_10px_18px_rgba(92,141,246,0.24)] hover:brightness-[1.03] active:scale-[0.99]'
                    : 'bg-[#eef2f6] text-[#a0aebe]'
                }`}
              >
                {item.count > 0 ? '使用' : '无存货'}
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-[rgba(83,101,122,0.10)] bg-[#f9fbfe] px-4 py-3">
          <p className="text-[11px] font-bold leading-relaxed text-[var(--shell-ink-soft)]">
            道具层只负责验证外部流程和反馈节奏，不再保留 mascot 或额外剧情提示。
          </p>
        </div>
      </div>
    </ShellModal>
  );
};
