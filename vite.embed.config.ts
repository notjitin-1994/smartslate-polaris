import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// Build the embeddable Polaris Starmap Picker as a small library
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const SUPABASE_URL = (env.VITE_SUPABASE_URL || '').trim()
  const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // eslint-disable-next-line no-console
    console.warn('[embed] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Build may fail at runtime.')
  }

  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false, // keep app build outputs alongside embed outputs
      lib: {
        entry: fileURLToPath(new URL('./src/embed/index.ts', import.meta.url)),
        name: 'SmartslatePolaris',
        formats: ['es', 'iife'],
        fileName: (format) => (format === 'iife' ? 'embed/smartslate-polaris.iife.js' : 'embed/smartslate-polaris.esm.js'),
      },
      rollupOptions: {
        // Bundle dependencies so consumers can just drop-in the script
        external: [],
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_ANON_KEY),
    },
  }
})



