import React, { useState } from 'react';
import { Check, Gift, X } from 'lucide-react';

import { ShellModal } from './shell/ShellModal';

interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRedeemReward: (rewards: { coins: number; diamonds: number; undo?: number; shuffle?: number; hint?: number; upgrade?: number; title: string }) => void;
}

export const RedeemModal: React.FC<RedeemModalProps> = ({
  isOpen,
  onClose,
  onRedeemReward,
}) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    if (cleanCode === 'SAMPLE') {
      onRedeemReward({ coins: 1000, diamonds: 50, undo: 1, shuffle: 1, hint: 1, upgrade: 1, title: '示例全资源礼包' });
      setStatus('success');
      setMsg('成功兑换：金币 x1000、宝石 x50、全部道具 +1');
      setCode('');
    } else if (cleanCode === 'BOOST') {
      onRedeemReward({ coins: 500, diamonds: 10, title: '资源加速礼包' });
      setStatus('success');
      setMsg('成功兑换：金币 x500、宝石 x10');
      setCode('');
    } else if (cleanCode === 'UPGRADE') {
      onRedeemReward({ coins: 0, diamonds: 0, upgrade: 2, title: '强化测试礼包' });
      setStatus('success');
      setMsg('成功兑换：升级道具 x2');
      setCode('');
    } else {
      setStatus('error');
      setMsg('兑换码无效或已使用，请检查输入内容。');
    }
  };

  return (
    <ShellModal>
      <div className="relative flex w-full max-w-[360px] flex-col overflow-hidden rounded-[28px] border border-[rgba(83,101,122,0.16)] bg-[rgba(255,255,255,0.98)] font-sans shadow-[0_24px_48px_rgba(38,54,72,0.16)] backdrop-blur-sm animate-scale-up">
        <div className="flex items-center justify-between border-b border-[rgba(83,101,122,0.12)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff3ea] text-[#e38b54]">
              <Gift className="h-4.5 w-4.5 stroke-[2.2]" />
            </span>
            <div>
              <h2 className="text-[20px] font-black text-[var(--shell-ink)]">礼包兑换</h2>
              <p className="text-[11px] font-bold text-[var(--shell-ink-soft)]">给当前示例进度发放测试资源</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              setStatus('idle');
              setMsg('');
              setCode('');
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(83,101,122,0.12)] bg-white text-[var(--shell-ink-soft)] shadow-[0_8px_16px_rgba(38,54,72,0.08)]"
            id="close-redeem-btn"
          >
            <X className="h-4.5 w-4.5 stroke-[2.8]" />
          </button>
        </div>

        <div className="space-y-4 bg-[#f8fbff] p-5 text-center">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setStatus('idle');
              }}
              placeholder="输入测试兑换码"
              className="w-full rounded-[18px] border border-[rgba(83,101,122,0.14)] bg-white px-4 py-3 text-center text-sm font-black uppercase text-[var(--shell-ink)] shadow-[inset_0_1px_3px_rgba(38,54,72,0.05)] outline-none focus:border-[var(--shell-accent)]"
            />
            <button
              type="submit"
              className="w-full rounded-[18px] bg-[var(--shell-accent)] px-4 py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(92,141,246,0.24)] transition-all hover:brightness-[1.03] active:scale-[0.99]"
            >
              立即兑换
            </button>
          </form>

          {status !== 'idle' ? (
            <div
              className={`rounded-[20px] border px-4 py-3 text-left text-xs font-bold leading-relaxed ${
                status === 'success'
                  ? 'border-[#ccebd5] bg-[#eefaf2] text-[#2c6c3f]'
                  : 'border-[#f5c8cf] bg-[#fff1f4] text-[#b64a60]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    status === 'success' ? 'bg-[#4d9463] text-white' : 'bg-[#df6867] text-white'
                  }`}
                >
                  {status === 'success' ? <Check className="h-4 w-4 stroke-[3]" /> : <X className="h-4 w-4 stroke-[3]" />}
                </span>
                <span>{msg}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ShellModal>
  );
};
