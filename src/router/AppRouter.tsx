import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { paths } from '@/routes/paths'
import AuthLanding from '@/pages/AuthLanding'
import { PortalPage } from '@/pages/PortalPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={paths.home} element={<AuthLanding />} />
        <Route path={paths.portal} element={<PortalPage />} />
      </Routes>
    </BrowserRouter>
  )
}


