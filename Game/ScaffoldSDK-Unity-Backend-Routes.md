# ScaffoldSDK Unity 后端交互复现说明

本文档面向后续 Unity C# 复现。重点记录当前 2048 游戏使用的 ScaffoldSDK 后端交互方式、baseURL 配置、GET/POST 路径和请求体结构。

## 1. BaseURL

当前项目已调整为新后端地址：

```txt
https://api.uggamer.com/scaffold-sdk
```

SDK 脚本地址：

```txt
https://api.uggamer.com/scaffold-sdk/scaffold-sdk.js
https://api.uggamer.com/scaffold-sdk/scaffold-sdk.min.js
```

业务 API 的完整路径规则：

```txt
{baseURL}/api/v1/{path}
```

例如：

```txt
https://api.uggamer.com/scaffold-sdk/api/v1/auth/login
https://api.uggamer.com/scaffold-sdk/api/v1/wallet/balances
```

当前 Web 项目配置点：

```txt
.env.local
VITE_SCAFFOLD_BASE_URL=https://api.uggamer.com/scaffold-sdk
```

Unity 中建议配置：

```csharp
const string BaseUrl = "https://api.uggamer.com/scaffold-sdk";
```

## 2. 通用 HTTP 结构

所有接口返回结构：

```json
{
  "code": 200,
  "message": "ok",
  "data": {}
}
```

客户端只使用 `data`。如果 `code != 200`，按业务错误处理。

有请求体的 POST 请求使用：

```http
Accept: application/json
Content-Type: application/json
```

登录后的业务请求额外携带：

```http
Authorization: Bearer <token>
```

GET 请求没有 body，只拼 query string。

POST 请求如果没有 body，可以发送空 body 或 `{}`，但和 JS SDK 对齐时，大多数无 body POST 不设置 `Content-Type`。

## 3. 登录与会话

### POST /auth/login

完整路径：

```txt
POST {baseURL}/api/v1/auth/login
```

请求体：

```json
{
  "channel_id": "h5_2048",
  "sdk_user_id": "player_user_id",
  "sdk_game_token": "access_token_or_dev_token"
}
```

返回 data：

```json
{
  "token": "jwt-token",
  "expires_in": 86400,
  "user_id": "player_user_id"
}
```

Unity 处理：

```txt
保存 token
保存 user_id
后续请求加 Authorization: Bearer token
```

## 4. 钱包 Wallet

当前 2048 游戏实际使用 `getBalances()`，把 `coin` 映射为金币，把 `gem` 映射为钻石。

### GET /wallet/balances

```txt
GET {baseURL}/api/v1/wallet/balances
```

请求体：无。

返回 data 示例：

```json
{
  "balances": {
    "coin": 1200,
    "gem": 10
  },
  "currencies": []
}
```

### GET /wallet/ledger

```txt
GET {baseURL}/api/v1/wallet/ledger?currency_code=coin&page=1&size=20
```

请求体：无。

query：

```txt
currency_code
page
size
```

### GET /wallet/exchange/rules

```txt
GET {baseURL}/api/v1/wallet/exchange/rules
```

请求体：无。

### POST /wallet/exchange/quote

```txt
POST {baseURL}/api/v1/wallet/exchange/quote
```

请求体：

```json
{
  "rule_code": "coin_to_gem",
  "from_amount": 1000
}
```

### POST /wallet/exchange

```txt
POST {baseURL}/api/v1/wallet/exchange
```

请求体：

```json
{
  "rule_code": "coin_to_gem",
  "from_amount": 1000,
  "idempotency_key": "exchange-order-001"
}
```

说明：`idempotency_key` 用于防止重复点击或网络重试导致重复兑换。

## 5. 签到 Checkin

当前 2048 游戏使用：查询签到状态、今日签到、补签、领取签到奖励。

### GET /checkin/status

```txt
GET {baseURL}/api/v1/checkin/status
```

请求体：无。

返回 data 里常用字段：

```json
{
  "config": {
    "cycle_days": 7
  },
  "records": [
    {
      "id": "record_id",
      "check_day": 1,
      "check_date": "2026-05-21T00:00:00Z",
      "is_rewarded": 1,
      "is_makeup": 0,
      "ad_count": 0
    }
  ],
  "round": 1
}
```

### POST /checkin/check

```txt
POST {baseURL}/api/v1/checkin/check
```

请求体：无。

返回 data：签到记录，重点取 `id`。

```json
{
  "id": "record_id",
  "check_day": 1
}
```

2048 当前流程：`check()` 成功后，立刻调用 `/checkin/reward`。

### POST /checkin/makeup

```txt
POST {baseURL}/api/v1/checkin/makeup
```

请求体：

```json
{
  "day": 3
}
```

返回 data：补签记录，重点取 `id`。

### POST /checkin/reward

```txt
POST {baseURL}/api/v1/checkin/reward
```

请求体：

```json
{
  "record_id": "record_id"
}
```

返回 data：奖励 claim，交给统一奖励处理。

### POST /checkin/ad

```txt
POST {baseURL}/api/v1/checkin/ad
```

请求体：

```json
{
  "record_id": "record_id"
}
```

说明：SDK 只记录广告加成结果，不负责播放广告。

## 6. 任务 Mission

当前 2048 游戏使用任务组 `main_daily`。游戏行为由客户端判断，达到条件后调用 `finishSlot()` 上报，玩家点击领取时调用 `rewardSlot()`。

### GET /mission/groups

```txt
GET {baseURL}/api/v1/mission/groups
GET {baseURL}/api/v1/mission/groups?disabled_categories=ad%2Clevel
```

请求体：无。

query：

```txt
disabled_categories 可选，多个分类用英文逗号拼接
```

### GET /mission/groups/{groupCode}

```txt
GET {baseURL}/api/v1/mission/groups/main_daily
GET {baseURL}/api/v1/mission/groups/main_daily?disabled_categories=ad
```

请求体：无。

返回 data：

```json
{
  "group": {
    "group_code": "main_daily",
    "group_name": "每日任务",
    "status": "in_progress",
    "claim_mode": "manual"
  },
  "slots": [
    {
      "id": "detail_id",
      "mission_code": "2048_merge_512",
      "mission_name": "合成 512 方块",
      "category": "merge_tile",
      "status": "open",
      "opened": true,
      "finished": false,
      "claimed": false,
      "progress_value": 0,
      "target_value": 512,
      "reward_snapshot": {}
    }
  ],
  "task_date": "2026-05-21"
}
```

### POST /mission/groups/{groupCode}/open

```txt
POST {baseURL}/api/v1/mission/groups/main_daily/open
POST {baseURL}/api/v1/mission/groups/main_daily/open?disabled_categories=battle
```

请求体：无。

### POST /mission/slots/{detailId}/open

```txt
POST {baseURL}/api/v1/mission/slots/detail_id/open
```

请求体：无。

### POST /mission/slots/{detailId}/finish

```txt
POST {baseURL}/api/v1/mission/slots/detail_id/finish
```

请求体：

```json
{
  "report": {
    "source": "2048",
    "event": "merge_tile",
    "value": 512,
    "score": 1800,
    "best_tile": 512,
    "moves": 73,
    "item_code": null,
    "exchange_amount": null,
    "exchange_amount_total": null,
    "difficulty": 1,
    "category": "merge_tile"
  }
}
```

2048 任务分类：

```txt
merge_tile   合成方块
score_single 单局分数
move_count   移动次数
games_played 完成局数
use_item     使用道具
rank_submit  排行榜上报
exchange     商店消费/兑换
```

### POST /mission/slots/{detailId}/reward

```txt
POST {baseURL}/api/v1/mission/slots/detail_id/reward
```

请求体：无。

返回 data：通常包含 `detail` 和 `claims`。

```json
{
  "detail": {
    "id": "detail_id",
    "status": "claimed"
  },
  "claims": []
}
```

### POST /mission/slots/{detailId}/refresh

```txt
POST {baseURL}/api/v1/mission/slots/detail_id/refresh
POST {baseURL}/api/v1/mission/slots/detail_id/refresh?disabled_categories=ad
```

请求体：无。

### POST /mission/slots/{detailId}/undo-refresh

```txt
POST {baseURL}/api/v1/mission/slots/detail_id/undo-refresh
```

请求体：无。

### GET /mission/stat

```txt
GET {baseURL}/api/v1/mission/stat
```

请求体：无。

## 7. 奖励 Reward

奖励 claim 是签到、任务、邮件、兑换码等模块的统一结果结构。Unity 里应该统一处理，不要每个模块各写一套发奖逻辑。

### GET /reward/claims/{claimId}

```txt
GET {baseURL}/api/v1/reward/claims/claim_id
```

请求体：无。

用于恢复或确认某一次领取结果。

### GET /reward/grants

```txt
GET {baseURL}/api/v1/reward/grants?status=pending&page=1&size=20
GET {baseURL}/api/v1/reward/grants?status=claimed&page=1&size=20
```

请求体：无。

### POST /reward/grants/{grantId}/claim

```txt
POST {baseURL}/api/v1/reward/grants/grant_id/claim
```

请求体：无。

## 8. 奖励 Claim 结构

服务端钱包货币：

```json
{
  "claim_id": "claim_001",
  "newly_claimed": true,
  "status": "success",
  "items": [
    {
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

客户端本地物品：

```json
{
  "claim_id": "claim_002",
  "newly_claimed": true,
  "status": "issued_to_client",
  "items": [
    {
      "kind": "item",
      "fulfillment": "client_local",
      "item_code": "booster_shuffle",
      "amount": 1,
      "status": "issued_to_client"
    }
  ]
}
```

Unity 处理规则：

```txt
kind=currency 且 fulfillment=scaffold_wallet：
  用 balances 或 item.balance 更新服务端钱包余额。

kind=item 且 fulfillment=client_local：
  写入 Unity 本地背包。
  必须用 claim_id 做幂等，避免重复入包。

newly_claimed=true：
  才弹出“获得奖励”提示。
```

2048 物品映射：

```txt
coin            -> 金币
gem             -> 钻石
booster_undo    -> 撤回
booster_shuffle -> 洗牌
booster_hint    -> 提示
booster_wild    -> 万能/升级
```

## 9. 邮件 Mail

当前 2048 游戏使用邮件摘要、列表、领取、已读、删除。

### GET /mail/summary

```txt
GET {baseURL}/api/v1/mail/summary
```

请求体：无。

返回 data：

```json
{
  "unread_count": 1,
  "unclaimed_count": 1
}
```

### GET /mail

```txt
GET {baseURL}/api/v1/mail?status=unread&page=1&size=20
GET {baseURL}/api/v1/mail?page=1&size=20
```

请求体：无。

query：

```txt
status 可选
page
size
```

### GET /mail/{mailId}

```txt
GET {baseURL}/api/v1/mail/mail_id
```

请求体：无。

### POST /mail/{mailId}/read

```txt
POST {baseURL}/api/v1/mail/mail_id/read
```

请求体：无。

### POST /mail/{mailId}/delete

```txt
POST {baseURL}/api/v1/mail/mail_id/delete
```

请求体：无。

### POST /mail/{mailId}/claim

```txt
POST {baseURL}/api/v1/mail/mail_id/claim
```

请求体：无。

返回 data：

```json
{
  "mail": {},
  "claim": {
    "claim_id": "claim_1",
    "items": []
  }
}
```

### POST /mail/claim-all

```txt
POST {baseURL}/api/v1/mail/claim-all
```

请求体：无。

返回 data：

```json
{
  "claims": [],
  "success_count": 1,
  "failure_count": 0
}
```

## 10. 排行榜 Rank

当前 2048 游戏：

```txt
rankType = score
dimension = CN
page = 1
size = 10
```

### GET /rank/{rankType}

```txt
GET {baseURL}/api/v1/rank/score?dimension=CN&period=weekly&page=1&size=10
GET {baseURL}/api/v1/rank/score?dimension=CN&page=1&size=10
```

请求体：无。

query：

```txt
dimension 可选
period 可选：alltime | daily | weekly | monthly
page
size
```

### GET /rank/{rankType}/me

```txt
GET {baseURL}/api/v1/rank/score/me?dimension=CN&period=daily
```

请求体：无。

### POST /rank/{rankType}/update

```txt
POST {baseURL}/api/v1/rank/score/update
```

简单分数请求体：

```json
{
  "score": 9999,
  "extra": {
    "nickname": "player",
    "country": "CN",
    "game": "2048"
  }
}
```

完整 payload 请求体也允许：

```json
{
  "level": 101,
  "extra": {
    "nickname": "player"
  }
}
```

### GET /rank/{rankType}/dimensions

```txt
GET {baseURL}/api/v1/rank/score/dimensions?period=alltime
```

请求体：无。

## 11. 兑换码 Redemption

当前 2048 Web 弹窗是本地奖励逻辑，没有真正调用这个接口。Unity 如果要后端化兑换码，应接入此接口。

### POST /redemption/redeem

```txt
POST {baseURL}/api/v1/redemption/redeem
```

请求体：

```json
{
  "code": "demo-2026"
}
```

返回 data：

```json
{
  "code_mask": "DEM***26",
  "campaign_id": "camp1",
  "record_id": "rec1",
  "claim": {
    "claim_id": "claim1",
    "items": []
  }
}
```

兑换成功后的 `claim` 仍然走统一奖励处理。

## 12. 实时通道 Realtime

实时通道不影响普通 HTTP 接口。它主要用于排行榜异步结果、系统通知、配置变化通知。

### POST /realtime/ticket

```txt
POST {baseURL}/api/v1/realtime/ticket
```

请求体：

```json
{}
```

返回 data：

```json
{
  "ticket": "ticket-1",
  "expires_in": 60,
  "ws_url": "wss://api.uggamer.com/scaffold-sdk/ws/v1"
}
```

WebSocket 连接：

```txt
{ws_url}?ticket={ticket}
```

连接打开后发送：

```json
{
  "type": "client.hello",
  "version": 1,
  "data": {
    "sdk_version": "0.1.0",
    "last_event_id": "",
    "subscriptions": []
  }
}
```

收到 `rank.update_result` 后发送 ack：

```json
{
  "type": "client.ack",
  "version": 1,
  "data": {
    "event_id": "evt-1"
  }
}
```

事件映射：

```txt
server.ready            -> realtime:connected
rank.update_result      -> rank:update_result
rank.changed            -> rank:changed
checkin.reward_result   -> checkin:reward_result
mission.reward_result   -> mission:reward_result
system.notice           -> system:notice
config.changed          -> config:changed
```

当前 2048 游戏处理：

```txt
system:notice      如果 notice_type 是 mail，则刷新邮件摘要和列表
config:changed     刷新钱包、签到、任务、邮件、排行榜
rank:update_result 刷新排行榜
```

## 13. Unity 推荐接口骨架

```csharp
public sealed class ScaffoldClient
{
    public string BaseUrl = "https://api.uggamer.com/scaffold-sdk";
    public string Token;

    public Task<LoginData> Login(string channelId, string userId, string accessToken);
    public Task<T> Get<T>(string path, Dictionary<string, string> query = null);
    public Task<T> Post<T>(string path, object body = null, Dictionary<string, string> query = null);
}
```

业务 service 只封装路径：

```csharp
WalletService.GetBalances()        -> GET  /wallet/balances
CheckinService.GetStatus()         -> GET  /checkin/status
CheckinService.Check()             -> POST /checkin/check
MissionService.GetGroup("main_daily") -> GET /mission/groups/main_daily
MissionService.FinishSlot(id, report) -> POST /mission/slots/{id}/finish
MailService.List(1, 20)            -> GET  /mail?page=1&size=20
RankService.Update("score", body)  -> POST /rank/score/update
```

## 14. 当前 2048 游戏实际调用清单

当前游戏实际主要调用：

```txt
POST /auth/login
GET  /wallet/balances
GET  /checkin/status
POST /checkin/check
POST /checkin/makeup
POST /checkin/reward
GET  /mission/groups/main_daily
POST /mission/slots/{id}/finish
POST /mission/slots/{id}/reward
GET  /mail/summary
GET  /mail?page=1&size=20
POST /mail/{id}/claim
POST /mail/{id}/read
POST /mail/{id}/delete
GET  /rank/score?dimension=CN&page=1&size=10
GET  /rank/score/me?dimension=CN
POST /rank/score/update
POST /realtime/ticket
```

SDK 支持但当前游戏没有完整后端化使用：

```txt
GET  /wallet/ledger
GET  /wallet/exchange/rules
POST /wallet/exchange/quote
POST /wallet/exchange
GET  /reward/grants
POST /reward/grants/{id}/claim
POST /mail/claim-all
POST /redemption/redeem
```
