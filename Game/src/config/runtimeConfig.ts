import { cloneGameConfig, DEFAULT_GAME_CONFIG, type GameConfig } from './gameConfig';

type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? U[]
    : T[K] extends object
      ? PartialDeep<T[K]>
      : T[K];
};

let currentConfig: GameConfig = cloneGameConfig(DEFAULT_GAME_CONFIG);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep<T>(base: T, patch: PartialDeep<T> | undefined): T {
  if (patch == null) return base;
  if (Array.isArray(base)) {
    return (Array.isArray(patch) ? patch : base) as T;
  }
  if (!isRecord(base) || !isRecord(patch)) {
    return (patch as T) ?? base;
  }

  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const baseValue = result[key];
    if (Array.isArray(value)) {
      result[key] = value;
      continue;
    }
    if (isRecord(baseValue) && isRecord(value)) {
      result[key] = mergeDeep(baseValue, value);
      continue;
    }
    result[key] = value;
  }
  return result as T;
}

export function getGameConfig() {
  return currentConfig;
}

export function resetGameConfig() {
  currentConfig = cloneGameConfig(DEFAULT_GAME_CONFIG);
  return currentConfig;
}

export function setGameConfig(nextConfig: PartialDeep<GameConfig>) {
  currentConfig = mergeDeep(cloneGameConfig(DEFAULT_GAME_CONFIG), nextConfig);
  return currentConfig;
}

export async function loadRuntimeGameConfig(url = '/config/runtime-config.json') {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) return currentConfig;
    const payload = (await response.json()) as PartialDeep<GameConfig>;
    return setGameConfig(payload);
  } catch {
    return currentConfig;
  }
}
