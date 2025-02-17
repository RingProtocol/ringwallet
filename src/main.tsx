import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

// 注册 PWA Service Worker
import './registerServiceWorker'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
