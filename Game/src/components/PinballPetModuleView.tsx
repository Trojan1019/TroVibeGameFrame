import React from 'react';
import { Flame, Snowflake, Target, Zap } from 'lucide-react';

import type { ItemInventory } from '../types';
import {
  createPinballBoardLayout,
  getEnemyCollisionRect,
  type PinballRuntimeFrame,
} from '../games/pinballPet/runtime';
import {
  getActivePet,
  getBattlePets,
  getSupportPet,
  type PetBattleState,
  type PinballPetState,
  type PreviewPoint,
} from '../games/pinballPet/module';
import { LAUNCHER_HEIGHT_PX, LAUNCHER_WIDTH_PX } from '../games/pinballPet/board';
import { PlayingModuleLayout } from './PlayingModuleLayout';
import { GameResourceIcon } from './shell/GameResourceIcon';

interface PinballPetModuleViewProps {
  boardRef: React.RefObject<HTMLDivElement | null>;
  boardSize: number;
  boardHeight: number;
  state: PinballPetState;
  statusBanner?: React.ReactNode;
  inventory: ItemInventory;
  aimAngle: number;
  previewPath: PreviewPoint[];
  hintPreviewPath: PreviewPoint[];
  hintAngle: number | null;
  runtimeFrame?: PinballRuntimeFrame | null;
  isSimulating?: boolean;
  onTriggerUndo: () => void;
  onTriggerShuffle: () => void;
  onTriggerHint: () => void;
  onTriggerUpgrade: () => void;
  onTriggerSkill: () => void;
  onSwitchActivePet: () => void;
}

function petIcon(pet: PetBattleState) {
  if (pet.affinity === 'ember') return <Flame className="h-4 w-4 text-[#ff9a62]" />;
  if (pet.affinity === 'frost') return <Snowflake className="h-4 w-4 text-[#84d2ff]" />;
  return <Zap className="h-4 w-4 text-[#ffe06a]" />;
}

function enemyTone(kind: PinballPetState['enemies'][number]['kind']) {
  if (kind === 'boss') return 'from-[#ffcf9d] via-[#ff9165] to-[#eb604a]';
  if (kind === 'shield') return 'from-[#d0ebff] via-[#82bcff] to-[#5689e1]';
  if (kind === 'nest') return 'from-[#f9d1ff] via-[#e39dff] to-[#c46bf2]';
  return 'from-[#d8ffd8] via-[#9edf9f] to-[#57b86d]';
}

function pickupLabel(kind: PinballPetState['pickups'][number]['kind']) {
  switch (kind) {
    case 'extraBall':
      return '+1';
    case 'split':
      return '裂';
    case 'charge':
      return '能';
    case 'crit':
      return '暴';
    default:
      return '?';
  }
}

export const PinballPetModuleView: React.FC<PinballPetModuleViewProps> = ({
  boardRef,
  boardSize,
  boardHeight,
  state,
  statusBanner,
  inventory,
  aimAngle,
  previewPath,
  hintPreviewPath,
  hintAngle,
  runtimeFrame = null,
  isSimulating = false,
  onTriggerUndo,
  onTriggerShuffle,
  onTriggerHint,
  onTriggerUpgrade,
  onTriggerSkill,
  onSwitchActivePet,
}) => {
  const layout = createPinballBoardLayout(boardSize, boardHeight);
  const launcherWidth = LAUNCHER_WIDTH_PX;
  const launcherHeight = LAUNCHER_HEIGHT_PX;
  const launcherMouthWidth = 24;
  const launcherMouthHeight = 16;
  const launcherNozzleWidth = 8;
  const launcherNozzleHeight = 22;
  const displayEnemies = runtimeFrame?.enemies ?? state.enemies;
  const displayPickups = runtimeFrame?.pickups ?? state.pickups;
  const displayScore = runtimeFrame?.score ?? state.score;
  const displayEnergy = runtimeFrame?.energy ?? state.energy;
  const displayBestCombo = runtimeFrame?.bestCombo ?? state.bestCombo;
  const battlePets = getBattlePets(state);
  const activePet = getActivePet(state);
  const supportPet = getSupportPet(state);

  const playfield = (
    <div
      ref={boardRef}
      className="relative overflow-hidden rounded-[36px] border-[4px] border-[#4e3427] bg-[radial-gradient(circle_at_top,#31466f_0%,#1a2644_24%,#101a30_48%,#09111d_100%)] shadow-[inset_0_18px_36px_rgba(255,255,255,0.08),inset_0_-24px_40px_rgba(0,0,0,0.34),0_16px_0_#6a4932,0_34px_58px_rgba(20,18,20,0.28)]"
      style={{ width: boardSize, height: layout.boardHeight }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_4%,rgba(139,195,255,0.18)_0%,rgba(0,0,0,0)_32%)]" />

      <div
        className="absolute inset-x-0 z-10 border-t-2 border-dashed border-[#ff8b74]/70"
        style={{ top: layout.failLineY }}
      />

      <div className="absolute inset-x-0 top-0 z-10 h-[132px] bg-[linear-gradient(180deg,rgba(142,189,255,0.12)_0%,rgba(59,87,142,0.04)_100%)]" />

      <div
        className="absolute -translate-x-1/2 rounded-full border-4 border-[#ffd8a6] bg-[radial-gradient(circle_at_30%_30%,#fff8e3_0%,#f8cc7e_45%,#ce7e3e_100%)] shadow-[0_0_22px_rgba(255,212,140,0.55)]"
        style={{
          left: layout.leftBumper.x,
          top: layout.leftBumper.y,
          width: layout.bumperRadius * 2,
          height: layout.bumperRadius * 2,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        className="absolute -translate-x-1/2 rounded-full border-4 border-[#ffd8a6] bg-[radial-gradient(circle_at_30%_30%,#fff8e3_0%,#f8cc7e_45%,#ce7e3e_100%)] shadow-[0_0_22px_rgba(255,212,140,0.55)]"
        style={{
          left: layout.rightBumper.x,
          top: layout.rightBumper.y,
          width: layout.bumperRadius * 2,
          height: layout.bumperRadius * 2,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {[layout.leftHole, layout.middleHole, layout.rightHole].map((hole, index) => (
        <div
          key={index}
          className="absolute -translate-x-1/2 rounded-full border-2 border-[#8ac8ff]/70 bg-[radial-gradient(circle_at_center,#0f1a2c_10%,#193b68_52%,#55b8ff_100%)] shadow-[0_0_18px_rgba(97,194,255,0.45)]"
          style={{
            left: hole.x,
            top: hole.y,
            width: layout.holeRadius * 2,
            height: layout.holeRadius * 2,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-[#dff4ff]">
            {index === 1 ? '出' : '入'}
          </span>
        </div>
      ))}

      <div
        className="absolute -translate-x-1/2 rounded-[26px] border-2 border-[#f4d5a7] bg-[linear-gradient(180deg,#fff8dc_0%,#f8c97f_42%,#c97739_100%)] shadow-[0_10px_18px_rgba(0,0,0,0.28)]"
        style={{
          left: layout.launchX,
          top: layout.launchY,
          width: launcherWidth,
          height: launcherHeight,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[#412612]"
          style={{
            top: 7,
            width: launcherMouthWidth,
            height: launcherMouthHeight,
          }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-b-[12px] bg-[linear-gradient(180deg,rgba(87,52,24,0.92)_0%,rgba(64,38,18,0.35)_100%)]"
          style={{
            top: 22,
            width: launcherNozzleWidth,
            height: launcherNozzleHeight,
          }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#fff7da_0%,rgba(255,247,218,0.18)_72%,rgba(0,0,0,0)_100%)]"
          style={{
            top: 39,
            width: 12,
            height: 12,
          }}
        />
        <span className="absolute inset-x-0 bottom-[7px] text-center text-[10px] font-black text-[#412612]">{state.balls} 球</span>
      </div>

      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
        {runtimeFrame ? null : (
          <polyline
            fill="none"
            stroke="rgba(255,225,170,0.58)"
            strokeWidth="3"
            strokeDasharray="10 10"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={previewPath.map((point) => `${point.x * boardSize},${point.y * layout.boardHeight}`).join(' ')}
          />
        )}
        {hintAngle !== null && !runtimeFrame ? (
          <polyline
            fill="none"
            stroke="rgba(111,216,255,0.26)"
            strokeWidth="2.5"
            strokeDasharray="8 12"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={hintPreviewPath.map((point) => `${point.x * boardSize},${point.y * layout.boardHeight}`).join(' ')}
          />
        ) : null}
      </svg>

      <div className="absolute inset-x-0 bottom-[72px] top-[122px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(112,176,255,0.08)_0%,rgba(0,0,0,0)_62%)]" />
        <div className="absolute inset-0 opacity-70">
          <div className="absolute left-[12%] top-[16%] h-1 w-1 rounded-full bg-white/65" />
          <div className="absolute left-[78%] top-[28%] h-1.5 w-1.5 rounded-full bg-white/50" />
          <div className="absolute left-[32%] top-[58%] h-1 w-1 rounded-full bg-white/45" />
          <div className="absolute left-[66%] top-[74%] h-1.5 w-1.5 rounded-full bg-white/40" />
        </div>

        {displayPickups.map((pickup) => {
          const size = pickup.radius * boardSize * 2;
          return (
            <div
              key={pickup.id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#5b3a21] bg-[linear-gradient(180deg,#fff6db_0%,#ffd28e_100%)] text-[12px] font-black text-[#5b3a21] shadow-[0_4px_0_#5b3a21]"
              style={{
                left: pickup.x * boardSize,
                top: pickup.y * layout.boardHeight,
                width: size,
                height: size,
              }}
            >
              {pickupLabel(pickup.kind)}
            </div>
          );
        })}

        {displayEnemies.map((enemy) => {
          const collisionRect = getEnemyCollisionRect(layout, enemy);
          return (
            <div
              key={enemy.id}
              className={`absolute flex items-center justify-center border-2 border-[#352012] bg-gradient-to-br ${enemyTone(enemy.kind)} text-white shadow-[0_6px_0_#352012]`}
              style={{
                left: collisionRect.left,
                top: collisionRect.top,
                width: collisionRect.width,
                height: collisionRect.height,
                borderRadius: Math.min(22, collisionRect.width * 0.24, collisionRect.height * 0.24),
              }}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] opacity-80">
                  {enemy.kind === 'boss' ? 'Boss' : enemy.kind === 'shield' ? '盾' : enemy.kind === 'nest' ? '巢' : '怪'}
                </span>
                <span className="mt-1 text-[18px] font-black leading-none">{enemy.hp}</span>
                {enemy.shield > 0 ? <span className="mt-1 text-[10px] font-black text-[#eff7ff]">盾 {enemy.shield}</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      {runtimeFrame?.balls.map((ball) => (
        <div
          key={ball.id}
          className="pointer-events-none absolute rounded-full border border-[#7a4b2c] bg-[radial-gradient(circle_at_30%_30%,#fffdf2_0%,#ffe09d_50%,#ffbc5e_100%)] shadow-[0_0_16px_rgba(255,225,145,0.6)]"
          style={{
            left: ball.x - ball.radius,
            top: ball.y - ball.radius,
            width: ball.radius * 2,
            height: ball.radius * 2,
          }}
        />
      ))}

      {runtimeFrame?.impacts.map((impact) => (
        <div
          key={impact.id}
          className="pointer-events-none absolute rounded-full border border-[#fff1cf] bg-[rgba(255,241,207,0.16)] px-2 py-0.5 text-[10px] font-black text-[#fff2cf]"
          style={{
            left: impact.x - 16,
            top: impact.y - 12,
            opacity: impact.alpha,
            transform: `translateY(${(1 - impact.alpha) * -12}px) scale(${impact.scale})`,
          }}
        >
          {impact.label}
        </div>
      ))}

      <div
        className="absolute inset-x-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,29,0.2)_0%,rgba(11,17,28,0.64)_24%,rgba(20,32,54,0.96)_100%)]"
        style={{ top: layout.recoveryTop, bottom: 8 }}
      >
        <div className="absolute inset-x-[14%] top-0 h-[6px] rounded-full bg-[radial-gradient(circle,#9ce1ff_0%,rgba(156,225,255,0.12)_72%,rgba(0,0,0,0)_100%)]" />
        <div className="absolute left-5 top-3 text-[12px] font-black tracking-[0.06em] text-[#d9ebff]">底部回收带</div>
      </div>
    </div>
  );

  const controls = (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-x-4 top-3 flex items-center justify-between gap-2">
        <div className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(7,12,24,0.82)] px-3 py-2 text-[11px] font-black tracking-[0.08em] text-[#f8ead2] shadow-[0_10px_22px_rgba(0,0,0,0.22)]">
          WAVE {state.wave}/6
        </div>
        <div className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(7,12,24,0.82)] px-3 py-2 text-[11px] font-black tracking-[0.08em] text-[#f8ead2] shadow-[0_10px_22px_rgba(0,0,0,0.22)]">
          ROUND {state.roundIndex + 1}
        </div>
        <div className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(7,12,24,0.82)] px-3 py-2 text-[11px] font-black tracking-[0.08em] text-[#f8ead2] shadow-[0_10px_22px_rgba(0,0,0,0.22)]">
          连击 {displayBestCombo}
        </div>
      </div>

      <div className="absolute left-4 top-[50px] flex items-center gap-2">
        <div className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(7,12,24,0.72)] px-3 py-1.5 text-[10px] font-black text-[#dce9ff] shadow-[0_10px_22px_rgba(0,0,0,0.22)]">
          球 {state.balls}
        </div>
        <div className="rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(7,12,24,0.72)] px-3 py-1.5 text-[10px] font-black text-[#dce9ff] shadow-[0_10px_22px_rgba(0,0,0,0.22)]">
          能量 {displayEnergy}/8
        </div>
      </div>

      <div className="absolute right-4 top-[50px] rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(7,12,24,0.72)] px-3 py-1.5 text-[10px] font-black text-[#fff0c9] shadow-[0_10px_22px_rgba(0,0,0,0.22)]">
        当前主战 {activePet?.name ?? '--'}
      </div>

      <div
        className="absolute right-4 rounded-full border border-[#ff8b74]/50 bg-[rgba(88,22,18,0.7)] px-3 py-1 text-[10px] font-black text-[#ffd5c8]"
        style={{ top: layout.failLineY - 20 }}
      >
        上移到这条线即失败
      </div>

      <button
        onClick={onSwitchActivePet}
        disabled={isSimulating || state.status !== 'playing'}
        className="pointer-events-auto absolute rounded-[16px] border border-[#83b8ff]/50 bg-[rgba(20,34,56,0.86)] px-3 py-2 text-left text-[10px] font-black text-[#eff7ff] shadow-[0_10px_18px_rgba(4,10,20,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ left: layout.launchX - 114, top: layout.launchY - 12 }}
      >
        <p>切换精灵</p>
        <p className="mt-1 text-[11px] text-[#ffd8a2]">{activePet?.name}</p>
      </button>

      <button
        onClick={onTriggerSkill}
        disabled={displayEnergy < 3 || Boolean(state.skillArmedPetId) || state.status !== 'playing' || isSimulating}
        className="pointer-events-auto absolute rounded-[16px] border border-[#ffe0a8]/55 bg-[rgba(63,38,18,0.86)] px-3 py-2 text-left text-[10px] font-black text-[#fff0d6] shadow-[0_10px_18px_rgba(4,10,20,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ left: layout.launchX + 26, top: layout.launchY - 12 }}
      >
        <p>主动技</p>
        <p className="mt-1 text-[11px] text-[#fff0bd]">
          {state.skillArmedPetId ? '已蓄力' : `${activePet?.skillName ?? '技能'} · 3 能量`}
        </p>
      </button>

      <div className="absolute inset-x-4 bottom-[108px] flex items-center justify-between gap-3">
        <div className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,26,0.72)] px-3 py-2 text-[10px] font-black text-[#d9ebff] shadow-[0_10px_22px_rgba(0,0,0,0.22)]">
          <span className="inline-flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-[#ffe2a8]" />
            当前角度 {Math.round(aimAngle)}°
          </span>
        </div>
        <div className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,26,0.72)] px-3 py-2 text-[10px] font-black text-[#d9ebff] shadow-[0_10px_22px_rgba(0,0,0,0.22)]">
          {state.overchargeArmed ? '过载待发射' : state.skillArmedPetId ? '主动技待发射' : '标准弹道'}
        </div>
      </div>

      {state.lastTurn && !isSimulating ? (
        <div className="absolute left-4 right-[80px] bottom-[78px] rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(9,15,26,0.72)] px-3 py-2 text-[10px] font-black text-[#ffe2ad] shadow-[0_10px_22px_rgba(0,0,0,0.22)]">
          上轮命中 {state.lastTurn.totalHits} · 最高连击 {state.lastTurn.comboPeak} · 回收额外球 +{state.lastTurn.extraBalls}
        </div>
      ) : null}

      <div className="absolute bottom-4 left-4 right-[82px] rounded-[26px] border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(9,14,26,0.72)_0%,rgba(16,25,42,0.94)_100%)] p-3 shadow-[0_16px_28px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black tracking-[0.08em] text-[#b4cced]">双精灵出战槽</p>
            <p className="mt-1 text-[12px] font-black text-[#f6ead6]">
              主战 {activePet?.name ?? '--'} / 副战 {supportPet?.name ?? '--'}
            </p>
          </div>
          <div className="rounded-full bg-[rgba(255,179,92,0.16)] px-3 py-1 text-[10px] font-black text-[#ffd38a]">
            {state.skillArmedPetId ? '本轮已锁定主动技' : '发射前可切换'}
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {battlePets.map((pet) => {
            const active = pet.id === state.activePetId;
            return (
              <div
                key={pet.id}
                className={`rounded-[20px] border p-2.5 text-left ${
                  active
                    ? 'border-[rgba(255,179,92,0.46)] bg-[linear-gradient(180deg,rgba(255,245,223,0.98)_0%,rgba(255,231,186,0.92)_100%)]'
                    : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {petIcon(pet)}
                    <span className={`text-[12px] font-black ${active ? 'text-[var(--shell-ink)]' : 'text-[#eff4ff]'}`}>{pet.name}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${active ? 'bg-black/6 text-[var(--shell-ink-soft)]' : 'bg-white/10 text-[#b7d2f2]'}`}>
                    Lv.{pet.level}
                  </span>
                </div>
                <p className={`mt-1 text-[9px] font-black ${active ? 'text-[var(--shell-accent)]' : 'text-[#9cc0e8]'}`}>
                  {active ? '当前激活' : '副战被动'}
                </p>
                <p className={`mt-2 line-clamp-2 text-[9px] font-bold leading-snug ${active ? 'text-[var(--shell-ink-soft)]' : 'text-[#dce8fa]'}`}>
                  {active ? pet.summary : pet.passive}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const footerTools = (
    <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col gap-2">
      <button onClick={onTriggerUndo} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-[17px] border-2 border-[#78350F] bg-[#E0F2FE] shadow-[0_3px_0_#78350F] transition-transform active:translate-y-0.5">
        <div className="relative flex items-center justify-center">
          <GameResourceIcon kind="undo" size={22} framed={false} />
          <span className="absolute -right-3 -top-3 rounded-full border border-[#78350F] bg-[#EA580C] px-1 text-[8px] font-black text-white">x{inventory.undo}</span>
        </div>
      </button>

      <button onClick={onTriggerShuffle} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-[17px] border-2 border-[#78350F] bg-[#DCFCE7] shadow-[0_3px_0_#78350F] transition-transform active:translate-y-0.5">
        <div className="relative flex items-center justify-center">
          <GameResourceIcon kind="shuffle" size={22} framed={false} />
          <span className="absolute -right-3 -top-3 rounded-full border border-[#78350F] bg-[#EA580C] px-1 text-[8px] font-black text-white">x{inventory.shuffle}</span>
        </div>
      </button>

      <button onClick={onTriggerHint} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-[17px] border-2 border-[#78350F] bg-[#FEF9C3] shadow-[0_3px_0_#78350F] transition-transform active:translate-y-0.5">
        <div className="relative flex items-center justify-center">
          <GameResourceIcon kind="hint" size={22} framed={false} />
          <span className="absolute -right-3 -top-3 rounded-full border border-[#78350F] bg-[#EA580C] px-1 text-[8px] font-black text-white">x{inventory.hint}</span>
        </div>
      </button>

      <button onClick={onTriggerUpgrade} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-[17px] border-2 border-[#78350F] bg-[#FEE2E2] shadow-[0_3px_0_#78350F] transition-transform active:translate-y-0.5">
        <div className="relative flex items-center justify-center">
          <GameResourceIcon kind="upgrade" size={22} framed={false} />
          <span className="absolute -right-3 -top-3 rounded-full border border-[#78350F] bg-[#EA580C] px-1 text-[8px] font-black text-white">x{inventory.upgrade}</span>
        </div>
      </button>
    </div>
  );

  return <PlayingModuleLayout layered statusBanner={statusBanner} playfield={playfield} controls={controls} footerTools={footerTools} />;
};
