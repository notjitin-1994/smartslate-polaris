import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiDebugStore } from '@/dev/apiDebug'

export function DevDebugButton() {
  const [errorCount, setErrorCount] = useState(0)
  const location = useLocation()

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const compute = () => setErrorCount(apiDebugStore.get().filter(l => l.ok === false || (typeof l.status === 'number' && l.status >= 400)).length)
    compute()
    return apiDebugStore.subscribe(compute)
  }, [])

  if (!import.meta.env.DEV) return null
  if (location.pathname.startsWith('/dev/debug')) return null

  return (
    <Link to="/dev/debug" className="fixed z-50 right-4 bottom-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center hover:bg-white/20 transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6a2 2 0 012-2h4m4 8V7a2 2 0 00-2-2h-7l-4 4v10a2 2 0 002 2h9a2 2 0 002-2z"/>
          </svg>
        </div>
        {errorCount > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white border border-white/30">
            {errorCount}
          </span>
        )}
      </div>
    </Link>
  )
}


