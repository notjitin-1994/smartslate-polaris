import { } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { paths } from '@/routes/paths'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { withLazyLoad } from '@/components/LazyLoad'
import { DevDebugButton } from '@/components/DevDebugButton'
import SmallScreenGate from '@/components/SmallScreenGate'
import { RouteBreadcrumbs } from '@/router/RouteBreadcrumbs'

// Eagerly loaded components (needed immediately)
import AuthCallback from '@/pages/AuthCallback'

// Lazy load all other pages for better performance
const AuthLanding = withLazyLoad(() => import('@/pages/AuthLanding'))
const PortalPage = withLazyLoad(() => import('@/pages/PortalPage').then(m => ({ default: m.PortalPage })))
const SettingsContent = withLazyLoad(() => import('@/portal/SettingsContent').then(m => ({ default: m.SettingsContent })))
const PublicProfile = withLazyLoad(() => import('@/pages/PublicProfile').then(m => ({ default: m.PublicProfile })))
const PublicReportView = withLazyLoad(() => import('@/pages/PublicReportView'))
const PolarisRevampedV3 = withLazyLoad(() => import('@/pages/PolarisRevampedV3'))
const StarmapJobsDashboard = withLazyLoad(() => import('@/components/StarmapJobsDashboard'))
const Pricing = withLazyLoad(() => import('@/pages/Pricing'))
const ReportsDebug = withLazyLoad(() => import('@/pages/ReportsDebug'))
const ApiDebug = withLazyLoad(() => import('@/pages/ApiDebug'))
const CardComparison = withLazyLoad(() => import('@/pages/CardComparison'))
const StarmapJobViewer = withLazyLoad(() => import('@/pages/StarmapJobViewer'))

// Job-based Polaris routes removed; only /discover remains active

// App-wide fallback removed to avoid blocking page content while auth initializes

/**
 * Optimized App Router with lazy loading and code splitting
 */
export function OptimizedAppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SmallScreenGate minWidthPx={800}>
        {import.meta.env.DEV && <RouteBreadcrumbs />}
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<AuthLanding />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            {/* Pricing is shown within the portal layout */}
            <Route path={paths.publicProfile} element={<PublicProfile />} />
            <Route path="/report/public/:id" element={<PublicReportView />} />
            <Route path="/report/public/starmap/:id" element={<PublicReportView />} />
            {import.meta.env.DEV && (
              <>
                <Route path="/dev/debug" element={<ApiDebug />} />
                <Route path="/dev/card-comparison" element={<CardComparison />} />
              </>
            )}
            
            
            {/* Protected routes - require authentication */}
            <Route element={<ProtectedRoute />}>
              <Route path={paths.portal} element={<PortalPage />}>
                <Route index element={<StarmapJobsDashboard />} />
                <Route path="settings" element={<SettingsContent />} />
                <Route path="discover" element={<PolarisRevampedV3 />} />
                <Route path="report/starmap/:id" element={<StarmapJobViewer />} />
                <Route path="pricing" element={<Pricing />} />
                <Route path="debug/reports" element={<ReportsDebug />} />
                <Route path="briefings" element={<Navigate to="/discover" replace />} />
                <Route path="summaries" element={<Navigate to="/discover" replace />} />
              </Route>
              
            </Route>
            
            {/* 404 fallback */}
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-gradient-to-br from-[#020C1B] to-[#0A1628] flex items-center justify-center">
                  <div className="text-center text-white">
                    <h1 className="text-6xl font-bold mb-4">404</h1>
                    <p className="text-xl mb-8 text-white/60">Page not found</p>
                    <a
                      href="/"
                      className="inline-block px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                    >
                      Go Home
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
          {import.meta.env.DEV && <DevDebugButton />}
          
        </SmallScreenGate>
      </AuthProvider>
    </BrowserRouter>
  )
}
