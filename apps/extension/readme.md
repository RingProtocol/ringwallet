# Ring Wallet Extension

浏览器扩展版本的钱包。点击扩展图标打开 popup 使用，底层复用 `src/` 目录的组件和逻辑。

## 构建

```bash
# 开发模式（带热更新）
yarn ext:dev

# 生产构建（输出到 dist-extension/）
yarn ext:build
```

生产构建会执行两步：

1. `vite build --config apps/extension/vite.config.ts` —— 打包 popup + background
2. `node apps/extension/copy-assets.ts` —— 复制 manifest.json、icons、chainid.json 等静态资源到 `dist-extension/`

## 加载到 Chrome（开发调试）

1. 执行 `yarn ext:build`
2. 打开 Chrome，进入 `chrome://extensions/`
3. 右上角开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目根目录下的 `dist-extension/` 文件夹
6. 扩展图标会出现在 Chrome 工具栏，点击即可使用

## 发布到 Chrome Web Store

### 1. 打包

```bash
# 自动构建 + 打包为版本号 zip
node .claude/skills/publish-ext/scripts/publish.mjs
```

输出：`ring-wallet-extension-v{VERSION}.zip`

### 2. 注册开发者账号

- 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- 支付一次性 $5 注册费

### 3. 上传并填写信息

- 点击「新建项目」→ 上传 zip 文件
- 填写商店信息（名称、简介、描述、类别）
- 上传截图和宣传素材（见下方尺寸要求）
- 选择「公开」或「不公开」

### 4. 提交审核

提交后通常 1-3 个工作日完成审核。

### 商店素材尺寸要求

| 素材类型               | 尺寸要求                | 格式       | 数量限制                      |
| ---------------------- | ----------------------- | ---------- | ----------------------------- |
| 截图（Screenshots）    | **1280×800** 或 640×400 | PNG / JPEG | 最多 5 张                     |
| 宣传图片（Marquee）    | 1400×560 或 1280×800    | PNG / JPEG | 最多 1 张（可选）             |
| 商店图标（Store icon） | 128×128                 | PNG        | 1 张（与扩展 icons/128 一致） |
| 小图标（Small tile）   | 440×280                 | PNG / JPEG | 最多 1 张（可选）             |

> 推荐截图用 **1280×800**，在商店详情页展示效果最好。若直接截取 popup（380×600），可放在同尺寸深色背景画布中导出为 1280×800。

### 版本升级

发新版时同时更新以下两个文件的版本号，保持一致：

```bash
# apps/extension/manifest.json
# apps/extension/version.ts
```

然后重新执行 `node .claude/skills/publish-ext/scripts/publish.mjs` 打包上传。

## 项目结构

```
apps/extension/
├── App.tsx              # Popup 主界面（复用 src/ 组件）
├── main.tsx             # React 挂载入口
├── background.ts        # Manifest V3 service worker（最小化占位）
├── manifest.json        # 扩展配置
├── popup.html           # Popup HTML 入口
├── vite.config.ts       # 构建配置
├── copy-assets.ts       # 构建后复制静态资源
└── App.css / index.css  # Popup 样式
```

## 注意事项

- Extension 是纯钱包 popup，**不涉及 DApp 网页注入**，DApp 场景直接使用网页版即可。
- `src/` 目录的组件、hooks、services 全部共享给 extension 使用。
- `dist-extension/` 是完整的扩展包，可直接打包为 `.zip` 上传 Chrome Web Store。
