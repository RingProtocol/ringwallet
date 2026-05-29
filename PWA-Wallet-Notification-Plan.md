# PWA Wallet 本地通知方案

## 一、需求概述

- **场景**：PWA Wallet 安装到桌面后，用户开启本地通知，接收交易/转账通知
- **触发来源**：后端服务推送（FCM / Web Push）
- **目标**：实现稳定、实时、可扩展的推送通知体系

---

## 二、整体架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PWA Wallet    │     │   Backend API   │     │   Push Gateway  │
│  (Service Worker│◄────│  (事件/订阅管理) │◄────│  (FCM/WebPush)  │
│   + Push API)   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                                               ▲
         │                                               │
         └──────────── 链上事件 / 交易状态 ────────────────┘
```

---

## 三、核心模块设计

### 3.1 Service Worker 推送接收

```javascript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const { title, body, icon, badge, tag, data: payload } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag, // 用于替换同 tag 的旧通知
      requireInteraction: false,
      data: payload, // 携带 deeplink 等数据
      actions: [
        { action: 'view', title: '查看详情' },
        { action: 'dismiss', title: '忽略' },
      ],
    })
  )
})

// 点击通知打开对应页面
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { txHash, chainId } = event.notification.data || {}

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const url = `/tx/${txHash}?chain=${chainId}`
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client)
            return client.focus()
        }
        if (clients.openWindow) return clients.openWindow(url)
      })
  )
})
```

### 3.2 前端订阅管理

```typescript
// push-subscription.ts
export async function subscribePush() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  // 将 subscription 发送到后端保存
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
      walletAddress, // 关联钱包地址
      deviceId, // 设备标识
    }),
  })

  return subscription
}

export async function unsubscribePush() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
  }
}
```

### 3.3 后端推送服务（Node.js 示例）

```typescript
// push-service.ts
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:admin@yourwallet.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushPayload {
  title: string
  body: string
  icon?: string
  tag?: string
  data?: Record<string, any>
}

export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // 订阅已失效，从数据库移除
      await removeSubscription(subscription.endpoint)
    } else {
      throw err
    }
  }
}

// 批量推送（交易事件触发时）
export async function broadcastToWallet(
  walletAddress: string,
  payload: PushPayload
) {
  const subs = await getSubscriptionsByWallet(walletAddress)
  await Promise.all(subs.map((sub) => sendPush(sub, payload).catch(() => null)))
}
```

### 3.4 通知触发流程

```
链上交易状态变更
        │
        ▼
┌───────────────┐
│  事件监听服务  │  ← 通过 RPC/WS 监听链上事件
│ (Indexer/Node)│
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  交易状态判定  │  ← 确认数达标、成功/失败
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  推送服务调度  │  ← 查询该地址的所有订阅设备
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  FCM/WebPush  │  ← 下发通知到各设备
└───────────────┘
```

---

## 四、关键配置清单

| 配置项           | 说明                         | 获取方式                                 |
| ---------------- | ---------------------------- | ---------------------------------------- |
| VAPID Key Pair   | Web Push 的公钥/私钥         | `npx web-push generate-vapid-keys`       |
| FCM Server Key   | Android/Chrome 推送（可选）  | Firebase Console → 项目设置 → 云消息传递 |
| APNs Certificate | iOS Safari 推送（可选）      | Apple Developer Portal                   |
| manifest.json    | PWA 配置，包含 gcm_sender_id | 项目根目录配置                           |

### manifest.json 示例

```json
{
  "name": "My Wallet",
  "short_name": "Wallet",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512" }
  ],
  "gcm_sender_id": "103953800507"
}
```

---

## 五、用户权限与引导流程

```
用户安装 PWA
    │
    ▼
首次进入钱包 ──► 检测通知权限
    │
    ├── 已授权 ──► 自动订阅 Push
    │
    └── 未授权 ──► 展示引导弹窗
                      │
                      ▼
                 说明通知价值
                 （交易到账提醒、安全预警等）
                      │
                      ▼
                 用户点击"开启通知"
                      │
                      ▼
                 调用 Notification.requestPermission()
                      │
                      ▼
                 授权成功 ──► 执行 subscribePush()
                      │
                      ▼
                 订阅成功 ──► 后端保存订阅信息
```

---

## 六、通知类型与内容模板

| 类型     | 标题       | 内容示例                           | Tag                    |
| -------- | ---------- | ---------------------------------- | ---------------------- |
| 入账通知 | "收到转账" | "+0.5 ETH 来自 0x1234...5678"      | `income-{txHash}`      |
| 出账确认 | "转账成功" | "-100 USDT 已发送至 0xabcd...efgh" | `outcome-{txHash}`     |
| 交易失败 | "交易失败" | "Gas 不足，交易已回滚"             | `failed-{txHash}`      |
| 授权提醒 | "代币授权" | "DApp 请求授权无限额 USDC"         | `approve-{contract}`   |
| 安全预警 | "异常活动" | "检测到大额转账，请确认"           | `security-{timestamp}` |

---

## 七、可靠性保障

### 7.1 订阅健康检查

- 定期（每周）检测订阅有效性
- 对 410 Gone / 404 Not Found 的订阅自动清理

### 7.2 离线补偿

- Service Worker 在 `push` 事件中直接展示通知，无需主页面在线
- 用户点击通知后，若页面未打开，通过 `clients.openWindow()` 唤醒

### 7.3 多端去重

- 同一钱包地址多设备订阅时，各设备独立接收
- 使用 `tag` 字段确保同一交易的通知不会重复堆叠

### 7.4 降级方案

- 若用户拒绝通知权限，提供"应用内消息中心"作为兜底
- 消息中心通过轮询 `/api/notifications` 获取未读消息

---

## 八、安全与隐私

| 风险点       | 防护措施                                            |
| ------------ | --------------------------------------------------- |
| 订阅信息泄露 | endpoint + keys 按 walletAddress 隔离存储，加密保存 |
| 伪造推送     | VAPID 签名验证，服务端私钥严格保密                  |
| 敏感信息暴露 | 通知内容不包含完整私钥、助记词，仅展示摘要          |
| 权限滥用     | 用户可随时在设置中关闭通知并取消订阅                |

---

## 九、开发阶段建议

| 阶段    | 任务                           | 验收标准                     |
| ------- | ------------------------------ | ---------------------------- |
| Phase 1 | Service Worker + Push API 接入 | 本地可接收测试推送           |
| Phase 2 | 后端订阅管理与推送调度         | 可针对指定地址发送通知       |
| Phase 3 | 链上事件监听集成               | 真实交易触发推送             |
| Phase 4 | 消息中心 + 通知设置页          | 用户可管理通知偏好           |
| Phase 5 | 多链支持 + 性能优化            | ETH/BSC/Polygon 等全链路覆盖 |

---

## 十、参考资源

- [Web Push Protocol (RFC 8030)](https://datatracker.ietf.org/doc/html/rfc8030)
- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push Node.js 库](https://github.com/web-push-libs/web-push)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
