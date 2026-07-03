export function createScopedKey(prefix: string, channelId: string, userId: string): string {
  const safePrefix = String(prefix || 'scaffold').trim() || 'scaffold'
  const safeChannel = String(channelId || 'default').trim() || 'default'
  const safeUser = String(userId || 'anonymous').trim() || 'anonymous'
  return `${safePrefix}:${safeChannel}:${safeUser}`
}

export function readJSONStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSONStorage(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export interface InventoryStore {
  key: string
  inventory: Record<string, number>
  processed: Record<string, boolean>
  save(): boolean
}

export function createInventoryStore({ channelId, userId }: { channelId: string; userId: string }): InventoryStore {
  const key = createScopedKey('inventory', channelId, userId)
  const saved = readJSONStorage<{ inventory?: Record<string, number>; processed?: Record<string, boolean> }>(key, {})
  const inventory: Record<string, number> = (saved && typeof saved.inventory === 'object' && saved.inventory) ? saved.inventory : {}
  const processed: Record<string, boolean> = (saved && typeof saved.processed === 'object' && saved.processed) ? saved.processed : {}

  return {
    key,
    inventory,
    processed,
    save() {
      return writeJSONStorage(key, { inventory: this.inventory, processed: this.processed })
    },
  }
}

export function nextIdempotencyKey(prefix = 'exchange'): string {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}:${seed}`
}
