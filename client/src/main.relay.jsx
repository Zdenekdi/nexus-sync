import { createRoot } from 'react-dom/client';
import React from 'react';
import { RelayProvider } from './context/RelayContext';
import RelayApp from './RelayApp';
import ErrorBoundary from './ErrorBoundary';
import './index.css';

// Polyfills for Android WebView
if (typeof window !== 'undefined' && !window.MessageChannel) {
  window.MessageChannel = function () {
    const channel = {
      port1: { onmessage: null, postMessage: (msg) => setTimeout(() => channel.port2.onmessage?.({ data: msg }), 0) },
      port2: { onmessage: null, postMessage: (msg) => setTimeout(() => channel.port1.onmessage?.({ data: msg }), 0) },
    };
    return channel;
  };
}

window.onerror = function (msg, url, line, col, err) {
  console.error(`FATAL ERROR: ${msg}\nAt: ${line}:${col}\nStack:\n${err?.stack}`);
  return false;
};

const bootstrap = () => {
  try {
    const container = document.getElementById('root');
    if (!container) { setTimeout(bootstrap, 200); return; }
    createRoot(container).render(
      <ErrorBoundary>
        <RelayProvider>
          <RelayApp />
        </RelayProvider>
      </ErrorBoundary>
    );
  } catch (err) {
    console.error('FATAL BOOT ERROR:', err);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(bootstrap, 100));
} else {
  setTimeout(bootstrap, 100);
}
