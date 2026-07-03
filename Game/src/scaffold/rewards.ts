import { InventoryStore } from './storage'

export interface RewardItem {
  kind?: string
  fulfillment?: string
  currency_code?: string
  item_code?: string
  amount?: number
  balance?: number
}

export interface Claim {
  claim_id?: string
  newly_claimed?: boolean
  balances?: Record<string, number>
  items?: RewardItem[]
}

export interface MailSummaryPayload {
  unread_count?: number
  unreadCount?: number
  unclaimed_count?: number
  unclaimedCount?: number
}

export interface MailItem {
  id?: string
  mail_status?: string
  attachment_status?: string
}

export function collectClaims(result: unknown): Claim[] {
  if (!result) return []
  if (Array.isArray(result)) return (result as Claim[]).filter(Boolean)
  const r = result as Record<string, unknown>
  if (Array.isArray(r.claims)) return (r.claims as Claim[]).filter(Boolean)
  if (r.claim && typeof r.claim === 'object') return [r.claim as Claim]
  if (typeof result === 'object' && (result as Claim).claim_id) return [result as Claim]
  return []
}

export function mergeWalletBalancesFromClaims(claims: Claim[]): Record<string, number> {
  const patch: Record<string, number> = {}
  for (const claim of claims || []) {
    if (claim?.balances && typeof claim.balances === 'object') {
      for (const [code, balance] of Object.entries(claim.balances)) {
        if (typeof balance === 'number' && Number.isFinite(balance)) {
          patch[code] = balance
        }
      }
    }
    for (const item of claim?.items || []) {
      const isWalletCurrency =
        item?.kind === 'currency' &&
        item?.fulfillment === 'scaffold_wallet' &&
        typeof item?.currency_code === 'string'
      if (!isWalletCurrency) continue
      if (typeof item.balance === 'number' && Number.isFinite(item.balance)) {
        patch[item.currency_code!] = item.balance
      }
    }
  }
  return patch
}

export function applyClientLocalClaims(
  claims: Claim[],
  store: InventoryStore
): { appliedItems: { claimId: string; itemCode: string; amount: number }[]; changed: boolean } {
  const appliedItems: { claimId: string; itemCode: string; amount: number }[] = []
  if (!store || !store.inventory || !store.processed) return { appliedItems, changed: false }

  let changed = false
  for (const claim of claims || []) {
    const claimId = claim?.claim_id
    if (!claimId || store.processed[claimId]) continue
    for (const item of claim?.items || []) {
      const isClientLocalItem =
        item?.kind === 'item' &&
        item?.fulfillment === 'client_local' &&
        typeof item?.item_code === 'string'
      if (!isClientLocalItem) continue
      const amount = Number(item.amount || 0)
      if (!Number.isFinite(amount) || amount <= 0) continue
      store.inventory[item.item_code!] = Number(store.inventory[item.item_code!] || 0) + amount
      appliedItems.push({ claimId, itemCode: item.item_code!, amount })
    }
    store.processed[claimId] = true
    changed = true
  }

  if (changed && typeof store.save === 'function') store.save()
  return { appliedItems, changed }
}

function createRewardLabel(item: RewardItem): string {
  if (item?.kind === 'currency' && item?.currency_code) return String(item.currency_code)
  if (item?.kind === 'item' && item?.item_code) return String(item.item_code)
  return 'reward'
}

export function summarizeRewardItems(items: RewardItem[]): string[] {
  if (!Array.isArray(items)) return []
  return items.flatMap((item) => {
    const amount = Number(item?.amount || 0)
    if (!Number.isFinite(amount) || amount <= 0) return []
    const isWalletCurrency =
      item?.kind === 'currency' &&
      item?.fulfillment === 'scaffold_wallet' &&
      typeof item?.currency_code === 'string'
    if (isWalletCurrency) return [`${item.currency_code} x${amount}`]
    const isClientLocalItem =
      item?.kind === 'item' &&
      item?.fulfillment === 'client_local' &&
      typeof item?.item_code === 'string'
    if (isClientLocalItem) return [`${item.item_code} x${amount}`]
    return []
  })
}

export function normalizeMailSummary(payload: MailSummaryPayload): { unreadCount: number; unclaimedCount: number } {
  const unreadCount = Number(payload?.unread_count ?? payload?.unreadCount ?? 0)
  const unclaimedCount = Number(payload?.unclaimed_count ?? payload?.unclaimedCount ?? 0)
  return {
    unreadCount: Number.isFinite(unreadCount) ? unreadCount : 0,
    unclaimedCount: Number.isFinite(unclaimedCount) ? unclaimedCount : 0,
  }
}

export function pickMailList(payload: unknown): MailItem[] {
  if (!payload || typeof payload !== 'object') return []
  const p = payload as Record<string, unknown>
  if (Array.isArray(p.list)) return p.list as MailItem[]
  if (Array.isArray(p.mails)) return p.mails as MailItem[]
  if (p.page && typeof p.page === 'object' && Array.isArray((p.page as Record<string, unknown>).list)) {
    return (p.page as Record<string, unknown>).list as MailItem[]
  }
  return []
}

export function computeMailBadgeCount(summary: MailSummaryPayload, mails: MailItem[]): number {
  if (Array.isArray(mails) && mails.length > 0) {
    const attentionIds = new Set<string>()
    mails.forEach((mail, index) => {
      const mailStatus = String(mail?.mail_status || '')
      const attachmentStatus = String(mail?.attachment_status || '')
      const isInactive = mailStatus === 'deleted' || mailStatus === 'expired'
      if (isInactive) return
      const needsAttention = mailStatus === 'unread' || attachmentStatus === 'unclaimed'
      if (!needsAttention) return
      attentionIds.add(String(mail?.id || `mail-${index}`))
    })
    return attentionIds.size
  }
  const normalized = normalizeMailSummary(summary)
  return Math.max(normalized.unreadCount, normalized.unclaimedCount)
}

export function getMailStatusText(status: string): string {
  const map: Record<string, string> = { unread: '未读', read: '已读', deleted: '已删除', expired: '已过期' }
  return map[String(status || '')] || String(status || '-')
}

export function getAttachmentStatusText(status: string): string {
  const map: Record<string, string> = { none: '无附件', unclaimed: '待领取', claimed: '已领取', failed: '失败', expired: '已过期' }
  return map[String(status || '')] || String(status || '-')
}

export function summarizeNewlyClaimedRewards(claims: Claim[]): { key: string; label: string; amount: number }[] {
  const totals = new Map<string, { key: string; label: string; amount: number }>()
  for (const claim of claims || []) {
    if (claim?.newly_claimed !== true) continue
    for (const item of claim?.items || []) {
      const isRewardItem =
        (item?.kind === 'currency' && item?.fulfillment === 'scaffold_wallet' && item?.currency_code) ||
        (item?.kind === 'item' && item?.fulfillment === 'client_local' && item?.item_code)
      if (!isRewardItem) continue
      const code = item.currency_code || item.item_code
      const amount = Number(item.amount || 0)
      if (!Number.isFinite(amount) || amount <= 0) continue
      const key = `${item.kind}:${code}:${item.fulfillment}`
      const previous = totals.get(key)
      if (previous) {
        previous.amount += amount
      } else {
        totals.set(key, { key, label: createRewardLabel(item), amount })
      }
    }
  }
  return Array.from(totals.values())
}
