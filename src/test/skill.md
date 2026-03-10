总结本次改动：

**测试模式**（3 个文件）：
- `app/test/dapps/page.tsx` — 独立测试页面，用 mock AuthContext（`isLoggedIn: true`、mock wallet 地址 `0xd8dA...6045`、Ethereum mainnet chain），跳过生物认证登录
- `src/contexts/AuthContext.tsx` — 导出 `AuthContext__TEST_ONLY` 供测试页使用
- `src/features/dapps/components/DAppsPage.tsx` + `DAppList.tsx` — 支持 `?test=N` 参数，N 秒后自动打开第 N 个 DApp

**测试 URL**：
```
https://your-domain/test/dapps          → 手动浏览 DApp 列表
https://your-domain/test/dapps?test=0   → 5 秒后自动打开第一个 DApp
```

部署到 Vercel 后，用 `/test/dapps?test=0` 即可自动测试代理流程。
