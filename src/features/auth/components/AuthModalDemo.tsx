import { useState } from 'react'
import { AnimatedAuthModal } from './AnimatedAuthModal'

/**
 * Demo component to showcase the animated auth modal
 * This can be used for testing and demonstration purposes
 */
export function AuthModalDemo() {
  const [initialMode, setInitialMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 swirl-pattern opacity-5" />
      
      {/* Demo controls */}
      <div className="absolute top-4 left-4 z-50">
        <div className="glass-card p-4 space-y-2">
          <p className="text-xs text-white/60 font-medium">Demo Controls</p>
          <div className="flex gap-2">
            <button
              onClick={() => setInitialMode('login')}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                initialMode === 'login'
                  ? 'bg-primary-500 text-slate-900'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Login Mode
            </button>
            <button
              onClick={() => setInitialMode('signup')}
              className={`px-3 py-1 text-xs rounded-lg transition-all ${
                initialMode === 'signup'
                  ? 'bg-primary-500 text-slate-900'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Signup Mode
            </button>
          </div>
        </div>
      </div>

      {/* Modal showcase */}
      <div className="w-full max-w-md">
        <AnimatedAuthModal key={initialMode} initialMode={initialMode} />
      </div>

      {/* Feature highlights */}
      <div className="absolute bottom-4 right-4 z-50 max-w-xs">
        <div className="glass-card p-4 space-y-2">
          <p className="text-xs text-white/60 font-medium">✨ Features</p>
          <ul className="text-xs text-white/50 space-y-1">
            <li>• Full name field for signup</li>
            <li>• Smooth animated transitions</li>
            <li>• Material Design ripple effects</li>
            <li>• Real-time password strength</li>
            <li>• Form validation & error handling</li>
            <li>• Accessible form controls</li>
            <li>• Brand-compliant styling</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
