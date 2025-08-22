import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppRouter } from '@/router/AppRouter'
import { getSupabase } from '@/services/supabase'

// Initialize Supabase early so cross-subdomain session adoption (cookie handoff) runs at startup
getSupabase()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
