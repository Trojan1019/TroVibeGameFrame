import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const BOOTSTRAP_LOG_KEY = '__scaffoldBootstrapLogs';
const BOOTSTRAP_LOG_LIMIT = 120;

function appendBootstrapLog(type: string, detail: unknown) {
  const logs: unknown[] = Array.isArray(window[BOOTSTRAP_LOG_KEY as keyof Window])
    ? (window[BOOTSTRAP_LOG_KEY as keyof Window] as unknown[])
    : [];
  logs.push({ time: new Date().toISOString(), type, detail });
  if (logs.length > BOOTSTRAP_LOG_LIMIT) logs.splice(0, logs.length - BOOTSTRAP_LOG_LIMIT);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)[BOOTSTRAP_LOG_KEY] = logs;
  console.log('[ScaffoldBootstrap]', type, detail);
}

function normalizeBaseURL(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : '';
}

function getScaffoldSdkCandidates(): string[] {
  return ['/scaffold-sdk/scaffold-sdk.min.js', './scaffold-sdk/scaffold-sdk.min.js'];
}

function getRemoteScaffoldSdkCandidates(baseURL: string): string[] {
  const normalized = normalizeBaseURL(baseURL);
  if (!normalized) return [];
  if (/\/scaffold-sdk$/i.test(normalized)) {
    return [`${normalized}/scaffold-sdk.min.js`, `${normalized}/scaffold-sdk.js`];
  }
  return [`${normalized}/scaffold-sdk/scaffold-sdk.min.js`, `${normalized}/scaffold-sdk/scaffold-sdk.js`];
}

function toAbsoluteURL(url: string): string {
  return new URL(url, window.location.href).href;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasRequiredScaffoldSDK(sdk: any): boolean {
  return Boolean(
    sdk &&
      typeof sdk.init === 'function' &&
      typeof sdk.wallet?.getBalances === 'function' &&
      typeof sdk.checkin?.getStatus === 'function' &&
      typeof sdk.checkin?.check === 'function' &&
      typeof sdk.checkin?.reward === 'function' &&
      typeof sdk.mission?.listGroups === 'function' &&
      typeof sdk.mission?.getGroup === 'function' &&
      typeof sdk.mission?.finishSlot === 'function' &&
      typeof sdk.mission?.rewardSlot === 'function' &&
      typeof sdk.mail?.getSummary === 'function' &&
      typeof sdk.mail?.list === 'function' &&
      typeof sdk.mail?.get === 'function' &&
      typeof sdk.mail?.markRead === 'function' &&
      typeof sdk.mail?.delete === 'function' &&
      typeof sdk.mail?.claim === 'function',
  );
}

function loadScript(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const absoluteURL = toAbsoluteURL(url);
    appendBootstrapLog('script:try', { url: absoluteURL });
    const existing = Array.from(document.scripts).find((s) => s.src === absoluteURL);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        appendBootstrapLog('script:loaded_cached', { url: absoluteURL });
        resolve(absoluteURL);
        return;
      }
      existing.addEventListener('load', () => resolve(absoluteURL), { once: true });
      existing.addEventListener('error', () => reject(new Error(`script load failed: ${absoluteURL}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = absoluteURL;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = 'true';
      appendBootstrapLog('script:loaded', { url: absoluteURL });
      resolve(absoluteURL);
    };
    script.onerror = () => {
      appendBootstrapLog('script:error', { url: absoluteURL });
      reject(new Error(`script load failed: ${absoluteURL}`));
    };
    document.head.appendChild(script);
  });
}

async function ensureScaffoldSDK(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  if (hasRequiredScaffoldSDK(win.ScaffoldSDK)) {
    appendBootstrapLog('sdk:exists', { version: win.ScaffoldSDK.version || 'unknown' });
    return true;
  }

  const envBaseURL = normalizeBaseURL(import.meta.env.VITE_SCAFFOLD_BASE_URL);
  const candidates = getScaffoldSdkCandidates();

  // Also try loading from backend if configured
  if (envBaseURL && !(window.location.protocol === 'https:' && envBaseURL.startsWith('http://'))) {
    candidates.unshift(...getRemoteScaffoldSdkCandidates(envBaseURL));
  }

  appendBootstrapLog('sdk:candidates', { candidates });

  for (const candidate of candidates) {
    try {
      await loadScript(candidate);
      if (hasRequiredScaffoldSDK(win.ScaffoldSDK)) {
        appendBootstrapLog('sdk:ready', { loadedFrom: candidate, version: win.ScaffoldSDK.version || 'unknown' });
        return true;
      }
      appendBootstrapLog('sdk:candidate_incomplete', { candidate });
    } catch (error) {
      appendBootstrapLog('sdk:load_failed', { candidate, message: (error as Error)?.message });
    }
  }

  appendBootstrapLog('sdk:not_found', {});
  return false;
}

async function bootstrap() {
  appendBootstrapLog('bootstrap:start', {});
  await ensureScaffoldSDK();
  appendBootstrapLog('bootstrap:mount', {});
  createRoot(document.getElementById('root')!).render(
    <App />
  );
}

bootstrap();
