import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Apply theme immediately to prevent flash
function applyThemeOnStartup() {
  const saved = localStorage.getItem('darkMode');
  if (saved !== null) {
    const isDark = JSON.parse(saved);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } else {
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
}

// Apply theme before rendering
applyThemeOnStartup();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
