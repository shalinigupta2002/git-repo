import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Strip accidental .env-line paste (same logic as src/constants/env.js). */
function normalizeBuildApiUrl(raw) {
  let url = String(raw ?? '').trim()
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim()
  }
  return url.replace(/^\/?VITE_API_(?:BASE_)?URL\s*=\s*/i, '').trim()
}

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    const api = normalizeBuildApiUrl(
      process.env.VITE_API_BASE_URL || process.env.VITE_API_URL || '',
    )
    if (!api || api === '/api' || !/^https?:\/\//i.test(api)) {
      throw new Error(
        [
          '',
          'VITE_API_BASE_URL is required for production builds (Vercel).',
          'Set it in Vercel → Settings → Environment Variables, e.g.:',
          '  VITE_API_BASE_URL=https://your-service.onrender.com/api',
          'Then trigger a new deployment.',
          '',
        ].join('\n'),
      )
    }
  }

  return {
  plugins: [react()],

  server: {
    proxy: {
      '/api': {
        // In dev, set VITE_BACKEND_URL in client/.env to point at a non-default server.
        // Defaults to http://localhost:3001 which matches the server PORT default.
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    // Raise the warning threshold — inform rather than fail CI on large chunks
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor code into separate chunks so browsers can cache them
        // independently of app code changes.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router'))
            return 'vendor-react'
          if (id.includes('/@reduxjs/') || id.includes('/react-redux/'))
            return 'vendor-redux'
          if (id.includes('/react-hook-form/') || id.includes('/@hookform/') || id.includes('/yup/'))
            return 'vendor-forms'
          if (id.includes('/react-hot-toast/'))
            return 'vendor-ui'
        },
      },
    },
  },

  /**
   * Vitest configuration — co-located with Vite for a single config file.
   * Run with:  npm test  (or npx vitest run)
   */
  test: {
    // jsdom gives us a browser-like DOM for React component tests
    environment: 'jsdom',
    // Import @testing-library/jest-dom matchers in every test automatically
    setupFiles: ['./src/__tests__/setup.js'],
    // Enable Jest-like globals (describe, it, expect, vi …)
    globals: true,
    environmentOptions: {
      jsdom: { url: 'http://localhost' },
    },
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/**'],
  },
  }
})
