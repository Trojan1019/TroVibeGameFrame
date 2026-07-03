import React, { useEffect, useState } from 'react';

type PreviewPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  group: '常用机型' | '比例预设' | '原始分辨率';
};

const PREVIEW_PRESETS: PreviewPreset[] = [
  { id: 'iphone-12', label: 'iPhone 12 / 13 / 14 · 390×844', width: 390, height: 844, group: '常用机型' },
  { id: 'iphone-se', label: 'iPhone SE · 375×667', width: 375, height: 667, group: '常用机型' },
  { id: 'iphone-pro-max', label: 'iPhone Pro Max · 430×932', width: 430, height: 932, group: '常用机型' },
  { id: 'pixel-8', label: 'Pixel 8 / 7 · 412×915', width: 412, height: 915, group: '常用机型' },
  { id: 'ipad', label: 'iPad · 768×1024', width: 768, height: 1024, group: '常用机型' },
  { id: 'ratio-9-20', label: '9:20 · 900×2000', width: 900, height: 2000, group: '比例预设' },
  { id: 'ratio-4-3', label: '4:3 · 768×1024', width: 768, height: 1024, group: '比例预设' },
  { id: 'ratio-9-16', label: '9:16 · 1080×1920', width: 1080, height: 1920, group: '比例预设' },
  { id: 'ratio-10-16', label: '10:16 · 800×1280', width: 800, height: 1280, group: '比例预设' },
  { id: 'raw-750x1624', label: '750×1624', width: 750, height: 1624, group: '原始分辨率' },
  { id: 'raw-1224x2912', label: '1224×2912', width: 1224, height: 2912, group: '原始分辨率' },
  { id: 'raw-1624x750', label: '1624×750', width: 1624, height: 750, group: '原始分辨率' },
  { id: 'raw-1080x1920', label: '1080×1920', width: 1080, height: 1920, group: '原始分辨率' },
];

const DEVELOPMENT_RESOLUTION = { width: 750, height: 1624 };
const VISUAL_REFERENCE = { width: 390, height: 844 };
const DEFAULT_PRESET_ID = 'raw-750x1624';
const STORAGE_KEY = 'game-preview-preset-id';
const TOOLBAR_HEIGHT = 72;
const VIEWPORT_PADDING = 20;

type LayoutMode = 'compact' | 'standard' | 'tall' | 'landscape' | 'tablet';

type PreviewViewportContextValue = {
  width: number;
  height: number;
  aspect: string;
  layoutMode: LayoutMode;
  isPortrait: boolean;
  deviceWidth: number;
  deviceHeight: number;
  deviceLayoutMode: LayoutMode;
  designWidth: number;
  designHeight: number;
  visualWidth: number;
  visualHeight: number;
  renderScale: number;
};

type LayoutCheckState = {
  screen?: string;
  baseline?: string;
  active?: boolean;
  checkedAt?: string;
  issues?: string[];
};

const PreviewViewportContext = React.createContext<PreviewViewportContextValue>({
  width: VISUAL_REFERENCE.width,
  height: VISUAL_REFERENCE.height,
  aspect: `${VISUAL_REFERENCE.width}:${VISUAL_REFERENCE.height}`,
  layoutMode: 'standard',
  isPortrait: true,
  deviceWidth: VISUAL_REFERENCE.width,
  deviceHeight: VISUAL_REFERENCE.height,
  deviceLayoutMode: 'standard',
  designWidth: DEVELOPMENT_RESOLUTION.width,
  designHeight: DEVELOPMENT_RESOLUTION.height,
  visualWidth: VISUAL_REFERENCE.width,
  visualHeight: VISUAL_REFERENCE.height,
  renderScale: 1,
});

function getWindowSize() {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function findPreset(presetId: string) {
  return PREVIEW_PRESETS.find((preset) => preset.id === presetId) ?? findPreset(DEFAULT_PRESET_ID);
}

function readPresetFromUrl() {
  if (typeof window === 'undefined') return null;
  const presetId = new URLSearchParams(window.location.search).get('previewPreset');
  if (!presetId) return null;
  return PREVIEW_PRESETS.some((preset) => preset.id === presetId) ? presetId : null;
}

function formatAspect(width: number, height: number) {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function resolveLayoutMode(width: number, height: number): LayoutMode {
  if (width >= 700 || height >= 1100) {
    if (width / height >= 0.72) return 'tablet';
  }

  if (width > height) return 'landscape';
  if (height / width >= 2.05) return 'tall';
  if (height <= 740 || width <= 380) return 'compact';
  return 'standard';
}

export function usePreviewViewport() {
  return React.useContext(PreviewViewportContext);
}

export const PreviewViewport: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPresetId, setSelectedPresetId] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_PRESET_ID;
    }

    return readPresetFromUrl() || localStorage.getItem(STORAGE_KEY) || DEFAULT_PRESET_ID;
  });
  const [windowSize, setWindowSize] = useState(getWindowSize);
  const [layoutCheck, setLayoutCheck] = useState<LayoutCheckState | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowSize(getWindowSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedPresetId);
  }, [selectedPresetId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readLayoutCheck = () => {
      const nextState = (
        window as typeof window & {
          __uiLayoutIssues?: LayoutCheckState;
        }
      ).__uiLayoutIssues;
      setLayoutCheck(nextState ?? null);
    };

    readLayoutCheck();
    window.addEventListener('ui-layout-check-updated', readLayoutCheck as EventListener);
    return () => window.removeEventListener('ui-layout-check-updated', readLayoutCheck as EventListener);
  }, []);

  const preset = findPreset(selectedPresetId);
  const availableWidth = Math.max(windowSize.width - VIEWPORT_PADDING * 2 - 24, 240);
  const availableHeight = Math.max(windowSize.height - TOOLBAR_HEIGHT - VIEWPORT_PADDING * 2 - 24, 240);
  const scale = Math.min(availableWidth / preset.width, availableHeight / preset.height);
  const scaledWidth = preset.width * scale;
  const scaledHeight = preset.height * scale;
  const aspect = formatAspect(preset.width, preset.height);
  const deviceLayoutMode = resolveLayoutMode(preset.width, preset.height);
  const canvasScale = Math.min(
    preset.width / VISUAL_REFERENCE.width,
    preset.height / VISUAL_REFERENCE.height,
  );
  const logicalWidth = preset.width / canvasScale;
  const logicalHeight = preset.height / canvasScale;
  const layoutMode = resolveLayoutMode(logicalWidth, logicalHeight);
  const renderScale = scale * canvasScale;
  const isDevelopmentPreset = preset.width === DEVELOPMENT_RESOLUTION.width && preset.height === DEVELOPMENT_RESOLUTION.height;
  const layoutIssueCount = layoutCheck?.issues?.length ?? 0;
  const contextValue: PreviewViewportContextValue = {
    width: logicalWidth,
    height: logicalHeight,
    aspect,
    layoutMode,
    isPortrait: logicalHeight >= logicalWidth,
    deviceWidth: preset.width,
    deviceHeight: preset.height,
    deviceLayoutMode,
    designWidth: DEVELOPMENT_RESOLUTION.width,
    designHeight: DEVELOPMENT_RESOLUTION.height,
    visualWidth: VISUAL_REFERENCE.width,
    visualHeight: VISUAL_REFERENCE.height,
    renderScale,
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#2d2621]">
      <div className="flex h-[72px] shrink-0 items-center gap-3 overflow-x-auto border-b border-white/10 bg-[#3a342f] px-4 text-[#f7efe4]">
        <span className="shrink-0 whitespace-nowrap rounded-full bg-[#4b433d] px-3 py-1 text-[11px] font-black tracking-[0.16em] uppercase">
          Preview
        </span>
        <div className="hidden shrink-0 rounded-full bg-[#4b433d] px-3 py-1 text-[12px] font-black text-[#f0dfcb] md:block">
          开发基线 {DEVELOPMENT_RESOLUTION.width}×{DEVELOPMENT_RESOLUTION.height}
        </div>
        <div className="hidden shrink-0 rounded-full bg-[#4b433d] px-3 py-1 text-[12px] font-black text-[#e7dacb] lg:block">
          显示基线 {VISUAL_REFERENCE.width}×{VISUAL_REFERENCE.height}
        </div>
        <label className="shrink-0 whitespace-nowrap text-[12px] font-black text-[#d9c8b4]" htmlFor="preview-preset-select">
          测试机型
        </label>
        <select
          id="preview-preset-select"
          value={preset.id}
          onChange={(event) => setSelectedPresetId(event.target.value)}
          className="min-w-[240px] shrink-0 rounded-xl border-2 border-[#69513f] bg-[#2c2723] px-3 py-2 text-[13px] font-black text-[#fff7ed] outline-none"
        >
          {(['常用机型', '比例预设', '原始分辨率'] as const).map((group) => (
            <optgroup key={group} label={group}>
              {PREVIEW_PRESETS.filter((presetOption) => presetOption.group === group).map((presetOption) => (
                <option key={presetOption.id} value={presetOption.id}>
                  {presetOption.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="hidden shrink-0 rounded-full bg-[#4b433d] px-3 py-1 text-[12px] font-black text-[#e7dacb] md:block">
          比例 {aspect}
        </div>
        <div className="hidden shrink-0 rounded-full bg-[#4b433d] px-3 py-1 text-[12px] font-black text-[#e7dacb] xl:block">
          当前测试 {preset.width}×{preset.height}
        </div>
        <div
          className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-black ${
            isDevelopmentPreset
              ? layoutCheck?.active
                ? layoutIssueCount > 0
                  ? 'border border-[#f4b4ae] bg-[#fff1f0] text-[#b42318]'
                  : 'border border-[#b7ebc6] bg-[#ecfdf3] text-[#027a48]'
                : 'bg-[#4b433d] text-[#e7dacb]'
              : 'bg-[#4b433d] text-[#e7dacb]'
          }`}
        >
          {isDevelopmentPreset
            ? layoutCheck?.active
              ? layoutIssueCount > 0
                ? `基线检查失败 · ${layoutIssueCount} 处重叠`
                : '基线检查通过'
              : '基线检查待执行'
            : '基线检查仅在 750×1624 执行'}
        </div>
        <div className="ml-auto shrink-0 rounded-full bg-[#4b433d] px-3 py-1 text-[12px] font-black text-[#e7dacb]">
          缩放 {Math.round(scale * 100)}%
        </div>
      </div>

      <div className="relative flex-1 overflow-auto overscroll-contain">
        <div className="absolute inset-0 flex items-center justify-center p-5">
          <div className="rounded-[32px] border border-white/10 bg-[#1f1a16] p-3 shadow-[0_22px_60px_rgba(0,0,0,0.42)]">
            <div className="flex items-center justify-between px-2 pb-2 text-[11px] font-black text-[#cdbca6]">
              <span>{preset.label}</span>
              <span>{aspect}</span>
            </div>
            <div
              className="relative overflow-hidden rounded-[28px] border-[3px] border-[#5a3c26] bg-black"
              style={{ width: scaledWidth, height: scaledHeight }}
            >
              <PreviewViewportContext.Provider value={contextValue}>
                <div
                  className="absolute left-0 top-0 origin-top-left overflow-hidden bg-[linear-gradient(180deg,#f5ead4_0%,#f3e6d1_100%)]"
                  style={{
                    width: preset.width,
                    height: preset.height,
                    transform: `scale(${scale})`,
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.6)_0,rgba(255,255,255,0.6)_8%,transparent_8.5%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.4)_0,rgba(255,255,255,0.4)_6%,transparent_6.5%),radial-gradient(circle_at_12%_76%,rgba(255,247,214,0.45)_0,rgba(255,247,214,0.45)_10%,transparent_10.5%),linear-gradient(180deg,var(--shell-sky)_0%,var(--shell-field-light)_46%,var(--shell-field-dark)_100%)]" />
                  <div
                    className="absolute inset-0 overflow-hidden rounded-[30px]"
                    style={{
                      boxShadow: '0 20px 48px rgba(68, 42, 17, 0.18)',
                    }}
                  >
                    <div
                      className="origin-top-left"
                      style={{
                        width: logicalWidth,
                        height: logicalHeight,
                        transform: `scale(${canvasScale})`,
                      }}
                    >
                      {children}
                    </div>
                  </div>
                </div>
              </PreviewViewportContext.Provider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
