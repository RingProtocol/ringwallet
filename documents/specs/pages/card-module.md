# Card Module — Architecture Note

## Component hierarchy

```
WalletMainPage (底部 tab 控制)
  ├── CardTabHeader          → 标题栏 "Card"
  └── CardTabBody
       └── CardApp           → 核心状态机，管理所有子视图
            ├── Loading          (adapterLoading || accountsLoading)
            ├── CardOnboardingView  (供应商列表 — 始终作为 main 视图)
            │    └── CardProviderCard × N
            │         ├── "Visit site"   → 外部站点 (新标签页)
            │         └── "我的U卡"      → 已有卡 ⇒ Dashboard / 未有卡 ⇒ 申请新卡 Page
            ├── CardApplyPage       (申请新卡 — 全屏独立 Page，符合 page-style.md)
            │    ├── TitleBar (back)
            │    └── 内容区 (TempContent 加载/错误，或 KYC iframe)
            ├── CardDashboardView   (全屏 portal → document.body)
            │    ├── CardSimulationBanner  (琥珀色「当前为模拟模式」提示 — 可关闭)
            │    ├── CardOverview
            │    └── TransactionList
            ├── CardSettingsView    (设置页)
            └── TopUp 系列
                 ├── TopUpAssetSelect
                 ├── TopUpAmountInput
                 ├── TopUpConfirm
                 └── TopUpResult
```

## Views matrix

| View          | Trigger                      | Component                               | Exits to                             |
| ------------- | ---------------------------- | --------------------------------------- | ------------------------------------ |
| Provider list | `currentView === 'main'`     | `CardOnboardingView`                    | Apply Page (无卡) / Dashboard (有卡) |
| Apply         | `currentView === 'apply'`    | `CardApplyPage` → fullscreen portal     | Provider list (back / 完成)          |
| Dashboard     | `currentView === 'detail'`   | `CardDashboardView` → fullscreen portal | Provider list (Back)                 |
| Top-up        | `currentView === 'topup'`    | `TopUp*` components                     | Provider list                        |
| Settings      | `currentView === 'settings'` | `CardSettingsView`                      | Provider list                        |

## Navigation flow

```
[Card Tab] → Provider List (main)
  ├── "Visit site"   → external link (new tab)
  └── "我的U卡"      → Apply Page (loading, "checking…")
       │
       ├── 查询到该供应商的卡  → Dashboard (fullscreen portal, z-index:500)
       │                       ├── Back     → Provider List
       │                       ├── Top Up   → TopUp flow → Provider List
       │                       └── Settings → CardSettingsView → Provider List
       │
       └── 未申请过           → KYC iframe / 占位 → 轮询状态
                              ├── approved → 立即发卡 → Dashboard (直跳)
                              ├── rejected → 申请失败 → Retry / Back
                              └── 任意错误 → 申请失败 → Retry / Back
```

`CardProviderCard` 只暴露一个右侧按钮 "我的U卡"。父组件 `CardApp` 中的
`handleViewDetails(providerId)` 现在是一个统一异步流程：

1. 先把 Apply Page 切到 `checking` 加载态，**立即**给用户反馈。
2. 通过 `cardProviderRegistry.get(providerId)` 拿到该供应商的 adapter，
   `isLinked() && getCards()` 检查已有卡；若有则直接 `setPendingDetailCard`
   并 `setCurrentView('detail')` —— 不重新发起 KYC。
3. 未发现卡则进入 `starting` → `startKYC()` → 轮询 → `creating` → `createCard()`
   → `setPendingDetailCard` → `setCurrentView('detail')`，**首次申请也直接进
   Dashboard**，不回退到 onboarding。
4. 任意环节抛错（查询失败 / KYC 启动失败 / KYC 拒绝 / 发卡失败）都通过
   `setApplyError(...)` 上抛到 Apply Page，用户在原页看到 "申请失败" + Retry
   按钮或 TitleBar Back 即可。

## State ownership

所有导航与申请状态都由 `CardApp`（路由器）持有：

- `currentView: 'main' | 'detail' | 'topup' | 'settings' | 'apply'` — 主路由。
- `detailProviderId: string | null` — Dashboard 当前展示的卡所属供应商。
- `pendingDetailCard: CardAccount | null` — 刚拿到（查询到或新发的）卡，直接喂给
  `CardDashboardView`，避免 `useCardAccounts` reload 期间的闪烁。
- `kycUrl: string | null` — Apply Page 中嵌入的 KYC URL；`null` 表示正在进行非 iframe
  阶段（查询 / 启动 / 发卡）。
- `applyStage: 'checking' | 'starting' | 'creating' | null` — 决定 Apply Page 非
  iframe 加载态的提示文案（来自 `cardApplyChecking` / `cardApplyStarting` /
  `cardApplyCreating`）。
- `applyError: string | null` — 查询或申请失败的错误信息；驱动 TempContent 错误态。
- `activeProviderId: string | null` — 当前申请流程对应的供应商。
- `kycPollTimeoutsRef` — KYC 状态轮询的 `setTimeout` ID 集合，任意退出路径都必须 clear。

领域数据由专用 hooks 持有：

| Hook                  | Owns                              |
| --------------------- | --------------------------------- |
| `useCardProvider`     | 当前 adapter 实例                 |
| `useCardAccounts`     | `CardAccount[]`, cache-first 加载 |
| `useCardTransactions` | 分页交易列表                      |
| `useCardTopUp`        | 充值状态机                        |

## Apply Page exit paths

四种退出路径，每条都必须 clear `kycPollTimeoutsRef`：

| Exit                     | Handler                  | Action                                                                           |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------------- |
| 用户点 TitleBar Back (←) | `handleApplyDismiss`     | clear timers → 清掉所有 apply 状态 → `main`                                      |
| iframe 加载失败          | `handleApplyIframeError` | 写入 `applyError`，TempContent 展示错误 + Retry                                  |
| KYC approved             | poll 回调                | clear timers → createCard → `pendingDetailCard` → `detail`（**直跳 Dashboard**） |
| 查询到已有卡             | `handleViewDetails`      | clear timers → `pendingDetailCard` → `detail`（**直跳 Dashboard**）              |

`handleApplyRetry` 重新调用 `handleViewDetails(activeProviderId)`，会先重新查询已有卡，
所以即使是网络抖动导致的"查询失败"也能被 retry 修复，无需用户回到 onboarding 再点一次。

## Page-style 合规 (Apply Page)

`CardApplyPage` 遵循 `documents/specs/pages/page-style.md`：

- 全屏模式 (`position: fixed; inset: 0; z-index: 500`, 通过 `createPortal` 挂载到 `document.body`)。
- Header: `TitleBar` 组件 (48px 高，左上角 Back 按钮)。
- 内容区: 加载/错误态用 `TempContent`；KYC 的 `about:blank` 占位由 `TempContent` 包裹自定义 children 渲染。

## Dashboard presentation

`CardDashboardView` 同样通过 `createPortal` 全屏挂载到 `document.body` (`position: fixed; inset: 0; z-index: 500`)，包含一个 `TitleBar`，Back 按钮返回供应商列表 (`currentView = 'main'`)。

顶部有一条琥珀色 `CardSimulationBanner`（`当前为模拟模式 / OK 后隐藏`），提醒用户当前数据非真实；仅当父路由从其他视图切回 `detail` 时重新显示（dashboard 组件被重新挂载）。

## Adapter boundary

`src/features/card/services/adapter/` 隔离所有供应商特定代码，对外暴露统一接口 (`CardProviderAdapter`)。`MemoryBackedCardAdapter` 是 sandbox/测试实现；`ImmersveAdapter`、`EtherfiAdapter` 是各供应商的包装。`CardApp` 从不直接 import adapter——只通过 `useCardProvider()` 和 `cardProviderRegistry` 访问。
