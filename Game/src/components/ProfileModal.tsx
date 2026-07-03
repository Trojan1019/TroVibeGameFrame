import React, { useState, useEffect } from 'react';
import { X, User, Edit2, Check } from 'lucide-react';
import { PlayerInfo } from '../types';
import { UniversalAvatar } from './AnimalAvatarsSvg';
import { DragScrollArea } from './shell/DragScrollArea';
import { ShellModal } from './shell/ShellModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerInfo: PlayerInfo;
  onUpdateProfile: (nickname: string, avatarId: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  playerInfo,
  onUpdateProfile,
}) => {
  const [nickname, setNickname] = useState(playerInfo.nickname);
  const [selectedAvatarId, setSelectedAvatarId] = useState(playerInfo.avatarId);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  
  // Toggle states
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);

  // Reset when the modal opens or playerInfo updates
  useEffect(() => {
    if (isOpen) {
      setNickname(playerInfo.nickname);
      setSelectedAvatarId(playerInfo.avatarId);
      setSaveStatus('idle');
      setIsEditingAvatar(false);
      setIsEditingNickname(false);
    }
  }, [isOpen, playerInfo]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;

    onUpdateProfile(trimmed, selectedAvatarId);
    setSaveStatus('success');
    
    // Auto closes after short feedback delay
    setTimeout(() => {
      setSaveStatus('idle');
      onClose();
    }, 750);
  };

  const userId = "SAMPLE-USER-001";

  // List of all 10 distinct, cute animal avatars with corresponding naming settings
  const avatarOptions = [
    { id: 'player', name: '默认形象' },
    { id: 'fox', name: '狐狸阿皮' },
    { id: 'bear', name: '小熊墩墩' },
    { id: 'rabbit', name: '兔兔果冻' },
    { id: 'hamster', name: '仓鼠米粒' },
    { id: 'cat', name: '妙妙橘猫' },
    { id: 'dog', name: '乖乖金毛' },
    { id: 'panda', name: '滚滚熊猫' },
    { id: 'frog', name: '呱呱青蛙' },
    { id: 'tiger', name: '嗷嗷老虎' },
  ];

  const hasChanges = nickname.trim() !== playerInfo.nickname || selectedAvatarId !== playerInfo.avatarId;

  return (
    <ShellModal containerClassName="font-sans">
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] border border-[rgba(83,101,122,0.16)] bg-[rgba(255,255,255,0.98)] flex flex-col shadow-[0_24px_48px_rgba(38,54,72,0.16)] backdrop-blur-sm animate-scale-up">
        
        {/* Header styling */}
        <div className="flex items-center justify-between border-b border-[rgba(83,101,122,0.12)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4fb] text-[var(--shell-accent)]">
              <User className="h-4.5 w-4.5 stroke-[2.4]" />
            </span>
            <div>
              <h2 className="text-[20px] font-black text-[var(--shell-ink)]">个人档案</h2>
              <p className="text-[11px] font-bold text-[var(--shell-ink-soft)]">昵称与头像管理</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(83,101,122,0.12)] bg-white text-[var(--shell-ink-soft)] shadow-[0_8px_16px_rgba(38,54,72,0.08)] transition-all animate-none"
            id="close-profile-btn"
          >
            <X className="h-4.5 w-4.5 stroke-[2.8]" />
          </button>
        </div>

        {/* Content body */}
        <DragScrollArea axis="y" className="p-4 flex-1 space-y-3 overflow-y-auto overscroll-contain max-h-[440px] scrollbar-none">
          
          {/* User ID and Level metrics */}
          <div className="bg-[#FFFDF4] border-2 border-[#78350F] rounded-xl p-2.5 space-y-2 shadow-[0_1.5px_0_rgba(120,53,15,0.1)] relative">
            
            {/* Deterministic User details */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-extrabold text-[#78350F]/70">玩家标识:</span>
              <span className="font-black text-amber-950 font-mono tracking-wider bg-orange-100/50 px-2 py-0.5 rounded-lg border border-[#78350F]/15">
                {userId}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#78350F]/10">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-[#78350F]/70">当前等级:</span>
                <span className="font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-300/30 text-[9px]">
                  Lv.{playerInfo.level}
                </span>
              </div>
              <span className="text-[9px] font-bold text-[#A17C5B]">经验值: 350 / 500</span>
            </div>

            {/* Level progression bar */}
            <div className="relative w-full h-2.5 bg-amber-900/10 border-2 border-[#78350F] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-300" 
                style={{ width: '70%' }}
              />
            </div>
          </div>

          {/* Inline avatar & nickname display block */}
          <div className="bg-[#FFFDF4] border-2 border-[#78350F] rounded-xl p-2 shadow-md select-none gap-1.5 flex items-center justify-between">
            {/* Avatar block on the left */}
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full border-2 border-[#78350F] bg-[#FED7AA] flex items-center justify-center overflow-hidden shrink-0">
                <div className="w-6.5 h-6.5 flex items-center justify-center">
                  <UniversalAvatar id={selectedAvatarId} />
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setIsEditingAvatar(!isEditingAvatar);
                  setIsEditingNickname(false);
                }}
                className={`p-1 px-1.5 rounded-lg border border-[#78350F]/20 text-[#78350F]/70 shadow-sm active:translate-y-0.5 transition-all text-[10px] font-black flex items-center gap-0.5 h-6 ${
                  isEditingAvatar ? 'bg-amber-100 border-[#78350F] text-amber-800' : 'bg-white hover:bg-[#FFFDF4]'
                }`}
              >
                <Edit2 className="w-2.5 h-2.5 text-amber-600" />
                <span>换头像</span>
              </button>
            </div>

            {/* Nickname block on the right */}
            <div className="flex items-center gap-1.5 max-w-[50%] justify-end">
              <span className="text-[11px] font-black text-[#78350F] truncate" title={nickname}>
                {nickname}
              </span>
              
              <button
                type="button"
                onClick={() => {
                  setIsEditingNickname(!isEditingNickname);
                  setIsEditingAvatar(false);
                }}
                className={`p-1 px-1.5 rounded-lg border border-[#78350F]/20 text-[#78350F]/70 shadow-sm active:translate-y-0.5 transition-all text-[10px] font-black flex items-center gap-0.5 h-6 ${
                  isEditingNickname ? 'bg-amber-100 border-[#78350F] text-amber-800' : 'bg-white hover:bg-[#FFFDF4]'
                }`}
              >
                <Edit2 className="w-2.5 h-2.5 text-amber-600" />
                <span>改名字</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-2.5">
            {/* Dynamic Avatar Selector Row - Scrollable */}
            {isEditingAvatar && (
              <div className="space-y-1 bg-[#FFFDF4] border-2 border-dashed border-[#78350F]/15 rounded-xl p-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-[#78350F]/80 tracking-wide flex items-center gap-1 select-none">
                    <User className="w-2.5 h-2.5 text-[#48CAE4] fill-cyan-100" />
                    <span>左右滑动选择头像:</span>
                  </label>
                </div>

                {/* Horizontal scrollbar block */}
                <DragScrollArea axis="x" className="flex gap-1.5 overflow-x-auto pt-1 pb-1.5 px-1 bg-amber-900/5 rounded-lg shadow-inner custom-scrollbar overflow-y-hidden">
                  {avatarOptions.map((opt) => {
                    const isSelected = selectedAvatarId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedAvatarId(opt.id)}
                        className={`relative w-8 h-8 rounded-lg border-2 flex items-center justify-center p-0.5 shrink-0 transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-[#FED7AA] border-orange-500 ring-2 ring-orange-500 shadow-sm'
                            : 'bg-white border-[#78350F]/15 hover:border-[#78350F]/65'
                        }`}
                        title={opt.name}
                      >
                        <div className="w-6 h-6 flex items-center justify-center">
                          <UniversalAvatar id={opt.id} />
                        </div>
                        
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full p-0.1 border border-white scale-50">
                            <Check className="w-2 h-2 stroke-[5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </DragScrollArea>
              </div>
            )}

            {/* Dynamic Nickname input */}
            {isEditingNickname && (
              <div className="space-y-1 bg-[#FFFDF4] border-2 border-dashed border-[#78350F]/15 rounded-xl p-2 animate-fade-in">
                <label className="text-[10px] font-black text-[#78350F]/85 tracking-wide flex items-center gap-1">
                  <Edit2 className="w-2.5 h-2.5 text-amber-600" />
                  <span>修改显示名称:</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 10))}
                  placeholder="请输入您的昵称..."
                  required
                  className="w-full text-center py-1.5 px-3 bg-white border-2 border-[#78350F] rounded-xl text-[11px] font-black text-[#78350F] placeholder-[#78350F]/30 focus:outline-none focus:ring-2 focus:ring-[#8ADE41] shadow-inner"
                />
              </div>
            )}

            {/* Saves modifications button */}
            {(hasChanges || isEditingAvatar || isEditingNickname) && (
              <button
                type="submit"
                disabled={saveStatus === 'success' || !nickname.trim()}
                className={`w-full py-2 text-white font-black text-xs rounded-xl border-4 border-[#78350F] shadow-[0_3px_0_#78350F] active:translate-y-0.5 active:shadow-none transition-all ${
                  nickname.trim()
                    ? 'bg-gradient-to-r from-[#8ADE41] to-[#4CAF50] hover:brightness-105'
                    : 'bg-gray-400 cursor-not-allowed shadow-[0_3px_0_#4B5563]'
                }`}
              >
                {saveStatus === 'success' ? '保存成功!' : '保存修改'}
              </button>
            )}
          </form>
        </DragScrollArea>
      </div>
    </ShellModal>
  );
};
