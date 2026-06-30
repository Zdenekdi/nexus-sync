import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isRelay = process.env.VITE_APP_VARIANT === 'relay';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  define: {
    '__APP_VARIANT__': JSON.stringify(process.env.VITE_APP_VARIANT || 'full'),
  },
  build: {
    sourcemap: mode !== 'production',
    // Use a different entry point for relay to enable tree-shaking of full-app code
    rollupOptions: {
      input: isRelay
        ? { index: path.resolve(__dirname, 'index.relay.html') }
        : { index: path.resolve(__dirname, 'index.html') },
      output: {
        manualChunks: isRelay
          ? {} // let rollup decide for relay – smaller chunks
          : { jssip: ['jssip'] },
      },
    },
  },
}))

