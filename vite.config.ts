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
  // Fix: previously used API key env var when deriving base URL. Use correct *_BASE_URL vars
  const OPENAI_BASE_URL = ((env.VITE_OPENAI_BASE_URL || env.OPENAI_BASE_URL || 'https://api.openai.com').trim()).replace(/\/$/, '')
  const PERPLEXITY_API_KEY = (env.PERPLEXITY_API_KEY || env.VITE_PERPLEXITY_API_KEY || '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').trim()
  const PERPLEXITY_BASE_URL = ((env.VITE_PERPLEXITY_BASE_URL || env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai').trim()).replace(/\/$/, '')

  // Ensure server-side API handlers (dev middleware) see the Perplexity env vars
  if (!process.env.PERPLEXITY_API_KEY && PERPLEXITY_API_KEY) process.env.PERPLEXITY_API_KEY = PERPLEXITY_API_KEY
  if (!process.env.VITE_PERPLEXITY_API_KEY && PERPLEXITY_API_KEY) process.env.VITE_PERPLEXITY_API_KEY = PERPLEXITY_API_KEY
  if (!process.env.PERPLEXITY_BASE_URL && PERPLEXITY_BASE_URL) process.env.PERPLEXITY_BASE_URL = PERPLEXITY_BASE_URL
  if (!process.env.VITE_PERPLEXITY_BASE_URL && PERPLEXITY_BASE_URL) process.env.VITE_PERPLEXITY_BASE_URL = PERPLEXITY_BASE_URL

  // Supabase for DB-backed report jobs (optional in dev)
  const SUPABASE_URL = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const SUPABASE_SERVICE_ROLE_KEY = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!process.env.VITE_SUPABASE_URL && SUPABASE_URL) process.env.VITE_SUPABASE_URL = SUPABASE_URL
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && SUPABASE_URL) process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = SUPABASE_SERVICE_ROLE_KEY

  // Provide a minimal Express/Vercel-like response wrapper for Node's ServerResponse
  function toVercelResponse(res: any): any {
    const wrapper: any = Object.create(res)
    wrapper.status = (code: number) => {
      res.statusCode = code
      return wrapper
    }
    wrapper.json = (obj: any) => {
      try { res.setHeader('Content-Type', 'application/json') } catch {}
      res.end(JSON.stringify(obj))
    }
    wrapper.send = (body: any) => {
      // Minimal compatibility for VercelResponse.send
      if (typeof body === 'string' || body instanceof Buffer) {
        res.end(body)
      } else if (body != null) {
        try { res.setHeader('Content-Type', 'application/json') } catch {}
        res.end(JSON.stringify(body))
      } else {
        res.end()
      }
    }
    // Ensure these methods are callable on the wrapper too
    wrapper.setHeader = (...args: any[]) => res.setHeader?.(...args)
    wrapper.end = (...args: any[]) => res.end?.(...args)
    return wrapper
  }

  // Dev-only middleware to handle /api/reportJobsDb without an external server
  const localReportJobsDbPlugin = {
    name: 'local-report-jobsdb-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || ''
        if (!url.startsWith('/api/reportJobsDb')) return next()

        // Handle CORS preflight quickly
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key')
          res.end()
          return
        }

        try {
          // Parse query params
          const parsed = new URL(url, 'http://localhost')
          ;(req as any).query = Object.fromEntries(parsed.searchParams.entries())

          // Parse JSON body when present
          if (req.method === 'POST') {
            const chunks: Uint8Array[] = []
            await new Promise<void>((resolve) => {
              req.on('data', (c: Uint8Array) => chunks.push(c))
              req.on('end', () => resolve())
            })
            const raw = Buffer.concat(chunks).toString()
            try {
              ;(req as any).body = raw ? JSON.parse(raw) : {}
            } catch (_e) {
              ;(req as any).body = raw
            }
          }

          const mod = await import('./api/reportJobsDb.ts')
          const resCompat = toVercelResponse(res)
          return mod.default(req, resCompat)
        } catch (e: any) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e?.message || 'Internal error' }))
        }
      })
    }
  }

  // Dev-only middleware to handle /api/perplexity locally (avoids browser CORS/network issues)
  const localPerplexityPlugin = {
    name: 'local-perplexity-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || ''
        if (!url.startsWith('/api/perplexity')) return next()

        // CORS preflight
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.end()
          return
        }

        try {
          // Parse JSON body
          if (req.method === 'POST') {
            const chunks: Uint8Array[] = []
            await new Promise<void>((resolve) => {
              req.on('data', (c: Uint8Array) => chunks.push(c))
              req.on('end', () => resolve())
            })
            const raw = Buffer.concat(chunks).toString()
            try {
              ;(req as any).body = raw ? JSON.parse(raw) : {}
            } catch (_e) {
              ;(req as any).body = raw
            }
          }

          const mod = await import('./api/perplexity.ts')
          const resCompat = toVercelResponse(res)
          return mod.default(req, resCompat)
        } catch (e: any) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e?.message || 'Internal error' }))
        }
      })
    }
  }

  // Dev-only middleware to handle /api/share/meta locally
  const localShareMetaPlugin = {
    name: 'local-share-meta-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || ''
        if (!url.startsWith('/api/share/meta')) return next()

        try {
          const mod = await import('./api/share/meta.ts')
          const resCompat = toVercelResponse(res)
          return mod.default(req, resCompat)
        } catch (e: any) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'text/plain')
          res.end(e?.message || 'Internal error')
        }
      })
    }
  }

  return {
    plugins: [react(), localReportJobsDbPlugin, localPerplexityPlugin, localShareMetaPlugin],
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
        // Note: /api/perplexity is handled by localPerplexityPlugin in dev
        // Note: /api/reportJobsDb is handled by localReportJobsDbPlugin in dev
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
