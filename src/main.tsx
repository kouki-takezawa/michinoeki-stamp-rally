import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/AuthContext.tsx'
import { PreferencesProvider } from './lib/PreferencesContext.tsx'
import { ThemeProvider } from './lib/ThemeContext.tsx'
import { ToastProvider } from './lib/ToastContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <PreferencesProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </PreferencesProvider>
    </ThemeProvider>
  </StrictMode>,
)
