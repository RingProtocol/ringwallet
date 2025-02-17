import { registerSW } from 'virtual:pwa-register'

// 注册 service worker；vite-plugin-pwa 插件会为你生成并注入所需的 SW 逻辑
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('新的内容可用，请刷新页面以加载最新版本。')
    // 这里你可以添加弹窗提示用户更新，也可以直接调用 updateSW() 强制更新
  },
  onOfflineReady() {
    console.log('应用已准备好离线使用。')
  },
})

export default updateSW 