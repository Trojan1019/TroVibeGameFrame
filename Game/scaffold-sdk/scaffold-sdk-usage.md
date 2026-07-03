# ScaffoldSDK 接入指南

`ScaffoldSDK` 是面向游戏客户端的 JavaScript SDK，用于接入签到、任务、奖励领取、钱包货币、货币兑换、排行榜和实时事件能力。

本文只说明客户端可以使用的 SDK 功能和接口形态。游戏可以按自己的 UI、节奏、广告流程、背包系统和玩法条件自由接入；demo 只是一个完整示例，不代表唯一接入方式。

## 1. 能力概览

SDK 当前提供这些能力：

| 能力 | SDK 方法 | 典型用途 |
| --- | --- | --- |
| 登录态 | `init()`、`login()`、`ready()` | 建立 SDK 会话，后续请求自动携带鉴权 |
| 签到 | `checkin.*` | 查询签到进度、今日签到、补签、领取奖励、记录广告加成 |
| 任务 | `mission.*` | 获取任务组和槽位、打开任务、客户端上报完成、领取奖励、刷新和撤销刷新 |
| 奖励领取 | `reward.getClaim()` | 查询一次奖励领取单，做恢复、排查或补刷新 |
| 钱包货币 | `wallet.getBalances()`、`wallet.getLedger()` | 查询由服务端维护的货币余额和流水 |
| 货币兑换 | `wallet.listExchangeRules()`、`quoteExchange()`、`exchange()` | 查询兑换规则、试算兑换结果、执行兑换 |
| 兑换码 | `redemption.redeem()` | 输入兑换码并按 Reward Center 领取奖励 |
| 排行榜 | `rank.*` | 查询榜单、查询我的排名、上报分数、读取子榜维度 |
| 实时事件 | `realtime.*`、`on()` | 接收异步排行榜结果等事件 |

奖励分两类处理：

| 奖励类型 | 返回特征 | 客户端处理 |
| --- | --- | --- |
| 服务端钱包货币 | `kind: "currency"` + `fulfillment: "scaffold_wallet"` | 以返回的 `balance` / `balances` 或 `wallet.getBalances()` 为准刷新余额 |
| 客户端本地物品 | `kind: "item"` + `fulfillment: "client_local"` | 游戏按 `claim_id` 幂等写入自己的背包、道具或本地资产 |

SDK 不会下发 `client_local` 类型的服务端货币。如果游戏存在完全由客户端维护的“本地货币”，可以把它作为客户端自己的物品/背包资产处理；服务端钱包货币始终以 `scaffold_wallet` 为准。

## 2. 引入与初始化

### 2.1 页面引入

```html
<script src="scaffold-sdk.min.js"></script>
```

初始化时需要传入服务地址：

```javascript
await ScaffoldSDK.init({
  baseURL: 'https://scaffold.example.com',
  realtime: {
    enabled: true,
    autoConnect: true
  }
})
```

常用初始化参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `baseURL` | `string` | SDK 请求的服务地址，必填 |
| `channelId` | `string` | 渠道标识。App / WebView 环境中如果 bridge 能提供渠道，SDK 会优先使用 bridge 中的渠道 |
| `retry` | `number` | 网络错误或服务端临时错误的自动重试次数，默认 `2` |
| `retryDelay` | `number` | 首次重试等待毫秒数，默认 `300`，后续按指数退避 |
| `debug` | `boolean` | 开启 SDK 调试日志 |
| `realtime` | `boolean \| object` | 实时通道配置。传 `false` 可关闭实时通道 |

### 2.2 登录方式

如果游戏运行环境会触发登录成功事件，SDK 可以在 `init()` 后自动完成登录。SDK 会读取登录结果中的玩家标识和访问凭证，并换取 SDK 会话。

```javascript
ScaffoldSDK.on('auth:ready', function (session) {
  console.log('SDK ready:', session.userId, session.channelId)
})

ScaffoldSDK.on('auth:error', function (error) {
  console.warn('SDK login failed:', error.code, error.message)
})

await ScaffoldSDK.init({
  baseURL: 'https://scaffold.example.com'
})
```

如果游戏希望自行控制登录时机，也可以在拿到玩家凭证后手动调用：

```javascript
await ScaffoldSDK.init({
  baseURL: 'https://scaffold.example.com',
  realtime: { autoConnect: false }
}).catch(function () {
  // 如果当前时刻还没有游戏登录态，可以稍后手动 login。
})

await ScaffoldSDK.login({
  gameUserId: currentPlayer.id,
  accessToken: currentPlayer.accessToken
})
```

登录成功后，后续 SDK 方法会自动携带会话。业务代码通常只需要等待：

```javascript
await ScaffoldSDK.ready()
```

辅助方法：

```javascript
ScaffoldSDK.getUserId()
ScaffoldSDK.getChannelId()
ScaffoldSDK.getToken()
```

`getToken()` 主要用于调试或自定义请求场景。普通接入中不需要手动拼接鉴权头。

## 3. 通用事件

SDK 通过 `on()` / `off()` 监听事件：

```javascript
const off = ScaffoldSDK.on('auth:ready', function (session) {
  console.log(session.userId)
})

off()
```

常用事件：

| 事件名 | 触发时机 |
| --- | --- |
| `auth:ready` | SDK 登录完成 |
| `auth:error` | SDK 登录失败 |
| `realtime:connecting` | 实时通道开始连接 |
| `realtime:connected` | 实时通道连接成功 |
| `realtime:disconnected` | 实时通道断开 |
| `realtime:reconnecting` | 实时通道准备重连 |
| `realtime:error` | 实时通道发生错误 |
| `rank:update_result` | 异步排行榜上报完成处理 |
| `rank:changed` | 榜单发生变化时的通知事件 |
| `checkin:reward_result` | 签到奖励结果通知事件 |
| `mission:reward_result` | 任务奖励结果通知事件 |
| `system:notice` | 系统通知事件，例如管理员发放了新的待领取奖励或新邮件 |
| `config:changed` | 配置变化通知事件，客户端可据此清理本地配置缓存并重新拉取 |

奖励领取的主链路以 HTTP 返回为准。实时事件适合做 UI 刷新、提示或异步结果补充，不建议把它作为唯一发奖依据。

## 4. 签到接入

### 4.1 查询签到状态

```javascript
const status = await ScaffoldSDK.checkin.getStatus()
```

返回结构包含：

```json
{
  "config": {
    "cycle_days": 7,
    "allow_makeup": true,
    "makeup_cost": {},
    "rewards": {},
    "reset_rule": "loose"
  },
  "records": [
    {
      "id": "record_id",
      "check_day": 1,
      "check_round": 1,
      "check_date": "2026-05-21T00:00:00Z",
      "is_rewarded": 0,
      "is_makeup": 0,
      "ad_count": 1
    }
  ],
  "round": 1
}
```

客户端可以根据 `cycle_days` 渲染签到天数，根据 `records` 判断哪些天已签到、是否已领取奖励。具体 UI 可以是日历、横向列表、弹窗或游戏自己的入口。

### 4.2 今日签到、补签、广告加成

```javascript
const record = await ScaffoldSDK.checkin.check()
```

如果游戏提供补签入口：

```javascript
const record = await ScaffoldSDK.checkin.makeup(3)
```

如果签到奖励支持广告加成，广告播放由游戏自己的广告流程完成。广告成功后再通知 SDK：

```javascript
async function onCheckinAdReward(recordId) {
  const result = await ScaffoldSDK.checkin.watchAd(recordId)
  return result
}
```

SDK 只记录广告加成使用结果，不负责播放广告或决定广告是否成功。

### 4.3 领取签到奖励

```javascript
const claim = await ScaffoldSDK.checkin.reward(record.id)
await handleRewardClaims(claim)
```

领奖接口返回奖励领取单。客户端不需要也不应该传入奖励内容，实际奖励由当前签到配置决定。

## 5. 任务接入

任务由“任务组”和“任务槽位”组成。一个游戏可以只接入一个每日任务组，也可以接入主任务组、额外任务组、活动任务组等多个组。

SDK 不判断玩家是否真的完成了某个任务。游戏在自己认为任务达成时调用 `finishSlot()` 上报完成即可。

### 5.1 获取任务组列表

```javascript
const groups = await ScaffoldSDK.mission.listGroups()
```

任务组概要字段：

| 字段 | 说明 |
| --- | --- |
| `group_code` | 任务组标识 |
| `group_name` | 任务组名称 |
| `status` | 任务组状态 |
| `task_date` | 当前任务日期 |
| `task_count` | 任务数量 |
| `completed_count` | 已完成数量 |
| `claimed_count` | 已领奖数量 |
| `claim_mode` | `auto` 自动领奖，`manual` 手动领奖 |
| `requires_ad_to_open` | 是否需要广告开启任务组 |
| `next_refresh_at` | 下一次刷新时间，可用于倒计时 |

示例：

```javascript
groups.forEach(function (group) {
  console.log(group.group_name, group.completed_count + '/' + group.task_count)
})
```

### 5.2 获取任务组详情

```javascript
const detail = await ScaffoldSDK.mission.getGroup('main_daily')
```

返回：

```json
{
  "group": {
    "group_code": "main_daily",
    "group_name": "每日任务",
    "status": "in_progress",
    "task_count": 5,
    "completed_count": 1,
    "claimed_count": 1,
    "claim_mode": "manual",
    "next_refresh_at": "2026-05-22T00:00:00Z"
  },
  "slots": [
    {
      "id": "detail_id",
      "slot_index": 1,
      "mission_code": "watch_ad_easy",
      "mission_name": "观看激励广告",
      "description": "观看 3 次激励广告",
      "category": "ad",
      "difficulty": 1,
      "status": "open",
      "progress_value": 0,
      "target_value": 3,
      "opened": true,
      "requires_ad_unlock": false,
      "allow_refresh": false,
      "refresh_remaining": 0,
      "reward_snapshot": {}
    }
  ],
  "task_date": "2026-05-21"
}
```

槽位常用状态：

| 状态 | 含义 |
| --- | --- |
| `locked` | 尚未开放 |
| `ad_locked` | 需要广告解锁 |
| `open` | 已开放，可由游戏上报完成 |
| `finished` | 已完成，等待后续领取或结算 |
| `pending_claim` | 可领取 |
| `claimed` | 已领取 |

### 5.3 按玩家功能过滤任务分类

如果某些玩法对当前玩家不可用，客户端可以在拉取或打开任务组时传入 `disabledCategories`：

```javascript
const group = await ScaffoldSDK.mission.getGroup('main_daily', {
  disabledCategories: ['showroom', 'items']
})
```

这个参数用于告诉任务生成逻辑“本次不要生成这些分类的任务”。常见用法包括：

```javascript
function getDisabledMissionCategories(player) {
  const disabled = []
  if (!player.features.showroom) disabled.push('showroom')
  if (!player.features.items) disabled.push('items')
  if (!player.features.ads) disabled.push('ad')
  return disabled
}

const group = await ScaffoldSDK.mission.getGroup('main_daily', {
  disabledCategories: getDisabledMissionCategories(player)
})
```

如果当天任务已经生成，后续再传入不同的 `disabledCategories` 不会强制重抽已有任务。游戏可以在玩家首次打开任务入口、额外任务入口或刷新任务前传入当前功能状态。

### 5.4 打开任务组和槽位

如果任务组需要广告开启，游戏可以先完成自己的广告流程，再调用：

```javascript
await ScaffoldSDK.mission.openGroup('extra_daily')
```

如果单个槽位需要广告解锁：

```javascript
await ScaffoldSDK.mission.openSlot(slot.id)
```

SDK 不播放广告，也不规定入口展示方式。游戏可以把广告按钮、倒计时、解锁弹窗等做成自己的交互。

### 5.5 上报任务完成

当游戏判断任务达成时：

```javascript
const result = await ScaffoldSDK.mission.finishSlot(slot.id, {
  source: 'battle_result',
  level: 12,
  score: 9800
})

await handleRewardClaims(result)
```

`report` 是客户端上报给任务系统的附加信息，可以用于记录完成来源。任务完成校验采用“客户端上报完成即可信”的接入方式，客户端不需要把完整战斗日志传给 SDK。

如果任务组是自动领取模式，`finishSlot()` 可能直接返回奖励领取单；如果是手动领取模式，客户端可以展示领取按钮。

### 5.6 手动领取任务奖励

```javascript
const result = await ScaffoldSDK.mission.rewardSlot(slot.id)
await handleRewardClaims(result)
```

任务领奖结果结构：

```json
{
  "detail": {
    "id": "detail_id",
    "status": "claimed",
    "finished": true,
    "claimed": true
  },
  "claims": [
    {
      "claim_id": "claim_id",
      "source_type": "mission_detail",
      "source_id": "detail_id",
      "newly_claimed": true,
      "status": "success",
      "items": [],
      "balances": {}
    }
  ]
}
```

`claims` 里可能同时包含槽位奖励、完成 N 个任务奖励、全部完成奖励。客户端可以统一遍历处理。

### 5.7 刷新和撤销刷新

如果槽位允许刷新：

```javascript
const result = await ScaffoldSDK.mission.refreshSlot(slot.id, {
  disabledCategories: getDisabledMissionCategories(player)
})
```

如果刷新需要广告，游戏可以先播放广告，再调用 `refreshSlot()`。如果业务提供撤销刷新入口：

```javascript
const result = await ScaffoldSDK.mission.undoRefreshSlot(slot.id)
```

槽位里与刷新相关的字段：

| 字段 | 说明 |
| --- | --- |
| `allow_refresh` | 是否允许刷新 |
| `refresh_total` | 总刷新次数 |
| `refresh_used` | 已使用次数 |
| `refresh_remaining` | 剩余次数 |
| `refresh_requires_ad` | 刷新是否需要广告 |
| `allow_refresh_undo` | 是否允许撤销刷新 |
| `has_previous_snapshot` | 是否存在可撤销的上一次任务 |

### 5.8 查询任务统计

```javascript
const stat = await ScaffoldSDK.mission.getStat()
```

可用于大厅红点、任务入口摘要或跨任务组进度展示。

## 6. 奖励领取与背包处理

签到和任务领奖都会返回奖励领取单。领取单核心字段：

| 字段 | 说明 |
| --- | --- |
| `claim_id` | 本次领取单 ID，可用于本地幂等 |
| `source_type` | 来源类型，例如 `checkin`、`mission_detail` |
| `source_id` | 来源记录 ID |
| `newly_claimed` | 本次调用是否真正新领取成功 |
| `status` | 领取整体状态 |
| `items` | 奖励项列表 |
| `balances` | 涉及服务端钱包货币时返回的最新余额快照 |

奖励项字段：

| 字段 | 说明 |
| --- | --- |
| `kind` | `currency` 服务端钱包货币，`item` 客户端本地物品 |
| `fulfillment` | `scaffold_wallet` 或 `client_local` |
| `currency_code` | 货币标识，仅服务端钱包货币使用 |
| `item_code` | 物品标识，仅客户端本地物品使用 |
| `amount` | 数量 |
| `status` | 奖励项状态 |
| `balance` | 服务端钱包货币发放后的余额 |

服务端钱包货币示例：

```json
{
  "claim_id": "claim_001",
  "newly_claimed": true,
  "status": "success",
  "items": [
    {
      "id": "item_001",
      "kind": "currency",
      "fulfillment": "scaffold_wallet",
      "currency_code": "coin",
      "amount": 100,
      "status": "success",
      "balance": 1200
    }
  ],
  "balances": {
    "coin": 1200
  }
}
```

客户端本地物品示例：

```json
{
  "claim_id": "claim_002",
  "newly_claimed": true,
  "status": "issued_to_client",
  "items": [
    {
      "id": "item_002",
      "kind": "item",
      "fulfillment": "client_local",
      "item_code": "booster_shuffle",
      "amount": 1,
      "status": "issued_to_client"
    }
  ]
}
```

管理员发放的奖励会先进入待领取发奖单。游戏可以在登录、打开邮箱/福利入口、收到 `system:notice` 后拉取待领取发奖单：

```javascript
const inbox = await ScaffoldSDK.reward.listPendingGrants({ page: 1, size: 20 })
```

也可以按状态查询：

```javascript
const claimed = await ScaffoldSDK.reward.listGrants({
  status: 'claimed',
  page: 1,
  size: 20
})
```

发奖单常见字段：

| 字段 | 说明 |
| --- | --- |
| `id` | 发奖单 ID |
| `title` | 展示标题 |
| `description` | 展示描述 |
| `status` | `pending` 待领取，`claimed` 已领取，`canceled` 已取消，`expired` 已过期，`failed` 领取失败 |
| `reward_snapshot` | 发奖时的奖励快照 |
| `expire_at` | 过期时间，可为空 |

领取发奖单时调用：

```javascript
const result = await ScaffoldSDK.reward.claimGrant(grant.id)
await handleRewardClaims(result.claim)
```

`system:notice` 只表示“有新通知或新奖励值得刷新 UI”。实际奖励是否获得，应以 `claimGrant()` 的 HTTP 返回为准。

## 7. 游戏内邮箱

```js
const summary = await ScaffoldSDK.mail.getSummary();
const page = await ScaffoldSDK.mail.list({ status: "unread", page: 1, size: 20 });
const detail = await ScaffoldSDK.mail.get(page.list[0].id);
await ScaffoldSDK.mail.markRead(detail.id);
const claimResult = await ScaffoldSDK.mail.claim(detail.id);
const claimAllResult = await ScaffoldSDK.mail.claimAll();
```

- `system:notice` 仅用于提示“可能有新邮件”，客户端应主动调用 `mail.list()` 刷新。
- 附件领取是否成功，以 `mail.claim()` 的 HTTP 返回为准，不以 WebSocket 事件作为发奖依据。
- `mail.claim()` 成功处理附件后，会顺手把该邮件标记为已读，便于客户端做“一键领取”。
- `mail.claimAll()` 会尝试领取当前玩家所有可领取附件，返回 `claims`、`success_count`、`failure_count` 和可选 `errors`。

demo 使用的处理方式如下，接入方可以按自己的背包系统调整：

```javascript
function collectClaims(result) {
  if (result && Array.isArray(result.claims)) return result.claims
  if (result && result.claim_id && Array.isArray(result.items)) return [result]
  return []
}

function applyClaimToBackpack(claim) {
  if (!claim || !claim.claim_id) return

  // 本地物品需要客户端自己保证幂等。
  if (hasProcessedClaim(claim.claim_id)) return

  claim.items.forEach(function (item) {
    if (item.kind === 'item' && item.fulfillment === 'client_local') {
      addItemToBackpack(item.item_code, item.amount)
    }
  })

  markClaimProcessed(claim.claim_id)
}

function mergeWalletBalances(claim, wallet) {
  if (claim.balances) {
    Object.assign(wallet, claim.balances)
    return
  }

  claim.items.forEach(function (item) {
    if (item.kind === 'currency' && item.fulfillment === 'scaffold_wallet' && item.balance != null) {
      wallet[item.currency_code] = item.balance
    }
  })
}

async function handleRewardClaims(result) {
  const claims = collectClaims(result)

  claims.forEach(function (claim) {
    applyClaimToBackpack(claim)
    mergeWalletBalances(claim, state.wallet)
  })

  const newlyClaimed = claims.filter(function (claim) {
    return claim.newly_claimed === true
  })

  if (newlyClaimed.length > 0) {
    showRewardToast(newlyClaimed)
  }
}
```

`newly_claimed` 很适合控制“获得奖励”提示，避免刷新页面或重复请求时反复弹出获得提示。客户端本地物品则建议额外用 `claim_id` 做幂等，避免同一领取单被本地重复入包。

如需恢复或确认某次领取结果：

```javascript
const claim = await ScaffoldSDK.reward.getClaim('claim_001')
```

## 8. 钱包与货币兑换

钱包只维护服务端货币，例如 `coin`、`gem`。客户端本地物品不进入钱包余额。

### 7.1 查询余额

```javascript
const wallet = await ScaffoldSDK.wallet.getBalances()
```

返回：

```json
{
  "balances": {
    "coin": 1200,
    "gem": 10
  },
  "currencies": [
    {
      "currency_code": "coin",
      "name": "金币",
      "icon": "",
      "status": 1,
      "sort_order": 1
    }
  ]
}
```

客户端展示余额时，应以 `balances` 为准。`currencies` 可用于显示货币名称、图标和排序。

### 7.2 查询流水

```javascript
const ledger = await ScaffoldSDK.wallet.getLedger({
  currencyCode: 'coin',
  page: 1,
  size: 20
})
```

返回：

```json
{
  "list": [
    {
      "id": "ledger_id",
      "currency_code": "coin",
      "amount_delta": 100,
      "balance_before": 1100,
      "balance_after": 1200,
      "source_type": "mission_detail",
      "source_id": "detail_id",
      "claim_id": "claim_id",
      "reason": "mission_detail_reward",
      "created_at": "2026-05-21T12:00:00Z"
    }
  ],
  "page": 1,
  "size": 20,
  "total": 1
}
```

### 7.3 查询兑换规则

```javascript
const rules = await ScaffoldSDK.wallet.listExchangeRules()
```

规则示例：

```json
[
  {
    "rule_code": "coin_to_gem",
    "rule_name": "金币兑换宝石",
    "from_currency_code": "coin",
    "from_currency_name": "金币",
    "to_currency_code": "gem",
    "to_currency_name": "宝石",
    "from_amount": 100,
    "to_amount": 1,
    "min_from_amount": 100,
    "max_from_amount": 10000,
    "daily_from_limit": 5000,
    "rounding_mode": "floor",
    "sort_order": 1
  }
]
```

兑换只会使用直接配置的规则。如果游戏需要双向兑换，通常会看到两条规则，例如 `coin_to_gem` 和 `gem_to_coin`。

### 7.4 兑换试算

```javascript
const quote = await ScaffoldSDK.wallet.quoteExchange({
  ruleCode: 'coin_to_gem',
  fromAmount: 1000
})
```

返回：

```json
{
  "rule_code": "coin_to_gem",
  "from_currency_code": "coin",
  "to_currency_code": "gem",
  "from_amount": 1000,
  "to_amount": 10,
  "rate": {},
  "limits": {
    "min_from_amount": 100,
    "max_from_amount": 10000,
    "daily_from_limit": 5000,
    "daily_from_used": 1000,
    "daily_from_remaining": 4000
  }
}
```

### 7.5 执行兑换

```javascript
const result = await ScaffoldSDK.wallet.exchange({
  ruleCode: 'coin_to_gem',
  fromAmount: 1000,
  idempotencyKey: 'exchange-' + orderId
})
```

返回：

```json
{
  "order_id": "exchange_order_id",
  "status": "success",
  "rule_code": "coin_to_gem",
  "from_currency_code": "coin",
  "to_currency_code": "gem",
  "from_amount": 1000,
  "to_amount": 10,
  "idempotency_key": "exchange-order-001",
  "balances": {
    "coin": 200,
    "gem": 20
  }
}
```

如果兑换按钮可能因为网络重试、页面恢复或玩家重复点击而发起同一笔请求，可以传 `idempotencyKey`。如果游戏希望每次点击都作为一笔新兑换，也可以生成新的幂等键或不传。

## 9. 排行榜接入

### 8.1 查询榜单

```javascript
const page = await ScaffoldSDK.rank.get('score', {
  period: 'alltime', // alltime | daily | weekly | monthly
  page: 1,
  size: 50
})
```

如果榜单支持子榜，可以传 `dimension`：

```javascript
const cnPage = await ScaffoldSDK.rank.get('score', {
  period: 'daily',
  dimension: 'CN',
  page: 1,
  size: 50
})
```

查询我的排名：

```javascript
const myRank = await ScaffoldSDK.rank.getMyRank('score', {
  period: 'weekly',
  dimension: 'CN'
})
```

查询已有子榜值：

```javascript
const dimensions = await ScaffoldSDK.rank.getDimensions('score', { period: 'alltime' })
```

### 8.2 上报分数

简单上报：

```javascript
const result = await ScaffoldSDK.rank.update('score', 9999)
```

携带展示信息：

```javascript
const result = await ScaffoldSDK.rank.update('score', 9999, {
  nickname: player.nickname,
  avatar: player.avatar
})
```

也可以传完整 payload：

```javascript
await ScaffoldSDK.rank.update('level', {
  level: 101,
  extra: {
    nickname: player.nickname
  }
})
```

`extra` 是排行榜展示用的扩展信息，SDK 会按原样提交。推荐放昵称、头像、段位等展示字段。国家维度由服务端在登录时根据 IP 识别并维护，客户端不应上传或依赖 `extra.country`。榜单是否接受本次分数取决于榜单规则；如果本次分数没有进入榜单，已有榜单记录里的 `extra` 可能不会变化。demo 为了让当前玩家立即看到自己改名后的效果，会对“我的那一行”使用本地昵称覆盖展示；接入方也可以使用自己的用户资料系统处理昵称展示。

### 8.3 等待异步榜单结果

有些榜单上报会异步处理。普通写法：

```javascript
const result = await ScaffoldSDK.rank.update('score', 9999, {
  nickname: player.nickname
})

if (result.mode === 'async') {
  console.log('等待榜单处理:', result.job_id)
}
```

监听处理结果：

```javascript
ScaffoldSDK.on('rank:update_result', function (event) {
  console.log(event.job_id, event.status, event.rank)
})
```

如果希望在一次调用里等待结果：

```javascript
const result = await ScaffoldSDK.rank.updateAndWait('score', 9999, {
  nickname: player.nickname
}, {
  timeout: 8000
})
```

如果实时通道不可用，`updateAndWait()` 会返回上报结果并带上 `wait_skipped`，游戏仍可主动调用 `rank.get()` 或 `rank.getMyRank()` 刷新榜单。

## 10. 实时通道

实时通道可在初始化时自动连接：

```javascript
await ScaffoldSDK.init({
  baseURL: 'https://scaffold.example.com',
  realtime: {
    enabled: true,
    autoConnect: true,
    reconnect: {
      enabled: true,
      minDelay: 1000,
      maxDelay: 30000
    }
  }
})
```

也可以手动连接：

```javascript
await ScaffoldSDK.realtime.connect()
```

断开：

```javascript
ScaffoldSDK.realtime.disconnect()
```

查询状态：

```javascript
ScaffoldSDK.realtime.isConnected()
ScaffoldSDK.realtime.getState()
```

实时通道断开不会影响普通 HTTP 接口。对于排行榜、钱包余额、任务状态这类关键 UI，游戏仍可以通过对应查询接口主动刷新。

## 11. 错误处理与重试

所有 SDK 业务方法都返回 `Promise`。请求失败会抛出带 `code` 和 `message` 的错误：

```javascript
try {
  await ScaffoldSDK.checkin.check()
} catch (error) {
  showToast(error.message || '操作失败')
}
```

SDK 默认会对网络错误、HTTP 5xx 和服务端临时错误自动重试。`400`、`401` 这类参数或登录态错误不会自动重试。

常见处理建议：

| 场景 | 可选处理 |
| --- | --- |
| `401` 登录失败或会话失效 | 引导游戏重新登录，再调用 `ScaffoldSDK.login()` |
| 业务参数错误 | 保留当前 UI 状态，提示玩家稍后重试或刷新 |
| 网络错误 | 允许玩家重试，或在网络恢复后重新查询状态 |
| 领奖请求成功但页面刷新 | 使用 `reward.getClaim()` 或重新查询签到/任务状态恢复 |
| 本地物品重复处理风险 | 使用 `claim_id` 做本地幂等 |

## 12. 一个完整接入流程示例

下面示例接近 demo 的流程，但 UI、状态存储和按钮交互都可以替换成游戏自己的实现。

```javascript
const state = {
  wallet: {},
  backpack: {},
  processedClaims: loadProcessedClaims(),
  player: {
    nickname: loadNickname()
  }
}

async function bootScaffold() {
  await ScaffoldSDK.init({
    baseURL: 'https://scaffold.example.com',
    realtime: { enabled: true, autoConnect: true }
  })

  await refreshWallet()
  await refreshCheckin()
  await refreshMissions()
  await refreshRank()
}

async function refreshWallet() {
  const wallet = await ScaffoldSDK.wallet.getBalances()
  state.wallet = wallet.balances || {}
  renderWallet(wallet)
}

async function refreshCheckin() {
  const status = await ScaffoldSDK.checkin.getStatus()
  renderCheckin(status)
}

async function doCheckin(record) {
  const checked = await ScaffoldSDK.checkin.check()
  renderCheckinRecord(checked)
}

async function claimCheckin(record) {
  const claim = await ScaffoldSDK.checkin.reward(record.id)
  await handleRewardClaims(claim)
  await refreshWallet()
  await refreshCheckin()
}

async function refreshMissions() {
  const group = await ScaffoldSDK.mission.getGroup('main_daily', {
    disabledCategories: getDisabledMissionCategories()
  })
  renderMissionGroup(group)
}

async function finishMission(slot) {
  const result = await ScaffoldSDK.mission.finishSlot(slot.id, {
    source: 'client',
    finished_at: Date.now()
  })
  await handleRewardClaims(result)
  await refreshWallet()
  await refreshMissions()
}

async function claimMission(slot) {
  const result = await ScaffoldSDK.mission.rewardSlot(slot.id)
  await handleRewardClaims(result)
  await refreshWallet()
  await refreshMissions()
}

async function exchangeCurrency(ruleCode, fromAmount) {
  const result = await ScaffoldSDK.wallet.exchange({
    ruleCode,
    fromAmount,
    idempotencyKey: 'exchange-' + Date.now()
  })
  state.wallet = Object.assign({}, state.wallet, result.balances || {})
  renderWallet({ balances: state.wallet })
}

async function submitScore(score) {
  await ScaffoldSDK.rank.updateAndWait('score', score, {
    nickname: state.player.nickname
  }, {
    timeout: 5000
  })
  await refreshRank()
}

async function refreshRank() {
  const page = await ScaffoldSDK.rank.get('score', { page: 1, size: 20 })
  renderRank(page)
}
```

## 13. 接入检查清单

接入时可以逐项确认：

| 项目 | 说明 |
| --- | --- |
| 初始化 | 页面已引入 SDK，并在合适时机调用 `init()` |
| 登录 | SDK 能拿到玩家标识、渠道标识和访问凭证，`auth:ready` 正常触发 |
| 签到 | 能查询状态、签到、补签、领取奖励，并根据领取结果刷新钱包/背包 |
| 任务 | 能拉取任务组和槽位，按游戏行为调用 `finishSlot()`，按领取模式处理奖励 |
| 分类过滤 | 如果玩家功能未解锁，拉取任务时传入对应 `disabledCategories` |
| 奖励 | 服务端货币只刷新钱包余额，本地物品按 `claim_id` 幂等入背包 |
| 钱包 | 能查询余额、流水，并在领奖或兑换后刷新展示 |
| 兑换 | 能展示规则、试算结果，并按需要传 `idempotencyKey` 执行兑换 |
| 排行榜 | 能上报分数、展示榜单，并按需要通过 `extra` 携带昵称等展示信息 |
| 实时事件 | 如启用实时通道，能处理连接状态和异步榜单结果 |
| 错误处理 | UI 对登录失败、网络失败、重复领奖等情况有合适提示或重试入口 |
