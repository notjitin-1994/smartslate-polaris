import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { getSupabase } from '@/services/supabase'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

type Appearance = 'system' | 'light' | 'dark'

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-white/95">{title}</h2>
        {description && <p className="mt-1 text-xs text-white/60">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-white/70">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-white/50">{hint}</span>}
    </label>
  )
}

export function SettingsContent() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [appearance, setAppearance] = useState<Appearance>('system')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [legalName, setLegalName] = useState<string>('')
  const [organization, setOrganization] = useState<string>('')
  const [jobTitle, setJobTitle] = useState<string>('')
  const [country, setCountry] = useState<string>('')
  const [timezone, setTimezone] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [language, setLanguage] = useState<string>('')
  const [website, setWebsite] = useState<string>('')
  const [linkedin, setLinkedin] = useState<string>('')
  const [consentMarketing, setConsentMarketing] = useState<boolean>(false)
  const [consentResearch, setConsentResearch] = useState<boolean>(false)
  const [profileSaving, setProfileSaving] = useState<boolean>(false)
  const [profileMessage, setProfileMessage] = useState<string>('')
  const [profileError, setProfileError] = useState<string>('')

  useEffect(() => {
    let mounted = true
    getSupabase().auth.getUser().then(({ data: { user: current } }) => {
      if (!mounted) return
      setUser(current ?? null)
      const meta: any = current?.user_metadata ?? {}
      setLegalName(meta.legal_name ?? '')
      setOrganization(meta.organization ?? '')
      setJobTitle(meta.job_title ?? '')
      setCountry(meta.country ?? '')
      setTimezone(meta.timezone ?? '')
      setPhone(meta.phone ?? '')
      setLanguage(meta.language ?? '')
      setWebsite(meta.website ?? '')
      setLinkedin(meta.linkedin ?? '')
      setConsentMarketing(Boolean(meta.consent_marketing))
      setConsentResearch(Boolean(meta.consent_research))
    })
    return () => {
      mounted = false
    }
  }, [])

  function saveAppearance(next: Appearance) {
    setAppearance(next)
    try {
      localStorage.setItem('settings:appearance', next)
    } catch {}
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('settings:appearance') as Appearance | null
      if (stored) setAppearance(stored)
    } catch {}
  }, [])

  function getAvatarUrl(u: User | null): string | null {
    const meta: any = u?.user_metadata ?? {}
    const identities: any[] = (u as any)?.identities ?? []
    const identityData = identities.find((i) => i?.identity_data)?.identity_data ?? {}
    return (
      meta.avatar_url || meta.avatarURL || meta.avatar || meta.picture || identityData.avatar_url || identityData.picture || null
    )
  }

  async function onUploadAvatar(file: File) {
    if (!user) return
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const bucket = 'public-assets'
      const path = `avatars/${user.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await getSupabase().storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: pub } = getSupabase().storage.from(bucket).getPublicUrl(path)
      const publicUrl = pub.publicUrl
      const { error: updateError, data } = await getSupabase().auth.updateUser({ data: { avatar_url: publicUrl, avatar_path: path } })
      if (updateError) throw updateError
      setUser(data.user)
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert(`Failed to upload avatar: ${err?.message || 'Unknown error'}`)
    }
  }

  async function onRemoveAvatar() {
    if (!user) return
    try {
      const meta: any = user.user_metadata || {}
      const path: string | undefined = meta.avatar_path
      if (path) {
        await getSupabase().storage.from('public-assets').remove([path])
      }
      const { error, data } = await getSupabase().auth.updateUser({ data: { avatar_url: '', avatar_path: '' } })
      if (error) throw error
      setUser(data.user)
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert(`Failed to remove avatar: ${err?.message || 'Unknown error'}`)
    }
  }

  function validatePhoneOptional(raw: string): string | null {
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      const parsed = parsePhoneNumberFromString(trimmed)
      if (parsed && parsed.isValid()) return null
      return 'Invalid phone number'
    } catch {
      return 'Invalid phone number'
    }
  }

  async function onSaveProfile() {
    setProfileError('')
    setProfileMessage('')
    const phoneError = validatePhoneOptional(phone)
    if (phoneError) {
      setProfileError(phoneError)
      return
    }
    setProfileSaving(true)
    try {
      const { error } = await getSupabase().auth.updateUser({
        data: {
          legal_name: legalName,
          organization,
          job_title: jobTitle,
          country,
          timezone,
          phone,
          language,
          website,
          linkedin,
          consent_marketing: consentMarketing,
          consent_research: consentResearch,
        },
      })
      if (error) throw error
      setProfileMessage('Saved')
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to save')
    } finally {
      setProfileSaving(false)
    }
  }

  async function onDisableAccount() {
    if (!user) return
    // eslint-disable-next-line no-alert
    const ok = window.confirm('Disable your account? You will be signed out and access will be limited until re-enabled.')
    if (!ok) return
    try {
      const { error } = await getSupabase().auth.updateUser({ data: { account_disabled: true, account_disabled_at: new Date().toISOString() } })
      if (error) throw error
    } catch (err: any) {
      // eslint-disable-next-line no-alert
      alert(`Failed to disable account: ${err?.message || 'Unknown error'}`)
      return
    }
    try {
      await getSupabase().auth.signOut()
    } finally {
      navigate('/', { replace: true })
    }
  }

  async function onDeleteAccount() {
    if (!user) return
    // eslint-disable-next-line no-alert
    const ok = window.confirm('Permanently delete your account and associated data? This cannot be undone.')
    if (!ok) return
    try {
      await getSupabase().auth.updateUser({ data: { delete_requested: true, delete_requested_at: new Date().toISOString() } })
    } catch {}
    try {
      await getSupabase().functions.invoke('delete-user', { body: { userId: user.id } })
    } catch {}
    try {
      await getSupabase().auth.signOut()
    } finally {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <SectionCard title="Avatar" description="Your profile picture.">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-white/10 bg-white/5 overflow-hidden">
            {getAvatarUrl(user) ? (
              <img src={getAvatarUrl(user) as string} alt="User avatar" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-sm font-semibold text-white/80">{(user?.email || 'U').charAt(0).toUpperCase()}</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost px-3 py-2 text-sm text-white/90"
            >
              Upload new
            </button>
            <button
              type="button"
              onClick={onRemoveAvatar}
              className="btn-ghost px-3 py-2 text-sm text-white/70 hover:text-white"
            >
              Remove
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUploadAvatar(file)
              e.currentTarget.value = ''
            }}
          />
        </div>
      </SectionCard>

      <SectionCard title="Profile" description="Your basic account information.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name">
            <input
              type="text"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="Your name"
              defaultValue={(user?.user_metadata?.name as string) || (user?.user_metadata?.full_name as string) || ''}
              readOnly
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="you@example.com"
              defaultValue={user?.email ?? ''}
              readOnly
            />
          </Field>
          <Field label="Full legal name (optional)" hint="Used for invoicing/compliance; not public.">
            <input
              type="text"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="Your legal name"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </Field>
          <Field label="Organization (optional)">
            <input
              type="text"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="Company / School"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </Field>
          <Field label="Job title (optional)">
            <input
              type="text"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="Role"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </Field>
          <Field label="Country / Region (optional)">
            <input
              type="text"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </Field>
          <Field label="Timezone (optional)">
            <input
              type="text"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="e.g., America/Los_Angeles"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </Field>
          <Field label="Phone (optional)" hint="Stored for support/security; not public.">
            <input
              type="tel"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="+1 415 555 2671"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="Preferred language (optional)">
            <input
              type="text"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="e.g., en-US"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </Field>
          <Field label="Website (optional)">
            <input
              type="url"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </Field>
          <Field label="LinkedIn (optional)">
            <input
              type="url"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/40 outline-none focus:ring-2 focus:ring-primary-400"
              placeholder="https://linkedin.com/in/yourname"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-white/90">
              <input type="checkbox" checked={consentMarketing} onChange={(e) => setConsentMarketing(e.target.checked)} className="h-4 w-4 rounded border-white/10 bg-white/5" />
              Receive product updates and marketing (optional)
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-white/90">
              <input type="checkbox" checked={consentResearch} onChange={(e) => setConsentResearch(e.target.checked)} className="h-4 w-4 rounded border-white/10 bg-white/5" />
              Participate in research (optional)
            </label>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onSaveProfile}
            disabled={profileSaving}
            className="btn-ghost px-4 py-2 text-sm text-white/90 disabled:opacity-60"
          >
            {profileSaving ? 'Saving…' : 'Save changes'}
          </button>
          {profileMessage && <span className="text-xs text-primary-500">{profileMessage}</span>}
          {profileError && <span className="text-xs text-red-400">{profileError}</span>}
        </div>
      </SectionCard>

      <SectionCard title="Appearance" description="Choose how Smartslate looks to you.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['system', 'light', 'dark'] as Appearance[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => saveAppearance(mode)}
              className={`relative rounded-xl border ${appearance === mode ? 'border-primary-400/40 bg-primary-400/5' : 'border-white/10 bg-white/5'} p-3 text-left transition pressable`}
              aria-pressed={appearance === mode}
            >
              <div className="text-sm font-medium capitalize text-white/90">{mode}</div>
              <div className="mt-1 text-[11px] text-white/60">
                {mode === 'system' ? 'Match your system setting' : mode === 'light' ? 'Bright theme' : 'Dim theme'}
              </div>
              {appearance === mode && (
                <span className="absolute top-2 right-2 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary-400/80">
                  <span className="sr-only">Selected</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="General" description="Common preferences and defaults.">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/90">Enable shortcuts</div>
              <div className="text-xs text-white/60">Use keyboard shortcuts where available</div>
            </div>
            <input type="checkbox" className="h-5 w-5 rounded-md border-white/10 bg-white/5 text-primary-400" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/90">Show advanced options</div>
              <div className="text-xs text-white/60">Reveal experimental controls</div>
            </div>
            <input type="checkbox" className="h-5 w-5 rounded-md border-white/10 bg-white/5 text-primary-400" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Account" description="Manage account status and data.">
        <div className="space-y-3">
          <button
            type="button"
            onClick={onDisableAccount}
            className="w-full sm:w-auto btn-ghost px-4 py-2 text-sm text-white/90 hover:text-white"
          >
            Disable account
          </button>
          <div className="text-[11px] text-white/60">You can re-enable later by contacting support or signing in if allowed.</div>
          <div className="h-px bg-white/10 my-2" />
          <button
            type="button"
            onClick={onDeleteAccount}
            className="w-full sm:w-auto btn-ghost px-4 py-2 text-sm text-red-300 hover:text-red-200"
          >
            Delete account permanently
          </button>
          <div className="text-[11px] text-white/60">This will sign you out and request permanent deletion of your data.</div>
        </div>
      </SectionCard>
    </div>
  )
}


