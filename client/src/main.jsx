import { createRoot } from 'react-dom/client'
import React from 'react'
import App from './App'
import { NexusProvider } from './context/NexusContext'
import ErrorBoundary from './ErrorBoundary'
import './index.css'

// 0. ENVIRONMENT HARDENING (Polyfills for Android Webview)
if (typeof window !== 'undefined') {
  // Ensure basic polyfills for React 19 Scheduler
  if (!window.MessageChannel) {
    window.MessageChannel = function() {
      const channel = {
        port1: { onmessage: null, postMessage: (msg) => setTimeout(() => channel.port2.onmessage?.({ data: msg }), 0) },
        port2: { onmessage: null, postMessage: (msg) => setTimeout(() => channel.port1.onmessage?.({ data: msg }), 0) }
      };
      return channel;
    };
  }
}

// 1. UNIVERSAL ERROR HANDLER (Silent in production, but ready for fatal crashes)
window.onerror = function (msg, url, line, col, error) {
  const stack = error && error.stack ? error.stack : 'No stacktrace';
  console.error(`FATAL ERROR: ${msg}\nAt: ${line}:${col}\nURL: ${url}\n\nStack:\n${stack}`);
  // In production, we keep errors in console to avoid annoying users unless critical
  return false;
};

const bootstrap = () => {
  try {
    const container = document.getElementById('root');
    if (!container) {
      setTimeout(bootstrap, 200);
      return;
    }

    const root = createRoot(container);
    root.render(
      <ErrorBoundary>
        <NexusProvider>
          <App />
        </NexusProvider>
      </ErrorBoundary>
    );
  } catch (err) {
    console.error('FATAL BOOT ERROR:', err);
  }
};

// Safe entry point: wait for DOM and then add a small safety delay
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(bootstrap, 100));
} else {
  setTimeout(bootstrap, 100);
}
