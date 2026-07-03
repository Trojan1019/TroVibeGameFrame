import { createRoot } from 'react-dom/client';
import { useMemo, useState } from 'react';
import { SpinePlayerView } from './components/spine/SpinePlayerView';
import { getGameConfig, loadRuntimeGameConfig } from './config/runtimeConfig';
import './index.css';

function readSearchParam(name: string) {
  return new URLSearchParams(window.location.search).get(name)?.trim() || '';
}

function readBooleanParam(name: string, fallback: boolean) {
  const value = readSearchParam(name).toLowerCase();
  if (!value) return fallback;
  if (value === '1' || value === 'true' || value === 'yes') return true;
  if (value === '0' || value === 'false' || value === 'no') return false;
  return fallback;
}

function readNumberParam(name: string) {
  const value = Number(readSearchParam(name));
  return Number.isFinite(value) ? value : undefined;
}

function SpineDemoPage() {
  const config = useMemo(() => {
    const defaultPreset = getGameConfig().spine.presets[0];
    const skeleton = readSearchParam('skeleton') || defaultPreset?.skeleton || '';
    const atlas = readSearchParam('atlas') || defaultPreset?.atlas || '';
    const animation = readSearchParam('animation') || undefined;
    const skin = readSearchParam('skin') || undefined;
    const scale = readNumberParam('scale');
    const backgroundColor = readSearchParam('background') || '#00000000';
    const showControls = readBooleanParam('controls', true);
    const interactive = readBooleanParam('interactive', true);

    return {
      animation,
      atlas,
      backgroundColor,
      interactive,
      scale,
      showControls,
      skeleton,
      skin,
    };
  }, []);

  const [statusText, setStatusText] = useState('等待播放器初始化…');

  const localExample = `/spine-demo.html?skeleton=${encodeURIComponent('/spine/example.json')}&atlas=${encodeURIComponent('/spine/example.atlas')}&animation=idle`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#3d2a1d_0%,#201711_42%,#110d0a_100%)] text-[#f8ead9]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col gap-6 px-5 py-6 lg:flex-row lg:px-8">
        <section className="flex min-h-[520px] flex-1 flex-col rounded-[32px] border border-white/10 bg-black/20 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.28)] md:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#f2c38f]">Spine Runtime Demo</p>
              <h1 className="mt-2 text-[28px] font-black tracking-[0.04em] text-[#fff7ef]">HTML 项目可直接接入 Spine</h1>
            </div>
            <div className="rounded-full border border-[#f2c38f]/25 bg-[#2c1d15]/75 px-4 py-2 text-[12px] font-bold text-[#f7d9b0]">
              {statusText}
            </div>
          </div>
          <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#251a14_0%,#140f0c_100%)]">
            <SpinePlayerView
              {...config}
              className="relative h-full min-h-[420px] w-full"
              onReady={() => setStatusText('Spine 资源已加载')}
              onError={(message) => setStatusText(`加载失败: ${message}`)}
            />
          </div>
        </section>

        <aside className="w-full shrink-0 rounded-[32px] border border-white/10 bg-[#16100d]/88 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.26)] lg:w-[430px]">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#f2c38f]">接入建议</p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-[#ead8c4]">
            <p>当前仓库是 React + Vite 的 DOM 项目，不是 Pixi/Phaser 工程。最小接法是先用官方 `spine-player`，把骨骼动画当成一块独立 WebGL 视图嵌到页面里。</p>
            <p>如果后面要做更深的游戏内联动，比如挂事件、插槽绑 UI、多个 Spine 角色和游戏渲染共用时间轴，再升级到 `spine-pixi-v8` 更合适。</p>
            <p>这页现在默认加载的是官方公开示例资源。你自己的资源准备好后，直接把导出的 `.json/.skel`、`.atlas`、`.png` 放到 `Game/public/spine/`，然后用查询参数切换即可。</p>
          </div>

          <div className="mt-6 rounded-[24px] border border-[#f2c38f]/20 bg-[#221711] p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f2c38f]">当前参数</p>
            <div className="mt-3 space-y-2 text-xs leading-5 text-[#f6e2cd]">
              <p><span className="text-[#cfa47c]">skeleton</span>: {config.skeleton}</p>
              <p><span className="text-[#cfa47c]">atlas</span>: {config.atlas}</p>
              <p><span className="text-[#cfa47c]">animation</span>: {config.animation || '(默认第一段动画)'}</p>
              <p><span className="text-[#cfa47c]">controls</span>: {String(config.showControls)}</p>
              <p><span className="text-[#cfa47c]">interactive</span>: {String(config.interactive)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-[#f2c38f]/20 bg-[#221711] p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f2c38f]">本地资源示例</p>
            <code className="mt-3 block break-all rounded-2xl bg-black/30 px-3 py-3 text-[12px] leading-5 text-[#fff2e4]">
              {localExample}
            </code>
          </div>

          <div className="mt-4 rounded-[24px] border border-[#f2c38f]/20 bg-[#221711] p-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f2c38f]">注意</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5 text-[#f4dfca]">
              <li>Spine runtime 的主次版本应和你导出资源所用的 Spine Editor 主次版本一致。</li>
              <li>`.atlas` 引用的 `.png` 页面要和 atlas 路径对应，且服务端 MIME / CORS 要正确。</li>
              <li>Spine runtime 的接入和再分发受 Spine 官方许可约束，不能把 trial 流程直接用于正式产品集成。</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

async function bootstrap() {
  await loadRuntimeGameConfig();
  createRoot(document.getElementById('root')!).render(<SpineDemoPage />);
}

bootstrap();
