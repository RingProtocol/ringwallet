apps/extension/
├── manifest.json      # Chrome MV3 manifest 配置
├── popup.html         # 弹窗入口 HTML
├── main.tsx           # React 入口
├── App.tsx            # 主组件 (复用 src/ 下所有共享组件)
├── App.css            # Extension 适配的样式 (380x600 弹窗尺寸)
├── index.css          # 全局样式 (固定宽高适配 popup)
├── version.ts         # Extension 独立版本号
├── background.js      # Service Worker (MV3)
├── copy-assets.ts     # 构建后资产复制脚本
└── vite.config.ts     # Vite 构建配置