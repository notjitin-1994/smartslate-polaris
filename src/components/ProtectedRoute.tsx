import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Loading component while checking authentication
 */
const AuthLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#020C1B] to-[#0A1628] flex items-center justify-center">
    <div className="text-center">
      <div className="relative inline-block">
        <div className="w-12 h-12 border-3 border-white/20 rounded-full"></div>
        <div className="absolute top-0 left-0 w-12 h-12 border-3 border-primary-400 rounded-full animate-spin border-t-transparent"></div>
      </div>
      <p className="mt-4 text-white/60 text-sm">Checking authentication...</p>
    </div>
  </div>
)

/**
 * Protected route wrapper that requires authentication
 */
export function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth()
  const location = useLocation()

  // Avoid premature redirects while auth is initializing
  if (initializing) return <AuthLoading />

  // If authenticated, render child routes
  if (isAuthenticated) return <Outlet />

  // Redirect to login if not authenticated
  return <Navigate to="/login" state={{ from: location }} replace />
}