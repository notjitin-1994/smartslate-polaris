import { LoginForm } from '@/features/auth/components/LoginForm'

export function AuthPage() {
  return (
    <div className="w-full max-w-sm md:max-w-sm lg:max-w-md mx-auto relative z-10 h-full">
      <div className="pt-0.5 sm:pt-1 md:pt-2 pb-2 sm:pb-3 md:pb-4 lg:pb-4 px-0 animate-scale-in h-full flex flex-col rounded-2xl">
        {/* Soft halo for mobile to lift the card */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-primary-400/10 to-secondary-500/10 blur-xl opacity-70 pointer-events-none" aria-hidden="true" />
        <div className="relative flex-1 flex flex-col">
          <div className="mb-3 sm:mb-4 select-none animate-fade-in">
            {/* Hide logo on medium+ since it's now in the left hero pill; keep on mobile */}
            <img src="/images/logos/logo.png" alt="Smartslate" className="h-7 sm:h-8 w-auto logo-glow md:hidden" />
            <h2 className="mt-1.5 sm:mt-2 text-base sm:text-lg font-heading font-semibold text-white">Sign in to Smartslate</h2>
            <p className="mt-1 text-xs sm:text-sm text-white/60">Access Polaris Starmaps and your reports.</p>
          </div>

          <div className="animate-fade-in-up">
            <LoginForm />
          </div>

          {/* Keep footer content at the bottom on mobile; not needed on large screens */}
          <div className="flex-1 lg:hidden" />

          <p className="mt-4 sm:mt-5 text-left text-[11px] sm:text-xs text-white/60">
            Don't have an account?{' '}
            <a
              href="https://app.smartslate.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary-400 hover:text-secondary-300 underline underline-offset-4"
            >
              Sign Up
            </a>
          </p>
          <p className="mt-2 sm:mt-3 text-left text-[10px] sm:text-[11px] text-white/50">
            By continuing, you agree to our{' '}
            <a href="https://app.smartslate.io/terms" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:text-primary-400 underline underline-offset-4">Terms</a>
            {' '}and{' '}
            <a href="https://app.smartslate.io/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:text-primary-400 underline underline-offset-4">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}


