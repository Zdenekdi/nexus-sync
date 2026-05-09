import { lazy } from 'react';

/**
 * Enhanced lazy loader that detects chunk load failures (common during new deployments)
 * and attempts to recover by forcing a full page reload if necessary.
 */
export const lazyWithRetry = (componentImport) => 
  lazy(async () => {
    const pageHasAlreadyBeenReloaded = JSON.parse(
      window.sessionStorage.getItem('nexus-page-reload-flag') || 'false'
    );

    try {
      const component = await componentImport();
      // On success, clear the flag so future deployments can also trigger a reload
      window.sessionStorage.removeItem('nexus-page-reload-flag');
      return component;
    } catch (err) {
      // Check if it's a chunk load failure or MIME type error
      const isChunkError = 
        err instanceof TypeError || 
        err.name === 'ChunkLoadError' || 
        err.message.includes('fetch') ||
        err.message.includes('MIME type');

      if (isChunkError) {
        if (!pageHasAlreadyBeenReloaded) {
          window.sessionStorage.setItem('nexus-page-reload-flag', 'true');
          console.warn('[Nexus-Bootstrap] Chunk load failed during deployment, retrying via reload...', err);
          window.location.reload();
          // Return a pending promise so React doesn't throw while waiting for reload
          return new Promise(() => {});
        }
      }
      throw err;
    }
  });
