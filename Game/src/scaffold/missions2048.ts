export interface MissionSlot {
  mission_code?: string
  description?: string
  category?: string
  opened?: boolean
  finished?: boolean
  claimed?: boolean
  target_value?: number
  progress_value?: number
  difficulty?: number
}

export interface MissionEvent {
  type?: string
  event?: string
  value?: number
  progress_value?: number
  score?: number
  best_tile?: number
  moves?: number
  item_code?: string
  exchange_amount?: number
  exchange_amount_total?: number
  gamesPlayed?: number
  count?: number
}

export function normalizeCategory(slot: MissionSlot): string {
  const category = String(slot?.category || '').toLowerCase()
  if (category) return category
  const codeText = `${slot?.mission_code || ''} ${slot?.description || ''}`.toLowerCase()
  if (codeText.includes('merge')) return 'merge_tile'
  if (codeText.includes('score')) return 'score_single'
  if (codeText.includes('move')) return 'move_count'
  if (codeText.includes('finish') || codeText.includes('game')) return 'games_played'
  if (codeText.includes('item') || codeText.includes('booster') || codeText.includes('use')) return 'use_item'
  if (codeText.includes('rank')) return 'rank_submit'
  if (codeText.includes('exchange')) return 'exchange'
  return ''
}

function normalizeEventValue(event: MissionEvent): number {
  if (typeof event?.progress_value === 'number' && Number.isFinite(event.progress_value)) return event.progress_value
  if (typeof event?.value === 'number' && Number.isFinite(event.value)) return event.value
  return 0
}

function readMissionCodeThreshold(code: string, prefix: string): number {
  const text = String(code || '').toLowerCase()
  const match = text.match(new RegExp(`${prefix}_(\\d+)$`))
  if (!match) return 0
  const value = Number(match[1])
  return Number.isFinite(value) ? value : 0
}

function pickEffectiveProgress(slot: MissionSlot, event: MissionEvent, fallbackProgress: number): number {
  const missionCode = String(slot?.mission_code || '').toLowerCase()
  const category = normalizeCategory(slot)

  if (category === 'rank_submit') {
    const rankScoreTarget = readMissionCodeThreshold(missionCode, 'rank_score')
    if (rankScoreTarget > 0) {
      const score = Number(event?.score || 0)
      return Number.isFinite(score) ? score : 0
    }
    return fallbackProgress
  }

  if (category === 'exchange') {
    const exchangeTarget = readMissionCodeThreshold(missionCode, 'exchange')
    if (exchangeTarget > 1) {
      const totalAmount = Number(event?.exchange_amount_total)
      if (Number.isFinite(totalAmount) && totalAmount > 0) return totalAmount
      const singleAmount = Number(event?.exchange_amount)
      return Number.isFinite(singleAmount) ? singleAmount : 0
    }
    return fallbackProgress
  }

  return fallbackProgress
}

export function createMoveEvent(context: { moves?: number; score?: number; bestTile?: number } = {}): MissionEvent {
  return {
    type: 'move_count',
    event: 'move',
    value: Number(context.moves || 0),
    progress_value: Number(context.moves || 0),
    score: Number(context.score || 0),
    best_tile: Number(context.bestTile || 0),
    moves: Number(context.moves || 0),
  }
}

export function createMergeEvent(tileValue: number, context: { score?: number; bestTile?: number; moves?: number } = {}): MissionEvent {
  return {
    type: 'merge_tile',
    event: 'merge_tile',
    value: Number(tileValue || 0),
    progress_value: Number(tileValue || 0),
    score: Number(context.score || 0),
    best_tile: Number(context.bestTile || tileValue || 0),
    moves: Number(context.moves || 0),
  }
}

export function createScoreEvent(score: number, context: { bestTile?: number; moves?: number } = {}): MissionEvent {
  return {
    type: 'score_single',
    event: 'score',
    value: Number(score || 0),
    progress_value: Number(score || 0),
    score: Number(score || 0),
    best_tile: Number(context.bestTile || 0),
    moves: Number(context.moves || 0),
  }
}

export function createGameFinishedEvent(context: { gamesPlayed?: number; score?: number; bestTile?: number; moves?: number } = {}): MissionEvent {
  return {
    type: 'games_played',
    event: 'game_finished',
    value: Number(context.gamesPlayed || 1),
    progress_value: Number(context.gamesPlayed || 1),
    score: Number(context.score || 0),
    best_tile: Number(context.bestTile || 0),
    moves: Number(context.moves || 0),
  }
}

export function createItemUsedEvent(itemCode: string, context: { count?: number; score?: number; bestTile?: number; moves?: number } = {}): MissionEvent {
  return {
    type: 'use_item',
    event: 'item_used',
    value: Number(context.count || 1),
    progress_value: Number(context.count || 1),
    score: Number(context.score || 0),
    best_tile: Number(context.bestTile || 0),
    moves: Number(context.moves || 0),
    item_code: itemCode || '',
  }
}

export function findCompletableMissionSlots(slots: MissionSlot[], event: MissionEvent): MissionSlot[] {
  const targetType = String(event?.type || '').toLowerCase()
  const progress = normalizeEventValue(event)
  return (slots || []).filter((slot) => {
    if (!slot || slot.opened !== true || slot.finished === true || slot.claimed === true) return false
    const category = normalizeCategory(slot)
    if (!category || category !== targetType) return false
    const target = Number(slot.target_value || 0)
    const slotProgress = Number(slot.progress_value || 0)
    const effectiveEventProgress = pickEffectiveProgress(slot, event, progress)
    const effective = Math.max(effectiveEventProgress, slotProgress)
    if (!Number.isFinite(target) || target <= 0) return effective > 0
    return effective >= target
  })
}

export function buildMissionReport(slot: MissionSlot, event: MissionEvent): Record<string, unknown> {
  const normalizedValue = normalizeEventValue(event)
  const value = pickEffectiveProgress(slot, event, normalizedValue)
  return {
    source: '2048',
    event: event?.event || event?.type || 'unknown',
    value,
    score: Number(event?.score || 0),
    best_tile: Number(event?.best_tile || 0),
    moves: Number(event?.moves || 0),
    item_code: typeof event?.item_code === 'string' ? event.item_code : undefined,
    exchange_amount: Number.isFinite(Number(event?.exchange_amount)) ? Number(event.exchange_amount) : undefined,
    exchange_amount_total: Number.isFinite(Number(event?.exchange_amount_total)) ? Number(event.exchange_amount_total) : undefined,
    difficulty: Number(slot?.difficulty || 0) || undefined,
    category: normalizeCategory(slot) || undefined,
  }
}
