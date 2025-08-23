import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ANTHROPIC_API_KEY = (env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY || '').trim()
  const ANTHROPIC_BASE_URL = ((env.VITE_ANTHROPIC_BASE_URL || env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').trim()).replace(/\/$/, '')
  const ANTHROPIC_VERSION = (env.ANTHROPIC_VERSION || '2023-06-01').trim()
  const OPENAI_API_KEY = (env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || '').trim()
  const OPENAI_BASE_URL = ((env.VITE_OPENAI_BASE_URL || env.OPENAI_BASE_URL || 'https://api.openai.com').trim()).replace(/\/$/, '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api/anthropic': {
          target: ANTHROPIC_BASE_URL,
          changeOrigin: true,
          rewrite: () => '/v1/messages',
          headers: ANTHROPIC_API_KEY
            ? { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': ANTHROPIC_VERSION, 'anthropic-dangerous-direct-browser-access': 'true' }
            : { 'anthropic-version': ANTHROPIC_VERSION, 'anthropic-dangerous-direct-browser-access': 'true' },
        },
        '/api/openai': {
          target: OPENAI_BASE_URL,
          changeOrigin: true,
          rewrite: () => '/v1/chat/completions',
          headers: OPENAI_API_KEY ? { Authorization: `Bearer ${OPENAI_API_KEY}` } : {},
        },
      },
    },
  }
})
