import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
// Dev breadcrumbs removed

export function RouteBreadcrumbs() {
  const location = useLocation()

  useEffect(() => {
    // no-op
  }, [location.pathname, location.search, location.hash])

  return null
}


