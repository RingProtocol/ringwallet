## Why

当前预测市场详情页仅支持查看市场信息，用户无法直接在钱包内完成下注操作，必须跳转到外部 Polymarket 网站。这破坏了钱包的闭环体验。通过集成 Polymarket 的 Polygon 链上合约交互能力，用户可以直接用当前钱包签名下注，并在钱包内查看自己的持仓信息。

## What Changes

- 在 `PolymarketDetailPage` 增加「下注」交互：选择 outcome、输入金额、签名并提交 Polygon 链上交易
- 新增「我的下注」页面/入口，展示当前钱包地址在 Polymarket 上的所有活跃仓位（position）和历史订单
- 在详情页保留并强化「在 Polymarket 打开」外部链接能力
- 新增 `PolymarketService` 链上交互层：合约 ABI、下单（buy/sell）、查询仓位、查询订单历史
- 新增 `PolymarketBettingHook`：封装下注状态机、交易确认、错误处理
- 下注前检查当前活跃链是否为 Polygon，若不是则提示切换

## Capabilities

### New Capabilities

- `polymarket-betting`: 钱包内直接对 Polymarket 市场进行下单（buy/sell）和查询持仓
- `polymarket-positions`: 查看当前钱包在 Polymarket 上的活跃仓位与历史订单
- `polymarket-external-link`: 从钱包内跳转原始 Polymarket 事件页面

### Modified Capabilities

- （无现有 spec 需要修改）

## Impact

- `src/components/predict/PolymarketDetailPage.tsx` — 新增下注 UI 和外部链接入口
- `src/services/polymarketService.ts` — 新增链上合约读写方法
- `src/hooks/usePolymarketMarkets.ts` — 可能新增仓位查询相关接口
- `src/config/chains.ts` — 确认 Polygon 链配置完整（RPC、合约地址等）
- 新增 `src/components/predict/PolymarketPositionsPage.tsx` 及对应样式
- 新增 `src/hooks/usePolymarketBetting.ts` 封装下注逻辑
