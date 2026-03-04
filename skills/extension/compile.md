# build
命令	说明
yarn ext:dev	开发模式
yarn ext:build	构建产物到 dist-extens


# 加载到 Chrome 测试
运行 yarn ext:build
打开 chrome://extensions，开启"开发者模式"
点击"加载已解压的扩展程序"，选择 dist-extension/ 目录
点击工具栏上的 Ring Wallet 图标即可打开 popup
