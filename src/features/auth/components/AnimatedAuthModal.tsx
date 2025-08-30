import { useState, useRef, useEffect } from 'react'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordStrength } from '@/features/auth/components/PasswordStrength'
import { GoogleOAuthButton } from '@/features/auth/components/GoogleOAuthButton'
import type { IdentifierValue } from '@/features/auth/types'
import * as authService from '@/features/auth/services/authService'
import { useAuth } from '@/contexts/AuthContext'
import { ForgotPasswordModal } from '@/features/auth/components/ForgotPasswordModal'

type AuthMode = 'login' | 'signup'

interface AnimatedAuthModalProps {
  initialMode?: AuthMode
}

export function AnimatedAuthModal({ initialMode = 'login' }: AnimatedAuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [fullName, setFullName] = useState('')
  const [identifierRaw, setIdentifierRaw] = useState('')
  const [identifier, setIdentifier] = useState<IdentifierValue>({ kind: 'unknown', raw: '' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  
  const { rememberMe, setRememberMe, signIn } = useAuth()
  
  const formRef = useRef<HTMLFormElement>(null)
  const confirmPasswordRef = useRef<HTMLDivElement>(null)
  const passwordStrengthRef = useRef<HTMLDivElement>(null)

  // Handle mode transition with animation
  const switchMode = async (newMode: AuthMode) => {
    if (newMode === mode || isTransitioning) return
    
    setIsTransitioning(true)
    setError(null)
    setShowSuccess(false)
    
    // Clear form data when switching modes
    if (newMode === 'login') {
      setFullName('')
      setConfirmPassword('')
    }
    
    // Wait for animation to complete
    setTimeout(() => {
      setMode(newMode)
      setIsTransitioning(false)
    }, 200)
  }

  // Auto-focus on first input when mode changes
  useEffect(() => {
    if (!isTransitioning) {
      const firstInput = formRef.current?.querySelector('input')
      firstInput?.focus()
    }
  }, [mode, isTransitioning])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowSuccess(false)
    
    // Validation for signup mode
    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Full name is required')
        return
      }
      if (fullName.trim().length < 2) {
        setError('Please enter your full name')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }
    }
    
    setLoading(true)
    
    try {
      if (mode === 'login') {
        if (identifier.kind !== 'email') {
          setError('Enter a valid email')
          return
        }
        await signIn(identifier.email, password, rememberMe)
      } else {
        // For signup, pass the fullName along with other data
        await authService.signup({ identifier, password, fullName })
        // Show success message for signup
        setSuccessMessage('Account created! Please check your email to verify your account.')
        setShowSuccess(true)
        
        // Clear form after successful signup
        setTimeout(() => {
          switchMode('login')
          setPassword('')
          setConfirmPassword('')
          setFullName('')
        }, 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${mode === 'login' ? 'Login' : 'Sign up'} failed`)
    } finally {
      setLoading(false)
    }
  }

  const isSignupMode = mode === 'signup'
  const buttonText = loading 
    ? (isSignupMode ? 'Creating account…' : 'Signing in…')
    : (isSignupMode ? 'Create Account' : 'Sign In')

  return (
    <>
      <div className="w-full max-w-lg mx-auto relative z-10 h-full px-4 sm:px-0">
        <div className="pt-0.5 sm:pt-1 md:pt-2 pb-2 sm:pb-3 md:pb-4 lg:pb-4 px-0 animate-scale-in h-full flex flex-col rounded-2xl">
          
          <div className="relative flex-1 flex flex-col">
            {/* Header with animated title */}
            <div className="mb-3 sm:mb-4 select-none animate-fade-in">
              {/* Hide logo on medium+ since it's now in the left hero pill; keep on mobile */}
              <img src="/images/logos/logo.png" alt="Smartslate" className="h-7 sm:h-8 w-auto logo-glow md:hidden" />
              
              <div className="relative overflow-hidden">
                <h2 
                  className={`mt-1.5 sm:mt-2 text-base sm:text-lg font-heading font-semibold text-white transition-all duration-300 ease-out ${
                    isTransitioning ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'
                  }`}
                >
                  {isSignupMode ? 'Create your account' : 'Welcome back'}
                </h2>
              </div>
              
              <div className="relative overflow-hidden">
                <p 
                  className={`mt-1 text-xs sm:text-sm text-white/60 transition-all duration-300 ease-out ${
                    isTransitioning ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'
                  }`}
                >
                  {isSignupMode 
                    ? 'Join thousands of users creating better starmaps.' 
                    : 'Access Polaris Starmaps and your reports.'
                  }
                </p>
              </div>
            </div>

            {/* Success message */}
            {showSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-fade-in">
                <p className="text-sm text-emerald-400">{successMessage}</p>
              </div>
            )}

            {/* Animated form container */}
            <div className="relative animate-fade-in-up">
              <form 
                ref={formRef}
                onSubmit={handleSubmit} 
                className={`space-y-4 transition-all duration-300 ease-out ${
                  isTransitioning ? 'opacity-70 transform scale-98' : 'opacity-100 transform scale-100'
                }`}
              >
                {/* Full Name input - only visible in signup mode */}
                <div 
                  className={`transform transition-all duration-300 ease-out ${
                    isSignupMode 
                      ? 'opacity-100 translate-y-0 max-h-20' 
                      : 'opacity-0 -translate-y-2 max-h-0 overflow-hidden'
                  }`}
                  style={{ 
                    transitionDelay: isSignupMode ? '50ms' : '0ms'
                  }}
                >
                  {isSignupMode && (
                    <div className="space-y-2">
                      <label className="block text-sm text-white/70">Full Name</label>
                      <input
                        className="input"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        name="fullName"
                        type="text"
                      />
                    </div>
                  )}
                </div>

                {/* Email input */}
                <div className="transform transition-all duration-200 ease-out">
                  <AuthInput
                    value={identifierRaw}
                    onChange={(raw, parsed) => {
                      setIdentifierRaw(raw)
                      setIdentifier(parsed)
                      setError(null) // Clear error on input change
                    }}
                  />
                </div>

                {/* Password input */}
                <div className="transform transition-all duration-200 ease-out">
                  <PasswordInput
                    label="Password"
                    value={password}
                    onChange={(value) => {
                      setPassword(value)
                      setError(null) // Clear error on input change
                    }}
                    placeholder={isSignupMode ? "Create a strong password" : "••••••••"}
                    autoComplete={isSignupMode ? "new-password" : "current-password"}
                    name={isSignupMode ? "new-password" : "current-password"}
                  />
                </div>

                {/* Forgot password link - only visible in login mode */}
                {!isSignupMode && (
                  <div className="text-right -mt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-secondary-400 hover:text-secondary-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Password strength indicator - only visible in signup mode */}
                <div 
                  ref={passwordStrengthRef}
                  className={`transform transition-all duration-300 ease-out ${
                    isSignupMode 
                      ? 'opacity-100 translate-y-0 max-h-16' 
                      : 'opacity-0 -translate-y-2 max-h-0 overflow-hidden'
                  }`}
                  style={{ 
                    transitionDelay: isSignupMode ? '150ms' : '0ms'
                  }}
                >
                  {isSignupMode && (
                    <div className="-mt-2">
                      <PasswordStrength value={password} />
                    </div>
                  )}
                </div>

                {/* Confirm password input - only visible in signup mode */}
                <div 
                  ref={confirmPasswordRef}
                  className={`transform transition-all duration-300 ease-out ${
                    isSignupMode 
                      ? 'opacity-100 translate-y-0 max-h-20' 
                      : 'opacity-0 -translate-y-2 max-h-0 overflow-hidden'
                  }`}
                  style={{ 
                    transitionDelay: isSignupMode ? '200ms' : '0ms'
                  }}
                >
                  {isSignupMode && (
                    <PasswordInput
                      label="Confirm password"
                      value={confirmPassword}
                      onChange={(value) => {
                        setConfirmPassword(value)
                        setError(null) // Clear error on input change
                      }}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      name="confirm-password"
                    />
                  )}
                </div>

                {/* Remember me checkbox - only visible in login mode */}
                {!isSignupMode && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 accent-[rgb(var(--primary))] text-white cursor-pointer focus:ring-primary-500 focus:ring-offset-0 focus:ring-2"
                    />
                    <label htmlFor="remember-me" className="text-sm text-white/70 cursor-pointer">
                      Remember me for 30 days
                    </label>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="animate-shake">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button 
                  type="submit" 
                  className="btn-primary w-full pressable transform transition-all duration-200 ease-out relative overflow-hidden group"
                  disabled={loading || isTransitioning}
                  onMouseDown={(e) => {
                    // Create ripple effect
                    const button = e.currentTarget
                    const rect = button.getBoundingClientRect()
                    const size = Math.max(rect.width, rect.height)
                    const x = e.clientX - rect.left - size / 2
                    const y = e.clientY - rect.top - size / 2
                    
                    const ripple = document.createElement('div')
                    ripple.className = 'ripple-ink'
                    ripple.style.width = ripple.style.height = size + 'px'
                    ripple.style.left = x + 'px'
                    ripple.style.top = y + 'px'
                    
                    button.appendChild(ripple)
                    
                    setTimeout(() => {
                      ripple.remove()
                    }, 600)
                  }}
                >
                  <span className={`relative z-10 transition-all duration-150 ${loading ? 'opacity-70' : ''}`}>
                    {buttonText}
                  </span>
                  
                  {/* Loading spinner overlay */}
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                  )}
                </button>

                {/* Divider */}
                <div className="relative py-2 text-center text-xs text-white/40">
                  <span className="bg-white/5 px-2 rounded-sm relative z-10 text-primary-500">or</span>
                  <span className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-white/10" />
                </div>

                {/* Google OAuth button */}
                <GoogleOAuthButton />
              </form>
            </div>

            {/* Keep footer content at the bottom on mobile; not needed on large screens */}
            <div className="flex-1 lg:hidden" />

            {/* Footer with mode switcher */}
            <div className="mt-4 sm:mt-5 space-y-2">
              <p className="text-left text-[11px] sm:text-xs text-white/60">
                {isSignupMode ? "Already have an account?" : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(isSignupMode ? 'login' : 'signup')}
                  className="text-secondary-400 hover:text-secondary-300 underline underline-offset-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400/60 rounded-sm px-1 -mx-1 relative group"
                  disabled={isTransitioning || loading}
                  aria-label={`Switch to ${isSignupMode ? 'login' : 'signup'} form`}
                >
                  <span className="relative z-10">
                    {isSignupMode ? 'Sign In' : 'Sign Up'}
                  </span>
                  {/* Subtle hover background */}
                  <div className="absolute inset-0 bg-secondary-400/10 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                </button>
              </p>
              
              <p className="text-left text-[10px] sm:text-[11px] text-white/50">
                By continuing, you agree to our{' '}
                <a 
                  href="https://app.smartslate.io/terms" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-brand-accent hover:text-primary-400 underline underline-offset-4 transition-colors duration-200"
                >
                  Terms
                </a>
                {' '}and{' '}
                <a 
                  href="https://app.smartslate.io/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-brand-accent hover:text-primary-400 underline underline-offset-4 transition-colors duration-200"
                >
                  Privacy Policy
                </a>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
          onSuccess={(message) => {
            setShowForgotPassword(false)
            setSuccessMessage(message)
            setShowSuccess(true)
          }}
        />
      )}
    </>
  )
}