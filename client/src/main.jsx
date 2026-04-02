import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { NexusProvider } from './context/NexusContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <NexusProvider>
        <App />
      </NexusProvider>
    </ErrorBoundary>
  </StrictMode>,
)
