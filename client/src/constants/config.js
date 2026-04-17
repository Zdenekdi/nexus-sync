/**
 * Global Configuration for Nexus Hub Client
 */

export const API_BASE = import.meta.env.VITE_API_URL || (
  (import.meta.env.DEV && typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.startsWith('192.168.')
  ))
    ? `http://${window.location.hostname === 'localhost' && typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent) ? '10.0.2.2' : 'localhost'}:3000/api` 
    : 'https://nexus-api.myvnc.com/api'
);

export const APP_VERSION = 'v1.0.4 hardened';
