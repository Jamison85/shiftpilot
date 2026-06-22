import React from 'react'
import ReactDOM from 'react-dom/client'
import FindTrailApp from './FindTrailApp.jsx'
import './calmVideoInjector.js'
import './findtrail.css'

ReactDOM.createRoot(document.getElementById('findtrail-root')).render(
  <React.StrictMode>
    <FindTrailApp />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
