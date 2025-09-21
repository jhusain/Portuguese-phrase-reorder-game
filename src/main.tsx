import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const registerServiceWorker = () => {
    const serviceWorkerUrl = `${import.meta.env.BASE_URL}service-worker.js`
    navigator.serviceWorker.register(serviceWorkerUrl).catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  }

  if (document.readyState === 'complete') {
    registerServiceWorker()
  } else {
    window.addEventListener('load', registerServiceWorker, { once: true })
  }
}
