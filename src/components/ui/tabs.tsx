import { createContext, useContext, useId, useMemo, useState } from 'react'
import { clsx } from 'clsx'

type TabsContextValue = { active: string; setActive: (v: string) => void; idPrefix: string }
const TabsContext = createContext<TabsContextValue | null>(null)

export function Tabs({ defaultValue, className, children }: { defaultValue: string; className?: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultValue)
  const idPrefix = useId()
  const value = useMemo(() => ({ active, setActive, idPrefix }), [active, idPrefix])
  return <TabsContext.Provider value={value}><div className={className}>{children}</div></TabsContext.Provider>
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div role="tablist" className={clsx('inline-flex rounded-xl border border-white/10 bg-white/5 p-1', className)}>{children}</div>
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext)
  const active = ctx?.active === value
  const id = `${ctx?.idPrefix}-tab-${value}`
  const panelId = `${ctx?.idPrefix}-panel-${value}`
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      onClick={() => ctx?.setActive(value)}
      className={clsx('px-3 py-2 text-sm rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent data-[active=true]:bg-white/10', active && 'bg-white/10')}
      data-active={active ? 'true' : 'false'}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext)
  if (!ctx || ctx.active !== value) return null
  const id = `${ctx.idPrefix}-panel-${value}`
  const labelledBy = `${ctx.idPrefix}-tab-${value}`
  return <div id={id} role="tabpanel" aria-labelledby={labelledBy} className={className}>{children}</div>
}


