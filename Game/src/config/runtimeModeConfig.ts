import { setGameConfig } from './runtimeConfig';
import {
  buildGameConfigPatch,
  type ActivityPackConfig,
  type GameplayModeConfig,
  type RuntimeModeBundle,
  type RuntimeModeManifest,
  type ShellLayoutConfig,
} from './modeConfig';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function loadRuntimeModeBundle(manifestUrl = '/config/current-mode.json'): Promise<RuntimeModeBundle | null> {
  try {
    const manifest = await fetchJson<RuntimeModeManifest>(manifestUrl);
    const [mode, activityPack, shellLayout] = await Promise.all([
      fetchJson<GameplayModeConfig>(`/config/modes/${manifest.modeId}.json`),
      fetchJson<ActivityPackConfig>(`/config/activity-packs/${manifest.activityPackId}.json`),
      fetchJson<ShellLayoutConfig>(`/config/shell-layouts/${manifest.shellLayoutId}.json`),
    ]);

    return {
      manifest,
      mode,
      activityPack,
      shellLayout,
    };
  } catch {
    return null;
  }
}

export async function applyRuntimeModeBundle(manifestUrl?: string): Promise<RuntimeModeBundle | null> {
  const bundle = await loadRuntimeModeBundle(manifestUrl);
  if (!bundle) return null;

  setGameConfig(buildGameConfigPatch(bundle));
  return bundle;
}
