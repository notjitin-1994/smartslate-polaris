import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { breadcrumbs } from '@/dev/errorTracker'

export function RouteBreadcrumbs() {
  const location = useLocation()

  useEffect(() => {
    try {
      breadcrumbs.add({
        category: 'navigation',
        message: 'route.change',
        data: { pathname: location.pathname, search: location.search, hash: location.hash },
        level: 'info',
      })
    } catch {}
  }, [location.pathname, location.search, location.hash])

  return null
}


