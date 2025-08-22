import { useState } from 'react'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { SignUpForm } from '@/features/auth/components/SignUpForm'

export function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')

  return (
    <div className="w-full max-w-sm md:max-w-sm lg:max-w-md mx-auto relative z-10">
      <div className="glass-card p-6 md:p-8 animate-scale-in">
        <div className="flex items-center mb-6 select-none animate-fade-in">
          <img src="/images/logos/logo.png" alt="SmartSlate" className="h-8 w-auto logo-glow" />
        </div>
        <div className="flex mb-6 rounded-lg bg-white/5 p-1">
          <button
            className={`tab pressable ${activeTab === 'login' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            <span className="relative inline-flex items-center justify-center">
              Login
              {activeTab === 'login' && (
                <span className="absolute -bottom-[9px] left-1/2 h-0.5 w-10 -translate-x-1/2 bg-secondary-500 rounded-full" />
              )}
            </span>
          </button>
          <button
            className={`tab pressable ${activeTab === 'signup' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            <span className="relative inline-flex items-center justify-center">
              Sign Up
              {activeTab === 'signup' && (
                <span className="absolute -bottom-[9px] left-1/2 h-0.5 w-10 -translate-x-1/2 bg-secondary-500 rounded-full" />
              )}
            </span>
          </button>
        </div>

        <div className="relative">
          {activeTab === 'login' ? (
            <div key="login" className="animate-fade-in-up">
              <LoginForm />
            </div>
          ) : (
            <div key="signup" className="animate-fade-in-up">
              <SignUpForm />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


