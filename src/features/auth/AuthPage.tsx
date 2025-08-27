import { LoginForm } from '@/features/auth/components/LoginForm'

export function AuthPage() {
  return (
    <div className="w-full max-w-sm md:max-w-sm lg:max-w-md mx-auto relative z-10">
      <div className="glass-card p-6 md:p-7 lg:p-8 animate-scale-in">
        <div className="mb-6 select-none animate-fade-in">
          <img src="/images/logos/logo.png" alt="Smartslate" className="h-8 w-auto logo-glow" />
          <h2 className="mt-4 text-lg font-heading font-semibold text-white">Sign in to Smartslate</h2>
          <p className="mt-1 text-sm text-white/60">Access Polaris Starmaps and your reports.</p>
        </div>

        <div className="relative">
          <div className="animate-fade-in-up">
            <LoginForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/60">
          Don't have an account?{' '}
          <a
            href="https://app.smartslate.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary-500 hover:text-secondary-400 underline underline-offset-4"
          >
            Sign Up
          </a>
        </p>
        <p className="mt-3 text-center text-[11px] text-white/50">
          By continuing, you agree to our{' '}
          <a href="https://app.smartslate.io/terms" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white underline underline-offset-4">Terms</a>
          {' '}and{' '}
          <a href="https://app.smartslate.io/privacy" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white underline underline-offset-4">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}


