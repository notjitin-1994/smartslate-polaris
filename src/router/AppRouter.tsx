import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { paths } from '@/routes/paths'
import AuthCallback from '@/pages/AuthCallback'
import AuthLanding from '@/pages/AuthLanding'
import { PortalPage } from '@/pages/PortalPage'
import { SettingsContent } from '@/portal/SettingsContent'
import { PublicProfile } from '@/pages/PublicProfile'
import PolarisRevamped from '@/pages/PolarisRevamped'
import AllStarmaps from '@/pages/AllBriefings'
import StarmapDetail from '@/pages/StarmapDetail'
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
            <Route index element={<PolarisRevamped />} />
          </Route>
          <Route path={paths.portal} element={<PortalPage />}>
            <Route index element={<Navigate to="/" replace />} />
            <Route path="settings" element={<SettingsContent />} />
            <Route path="starmaps" element={<AllStarmaps />} />
            <Route path="starmaps/:id" element={<StarmapDetail />} />
            <Route path="briefings" element={<Navigate to="/portal/starmaps" replace />} />
            <Route path="summaries" element={<Navigate to="/portal/starmaps" replace />} />
          </Route>
          <Route path={paths.portalUser} element={<PortalPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}


