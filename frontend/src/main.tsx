import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { applyBrand, DEFAULT_BRAND, isValidEppatBrand } from './theme'
import { getSystemTheme } from './api'
import '@idds/styles'
import './index.css'

// Hydrate brand theme dari backend SEBELUM mount supaya tidak ada flash
// palet biru IDDS. Kalau fetch gagal (offline / backend down), fallback ke
// DEFAULT_BRAND. Timeout singkat 2 detik supaya app tetap responsif.
async function hydrateTheme(): Promise<void> {
  applyBrand(DEFAULT_BRAND);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const { brand } = await getSystemTheme();
    clearTimeout(timer);
    if (isValidEppatBrand(brand)) applyBrand(brand);
  } catch {
    /* keep default */
  }
}

hydrateTheme().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
})
