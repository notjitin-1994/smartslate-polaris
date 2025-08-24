import { getSupabase } from '@/services/supabase'
import { getAllSummaries, type PolarisSummary } from '@/services/polarisSummaryService'

type Nullable<T> = T | null | undefined

export type { PolarisSummary }

export type PolarisPickerOptions = {
  title?: string
  description?: string
  onSelect?: (summary: PolarisSummary) => void
  onCancel?: () => void
}

const ROOT_ID = 'ss-polaris-picker-root'
const STYLE_ID = 'ss-polaris-picker-styles'

function ensureStylesInjected() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .ssp-fixed { position: fixed; }
    .ssp-inset { top: 0; right: 0; bottom: 0; left: 0; }
    .ssp-backdrop { background: rgba(2, 12, 27, 0.6); backdrop-filter: blur(4px); }
    .ssp-center { display: flex; align-items: center; justify-content: center; }
    .ssp-panel { width: 96%; max-width: 720px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); background: linear-gradient(180deg, rgba(7,18,36,0.98), rgba(4,12,24,0.98)); color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
    .ssp-header { padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .ssp-title { font-size: 16px; font-weight: 700; letter-spacing: 0.2px; color: #E6F0FF; }
    .ssp-sub { font-size: 12px; color: rgba(255,255,255,0.65); margin-top: 4px; }
    .ssp-body { max-height: 70vh; overflow: auto; padding: 10px 12px; }
    .ssp-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 10px; border: 1px solid transparent; background: rgba(255,255,255,0.03); margin: 8px 4px; cursor: pointer; }
    .ssp-row:hover { background: rgba(30, 120, 255, 0.08); border-color: rgba(68, 138, 255, 0.35); }
    .ssp-row-title { font-weight: 600; font-size: 14px; color: rgba(255,255,255,0.95); }
    .ssp-row-meta { font-size: 12px; color: rgba(255,255,255,0.6); }
    .ssp-actions { padding: 12px 14px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.08); }
    .ssp-btn { padding: 8px 12px; font-size: 13px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.95); cursor: pointer; }
    .ssp-btn:hover { background: rgba(255,255,255,0.09); }
    .ssp-btn-primary { border-color: rgba(78, 158, 255, 0.5); background: linear-gradient(90deg, rgba(52,144,220,0.25), rgba(52,144,220,0.18)); color: #E6F0FF; }
    .ssp-empty { padding: 20px; text-align: center; color: rgba(255,255,255,0.7); }
    .ssp-search { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.25); color: #fff; outline: none; }
    .ssp-search::placeholder { color: rgba(255,255,255,0.45); }
  `
  document.head.appendChild(style)
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text) node.textContent = text
  return node
}

async function fetchStarmaps(): Promise<{ summaries: PolarisSummary[]; error: Nullable<unknown> }> {
  try {
    // Ensure supabase client initializes and attempts cross-subdomain session adoption
    getSupabase()
    const { data, error } = await getAllSummaries()
    return { summaries: data || [], error }
  } catch (e) {
    return { summaries: [], error: e }
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString()
}

function mountRoot(): HTMLDivElement {
  let root = document.getElementById(ROOT_ID) as HTMLDivElement | null
  if (root) return root
  root = document.createElement('div')
  root.id = ROOT_ID
  root.className = 'ssp-fixed ssp-inset ssp-backdrop ssp-center'
  document.body.appendChild(root)
  return root
}

function unmountRoot() {
  const root = document.getElementById(ROOT_ID)
  if (root && root.parentNode) root.parentNode.removeChild(root)
}

async function renderPicker(options?: PolarisPickerOptions): Promise<Nullable<PolarisSummary>> {
  ensureStylesInjected()
  const root = mountRoot()

  const panel = el('div', 'ssp-panel')
  const header = el('div', 'ssp-header')
  const hgroup = el('div', '')
  const title = el('div', 'ssp-title', options?.title || 'Select a Polaris Starmap')
  const sub = el('div', 'ssp-sub', options?.description || 'Choose one of your existing discovery starmaps to continue')
  hgroup.appendChild(title)
  hgroup.appendChild(sub)

  const closeBtn = el('button', 'ssp-btn')
  closeBtn.textContent = 'Close'
  closeBtn.addEventListener('click', () => {
    options?.onCancel?.()
    unmountRoot()
    resolveOnce(null)
  })

  header.appendChild(hgroup)
  header.appendChild(closeBtn)

  const body = el('div', 'ssp-body')
  const search = el('input', 'ssp-search') as HTMLInputElement
  ;(search as HTMLInputElement).type = 'search'
  ;(search as HTMLInputElement).placeholder = 'Search by title or company...'
  body.appendChild(search)

  const list = el('div', '')
  body.appendChild(list)

  const actions = el('div', 'ssp-actions')
  const refreshBtn = el('button', 'ssp-btn')
  refreshBtn.textContent = 'Refresh'
  actions.appendChild(refreshBtn)

  const signInBtn = el('button', 'ssp-btn ssp-btn-primary')
  signInBtn.textContent = 'Sign in'
  signInBtn.addEventListener('click', () => {
    const current = window.location.href
    const url = new URL('https://app.smartslate.io/login')
    url.searchParams.set('redirect', current)
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  })

  panel.appendChild(header)
  panel.appendChild(body)
  panel.appendChild(actions)
  root.appendChild(panel)

  let cached: PolarisSummary[] = []
  let resolveOnce: (value: Nullable<PolarisSummary>) => void = () => {}
  const result = new Promise<Nullable<PolarisSummary>>((resolve) => {
    resolveOnce = resolve
  })

  async function load() {
    list.innerHTML = ''
    const { summaries, error } = await fetchStarmaps()
    cached = summaries
    if (error) {
      const empty = el('div', 'ssp-empty')
      empty.innerHTML = 'You are not signed in. Please sign in to view your starmaps.'
      actions.appendChild(signInBtn)
      list.appendChild(empty)
      return
    }
    actions.removeChild(actions.contains(signInBtn) ? signInBtn : document.createElement('span'))
    renderList(summaries)
  }

  function renderList(items: PolarisSummary[]) {
    list.innerHTML = ''
    if (!items.length) {
      const empty = el('div', 'ssp-empty')
      empty.innerHTML = 'No starmaps yet. Create one in <a href="https://app.smartslate.io/" target="_blank" rel="noreferrer noopener" style="text-decoration: underline; color: #9fc5ff;">Smartslate</a>.'
      list.appendChild(empty)
      return
    }
    for (const s of items) {
      const row = el('div', 'ssp-row')
      const left = el('div', '')
      const t = el('div', 'ssp-row-title', (s.report_title as string) || (s.company_name as string) || 'Untitled Discovery')
      const m = el('div', 'ssp-row-meta', formatDate(s.created_at as string))
      left.appendChild(t)
      left.appendChild(m)
      row.appendChild(left)
      const choose = el('button', 'ssp-btn ssp-btn-primary', 'Use')
      choose.addEventListener('click', () => {
        options?.onSelect?.(s)
        unmountRoot()
        resolveOnce(s)
      })
      row.addEventListener('click', () => {
        options?.onSelect?.(s)
        unmountRoot()
        resolveOnce(s)
      })
      row.appendChild(choose)
      list.appendChild(row)
    }
  }

  refreshBtn.addEventListener('click', () => load())
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase()
    if (!q) return renderList(cached)
    const filtered = cached.filter((s) => {
      const title = ((s.report_title as string) || (s.company_name as string) || '').toLowerCase()
      return title.includes(q)
    })
    renderList(filtered)
  })

  await load()
  return result
}

export async function openStarmapPicker(options?: PolarisPickerOptions): Promise<Nullable<PolarisSummary>> {
  return renderPicker(options)
}

export async function listStarmaps(): Promise<PolarisSummary[]> {
  const { summaries } = await fetchStarmaps()
  return summaries
}

declare global {
  interface Window {
    SmartslatePolaris?: {
      openStarmapPicker: typeof openStarmapPicker
      listStarmaps: typeof listStarmaps
      version: string
    }
  }
}

// Attach a safe global for non-module consumers
if (typeof window !== 'undefined') {
  window.SmartslatePolaris = {
    openStarmapPicker,
    listStarmaps,
    version: '1.0.0',
  }
}



