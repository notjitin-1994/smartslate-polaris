import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from '@/services/supabase'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { StaticSwirls } from '@/components/StaticSwirls'

function resolveUserAvatarUrl(user: User | null): string | null {
  const meta: any = user?.user_metadata ?? {}
  const identities: any[] = (user as any)?.identities ?? []
  const identityData = identities.find((i) => i?.identity_data)?.identity_data ?? {}
  if (meta.noAvatar === true) return null
  return (
    meta.avatar_url ||
    meta.avatarURL ||
    meta.avatar ||
    meta.picture ||
    identityData.avatar_url ||
    identityData.picture ||
    null
  )
}

function getUserInitial(user: User | null): string {
  const rawName = (user?.user_metadata?.first_name as string) ||
    (user?.user_metadata?.name as string) ||
    (user?.user_metadata?.full_name as string) ||
    (user?.email as string) ||
    'U'
  return rawName.toString().trim().charAt(0).toUpperCase()
}

function UserAvatar({ user, sizeClass, textClass = 'text-sm font-semibold text-white/90', fallbackInitial }: { user: User | null; sizeClass: string; textClass?: string; fallbackInitial?: string }) {
  const [imgError, setImgError] = useState(false)
  const url = resolveUserAvatarUrl(user)
  const showImg = Boolean(url) && !imgError
  return (
    <span className={`inline-flex items-center justify-center ${sizeClass} rounded-full border border-white/10 bg-white/5 overflow-hidden`}>
      {showImg ? (
        <img
          src={url as string}
          alt="User avatar"
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={textClass}>{user ? getUserInitial(user) : (fallbackInitial || 'U').toString().trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  )
}

export function PublicProfile() {
  const { username } = useParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  
  // Profile form state
  const [displayName, setDisplayName] = useState<string>('')
  const [jobTitle, setJobTitle] = useState<string>('')
  const [company, setCompany] = useState<string>('')
  const [website, setWebsite] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [country, setCountry] = useState<string>('')
  const [bio, setBio] = useState<string>('')
  
  // Privacy preferences
  const [shareJobTitle, setShareJobTitle] = useState<boolean>(true)
  const [shareCompany, setShareCompany] = useState<boolean>(true)
  const [shareLocation, setShareLocation] = useState<boolean>(true)
  const [shareWebsite, setShareWebsite] = useState<boolean>(true)
  const [shareBio, setShareBio] = useState<boolean>(true)

  useDocumentTitle(`Smartslate | ${displayName || username || 'User'}`)

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      const supabase = getSupabase()
      
      try {
        // First try to find user by username in profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle()

        if (!error && profile) {
          // Set profile data from database
          setDisplayName(profile.full_name || profile.username || username || 'User')
          setJobTitle(profile.job_title || '')
          setCompany(profile.company || '')
          setWebsite(profile.website || '')
          setCity(profile.location || '')
          setCountry(profile.country || '')
          setBio(profile.bio || '')
          
          // Load privacy preferences
          setShareJobTitle(profile.share_job_title !== false)
          setShareCompany(profile.share_company !== false)
          setShareLocation(profile.share_location !== false)
          setShareWebsite(profile.share_website !== false)
          setShareBio(profile.share_bio !== false)
          
          // Try to get user auth data if available
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (authUser && authUser.id === profile.id) {
            setUser(authUser)
          } else {
            setUser(null)
          }
        } else {
          // Fallback: try to load from current user if logged in
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser) {
            setUser(currentUser)
            const meta: any = currentUser.user_metadata ?? {}
            setDisplayName(meta.full_name || meta.name || meta.first_name || 'User')
            setJobTitle(meta.job_title || '')
            setCompany(meta.organization || meta.company || '')
            setWebsite(meta.website || '')
            setCity(meta.location || '')
            setCountry(meta.country || '')
            setBio(meta.bio || '')
          } else {
            // No profile found and no user logged in
            setDisplayName(username || 'User')
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
        setDisplayName(username || 'User')
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      loadProfile()
    }
  }, [username])

  



  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[rgb(var(--bg))] text-[rgb(var(--text))] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[rgb(var(--bg))] text-[rgb(var(--text))] relative">
      {/* Static swirl background */}
      <StaticSwirls 
        imageSrc="/images/logos/logo-swirl.png"
        count={200}
        minSize={12}
        maxSize={80}
        opacityMin={0.01}
        opacityMax={0.25}
        areaPadding={24}
      />
      {/* Header with Smartslate Branding */}
      <header className="relative z-10 border-b border-white/10 bg-[rgb(var(--bg))]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start">
              <img src="/images/logos/logo.png" alt="Smartslate" className="h-8 w-auto" />
              <p className="text-sm font-medium text-primary-400 -mt-1">Professional Profile</p>
            </div>
            <a 
              href="https://app.smartslate.io/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors"
              title="Join Smartslate"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Master Profile Container */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8">
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <main className="space-y-8">
            {/* Main Profile Section */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Simple Avatar Section */}
            <div className="flex flex-col items-center sm:items-start">
              <div className="relative">
                <UserAvatar user={user} sizeClass="w-24 h-24" textClass="text-2xl font-semibold" fallbackInitial={displayName || username || 'User'} />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 border-2 border-white rounded-full" />
              </div>
            </div>
            
            {/* Profile Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {displayName}
                  </h2>
                  <div className="flex items-center gap-2 text-white/60">
                    <span>@{username || 'user'}</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => window.open('https://app.smartslate.io/portal', '_blank')}
                    className="p-2 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors"
                    title="Visit Portal"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>

                </div>
              </div>
              
              {/* Professional Info */}
              <div className="space-y-3 mb-4">
                {((jobTitle && shareJobTitle) || (company && shareCompany)) && (
                  <div className="flex flex-wrap gap-2 text-sm">
                    {jobTitle && shareJobTitle && <span className="text-white/90">{jobTitle}</span>}
                    {jobTitle && shareJobTitle && company && shareCompany && <span className="text-white/40">at</span>}
                    {company && shareCompany && <span className="text-primary-400 font-medium">{company}</span>}
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                  {((city || country) && shareLocation) && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{[city, country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  
                  {(website && shareWebsite) && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <a 
                        href={website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary-400 hover:underline"
                      >
                        {website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Social Actions */}
              <div className="flex items-center gap-2">
                <button 
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" 
                  title="LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </button>
                <button 
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" 
                  title="Twitter"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </button>
                <button 
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors" 
                  title="Email"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                
                

              </div>
            </div>
          </div>
          
                      {/* Bio Section */}
            {(bio && shareBio) && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <h3 className="text-sm font-medium text-white/80 mb-2">About</h3>
                <div 
                  className="text-white/70 leading-relaxed prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: bio }}
                  style={{
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                />
              </div>
            )}
        </div>

        {/* Portfolio Sections */}
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Certificates Section */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white/95">Certificates</h3>
                  <p className="text-sm text-white/60">Professional certifications and achievements</p>
                </div>
              </div>
              <div className="flex items-center justify-center py-12 px-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/60">Certificates will be displayed here</p>
                  <p className="text-xs text-white/40 mt-1">Coming soon</p>
                </div>
              </div>
            </div>

            {/* Achievements Section */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white/95">Achievements</h3>
                  <p className="text-sm text-white/60">Awards, recognitions, and accolades</p>
                </div>
              </div>
              <div className="flex items-center justify-center py-12 px-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/60">Achievements will be displayed here</p>
                  <p className="text-xs text-white/40 mt-1">Coming soon</p>
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white/95">Skills & Expertise</h3>
                  <p className="text-sm text-white/60">Professional skills and competencies</p>
                </div>
              </div>
              <div className="flex items-center justify-center py-12 px-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/60">Skills will be displayed here</p>
                  <p className="text-xs text-white/40 mt-1">Coming soon</p>
                </div>
              </div>
            </div>

            {/* Projects Section */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white/95">Projects & Portfolio</h3>
                  <p className="text-sm text-white/60">Notable projects and work samples</p>
                </div>
              </div>
              <div className="flex items-center justify-center py-12 px-4">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/60">Projects will be displayed here</p>
                  <p className="text-xs text-white/40 mt-1">Coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Smartslate Branding */}
        <footer className="relative z-10 mt-12 pt-8 border-t border-white/10 text-center">
          <div className="flex flex-col items-center justify-center mb-4">
            <img src="/images/logos/logo.png" alt="Smartslate" className="h-6 w-auto opacity-60 mb-2" />
            <span className="text-white/60 text-sm">Powered by Smartslate</span>
          </div>
          <p className="text-xs text-white/40 mb-4">
            Create your professional profile and showcase your achievements
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-white/40">
            <a href="https://smartslate.io" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">About Smartslate</a>
            <a href="https://app.smartslate.io/portal" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">Create Profile</a>
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
          </div>
        </footer>
          </main>
        </div>
      </div>
    </div>
  )
}
