import React, { useState } from 'react';
import { MailMessage } from '../types';
import { Mail, Check, Sparkles, X } from 'lucide-react';
import { DragScrollArea } from './shell/DragScrollArea';
import { GameResourceIcon, getGameResourceLabel } from './shell/GameResourceIcon';
import { ShellModal } from './shell/ShellModal';

interface MailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mailList: MailMessage[];
  onClaimMail: (mailId: string) => void;
  onClaimAll: () => void;
  onDeleteAllRead: () => void;
  onDeleteMail?: (mailId: string) => void;
  onReadMail?: (mailId: string) => void;
}

export const MailModal: React.FC<MailModalProps> = ({
  isOpen,
  onClose,
  mailList,
  onClaimMail,
  onClaimAll,
  onDeleteAllRead,
  onDeleteMail,
  onReadMail,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const unreadCount = mailList.filter((m) => !m.isRead).length;
  const claimableCount = mailList.filter((m) => !m.isClaimed && (m.coins > 0 || m.diamonds > 0 || (m.items && m.items.length > 0))).length;

  return (
    <ShellModal>
      <div className="relative flex w-full max-w-[360px] flex-col overflow-hidden rounded-[28px] border border-[rgba(83,101,122,0.16)] bg-[rgba(255,255,255,0.98)] font-sans shadow-[0_24px_48px_rgba(38,54,72,0.16)] backdrop-blur-sm animate-scale-up">
        <div className="flex items-center justify-between border-b border-[rgba(83,101,122,0.12)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4fb] text-[var(--shell-accent)]">
              <Mail className="h-4.5 w-4.5 stroke-[2.4]" />
            </span>
            <div>
              <h2 className="text-[20px] font-black text-[var(--shell-ink)]">邮箱</h2>
              <p className="text-[11px] font-bold text-[var(--shell-ink-soft)]">邮件、附件和批量领取</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(83,101,122,0.12)] bg-white text-[var(--shell-ink-soft)] shadow-[0_8px_16px_rgba(38,54,72,0.08)]"
            id="close-mail-btn"
          >
            <X className="h-4.5 w-4.5 stroke-[2.8]" />
          </button>
        </div>

        <div className="flex items-center justify-around border-b border-[rgba(83,101,122,0.10)] bg-[#f9fbfe] px-4 py-3 text-xs font-bold text-[var(--shell-ink)]">
          <div className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 text-[var(--shell-accent)]" />
            <span>未读 <span className="text-[var(--shell-accent)]">{unreadCount}</span></span>
          </div>
          <div className="h-4 w-px bg-[rgba(83,101,122,0.12)]" />
          <div className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#d85f9f]" />
            <span>待领取 <span className="text-[#d85f9f]">{claimableCount}</span></span>
          </div>
        </div>

        <DragScrollArea axis="y" className="flex-1 max-h-[320px] overflow-y-auto overscroll-contain bg-[#f8fbff] p-4 space-y-2.5">
          {mailList.length === 0 ? (
            <div className="text-center py-10 text-[#A16207]/60 text-sm font-bold">
              邮箱空空的哦~
            </div>
          ) : (
            mailList.map((mail) => {
              const isExpanded = expandedId === mail.id;
              return (
                <div
                  key={mail.id}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : mail.id);
                    if (!mail.isRead) {
                      onReadMail?.(mail.id);
                    }
                  }}
                  className={`p-3 rounded-[22px] border transition-all relative cursor-pointer shadow-[0_10px_20px_rgba(38,54,72,0.06)] ${
                    mail.isRead ? 'bg-[#f5f8fb] border-[rgba(83,101,122,0.08)] opacity-85' : 'bg-white border-[rgba(83,101,122,0.12)]'
                  }`}
                >
                  {/* Red Dot Alert for new/unclaimed messages */}
                  {!mail.isClaimed && (
                      <span className="absolute top-3 right-3 rounded-full bg-[#eef4ff] px-2 py-0.5 text-[9px] text-[var(--shell-accent)] font-black">
                        NEW
                      </span>
                  )}

                  {/* Header / Title row with time */}
                  <div className="flex items-center justify-between gap-2 mb-1 select-none pr-6">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[var(--shell-ink)] min-w-0 flex-1">
                      <GameResourceIcon kind="chest" size={18} />
                      <span className="truncate">{mail.title}</span>
                    </div>
                    <span className="text-[9px] text-[var(--shell-ink-soft)] font-bold shrink-0">{mail.time}</span>
                  </div>

                  {/* If NOT expanded, show single line containing rewards of this mail + action button on the right */}
                  {!isExpanded ? (
                    <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-[#78350F]/10">
                      {/* Rewards Compressed Line */}
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--shell-ink-soft)] font-bold whitespace-nowrap overflow-hidden text-ellipsis select-none">
                          {mail.coins > 0 && (
                            <span className="inline-flex items-center gap-0.5 shrink-0">
                              <GameResourceIcon kind="coins" size={16} />
                              <span>金币+{mail.coins}</span>
                            </span>
                          )}
                          {mail.diamonds > 0 && (
                            <span className="inline-flex items-center gap-0.5 shrink-0">
                              <GameResourceIcon kind="diamonds" size={16} />
                              <span>宝石+{mail.diamonds}</span>
                            </span>
                          )}
                          {mail.items && mail.items.map((it, idx) => (
                            <span key={idx} className="inline-flex items-center gap-0.5 shrink-0">
                              <GameResourceIcon kind={it.type} size={13} />
                              <span>{getGameResourceLabel(it.type)}+{it.count}</span>
                            </span>
                          ))}
                          {mail.coins === 0 && mail.diamonds === 0 && (!mail.items || mail.items.length === 0) && (
                            <span className="text-[var(--shell-ink-soft)]/70 text-[9px]">无奖励</span>
                          )}
                        </div>
                      </div>

                      {/* Right button */}
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        {mail.isClaimed ? (
                          <div className="flex items-center gap-0.5 text-[10px] text-green-600 font-extrabold bg-green-50 px-2 py-0.5 rounded-lg border border-green-200 select-none">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>已领</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onClaimMail(mail.id)}
                            className="rounded-full bg-[var(--shell-accent)] px-3 py-1 text-[10px] font-extrabold text-white shadow-[0_10px_18px_rgba(92,141,246,0.24)] transition-all active:scale-[0.99]"
                          >
                            领取
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* If EXPANDED, show detailed content, detailed rewards block, and the bottom actions: Delete & Claim */
                    <div className="mt-2 pt-2 border-t border-[#78350F]/10 space-y-2 animate-fade-in text-[11px] font-bold">
                      {/* Full Mail Content */}
                      <p className="text-[#78350F]/80 leading-relaxed font-semibold break-all whitespace-pre-wrap select-text pr-1">
                        {mail.content}
                      </p>

                      {/* Detailed Expanded Rewards Panel */}
                      <div className="bg-[#f5f8fb] p-2 rounded-xl border border-[rgba(83,101,122,0.10)] select-none">
                        <div className="text-[10px] text-[var(--shell-ink-soft)] mb-1 text-left">附件奖励：</div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          {mail.coins > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#D97706]">
                              <GameResourceIcon kind="coins" size={16} />
                              <span>金币 +{mail.coins}</span>
                            </div>
                          )}
                          {mail.diamonds > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#EC4899]">
                              <GameResourceIcon kind="diamonds" size={16} />
                              <span>宝石 +{mail.diamonds}</span>
                            </div>
                          )}
                          {mail.items && mail.items.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-[10px] font-bold text-[#10B981]">
                              <GameResourceIcon kind={it.type} size={16} />
                              <span>{getGameResourceLabel(it.type)} +{it.count}</span>
                            </div>
                          ))}
                          {mail.coins === 0 && mail.diamonds === 0 && (!mail.items || mail.items.length === 0) && (
                            <span className="text-[var(--shell-ink-soft)] text-[10px]">没有附件奖励</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons list */}
                      <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            onDeleteMail?.(mail.id);
                            if (expandedId === mail.id) setExpandedId(null);
                          }}
                          className="flex-1 rounded-full bg-[#fff1f4] py-2 text-[10px] font-extrabold text-[#b64a60] transition-all active:scale-[0.99]"
                        >
                          删除
                        </button>
                        {mail.isClaimed ? (
                          <div className="flex-1 py-1 bg-gray-150 text-gray-400 font-extrabold text-[10px] rounded-lg border-2 border-gray-300 flex items-center justify-center gap-1 select-none">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>已领取</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onClaimMail(mail.id)}
                            className="flex-1 rounded-full bg-[var(--shell-accent)] py-2 text-[10px] font-extrabold text-white shadow-[0_10px_18px_rgba(92,141,246,0.24)] transition-all active:scale-[0.99]"
                          >
                            领取
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </DragScrollArea>

        {/* Bottom Actions */}
        <div className="flex gap-3 justify-between border-t border-[rgba(83,101,122,0.10)] bg-[#f9fbfe] p-4 text-xs font-bold">
          <button
            onClick={onDeleteAllRead}
            className="flex-1 rounded-[18px] bg-white py-3 text-[var(--shell-ink)] shadow-[0_10px_20px_rgba(38,54,72,0.08)] transition-all active:scale-[0.99]"
            id="clear-read-btn"
          >
            一键删除已读
          </button>
          <button
            onClick={onClaimAll}
            className="flex-1 rounded-[18px] bg-[var(--shell-accent)] py-3 text-white shadow-[0_12px_24px_rgba(92,141,246,0.24)] transition-all active:scale-[0.99]"
            id="batch-claim-btn"
          >
            一键领取
          </button>
        </div>
      </div>
    </ShellModal>
  );
};
