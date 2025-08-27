import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { paths } from '@/routes/paths'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { withLazyLoad } from '@/components/LazyLoad'
import { DevDebugButton } from '@/components/DevDebugButton'

// Eagerly loaded components (needed immediately)
import AuthCallback from '@/pages/AuthCallback'

// Lazy load all other pages for better performance
const AuthLanding = withLazyLoad(() => import('@/pages/AuthLanding'))
const PortalPage = withLazyLoad(() => import('@/pages/PortalPage').then(m => ({ default: m.PortalPage })))
const SettingsContent = withLazyLoad(() => import('@/portal/SettingsContent').then(m => ({ default: m.SettingsContent })))
const PublicProfile = withLazyLoad(() => import('@/pages/PublicProfile').then(m => ({ default: m.PublicProfile })))
const PublicReportView = withLazyLoad(() => import('@/pages/PublicReportView'))
const PolarisRevampedV3 = withLazyLoad(() => import('@/pages/PolarisRevampedV3'))
const PolarisNova = withLazyLoad(() => import('@/pages/PolarisNova'))
const StarmapJobViewer = withLazyLoad(() => import('@/pages/StarmapJobViewer'))
const StarmapJobsDashboard = withLazyLoad(() => import('@/components/StarmapJobsDashboard'))
const Pricing = withLazyLoad(() => import('@/pages/Pricing'))
const SeedJitinStarmap = withLazyLoad(() => import('@/pages/SeedJitinStarmap'))
const ReportsDebug = withLazyLoad(() => import('@/pages/ReportsDebug'))
const ApiDebug = withLazyLoad(() => import('@/pages/ApiDebug'))
const CardComparison = withLazyLoad(() => import('@/pages/CardComparison'))

// Job-based Polaris routes (lazy)
const PolarisJobsDashboard = withLazyLoad(() => import('@/components/PolarisJobsDashboard'))
const PolarisJobViewer = withLazyLoad(() => import('@/components/PolarisJobViewer'))
const PolarisJobWizard = withLazyLoad(() => import('@/pages/PolarisJobWizard'))

// Loading component for the entire app
const AppLoadingFallback = () => (
  <div className="fixed inset-0 bg-gradient-to-br from-[#020C1B] to-[#0A1628] flex items-center justify-center">
    <div className="text-center">
      <div className="relative inline-block">
        <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary-400 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="mt-4 text-white/60 text-sm animate-pulse">Loading SmartSlate...</p>
    </div>
  </div>
)

/**
 * Optimized App Router with lazy loading and code splitting
 */
export function OptimizedAppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<AppLoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<AuthLanding />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path={paths.pricing} element={<Pricing />} />
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
                <Route path="starmaps" element={<StarmapJobsDashboard />} />
                <Route path="starmap/:id" element={<StarmapJobViewer />} />
                <Route path="discover" element={<PolarisRevampedV3 />} />
                <Route path="discover/new" element={<PolarisNova />} />
                <Route path="seed/jitin" element={<SeedJitinStarmap />} />
                <Route path="debug/reports" element={<ReportsDebug />} />
                <Route path="briefings" element={<Navigate to="/starmaps" replace />} />
                <Route path="summaries" element={<Navigate to="/starmaps" replace />} />

                {/* New Job-based Polaris Routes nested under PortalPage (sidebar + header) */}
                <Route path="polaris/jobs" element={<PolarisJobsDashboard />} />
                <Route path="polaris/new" element={<PolarisJobWizard />} />
                <Route path="polaris/job/:jobId" element={<PolarisJobViewer />} />
                <Route path="polaris/job/:jobId/resume" element={<PolarisJobWizard />} />
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
          
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
