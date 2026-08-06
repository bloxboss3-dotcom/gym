import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from '@/App'
import { StoreProvider } from '@/state/store'
import '@/index.css'

/**
 * Hash routing is deliberate: GitHub Pages has no rewrite rules, so a deep link
 * like /gym/progress/volume would 404 on refresh with a history router. Hashes
 * always resolve to index.html, which is also what the offline service worker
 * serves. One shell, every route, no server config.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </StoreProvider>
  </StrictMode>,
)

// Register the generated service worker in production builds only; in dev the
// module graph changes constantly and a cached shell just causes confusion.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`
    navigator.serviceWorker.register(swUrl).catch((error) => {
      console.warn('[forged] Service worker registration failed:', error)
    })
  })
}
