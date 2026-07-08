import React, { useEffect, useMemo, useState } from 'react';

type BuildStatus = 'idle' | 'running' | 'success' | 'error';

type BuildConfigSummary = {
  appName?: string;
  packageName?: string;
  versionCode?: number;
  versionName?: string;
  buildType?: string;
  packageType?: string;
  icon?: string;
  splash?: string;
};

type ResolvedLocation = {
  value: string | null;
  displayValue: string;
  source: 'project' | 'env' | 'auto' | 'missing';
  sourceLabel: string;
  detail: string | null;
};

type BuildState = {
  status: BuildStatus;
  logs: string[];
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  apkPath: string | null;
  configPath: ResolvedLocation;
  config: BuildConfigSummary | null;
  appConverterRoot: ResolvedLocation;
  javaHome: ResolvedLocation;
};

const EMPTY_STATE: BuildState = {
  status: 'idle',
  logs: [],
  startedAt: null,
  finishedAt: null,
  error: null,
  apkPath: null,
  configPath: { value: null, displayValue: '未发现', source: 'missing', sourceLabel: '未解析', detail: null },
  config: null,
  appConverterRoot: { value: null, displayValue: '未发现', source: 'missing', sourceLabel: '未解析', detail: null },
  javaHome: { value: null, displayValue: '未发现', source: 'missing', sourceLabel: '未解析', detail: null },
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error((payload && typeof payload.error === 'string' && payload.error) || `Request failed: ${response.status}`);
  }
  return payload as T;
}

function formatTime(value: string | null) {
  if (!value) return '未开始';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

function sourceTone(source: ResolvedLocation['source']) {
  if (source === 'project') return 'bg-[#eef5ff] text-[#315fbf]';
  if (source === 'env') return 'bg-[#eefaf2] text-[#1d7a43]';
  if (source === 'auto') return 'bg-[#fff7e8] text-[#9b6408]';
  return 'bg-[#fff0ef] text-[#bb3d36]';
}

function createDraft(config: BuildConfigSummary | null) {
  return {
    appName: config?.appName || '',
    packageName: config?.packageName || '',
    versionName: config?.versionName || '',
    versionCode: String(config?.versionCode ?? ''),
    buildType: config?.buildType || 'debug',
    packageType: config?.packageType || 'apk',
    icon: config?.icon || '',
  };
}

export const DeveloperPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [installAfterBuild, setInstallAfterBuild] = useState(true);
  const [state, setState] = useState<BuildState>(EMPTY_STATE);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [configDraft, setConfigDraft] = useState(createDraft(null));
  const [selectedIconName, setSelectedIconName] = useState<string | null>(null);
  const [selectedIconDataUrl, setSelectedIconDataUrl] = useState<string | null>(null);
  const [configDirty, setConfigDirty] = useState(false);

  const fetchState = async () => {
    try {
      const nextState = await requestJson<BuildState>('/__dev/apk-build/state');
      setState(nextState);
      if (!configDirty) {
        setConfigDraft(createDraft(nextState.config));
      }
      setRequestError(null);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    if (!open) return;

    void fetchState();
    const timer = window.setInterval(() => {
      void fetchState();
    }, state.status === 'running' ? 1200 : 4000);

    return () => window.clearInterval(timer);
  }, [configDirty, open, state.status]);

  const handleRunBuild = async () => {
    setIsSubmitting(true);
    try {
      const nextState = await requestJson<BuildState>('/__dev/apk-build/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ installAfterBuild }),
      });
      setState(nextState);
      setRequestError(null);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstallLatest = async () => {
    setIsSubmitting(true);
    try {
      const nextState = await requestJson<BuildState>('/__dev/apk-build/install', {
        method: 'POST',
      });
      setState(nextState);
      setRequestError(null);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevealLatest = async () => {
    setIsSubmitting(true);
    try {
      const nextState = await requestJson<BuildState>('/__dev/apk-build/reveal', {
        method: 'POST',
      });
      setState(nextState);
      setRequestError(null);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSubmitting(true);
    try {
      const nextState = await requestJson<BuildState>('/__dev/apk-build/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...configDraft,
          iconDataUrl: selectedIconDataUrl,
          iconFileName: selectedIconName,
        }),
      });
      setState(nextState);
      setConfigDraft(createDraft(nextState.config));
      setSelectedIconDataUrl(null);
      setSelectedIconName(null);
      setConfigDirty(false);
      setRequestError(null);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIconFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('图标读取失败。'));
      };
      reader.onerror = () => reject(new Error('图标读取失败。'));
      reader.readAsDataURL(file);
    });

    setSelectedIconName(file.name);
    setSelectedIconDataUrl(dataUrl);
    setConfigDirty(true);
  };

  const canInstallLatest = useMemo(
    () => Boolean(state.apkPath) && state.status !== 'running' && !isSubmitting,
    [isSubmitting, state.apkPath, state.status],
  );
  const canRevealLatest = useMemo(
    () => Boolean(state.apkPath) && state.status !== 'running' && !isSubmitting,
    [isSubmitting, state.apkPath, state.status],
  );
  const currentIconPreview = useMemo(() => {
    if (selectedIconDataUrl) return selectedIconDataUrl;
    if (!configDraft.icon) return null;
    if (/^https?:\/\//.test(configDraft.icon)) return configDraft.icon;
    return `/${configDraft.icon.replace(/^\/+/, '')}`;
  }, [configDraft.icon, selectedIconDataUrl]);

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-50 flex max-w-[min(92vw,420px)] flex-col items-end gap-3">
      {open && (
        <div className="pointer-events-auto flex max-h-[min(78vh,760px)] w-[min(92vw,420px)] flex-col overflow-hidden rounded-[28px] border border-[rgba(83,101,122,0.18)] bg-[rgba(255,255,255,0.96)] p-4 shadow-[0_18px_48px_rgba(38,54,72,0.18)] backdrop-blur">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[var(--shell-ink-soft)]">
                Developer
              </div>
              <h2 className="mt-1 text-[24px] font-black text-[var(--shell-ink)]">框架内打包</h2>
              <p className="mt-1 text-[12px] font-bold text-[var(--shell-ink-soft)]">
                当前面板优先读取环境变量，其次自动发现本机工具链，不依赖单一路径。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 w-10 rounded-full border border-[rgba(83,101,122,0.16)] bg-white text-[18px] font-black text-[var(--shell-ink)]"
            >
              ×
            </button>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 touch-pan-y [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">
            <div className="rounded-[24px] border border-[rgba(83,101,122,0.14)] bg-white px-3 py-3 text-[12px] font-bold text-[var(--shell-ink)]">
              <div className="flex items-center justify-between gap-3">
                <span>应用配置</span>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSubmitting || state.status === 'running'}
                  className="rounded-full bg-[var(--shell-accent)] px-4 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  保存配置
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="rounded-[20px] bg-[var(--shell-mint-soft)] px-3 py-2">
                  <div className="text-[11px] text-[var(--shell-ink-soft)]">应用名</div>
                  <input
                    value={configDraft.appName}
                    onChange={(event) => {
                      setConfigDirty(true);
                      setConfigDraft((draft) => ({ ...draft, appName: event.target.value }));
                    }}
                    className="mt-1 w-full bg-transparent text-[13px] font-black text-[var(--shell-ink)] outline-none"
                  />
                </label>
                <label className="rounded-[20px] bg-[var(--shell-mint-soft)] px-3 py-2">
                  <div className="text-[11px] text-[var(--shell-ink-soft)]">包名</div>
                  <input
                    value={configDraft.packageName}
                    onChange={(event) => {
                      setConfigDirty(true);
                      setConfigDraft((draft) => ({ ...draft, packageName: event.target.value }));
                    }}
                    className="mt-1 w-full bg-transparent text-[13px] font-black text-[var(--shell-ink)] outline-none"
                  />
                </label>
                <label className="rounded-[20px] bg-[var(--shell-mint-soft)] px-3 py-2">
                  <div className="text-[11px] text-[var(--shell-ink-soft)]">版本号</div>
                  <input
                    value={configDraft.versionName}
                    onChange={(event) => {
                      setConfigDirty(true);
                      setConfigDraft((draft) => ({ ...draft, versionName: event.target.value }));
                    }}
                    className="mt-1 w-full bg-transparent text-[13px] font-black text-[var(--shell-ink)] outline-none"
                  />
                </label>
                <label className="rounded-[20px] bg-[var(--shell-mint-soft)] px-3 py-2">
                  <div className="text-[11px] text-[var(--shell-ink-soft)]">版本序号</div>
                  <input
                    value={configDraft.versionCode}
                    onChange={(event) => {
                      setConfigDirty(true);
                      setConfigDraft((draft) => ({ ...draft, versionCode: event.target.value }));
                    }}
                    className="mt-1 w-full bg-transparent text-[13px] font-black text-[var(--shell-ink)] outline-none"
                  />
                </label>
                <label className="rounded-[20px] bg-[var(--shell-mint-soft)] px-3 py-2">
                  <div className="text-[11px] text-[var(--shell-ink-soft)]">构建类型</div>
                  <select
                    value={configDraft.buildType}
                    onChange={(event) => {
                      setConfigDirty(true);
                      setConfigDraft((draft) => ({ ...draft, buildType: event.target.value }));
                    }}
                    className="mt-1 w-full bg-transparent text-[13px] font-black text-[var(--shell-ink)] outline-none"
                  >
                    <option value="debug">debug</option>
                    <option value="release">release</option>
                  </select>
                </label>
                <label className="rounded-[20px] bg-[var(--shell-mint-soft)] px-3 py-2">
                  <div className="text-[11px] text-[var(--shell-ink-soft)]">产物类型</div>
                  <select
                    value={configDraft.packageType}
                    onChange={(event) => {
                      setConfigDirty(true);
                      setConfigDraft((draft) => ({ ...draft, packageType: event.target.value }));
                    }}
                    className="mt-1 w-full bg-transparent text-[13px] font-black text-[var(--shell-ink)] outline-none"
                  >
                    <option value="apk">apk</option>
                    <option value="bundle">bundle</option>
                    <option value="both">both</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 rounded-[20px] bg-[var(--shell-mint-soft)] px-3 py-3">
                <div className="text-[11px] text-[var(--shell-ink-soft)]">应用 Icon</div>
                <div className="mt-2 flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px] border border-[rgba(83,101,122,0.12)] bg-white">
                    {currentIconPreview ? (
                      <img src={currentIconPreview} alt="icon preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-[var(--shell-ink-soft)]">
                        无图标
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <input
                      value={configDraft.icon}
                      onChange={(event) => {
                        setSelectedIconDataUrl(null);
                        setSelectedIconName(null);
                        setConfigDirty(true);
                        setConfigDraft((draft) => ({ ...draft, icon: event.target.value }));
                      }}
                      placeholder="demo2apk-assets/app-icon.png"
                      className="w-full rounded-[14px] border border-[rgba(83,101,122,0.12)] bg-white px-3 py-2 text-[12px] font-bold text-[var(--shell-ink)] outline-none"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <label className="cursor-pointer rounded-full border border-[rgba(83,101,122,0.16)] bg-white px-3 py-2 text-[12px] font-black text-[var(--shell-ink)]">
                        选择图片
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(event) => void handleIconFileChange(event)}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIconDataUrl(null);
                          setSelectedIconName(null);
                          setConfigDirty(true);
                          setConfigDraft((draft) => ({ ...draft, icon: '' }));
                        }}
                        className="rounded-full border border-[rgba(83,101,122,0.16)] bg-white px-3 py-2 text-[12px] font-black text-[var(--shell-ink)]"
                      >
                        清空图标
                      </button>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-[var(--shell-ink-soft)]">
                      {selectedIconName ? `待保存图片：${selectedIconName}` : '可直接填相对路径，或选择本地图片后点保存配置。'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-[rgba(83,101,122,0.14)] bg-white px-3 py-3 text-[12px] font-bold text-[var(--shell-ink)]">
              <div className="flex items-center justify-between gap-3">
                <span>打包状态</span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${
                    state.status === 'success'
                      ? 'bg-[#ebf9ef] text-[#137a3b]'
                      : state.status === 'error'
                        ? 'bg-[#fff0ef] text-[#bb3d36]'
                        : state.status === 'running'
                          ? 'bg-[#eef3ff] text-[#3d67d6]'
                          : 'bg-[var(--shell-mint-soft)] text-[var(--shell-ink-soft)]'
                  }`}
                >
                  {state.status}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-[var(--shell-ink-soft)]">
                <div className="rounded-[14px] bg-[var(--shell-mint-soft)] px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-[var(--shell-ink)]">配置文件</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sourceTone(state.configPath.source)}`}>
                      {state.configPath.sourceLabel}
                    </span>
                  </div>
                  <div className="mt-1 break-all">{state.configPath.displayValue}</div>
                </div>
                <div className="rounded-[14px] bg-[var(--shell-mint-soft)] px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-[var(--shell-ink)]">打包工具</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sourceTone(state.appConverterRoot.source)}`}>
                      {state.appConverterRoot.sourceLabel}
                    </span>
                  </div>
                  <div className="mt-1 break-all">{state.appConverterRoot.displayValue}</div>
                  {state.appConverterRoot.detail && state.appConverterRoot.detail !== state.appConverterRoot.displayValue ? (
                    <div className="mt-1 break-all text-[10px] opacity-80">{state.appConverterRoot.detail}</div>
                  ) : null}
                </div>
                <div className="rounded-[14px] bg-[var(--shell-mint-soft)] px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-[var(--shell-ink)]">Java 运行时</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${sourceTone(state.javaHome.source)}`}>
                      {state.javaHome.sourceLabel}
                    </span>
                  </div>
                  <div className="mt-1 break-all">{state.javaHome.displayValue}</div>
                  {state.javaHome.detail && state.javaHome.detail !== state.javaHome.displayValue ? (
                    <div className="mt-1 break-all text-[10px] opacity-80">{state.javaHome.detail}</div>
                  ) : null}
                </div>
                <div>开始时间：{formatTime(state.startedAt)}</div>
                <div>结束时间：{formatTime(state.finishedAt)}</div>
              </div>
              {state.apkPath && (
                <div className="mt-3 rounded-[16px] bg-[var(--shell-mint-soft)] px-3 py-2 text-[11px] text-[var(--shell-ink)]">
                  产物：{state.apkPath}
                </div>
              )}
              {(requestError || state.error) && (
                <div className="mt-3 rounded-[16px] bg-[#fff0ef] px-3 py-2 text-[11px] font-black text-[#bb3d36]">
                  {requestError || state.error}
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="mb-2 text-[12px] font-black text-[var(--shell-ink)]">构建日志</div>
              <div className="max-h-[260px] overflow-auto rounded-[20px] bg-[#1d2430] px-3 py-3 font-mono text-[11px] leading-5 text-[#d6e3ff] touch-pan-y [-webkit-overflow-scrolling:touch]">
                {state.logs.length > 0 ? state.logs.map((line, index) => (
                  <div key={`${index}-${line}`}>{line}</div>
                )) : <div className="text-[#8ea3c7]">还没有打包日志。</div>}
              </div>
            </div>
          </div>

          <div className="mt-4 shrink-0">
            <label className="flex items-center gap-2 rounded-[18px] bg-[var(--shell-mint-soft)] px-3 py-2 text-[12px] font-bold text-[var(--shell-ink)]">
              <input
                type="checkbox"
                checked={installAfterBuild}
                onChange={(event) => setInstallAfterBuild(event.target.checked)}
                className="h-4 w-4 accent-[var(--shell-accent)]"
              />
              打包完成后自动安装到已连接设备
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRunBuild}
                disabled={state.status === 'running' || isSubmitting}
                className="rounded-full bg-[var(--shell-accent)] px-4 py-2 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.status === 'running' ? '打包中...' : '构建 APK'}
              </button>
              <button
                type="button"
                onClick={handleInstallLatest}
                disabled={!canInstallLatest}
                className="rounded-full border border-[rgba(83,101,122,0.16)] bg-white px-4 py-2 text-[13px] font-black text-[var(--shell-ink)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                安装现有 APK
              </button>
              <button
                type="button"
                onClick={handleRevealLatest}
                disabled={!canRevealLatest}
                className="rounded-full border border-[rgba(83,101,122,0.16)] bg-white px-4 py-2 text-[13px] font-black text-[var(--shell-ink)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                显示产物
              </button>
              <button
                type="button"
                onClick={() => void fetchState()}
                disabled={isSubmitting}
                className="rounded-full border border-[rgba(83,101,122,0.16)] bg-white px-4 py-2 text-[13px] font-black text-[var(--shell-ink)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                刷新状态
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="pointer-events-auto rounded-full border border-[rgba(83,101,122,0.16)] bg-white/95 px-4 py-3 text-[13px] font-black text-[var(--shell-ink)] shadow-[0_12px_30px_rgba(38,54,72,0.16)] backdrop-blur"
      >
        {open ? '收起 Dev' : 'Dev 打包'}
      </button>
    </div>
  );
};
