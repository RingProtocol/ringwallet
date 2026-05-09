# List + LoadMore 交互规范

## 场景

适用于所有需要「无限滚动/分页加载」的列表页面（如 Polymarket 市场列表、DApp 列表等）。

## 核心规则

### 1. 两种 Loading 状态必须分离

| 状态          | 语义       | 视觉表现                                   | 触发时机                         |
| ------------- | ---------- | ------------------------------------------ | -------------------------------- |
| `loading`     | 全量加载中 | 覆盖整个列表区域的 loading 占位            | 首次进入页面、切换分类、手动重试 |
| `loadingMore` | 加载更多   | **出现在列表最后一项的下方**，保留已有内容 | 滚动到底部触发翻页               |

**禁止**：在加载更多时把 `loading` 设为 `true`，导致列表被全屏 loading 替换、用户滚动位置丢失。

### 2. 翻页必须是 Append，不能 Replace

- 加载更多返回的数据通过 `setAllMarkets(prev => [...prev, ...data])` 追加到现有数组尾部。
- 只有「全量刷新」场景（切换分类、下拉刷新、重试）才允许 `setAllMarkets(data)` 覆盖。

### 3. Hook 层面的依赖陷阱

`loadMarkets` 回调**不能**依赖 `loadingMore` / `hasMore` 等会频繁变化的状态。否则这些状态一变，`useEffect(() => loadMarkets(true), [loadMarkets])` 会重新执行，导致：

1. `offset` 被重置为 `0`
2. 已加载的内容被第一页覆盖
3. 用户滚动位置丢失

**正确做法**：使用 `useRef` 保存可变状态（`loadingMoreRef`、`hasMoreRef`），让 `loadMarkets` 的依赖数组保持最小。

```ts
const loadingMoreRef = useRef(false)
const hasMoreRef = useRef(true)

const loadMarkets = useCallback(
  async (isInitial: boolean) => {
    if (!isInitial) {
      if (loadingMoreRef.current || !hasMoreRef.current) return
      setLoadingMore(true)
      loadingMoreRef.current = true
    }
    // ... fetch
    loadingMoreRef.current = false
  },
  [t]
) // 仅依赖稳定值

useEffect(() => {
  loadMarkets(true)
}, []) // 仅在挂载时执行
```

### 4. 切换分类时的重置行为

切换 Tab/分类时必须：

1. 清空当前已缓存列表（`setAllMarkets([])`）
2. 重置分页偏移（`offsetRef.current = 0`）
3. 重置 `hasMore`（`hasMoreRef.current = true`）
4. 触发全量加载（`loadMarkets(true)`）
5. 滚动容器回到顶部

### 5. 视觉层次

```
┌─────────────────────────────┐
│ TitleBar                    │
├─────────────────────────────┤
│ TabBar (horizontal scroll)  │
├─────────────────────────────┤
│                             │
│  Item 1                     │
│  Item 2                     │
│  ...                        │
│  Item N                     │
│                             │
│  ┌─────────────────────┐    │
│  │   🌀 loading more   │    │  ← 只在 loadingMore 时显示
│  └─────────────────────┘    │
│                             │
│  [sentinel div]             │  ← IntersectionObserver 观察点
│                             │
└─────────────────────────────┘
```

## 检查清单

- [ ] 滚动加载更多时，已有项目是否保留在列表中？
- [ ] 加载更多的 spinner 是否出现在**最后一项下方**？
- [ ] 加载完成后，滚动位置是否保持不变？
- [ ] 切换分类后，是否从第 1 页重新开始？
- [ ] 切换分类后，滚动是否回到顶部？
- [ ] Hook 中 `loadMarkets` 的依赖数组是否没有包含 `loadingMore` / `hasMore`？
