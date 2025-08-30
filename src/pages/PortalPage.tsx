import { Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { paths } from '@/routes/paths'
import { getCapitalizedFirstName } from '@/lib/textUtils'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { productionConfig } from '@/config/production'
import HeaderSwirlBackground from '@/components/HeaderSwirlBackground'

function Brand() {
  return (
    <a href="/" className="inline-flex items-center gap-2" aria-label="Smartslate">
      <img src="/images/logos/logo.png" alt="Smartslate" className="h-6 w-auto" />
    </a>
  )
}

export function PortalPage() {
  const { user, signOut } = useAuth()
  const fullName = (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || (user as any)?.user_metadata?.given_name || ''
  const derivedFromEmail = (user as any)?.email ? String((user as any).email).split('@')[0] : ''
  const firstName = getCapitalizedFirstName(fullName) || getCapitalizedFirstName(derivedFromEmail) || 'Your'
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>('ui.sidebarCollapsed', productionConfig.ui.sidebarCollapsed)
  return (
    <div className="h-screen w-full overflow-hidden bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      <div className="flex h-full">
        <aside className={`hidden md:flex ${isCollapsed ? 'md:w-14 lg:w-16' : 'md:w-72 lg:w-80'} flex-col border-r border-[#141620] bg-[#0D1B2A] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}>
          <div className={`border-b border-[#141620] flex items-center gap-2 sticky top-0 z-10 ${isCollapsed ? 'px-1 py-3 justify-end' : 'px-4 py-4 justify-between'}`}>
            {!isCollapsed && <Brand />}
            <button
              type="button"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
              onClick={() => setIsCollapsed(v => !v)}
              className="inline-flex h-9 w-9 items-center justify-center text-primary-300 hover:text-primary-400 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              <svg viewBox="0 0 24 24" className={`h-5 w-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" ry="3" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="7" y="5" width="3" height="14" rx="1.5" fill="currentColor" />
              </svg>
              <span className="sr-only">Toggle sidebar</span>
            </button>
          </div>
          <nav className={`flex-1 overflow-y-auto px-3 py-4 space-y-3 transition-all duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none select-none' : 'opacity-100 animate-slide-in'}`}>
            <div>
              <div className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-primary-500 rounded-lg">
                <span>Ignite</span>
              </div>
              <ul className="mt-1 pl-2 space-y-0.5 list-none">
                <li><a className="block px-3 py-1.5 text-sm text-white/75 rounded-lg hover:bg-white/5" href="#">Explore Learning</a></li>
                <li><a className="block px-3 py-1.5 text-sm text-white/75 rounded-lg hover:bg-white/5" href="#">My Learning</a></li>
              </ul>
            </div>
            <div>
              <div className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-primary-500 rounded-lg">
                <span>Strategic Skills Architecture</span>
              </div>
              <ul className="mt-1 pl-2 space-y-0.5 list-none">
                <li><a className="block px-3 py-1.5 text-sm text-white/75 rounded-lg hover:bg-white/5" href="#">Explore Partnership</a></li>
                <li><a className="block px-3 py-1.5 text-sm text-white/75 rounded-lg hover:bg-white/5" href="#">My Architecture</a></li>
              </ul>
            </div>
            <div>
              <div className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-primary-400 rounded-lg">
                <span>Solara</span>
              </div>
              <ul className="mt-1 pl-2 space-y-0.5 list-none">
                <li>
                  <a href={typeof window !== 'undefined' ? `${window.location.protocol}//polaris.smartslate.io` : 'https://polaris.smartslate.io'} className="flex items-center justify-between px-3 py-1.5 text-sm text-white/75 hover:text-primary-400 hover:bg-white/5 rounded-lg">
                    <span className="truncate">Polaris</span>
                    <span className="ml-3 shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium border-green-400/70 text-primary-300 bg-primary-400/10">2.5 Preview</span>
                  </a>
                </li>
              </ul>
            </div>
          </nav>
          <div className="px-3 pt-2 pb-3 border-t border-[#1a2438]">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-3">
                <a
                  href={paths.pricing}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-secondary-500 text-secondary-500 bg-transparent hover:bg-secondary-500/10 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
                  aria-label="Subscribe to Polaris"
                  title="Subscribe to Polaris"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <path d="M12 2l2.39 4.84L20 8l-4 3.9L17.18 18 12 15.27 6.82 18 8 11.9 4 8l5.61-1.16L12 2z" />
                  </svg>
                </a>
                <a
                  href={`${paths.settings}?tab=profile`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-primary-200 font-semibold hover:bg-white/15 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                  aria-label={`${firstName}'s Profile`}
                  title={`${firstName}'s Profile`}
                >
                  {firstName.slice(0,1)}
                </a>
                <a
                  href={paths.settings}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-primary-400 hover:bg-white/5 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                  aria-label="Settings"
                  title="Settings"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                    <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.027 7.027 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.89 1h-3.78a.5.5 0 0 0-.49.41l-.36 2.54c-.58.22-1.13.52-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.72 7.02a.5.5 0 0 0 .12.64l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.42.34.68.24l2.39-.96c.5.41 1.05.74 1.63.94l.36 2.54c.06.24.26.41.49.41h3.78c.24 0 .44-.17.49-.41l.36-2.54c.58-.22 1.13-.52 1.63-.94l2.39.96c.26.1.54 0 .68-.24l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"/>
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => { try { signOut() } catch {} }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white/80 hover:bg-white/5 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                  aria-label="Log out"
                  title="Log out"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                    <path fill="currentColor" d="M10.09 15.59 8.67 17l-5-5 5-5 1.41 1.41L6.5 11H21v2H6.5l3.59 2.59ZM12 3h8a1 1 0 0 1 1 1v4h-2V5h-7v14h7v-3h2v4a1 1 0 0 1-1 1h-8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <a
                  href={paths.pricing}
                  className="group inline-flex w-full items-center justify-start gap-2 rounded-lg border border-secondary-500 text-secondary-500 font-semibold px-3 py-2 text-sm bg-transparent hover:bg-secondary-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
                  aria-label="Subscribe to Polaris"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current opacity-90">
                    <path d="M12 2l2.39 4.84L20 8l-4 3.9L17.18 18 12 15.27 6.82 18 8 11.9 4 8l5.61-1.16L12 2z" />
                  </svg>
                  <span>Subscribe to Polaris</span>
                </a>
                <div className="mt-3 grid gap-3">
                  <a
                    href={`${paths.settings}?tab=profile`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    aria-label={`${firstName}'s Profile`}
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-primary-200 font-semibold">{firstName.slice(0,1)}</div>
                    <span className="truncate">{firstName}'s Profile</span>
                  </a>
                  <a
                    href={paths.settings}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    aria-label="Settings"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary-400">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                        <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.027 7.027 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.89 1h-3.78a.5.5 0 0 0-.49.41l-.36 2.54c-.58.22-1.13.52-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.72 7.02a.5.5 0 0 0 .12.64l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.42.34.68.24l2.39-.96c.5.41 1.05.74 1.63.94l.36 2.54c.06.24.26.41.49.41h3.78c.24 0 .44-.17.49-.41l.36-2.54c.58-.22 1.13-.52 1.63-.94l2.39.96c.26.1.54 0 .68-.24l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z"/>
                      </svg>
                    </div>
                    <span className="truncate">Settings</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => { try { signOut() } catch {} }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    aria-label="Log out"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/70">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                        <path fill="currentColor" d="M10.09 15.59 8.67 17l-5-5 5-5 1.41 1.41L6.5 11H21v2H6.5l3.59 2.59ZM12 3h8a1 1 0 0 1 1 1v4h-2V5h-7v14h7v-3h2v4a1 1 0 0 1-1 1h-8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>
                      </svg>
                    </div>
                    <span className="truncate">Log out</span>
                  </button>
                </div>
              </>
            )}
          </div>
          <div className={`px-4 py-3 text-xs text-white/50 ${isCollapsed ? 'hidden' : ''}`}>Made with ❤️ for better education</div>
        </aside>

        <main className="flex-1 min-w-0 h-full overflow-y-auto">
          <header className="sticky top-0 z-40 border-b border-[#141620] bg-[rgb(var(--bg))] backdrop-blur-xl overflow-hidden">
            <HeaderSwirlBackground />
            <div className="relative mx-auto max-w-7xl px-4 py-4 z-10">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">Illuminating the Path of Discovery: Polaris</h1>
            </div>
          </header>
          <div className="mx-auto max-w-7xl px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default PortalPage