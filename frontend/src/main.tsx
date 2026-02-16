import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { LanguageProvider } from './i18n/LanguageContext'
import { registerServiceWorker, requestNotificationPermission } from './utils/pwa'
import './index.css'
import './styles/common.css'

// Register PWA service worker
(async () => {
  try {
    await registerServiceWorker();
    // Request notification permission after a short delay
    setTimeout(async () => {
      await requestNotificationPermission();
    }, 2000);
  } catch (error) {
    console.error('Failed to initialize PWA:', error);
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
)
