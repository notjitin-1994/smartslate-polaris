import { } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { paths } from '@/routes/paths'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { withLazyLoad } from '@/components/LazyLoad'

import SmallScreenGate from '@/components/SmallScreenGate'

// Eagerly loaded components (needed immediately)
import AuthCallback from '@/pages/AuthCallback'

// Lazy load required pages only
const AuthLanding = withLazyLoad(() => import('@/pages/AuthLanding'))
const PortalPage = withLazyLoad(() => import('@/pages/PortalPage').then(m => ({ default: m.PortalPage })))
const BeginDiscovery = withLazyLoad(() => import('@/pages/BeginDiscovery'))
// DiscoveryViewer removed
const HomeDashboard = withLazyLoad(() => import('@/components/HomeDashboard').then(m => ({ default: m.HomeDashboard })))
const DynamicQuestionnaireDemo = withLazyLoad(() => import('@/components/forms/DynamicQuestionnaire/DemoPage').then(m => ({ default: m.DemoPage })))
const LoadingTest = withLazyLoad(() => import('@/pages/LoadingTest'))
const Pricing = withLazyLoad(() => import('@/pages/Pricing'))

export function OptimizedAppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SmallScreenGate minWidthPx={800}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<AuthLanding />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/loading-test" element={<LoadingTest />} />
            <Route path={paths.pricing} element={<Pricing />} />

            {/* Protected routes - require authentication */}
            <Route element={<ProtectedRoute />}>
              <Route path={paths.portal} element={<PortalPage />}>
                <Route index element={<HomeDashboard />} />
                <Route path="begin-discovery" element={<BeginDiscovery />} />
                <Route path="questionnaire-demo" element={<DynamicQuestionnaireDemo />} />
              </Route>
              {/* Discovery viewer route removed */}
            </Route>

            {/* 404 fallback */}
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-[rgb(var(--bg))] flex items-center justify-center">
                  <div className="text-center text-white">
                    <h1 className="text-6xl font-bold mb-4">404</h1>
                    <p className="text-xl mb-8 text-white/60">Page not found</p>
                    <a
                      href="/"
                      className="inline-block px-6 py-3 bg-secondary-500 hover:bg-secondary-600 rounded-lg transition-colors"
                    >
                      Go Home
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </SmallScreenGate>
      </AuthProvider>
    </BrowserRouter>
  )
}
