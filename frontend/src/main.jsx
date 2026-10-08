import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import './index.css'
import App from './App.jsx'
import { AppDataProvider } from '@/data/AppDataProvider'

// Remove the static splash once React takes over
document.getElementById('parrot-splash')?.remove()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </ThemeProvider>
  </StrictMode>,
)
