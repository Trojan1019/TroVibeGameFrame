import React from 'react';
import { Tile, ItemInventory, ItemType } from '../types';
import { MoveDirection } from '../games/game2048/module';
import { useRewardFlightTarget } from './flight/RewardFlightProvider';
import { PlayingModuleLayout } from './PlayingModuleLayout';
import { GameResourceIcon, getGameResourceLabel } from './shell/GameResourceIcon';

export type BoardFeedbackState = 'idle' | 'success' | 'invalid';

interface DirectionPreviewState {
  direction: MoveDirection;
  intensity: number;
}

export function getBoardMetrics(boardSize: number) {
  const border = 4;
  const padding = 10;
  const gap = 8;
  const cellSize = (boardSize - border * 2 - padding * 2 - gap * 3) / 4;
  const gridSpacing = cellSize + gap;

  return {
    border,
    padding,
    gap,
    cellSize,
    gridSpacing,
  };
}

interface Game2048ModuleViewProps {
  boardRef: React.RefObject<HTMLDivElement | null>;
  boardSize: number;
  board: Tile[];
  inventory: ItemInventory;
  activeItemMode: ItemType | null;
  statusBanner?: React.ReactNode;
  boardFeedbackState?: BoardFeedbackState;
  directionPreview?: DirectionPreviewState | null;
  showTutorial?: boolean;
  onTileUpgrade: (tile: Tile) => void;
  onTriggerUndo: () => void;
  onTriggerShuffle: () => void;
  onTriggerHint: () => void;
  onTriggerUpgradeMode: () => void;
}

function getTileStyles(val: number) {
  const styles: Record<number, { bg: string; text: string; shadow: string; border: string }> = {
    2: { bg: 'bg-[#FFF2E2]', text: 'text-[#78350F]', shadow: 'shadow-[0_4px_0_#915F3C]', border: 'border-2 border-[#78350F]' },
    4: { bg: 'bg-[#FFE2C2]', text: 'text-[#78350F]', shadow: 'shadow-[0_4px_0_#915F3C]', border: 'border-2 border-[#78350F]' },
    8: { bg: 'bg-[#FFD199]', text: 'text-[#78350F]', shadow: 'shadow-[0_4px_0_#C2711C]', border: 'border-2 border-[#78350F]' },
    16: { bg: 'bg-[#FFB766]', text: 'text-[#78350F]', shadow: 'shadow-[0_4px_0_#A95604]', border: 'border-2 border-[#78350F]' },
    32: { bg: 'bg-[#F28B82]', text: 'text-white', shadow: 'shadow-[0_4px_0_#A52516]', border: 'border-2 border-[#78350F]' },
    64: { bg: 'bg-[#EA5B4C]', text: 'text-white', shadow: 'shadow-[0_4px_0_#9C1104]', border: 'border-2 border-[#78350F]' },
    128: { bg: 'bg-[#76D7C4]', text: 'text-white', shadow: 'shadow-[0_4px_0_#138D75]', border: 'border-2 border-[#78350F]' },
    256: { bg: 'bg-[#5DADE2]', text: 'text-white', shadow: 'shadow-[0_4px_0_#21618C]', border: 'border-2 border-[#78350F]' },
    512: { bg: 'bg-[#BB8FCE]', text: 'text-white', shadow: 'shadow-[0_4px_0_#6C3483]', border: 'border-2 border-[#78350F]' },
    1024: { bg: 'bg-[#F4D03F]', text: 'text-[#78350F]', shadow: 'shadow-[0_4px_0_#9A7D0A]', border: 'border-2 border-[#78350F]' },
    2048: { bg: 'bg-gradient-to-tr from-[#9ADE33] to-[#4CAF50]', text: 'text-white', shadow: 'shadow-[0_4px_0_#2E6F1D]', border: 'border-3 border-[#78350F]' },
  };

  return styles[val] || { bg: 'bg-gradient-to-tr from-[#D135F2] to-[#4B105F]', text: 'text-white', shadow: 'shadow-[0_4px_0_#260D30]', border: 'border-3 border-[#78350F]' };
}

export const Game2048ModuleView: React.FC<Game2048ModuleViewProps> = ({
  boardRef,
  boardSize,
  board,
  inventory,
  activeItemMode,
  statusBanner,
  boardFeedbackState = 'idle',
  directionPreview = null,
  showTutorial = false,
  onTileUpgrade,
  onTriggerUndo,
  onTriggerShuffle,
  onTriggerHint,
  onTriggerUpgradeMode,
}) => {
  const undoTargetRef = useRewardFlightTarget('tool-undo');
  const shuffleTargetRef = useRewardFlightTarget('tool-shuffle');
  const hintTargetRef = useRewardFlightTarget('tool-hint');
  const upgradeTargetRef = useRewardFlightTarget('tool-upgrade');

  const playfield = (() => {
    const { cellSize, gridSpacing, padding } = getBoardMetrics(boardSize);
    const previewTone =
      directionPreview?.direction === 'up' || directionPreview?.direction === 'left' ? '#fff6cf' : '#def8ff';
    const previewGlow = directionPreview ? Math.round(18 + directionPreview.intensity * 16) : 0;
    const previewChipStyle =
      directionPreview?.direction === 'up'
        ? { top: 18, left: '50%', transform: 'translateX(-50%)' }
        : directionPreview?.direction === 'down'
          ? { bottom: 18, left: '50%', transform: 'translateX(-50%)' }
          : directionPreview?.direction === 'left'
            ? { left: 18, top: '50%', transform: 'translateY(-50%)' }
            : { right: 18, top: '50%', transform: 'translateY(-50%)' };
    const previewChipLabel =
      directionPreview?.direction === 'up'
        ? 'UP'
        : directionPreview?.direction === 'down'
          ? 'DOWN'
          : directionPreview?.direction === 'left'
            ? 'LEFT'
            : 'RIGHT';

    return (
      <div className="relative" style={{ width: boardSize, height: boardSize }}>
        <div
          ref={boardRef}
          className={`touch-none overscroll-none bg-[#C59B73] border-4 border-[#78350F] rounded-3xl relative shadow-[inset_0_4px_8px_rgba(0,0,0,0.15),_0_6px_0_#9E4E06] transition-shadow duration-200 ${
            boardFeedbackState === 'invalid'
              ? 'board-invalid-shake'
              : boardFeedbackState === 'success'
                ? 'board-success-pulse'
                : ''
          }`}
          style={{
            width: boardSize,
            height: boardSize,
            boxShadow:
              directionPreview && boardFeedbackState === 'idle'
                ? `inset 0 0 0 2px rgba(255,255,255,0.28), 0 0 0 ${previewGlow}px rgba(255,244,200,0.2), inset 0 4px 8px rgba(0,0,0,0.15), 0 6px 0 #9E4E06`
                : undefined,
          }}
        >
          {Array.from({ length: 16 }).map((_, idx) => {
            const row = Math.floor(idx / 4);
            const col = idx % 4;
            return (
              <div
                key={idx}
                className="absolute bg-[#A87E56] rounded-xl border-2 border-[#78350F]/20 shadow-inner"
                style={{
                  top: row * gridSpacing + padding,
                  left: col * gridSpacing + padding,
                  width: cellSize,
                  height: cellSize,
                }}
              />
            );
          })}

          {board.map((tile) => {
            const styles = getTileStyles(tile.value);
            const isUpgradeMode = activeItemMode === 'upgrade';
            const offsetRow = tile.row * gridSpacing + padding;
            const offsetCol = tile.col * gridSpacing + padding;

            return (
              <div
                key={tile.id}
                onClick={() => isUpgradeMode && onTileUpgrade(tile)}
                className={`absolute flex flex-col items-center justify-center rounded-2xl select-none font-sans font-black transition-all duration-150 cursor-pointer ${
                  styles.bg
                } ${styles.text} ${styles.shadow} ${styles.border} ${
                  tile.isNew ? 'animate-fade-in' : ''
                } ${tile.isMerged ? 'animate-bounce-short' : ''} ${
                  isUpgradeMode ? 'hover:brightness-110 border-red-500 ring-2 ring-red-400' : ''
                }`}
                style={{
                  top: offsetRow,
                  left: offsetCol,
                  width: cellSize,
                  height: cellSize,
                  fontSize: Math.floor(cellSize * 0.38),
                  transform: isUpgradeMode ? 'scale(1.02)' : undefined,
                }}
              >
                {isUpgradeMode ? (
                  <span className="absolute -top-1 text-[8px] bg-red-600 text-white px-1 py-0.1 outline border rounded-full scale-75 uppercase">
                    UP
                  </span>
                ) : null}
                <span style={{ fontSize: tile.value >= 1024 ? Math.floor(cellSize * 0.38 * 0.8) : undefined }}>
                  {tile.value}
                </span>
              </div>
            );
          })}

          {directionPreview ? (
            <div className="pointer-events-none absolute inset-0 z-20">
              <div
                className="absolute rounded-full border-2 border-white/80 px-3 py-1 text-[10px] font-black tracking-[0.16em] text-[#7b4e28] shadow-[0_3px_0_rgba(123,78,40,0.25)] status-chip-pop"
                style={{
                  ...previewChipStyle,
                  background: previewTone,
                  opacity: 0.78 + Math.min(directionPreview.intensity * 0.22, 0.22),
                }}
              >
                {previewChipLabel}
              </div>
            </div>
          ) : null}

          {showTutorial ? (
            <div className="pointer-events-none absolute inset-0 z-30">
              <div className="tutorial-focus absolute inset-[10px] rounded-[26px] border-2 border-[#fff7cf]" />
              <div className="absolute left-[16%] top-1/2 h-3 w-[50%] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.12),rgba(255,247,207,0.85),rgba(255,255,255,0.12))] tutorial-swipe-trail" />
              <div className="tutorial-hand-swipe absolute left-[18%] top-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--shell-bark)] bg-[#fff6cf] px-3 py-1 text-[10px] font-black text-[var(--shell-ink)] shadow-[0_3px_0_var(--shell-shadow)]">
                SWIPE
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  })();

  const footerTools = (
    <>
      <button ref={undoTargetRef} onClick={onTriggerUndo} className="flex flex-col items-center gap-1 group w-[22%] active:translate-y-0.5 transition-transform">
        <div className="w-14 h-14 bg-[#E0F2FE] group-hover:bg-[#BAE6FD] text-sky-600 rounded-xl flex flex-col items-center justify-center border-2 border-[#78350F] shadow-[0_2px_0_#78350F] relative">
          <GameResourceIcon kind="undo" size={28} framed={false} />
          <span className="absolute -top-1.5 -right-1 px-1 bg-[#EA580C] text-white text-[9px] font-black rounded-full border border-[#78350F]">x{inventory.undo}</span>
        </div>
        <span className="text-[11px] font-black text-[#78350F]">{getGameResourceLabel('undo')}</span>
      </button>

      <button ref={shuffleTargetRef} onClick={onTriggerShuffle} className="flex flex-col items-center gap-1 group w-[22%] active:translate-y-0.5 transition-transform">
        <div className="w-14 h-14 bg-[#DCFCE7] group-hover:bg-[#BBF7D0] text-emerald-600 rounded-xl flex flex-col items-center justify-center border-2 border-[#78350F] shadow-[0_2px_0_#78350F] relative">
          <GameResourceIcon kind="shuffle" size={28} framed={false} />
          <span className="absolute -top-1.5 -right-1 px-1 bg-[#EA580C] text-white text-[9px] font-black rounded-full border border-[#78350F]">x{inventory.shuffle}</span>
        </div>
        <span className="text-[11px] font-black text-[#78350F]">{getGameResourceLabel('shuffle')}</span>
      </button>

      <button ref={hintTargetRef} onClick={onTriggerHint} className="flex flex-col items-center gap-1 group w-[22%] active:translate-y-0.5 transition-transform">
        <div className="w-14 h-14 bg-[#FEF9C3] group-hover:bg-[#FEF08A] text-amber-600 rounded-xl flex flex-col items-center justify-center border-2 border-[#78350F] shadow-[0_2px_0_#78350F] relative">
          <GameResourceIcon kind="hint" size={28} framed={false} />
          <span className="absolute -top-1.5 -right-1 px-1 bg-[#EA580C] text-white text-[9px] font-black rounded-full border border-[#78350F]">x{inventory.hint}</span>
        </div>
        <span className="text-[11px] font-black text-[#78350F]">{getGameResourceLabel('hint')}</span>
      </button>

      <button
        ref={upgradeTargetRef}
        onClick={onTriggerUpgradeMode}
        className={`flex flex-col items-center gap-1 group w-[22%] active:translate-y-0.5 transition-transform ${activeItemMode === 'upgrade' ? 'scale-105' : ''}`}
      >
        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border-2 border-[#78350F] shadow-[0_2px_0_#78350F] relative transition-colors ${
          activeItemMode === 'upgrade' ? 'bg-[#FCA5A5] text-red-600' : 'bg-[#FEE2E2] group-hover:bg-[#FFCDCD] text-rose-500'
        }`}>
          <GameResourceIcon kind="upgrade" size={28} framed={false} />
          <span className="absolute -top-1.5 -right-1 px-1 bg-[#EA580C] text-white text-[9px] font-black rounded-full border border-[#78350F]">x{inventory.upgrade}</span>
        </div>
        <span className="text-[11px] font-black text-[#78350F]">{getGameResourceLabel('upgrade')}</span>
      </button>
    </>
  );

  return (
    <PlayingModuleLayout
      statusBanner={statusBanner}
      playfield={playfield}
      footerTools={footerTools}
    />
  );
};
