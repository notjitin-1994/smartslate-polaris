import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY
  const OPENAI_API_KEY = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY

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
          target: (env.VITE_ANTHROPIC_BASE_URL && env.VITE_ANTHROPIC_BASE_URL.trim()) || 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: () => '/v1/messages',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY || '',
            'anthropic-version': '2023-06-01',
          },
        },
        '/api/openai': {
          target: (env.VITE_OPENAI_BASE_URL && env.VITE_OPENAI_BASE_URL.trim()) || 'https://api.openai.com',
          changeOrigin: true,
          rewrite: () => '/v1/chat/completions',
          headers: {
            Authorization: OPENAI_API_KEY ? `Bearer ${OPENAI_API_KEY}` : '',
          },
        },
      },
    },
  }
})
