import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { paths } from '@/routes/paths'
import AuthCallback from '@/pages/AuthCallback'
import AuthLanding from '@/pages/AuthLanding'
import { PortalPage } from '@/pages/PortalPage'
import { SettingsContent } from '@/portal/SettingsContent'
import { PublicProfile } from '@/pages/PublicProfile'
import Polaris from '@/pages/Polaris'
import AllSummaries from '@/pages/AllSummaries'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<AuthLanding />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path={paths.publicProfile} element={<PublicProfile />} />
        
        {/* Protected routes - require authentication */}
        <Route element={<ProtectedRoute />}>
          <Route path={paths.home} element={<PortalPage />}>
            <Route index element={<Polaris />} />
          </Route>
          <Route path={paths.portal} element={<PortalPage />}>
            <Route index element={<Navigate to="/" replace />} />
            <Route path="settings" element={<SettingsContent />} />
            <Route path="summaries" element={<AllSummaries />} />
          </Route>
          <Route path={paths.portalUser} element={<PortalPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}


