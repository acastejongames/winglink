import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import './index.css'
import App from './App'
import { I18nProvider } from './lib/i18n'
import { StoreProvider } from './lib/store'
import { ToastProvider } from './components/ui/Toast'

const storedTheme = localStorage.getItem('winglink.theme')
if (storedTheme === 'light') document.documentElement.classList.remove('dark')
else document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <ToastProvider>
        <StoreProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <App />
          </BrowserRouter>
        </StoreProvider>
      </ToastProvider>
    </I18nProvider>
  </React.StrictMode>,
)
