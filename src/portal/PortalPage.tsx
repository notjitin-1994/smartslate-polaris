import { useEffect, useRef, useState, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from '@/services/supabase'
import { paths } from '@/routes/paths'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

type NavItem = string | { label: string; tagText?: string; tagTone?: 'preview' | 'soon' | 'info' }

type NavSectionProps = {
  title: string
  items: NavItem[]
  defaultOpen?: boolean
}

function NavSection({ title, items, defaultOpen = false }: NavSectionProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen)
  return (
    <div className="select-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-primary-500 hover:bg-white/5 rounded-lg transition pressable"
        aria-expanded={open}
        aria-controls={`section-${title.replace(/\s+/g, '-')}`}
      >
        <span>{title}</span>
        <span className={`inline-block text-xs text-primary-500/70 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      <div id={`section-${title.replace(/\s+/g, '-')}`} className={`${open ? 'block' : 'hidden'} mt-1 pl-2`}>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const { label, tagText, tagTone } =
              typeof item === 'string' ? { label: item } : item
            return (
              <li key={label}>
                <a
                  href="#"
                  className="flex items-center justify-between px-3 py-1.5 text-sm text-white/75 hover:text-primary-500 focus-visible:text-primary-500 active:text-primary-500 hover:bg-primary-500/5 rounded-lg transition pressable"
                >
                  <span className="truncate">{label}</span>
                  {tagText && (
                    <span
                      className={`ml-3 shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        tagTone === 'preview'
                          ? 'border-primary-400/30 text-primary-500 bg-primary-400/10'
                          : 'border-white/10 text-white/60 bg-white/5'
                      }`}
                    >
                      {tagText}
                    </span>
                  )}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function resolveUserAvatarUrl(user: User | null): string | null {
  const meta: any = user?.user_metadata ?? {}
  const identities: any[] = (user as any)?.identities ?? []
  const identityData = identities.find((i) => i?.identity_data)?.identity_data ?? {}
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

function UserAvatar({ user, sizeClass, textClass = 'text-sm font-semibold text-white/90' }: { user: User | null; sizeClass: string; textClass?: string }) {
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
        <span className={textClass}>{getUserInitial(user)}</span>
      )}
    </span>
  )
}

type WorkspaceActionCardProps = {
  href: string
  label: string
  description?: string
  icon: ComponentType<{ className?: string }>
}

function WorkspaceActionCard({ href, label, description, icon: Icon }: WorkspaceActionCardProps) {
  function onMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const target = e.currentTarget as HTMLAnchorElement
    const rect = target.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    target.style.setProperty('--x', `${x}px`)
    target.style.setProperty('--y', `${y}px`)
  }

  return (
    <a
      href={href}
      aria-label={label}
      onMouseMove={onMouseMove}
      className="group relative block h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 transition-transform duration-300 hover:-translate-y-0.5 pressable elevate animate-fade-in-up"
    >
      <div className="interactive-spotlight" aria-hidden="true" />
      <div className="relative p-5 sm:p-6 h-full grid grid-cols-[auto,1fr,auto] items-center gap-4">
        <span className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-white/10 bg-white/5 text-white/85 group-hover:text-primary-400 transition-colors">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-base font-semibold text-white/95">{label}</div>
          {description && (
            <p className="mt-0.5 text-xs text-white/60 line-clamp-3">{description}</p>
          )}
        </div>
        <span className="opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition will-change-transform text-white/70 group-hover:text-primary-400">
          <IconArrowRight className="h-5 w-5" />
        </span>
      </div>
    </a>
  )
}

function Brand() {
  return (
    <a href="/portal" className="inline-flex items-center gap-2" aria-label="SmartSlate">
      <img src="/images/logos/logo.png" alt="SmartSlate" className="h-6 w-auto logo-glow" />
    </a>
  )
}

function SidebarToggleIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9 5v14" />
    </svg>
  )
}

function IconWrench({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 6.5a5 5 0 0 1-6.8 4.7L7.8 17.6a2 2 0 1 1-2.8-2.8l6.4-6.4A5 5 0 1 1 21 6.5z" />
      <circle cx="4.5" cy="19.5" r="1.5" />
    </svg>
  )
}

function IconBookOpen({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5.5c-2.8-1.9-6.3-1.9-9 0v12c2.7-1.9 6.2-1.9 9 0" />
      <path d="M12 5.5c2.8-1.9 6.3-1.9 9 0v12c-2.7-1.9-6.2-1.9-9 0" />
      <path d="M12 5.5v12" />
    </svg>
  )
}

function IconChart({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 20.5h17" />
      <path d="M6.5 16.5v-4" />
      <path d="M11.5 16.5v-7" />
      <path d="M16.5 16.5v-2" />
      <path d="M5 11l3-3 3 3 5-5 3 3" />
    </svg>
  )
}

function IconArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 12h16" />
      <path d="M14 6l6 6-6 6" />
    </svg>
  )
}

function IconGraduationCap({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 9L12 5 2 9l10 4 6-2.4V16" />
      <path d="M6 10v3.5c0 1.6 2.7 2.9 6 2.9s6-1.3 6-2.9V10" />
    </svg>
  )
}

function IconChecklist({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M8 8.5h6" />
      <path d="M8 12h6" />
      <path d="M8 15.5h6" />
      <path d="M6.5 9.5l1 1 2-2" />
      <path d="M6.5 13l1 1 2-2" />
    </svg>
  )
}

function IconSun({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M4.5 12H2M22 12h-2.5M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8" />
    </svg>
  )
}

function SettingsIconImg({ className = '' }: { className?: string }) {
  return (
    <img
      src="https://oyjslszrygcajdpwgxbe.supabase.co/storage/v1/object/public/public-assets/gear.png"
      alt="Settings"
      className={`select-none ${className}`}
      style={{ objectFit: 'contain' }}
      loading="lazy"
    />
  )
}

export function PortalPage() {
  const navigate = useNavigate()
  useDocumentTitle('Smartslate | Portal')
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('portal:sidebarCollapsed')
    return stored ? stored === '1' : true
  })
  const [user, setUser] = useState<User | null>(null)
  const [profileMenu, setProfileMenu] = useState<{ open: boolean; x: number; y: number; align: 'center' | 'left' | 'right' }>({ open: false, x: 0, y: 0, align: 'center' })
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)

  useEffect(() => {
    try {
      localStorage.setItem('portal:sidebarCollapsed', sidebarCollapsed ? '1' : '0')
    } catch {}
  }, [sidebarCollapsed])

  // Track viewport to derive isMobile
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    let isMounted = true
    getSupabase()
      .auth
      .getUser()
      .then(({ data: { user: currentUser } }) => {
        if (isMounted) setUser(currentUser ?? null)
      })
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUser(session?.user ?? null)
    })
    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  function openProfileMenu(e: React.MouseEvent) {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.bottom + 8
    setProfileMenu({ open: true, x, y, align: 'center' })
  }

  function closeProfileMenu() {
    setProfileMenu((p) => ({ ...p, open: false }))
  }

  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') closeProfileMenu()
    }
    if (profileMenu.open) {
      window.addEventListener('keydown', onKeyDown)
    }
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [profileMenu.open])

  // Clamp menu within viewport when opened or on resize
  useEffect(() => {
    if (!profileMenu.open) return
    const menu = menuRef.current
    const margin = 8
    const vw = window.innerWidth

    function computeAlign() {
      const menuWidth = menu?.offsetWidth ?? 180
      const tooLeft = profileMenu.x - menuWidth / 2 < margin
      const tooRight = profileMenu.x + menuWidth / 2 > vw - margin
      const newAlign: 'center' | 'left' | 'right' = tooLeft ? 'left' : tooRight ? 'right' : 'center'
      if (newAlign !== profileMenu.align) setProfileMenu((p) => ({ ...p, align: newAlign }))
    }

    computeAlign()
    const onResize = () => computeAlign()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [profileMenu.open, profileMenu.x, profileMenu.align])

  async function onLogout() {
    try {
      await getSupabase().auth.signOut()
    } finally {
      navigate(paths.home, { replace: true })
    }
  }

  const collapsedQuickItems = [
    { title: 'Ignite', icon: IconGraduationCap },
    { title: 'Strategic Skills Architecture', icon: IconChecklist },
    { title: 'Solara', icon: IconSun },
  ]

  const solaraItems: NavItem[] = [
    { label: 'Polaris', tagText: 'V1 - Preview', tagTone: 'preview' },
    { label: 'Constellation', tagText: 'V1 - Preview', tagTone: 'preview' },
    { label: 'Nova', tagText: isMobile ? 'Visit on Desktop' : 'Coming Soon', tagTone: 'info' },
    { label: 'Orbit', tagText: isMobile ? 'Visit on Desktop' : 'Coming Soon', tagTone: 'info' },
    { label: 'Spectrum', tagText: isMobile ? 'Visit on Desktop' : 'Coming Soon', tagTone: 'info' },
  ]

  return (
    <div className="min-h-screen w-full bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      <div className="flex h-screen">
        <aside className={`hidden md:flex ${sidebarCollapsed ? 'md:w-16 lg:w-16' : 'md:w-72 lg:w-80'} flex-col border-r border-white/10 bg-white/5/50 backdrop-blur-xl transition-[width] duration-300 ease-in-out`}>
          <div className={`px-3 ${sidebarCollapsed ? 'py-2' : 'px-4 py-4'} border-b border-white/10 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
            {!sidebarCollapsed && <Brand />}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white transition pressable"
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
            >
              <SidebarToggleIcon className="h-5 w-5" />
            </button>
          </div>
          {sidebarCollapsed ? (
            <div className="flex-1 overflow-y-auto py-4 flex flex-col items-center gap-3">
              {collapsedQuickItems.map(({ title, icon: Icon }) => (
                <button
                  key={title}
                  type="button"
                  title={title}
                  aria-label={title}
                  className="w-10 h-10 rounded-lg text-white/80 hover:text-white flex items-center justify-center transition-transform duration-200 hover:scale-[1.04] pressable"
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          ) : (
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
              <NavSection title="Ignite" items={["Explore Learning", "My Learning"]} />
              <NavSection title="Strategic Skills Architecture" items={["Explore Partnership", "My Architecture"]} />
              <NavSection title="Solara" items={solaraItems} />
            </nav>
          )}
          {sidebarCollapsed ? (
            <div className="px-0 py-3 flex flex-col items-center gap-2">
              <button
                type="button"
                title={`${((user?.user_metadata?.first_name as string) || (user?.user_metadata?.name as string) || (user?.user_metadata?.full_name as string) || 'Your')}'s Profile`}
                onClick={openProfileMenu}
                className="w-10 h-10 rounded-full text-white/85 hover:text-white flex items-center justify-center pressable"
              >
                <UserAvatar user={user} sizeClass="w-10 h-10" textClass="text-sm font-semibold" />
              </button>
              <button
                type="button"
                title="Settings"
                className="w-10 h-10 rounded-lg text-white/85 hover:text-white flex items-center justify-center pressable"
              >
                <SettingsIconImg className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="px-3 py-3 space-y-2">
              <button
                type="button"
                onClick={openProfileMenu}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition pressable"
                title={`${((user?.user_metadata?.first_name as string) || (user?.user_metadata?.name as string) || (user?.user_metadata?.full_name as string) || 'Your')}'s Profile`}
              >
                <UserAvatar user={user} sizeClass="w-9 h-9" />
                <span className="text-sm text-white/90 font-medium">
                  {(() => {
                    const rawName = (user?.user_metadata?.first_name as string) ||
                      (user?.user_metadata?.name as string) ||
                      (user?.user_metadata?.full_name as string) ||
                      (user?.email as string) ||
                      'Your'
                    const first = rawName.trim().split(' ')[0]
                    return user ? `${first}'s Profile` : 'Your Profile'
                  })()}
                </span>
              </button>
              <button
                type="button"
                className="w-full inline-flex items-center gap-2 px-2 py-2 text-sm text-white/85 hover:bg-white/5 rounded-lg transition pressable"
                title="Settings"
              >
                <SettingsIconImg className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          )}
          <div className={`border-t border-white/10 text-xs text-white/50 ${sidebarCollapsed ? 'px-0 py-2 flex items-center justify-center' : 'px-4 py-3'}`}>
            {sidebarCollapsed ? null : 'Made with ❤️ for better education'}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[rgb(var(--bg))]/80 backdrop-blur-xl mb-12 md:mb-0">
            <div className="relative mx-auto max-w-7xl px-4 py-3 sm:py-4">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-br from-primary-400/10 via-fuchsia-400/5 to-transparent blur-2xl" />
              <div className="relative animate-fade-in-up">
                <div className="flex items-center md:hidden gap-2">
                  <Brand />
                  <div className="inline-flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={openProfileMenu}
                      title={`${((user?.user_metadata?.first_name as string) || (user?.user_metadata?.name as string) || (user?.user_metadata?.full_name as string) || 'Your')}'s Profile`}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-full pressable"
                    >
                      <UserAvatar user={user} sizeClass="w-9 h-9" textClass="text-sm font-semibold" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(true)}
                      aria-label="Open menu"
                      className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/85 hover:text-white pressable"
                    >
                      <SidebarToggleIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white animate-fade-in-up">
                  {(() => {
                    const rawName = (user?.user_metadata?.first_name as string) ||
                      (user?.user_metadata?.name as string) ||
                      (user?.user_metadata?.full_name as string) ||
                      (user?.email as string) ||
                      ''
                    const firstName = rawName.toString().trim().split(' ')[0]
                    return user && firstName ? (
                      <>
                        <span>Welcome to the Portal, </span>
                        <span className="text-primary-600">{firstName}</span>
                        <span>.</span>
                      </>
                    ) : (
                      <>Welcome to the Portal.</>
                    )
                  })()}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-white/70 max-w-3xl animate-fade-in-up animate-delay-150">
                  Your gateway to explore and connect with the Smartslate ecosystem — discover the home of every product in one place.
                </p>
                <div aria-hidden="true" className="mt-3 h-px w-16 bg-gradient-to-r from-white/40 to-transparent" />
              </div>
            </div>
          </header>

          <section className="mx-auto max-w-7xl px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-40 sm:h-44 md:h-48 animate-fade-in-up">
                <WorkspaceActionCard
                  href="#"
                  label="Build"
                  description="Conduct stakeholder analysis, instructional design & generate storyboards, build and deploy courses."
                  icon={IconWrench}
                />
              </div>
              <div className="h-40 sm:h-44 md:h-48 animate-fade-in-up animate-delay-75">
                <WorkspaceActionCard
                  href="#"
                  label="Learn"
                  description="Explore docs, courses, and tutorials to level up quickly."
                  icon={IconBookOpen}
                />
              </div>
              <div className="h-40 sm:h-44 md:h-48 animate-fade-in-up animate-delay-150">
                <WorkspaceActionCard
                  href="#"
                  label="Insight"
                  description="Discover analytics and reports to drive better decisions."
                  icon={IconChart}
                />
              </div>
            </div>
          </section>
          {profileMenu.open && (
            <div className="fixed inset-0 z-50 animate-fade-in" onClick={closeProfileMenu} aria-hidden="true">
              <div
                ref={menuRef}
                className="absolute z-50 min-w-[160px] rounded-lg border border-white/10 bg-[rgb(var(--bg))]/95 backdrop-blur-xl shadow-2xl p-1 text-sm animate-scale-in"
                style={{
                  top: `${profileMenu.y}px`,
                  ...(profileMenu.align === 'center'
                    ? { left: `${profileMenu.x}px`, transform: 'translateX(-50%)' }
                    : profileMenu.align === 'left'
                      ? { left: '8px' }
                      : { right: '8px' }),
                }}
                role="menu"
                aria-orientation="vertical"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 rounded-md text-white/90 hover:bg-white/5"
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setMobileMenuOpen(false)} />
              <div className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-[rgb(var(--bg))]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl p-3 animate-slide-in-right">
                <div className="flex items-center justify-between px-1 py-2 border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/80 hover:text-white pressable"
                  >
                    <span className="text-lg">×</span>
                  </button>
                  <Brand />
                </div>
                <nav className="mt-3 space-y-3 overflow-y-auto h-[calc(100%-56px)] pb-6">
                  <NavSection title="Ignite" items={["Explore Learning", "My Learning"]} defaultOpen />
                  <NavSection title="Strategic Skills Architecture" items={["Explore Partnership", "My Architecture"]} defaultOpen />
                  <NavSection title="Solara" items={solaraItems} defaultOpen />
                </nav>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}


