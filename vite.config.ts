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
  const OPENAI_BASE_URL = ((env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || 'https://api.openai.com').trim()).replace(/\/$/, '')
  const PERPLEXITY_API_KEY = (env.PERPLEXITY_API_KEY || env.VITE_PERPLEXITY_API_KEY || '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').trim()
  const PERPLEXITY_BASE_URL = ((env.VITE_PERPLEXITY_BASE_URL || env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai').trim()).replace(/\/$/, '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // Performance optimizations
    build: {
      target: 'esnext',
      minify: 'esbuild',
      esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks for better caching
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['clsx'],
            // Separate large components
            polaris: [
              './src/polaris/needs-analysis/ReportDisplay.tsx',
              './src/polaris/needs-analysis/RenderField.tsx'
            ],
            // Separate services
            services: [
              './src/services/api/llmService.ts',
              './src/services/api/baseClient.ts'
            ],
            // Separate animations
            animations: [
              './src/components/SwirlField.tsx',
              './src/components/StaticSwirls.tsx'
            ]
          },
          // Optimize chunk naming
          chunkFileNames: () => `js/[name]-[hash].js`,
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || []
            const ext = info[info.length - 1]
            if (/\.(css)$/.test(assetInfo.name || '')) {
              return `css/[name]-[hash].${ext}`
            }
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name || '')) {
              return `images/[name]-[hash].${ext}`
            }
            return `assets/[name]-[hash].${ext}`
          }
        }
      },
      // Enable source maps in development
      sourcemap: mode === 'development',
      // Optimize chunk size warnings
      chunkSizeWarningLimit: 1000,
    },
    // Development optimizations
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
        '/api/perplexity': {
          target: PERPLEXITY_BASE_URL,
          changeOrigin: true,
          rewrite: () => '/chat/completions',
          headers: PERPLEXITY_API_KEY ? { Authorization: `Bearer ${PERPLEXITY_API_KEY}` } : {},
        },
      },
      // Enable HMR optimizations
      hmr: {
        overlay: false,
      },
    },
    // CSS handling (use postcss.config.cjs for Tailwind + Autoprefixer)
    css: {
      devSourcemap: mode === 'development'
    },
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'clsx'
      ],
      exclude: [
        // Exclude large dependencies that should be loaded separately
        'docx',
        'html2canvas',
        'jspdf'
      ]
    },
    // Performance hints
    define: {
      __DEV__: mode === 'development',
      __PROD__: mode === 'production',
    },
    // Experimental features for better performance
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return { js: `/${filename}` }
        } else {
          return { relative: true }
        }
      }
    }
  }
})
