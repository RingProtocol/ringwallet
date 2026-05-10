## Context

当前 `PolymarketDetailPage` 仅展示市场元数据（问题、交易量、结果等），所有交互都是只读的。Polymarket 本身运行在 Polygon 链上，通过一系列智能合约（CTFExchange、NegRiskAdapter 等）处理订单簿和仓位结算。Ring Wallet 已经具备 EVM 签名和交易广播能力（`WalletService`、`AuthContext`），但尚未与 Polymarket 合约层对接。

## Goals / Non-Goals

**Goals:**

- 用户在 Polygon 链上可直接从钱包对 Polymarket 市场进行 buy/sell 下单
- 用户可在钱包内查看当前地址在 Polymarket 的活跃仓位（positions）和历史订单（order history）
- 详情页提供显式入口跳转原始 Polymarket 事件页面
- 下注前自动检查并引导用户切换到 Polygon 链

**Non-Goals:**

- 不支持创建新市场或做市（market making）
- 不实现 Polymarket 完整的订单簿深度展示（仅支持市价/限价单简化版）
- 不处理 NegRisk（二元以上）市场的复杂合并/拆分逻辑（一期仅支持标准二元市场）
- 不支持除 Polygon 外的其他链

## Decisions

**1. 使用 Polymarket CTFExchange 合约直接交互**

- **Rationale**: CTFExchange 是 Polymarket 的核心交易合约，支持原子化下单和撮合。相比通过 Polymarket 后端 API 下单，链上直接交互无需信任中间层，符合钱包自托管理念。
- **Alternative**: 通过 Polymarket REST API 下单（需要 API key，且不是 self-custody）。

**2. 订单采用简化限价单模型（简化版 CTFOrder）**

- **Rationale**: 完全实现 Polymarket 的订单结构（Side、Maker/Taker、Signature 等）过于复杂。一期采用简化模型：用户选择 outcome、输入 USDC 金额、钱包签名 EIP-712 订单消息，通过 `exchange.fillOrder` 或类似函数执行。
- **Trade-off**: 牺牲部分灵活性（如自定义价格精度、复杂订单类型），换取实现速度。

**3. 仓位数据通过 The Graph / Polymarket Subgraph 查询**

- **Rationale**: 直接通过事件日志扫描所有历史交易效率低且需要大量 RPC 调用。Polymarket 提供官方 Subgraph，可按用户地址索引 positions 和 orders。
- **Alternative**: 自建索引服务（需要后端，违反无自建服务器约束）。
- **Fallback**: 若 Subgraph 不可用，降级为通过 `conditionalTokens` 合约直接查询 `balanceOf`。

**4. 「我的下注」作为独立页面，从预测市场列表页入口进入**

- **Rationale**: 避免在主钱包 Tab 中增加新入口，保持现有导航结构。用户从预测市场列表页可进入「我的下注」页面查看持仓。
- **Alternative**: 在资产页显示 Polymarket 持仓（跨 feature 耦合过重，推迟）。

**5. 外部链接使用系统浏览器打开**

- **Rationale**: Polymarket 网站需要用户已登录且可能有不同的会话状态。直接 `window.open` 跳转到 `https://polymarket.com/event/{slug}` 最简单可靠。

## Risks / Trade-offs

- **[Risk] Polymarket 合约升级导致 ABI 不兼容** → **Mitigation**: 将合约地址和 ABI 版本化配置，升级时只需改配置；合约调用外层加 try/catch 并给出友好错误提示。
- **[Risk] Subgraph 延迟或宕机** → **Mitigation**: 实现 Subgraph + 合约直接查询的双路降级。Subgraph 失败时显示「数据可能延迟」并尝试合约查询。
- **[Risk] 用户未切换到 Polygon 链** → **Mitigation**: 下单前检查 `activeChain.chainId === 137`，若不是则弹出切换网络确认（复用现有 `switchNetwork` 能力）。
- **[Risk] 交易滑点导致实际成交价格偏离** → **Mitigation**: 下单前通过合约 `getOrderFee` 或估算函数计算预期结果数量和价格影响，用户确认页展示预估结果。
- **[Trade-off] 仅支持标准二元市场** → NegRisk 多结果市场的合并/拆分逻辑复杂，一期不做，后续通过 `polymarket-neg-risk` capability 扩展。
