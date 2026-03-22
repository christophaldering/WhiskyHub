import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ThemeTokens, SP } from './theme/tokens'
import { Translations } from './theme/i18n'
import * as Icon from './icons/Icons'

type TabId = 'tastings' | 'entdecken' | 'meinewelt' | 'circle'

interface Props {
  th:            ThemeTokens
  t:             Translations
  themeKey:      'dark' | 'light'
  lang:          'de' | 'en'
  activeTab:     TabId
  subScreen:     string | null
  session?:      any
  onTabChange:   (tab: TabId) => void
  onToggleTheme: () => void
  onToggleLang:  () => void
  onLogout?:     () => void
  children:      React.ReactNode
}

const TABS: { id: TabId; labelKey: keyof Translations; icon: (active: boolean, th: ThemeTokens) => React.ReactNode }[] = [
  { id: 'tastings',  labelKey: 'tabTastings',  icon: (a, th) => <Icon.TabTastings color={a ? th.gold : th.faint} size={24} /> },
  { id: 'entdecken', labelKey: 'tabEntdecken', icon: (a, th) => <Icon.TabDiscover color={a ? th.gold : th.faint} size={24} /> },
  { id: 'meinewelt', labelKey: 'tabMeineWelt', icon: (a, th) => <Icon.TabWorld    color={a ? th.gold : th.faint} size={24} /> },
  { id: 'circle',    labelKey: 'tabCircle',    icon: (a, th) => <Icon.TabCircle   color={a ? th.gold : th.faint} size={24} /> },
]

const MENU_BUILD = 'v5'

function showVanillaMenu(opts: {
  th: ThemeTokens, lang: 'de'|'en', session: any, photoUrl: string|null,
  isGuest: boolean, isAdmin: boolean,
  onClose: () => void, onProfile: () => void, onPhoto: () => void,
  onAdmin: () => void, onLogout: (() => void) | undefined,
}) {
  const existing = document.getElementById('casksense-profile-overlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'casksense-profile-overlay'
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;background:rgba(0,0,0,0.3);font-family:DM Sans,sans-serif;'
  overlay.addEventListener('click', () => { overlay.remove(); opts.onClose() })

  const rightOffset = Math.max(16, (window.innerWidth - 480) / 2 + 16)
  const card = document.createElement('div')
  card.style.cssText = `position:absolute;top:56px;right:${rightOffset}px;width:220px;max-width:calc(100vw - 32px);background:${opts.th.bgCard};border:1px solid ${opts.th.border};border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.35);overflow:hidden;color:${opts.th.text};`
  card.addEventListener('click', (e) => e.stopPropagation())

  const initial = opts.session?.name?.[0]?.toUpperCase() || '?'
  const nameText = opts.session?.name || ''
  const emailText = opts.isGuest ? (opts.lang === 'de' ? 'Gast' : 'Guest') : (opts.session?.email || '')

  const avatarBg = opts.photoUrl
    ? `background:transparent;`
    : `background:linear-gradient(135deg, ${opts.th.phases.nose.dim}, ${opts.th.phases.palate.dim});`
  const avatarContent = opts.photoUrl
    ? `<img src="${opts.photoUrl}" alt="${nameText}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<span style="font-size:18px;font-weight:700;color:${opts.th.gold};">${initial}</span>`

  card.innerHTML = `
    <div style="padding:16px;border-bottom:1px solid ${opts.th.border};display:flex;align-items:center;gap:10px;">
      <div style="width:44px;height:44px;border-radius:22px;border:2px solid ${opts.th.gold}44;${avatarBg}display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
        ${avatarContent}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:700;color:${opts.th.text};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nameText}</div>
        <div style="font-size:11px;color:${opts.th.faint};margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${emailText}</div>
      </div>
    </div>
  `

  function addBtn(label: string, iconColor: string, textColor: string, hasBorder: boolean, onClick: () => void, iconSvg: string) {
    const btn = document.createElement('button')
    btn.style.cssText = `width:100%;min-height:44px;display:flex;align-items:center;gap:10px;padding:0 16px;background:none;border:none;${hasBorder ? `border-bottom:1px solid ${opts.th.border};` : ''}cursor:pointer;color:${textColor};font-size:14px;font-family:DM Sans,sans-serif;`
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>${label}`
    btn.addEventListener('click', () => { overlay.remove(); opts.onClose(); onClick() })
    card.appendChild(btn)
  }

  addBtn(
    opts.lang === 'de' ? 'Profil bearbeiten' : 'Edit profile',
    opts.th.muted, opts.th.text, true, opts.onProfile,
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  )

  addBtn(
    opts.lang === 'de' ? 'Profilfoto ändern' : 'Change photo',
    opts.th.muted, opts.th.text, true, opts.onPhoto,
    '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'
  )

  if (opts.isAdmin) {
    addBtn(
      'Admin', opts.th.gold, opts.th.gold, true, opts.onAdmin,
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
    )
  }

  if (opts.onLogout) {
    const logoutFn = opts.onLogout
    addBtn(
      opts.lang === 'de' ? 'Abmelden' : 'Logout',
      '#e06060', '#e06060', false, () => logoutFn(),
      '<polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>'
    )
  }

  overlay.appendChild(card)
  document.body.appendChild(overlay)
}

function hideVanillaMenu() {
  const el = document.getElementById('casksense-profile-overlay')
  if (el) el.remove()
}

export const LabsAppleLayout: React.FC<Props> = ({
  th, t, themeKey, lang, activeTab, subScreen,
  session, onTabChange, onToggleTheme, onToggleLang, onLogout, children
}) => {
  const [profileOpen, setProfileOpen] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(session?.profilePhotoUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hideTabBar = subScreen !== null

  const initial = session?.name?.[0]?.toUpperCase() || '?'
  const isGuest = !session?.email
  const isAdmin = session?.isAdmin || session?.role === 'admin'

  const openMenu = useCallback(() => {
    setProfileOpen(true)
    showVanillaMenu({
      th, lang, session, photoUrl, isGuest, isAdmin,
      onClose: () => setProfileOpen(false),
      onProfile: () => onTabChange('meinewelt'),
      onPhoto: () => fileInputRef.current?.click(),
      onAdmin: () => (window as any).__casksenseNav?.('admin'),
      onLogout,
    })
  }, [th, lang, session, photoUrl, isGuest, isAdmin, onTabChange, onLogout])

  const closeMenu = useCallback(() => {
    setProfileOpen(false)
    hideVanillaMenu()
  }, [])

  useEffect(() => {
    if (!profileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [profileOpen, closeMenu])

  useEffect(() => {
    return () => hideVanillaMenu()
  }, [])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !session?.id) return
    setPhotoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/participants/${session.id}/photo`, {
        method: 'POST',
        headers: { 'x-participant-id': session.id },
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setPhotoUrl(data.photoUrl || data.url || null)
      }
    } catch { } finally {
      setPhotoUploading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: th.bg, color: th.text, position: 'relative', maxWidth: 480, margin: '0 auto' }}>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoUpload}
      />

      <div style={{ position: 'sticky', top: 0, zIndex: 10, height: 52, background: th.headerBg, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${SP.md}px`, borderBottom: `1px solid ${th.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: th.gold, letterSpacing: '0.04em' }}>
            {t.appName}
          </span>
          <span data-testid="text-build-marker" style={{ fontSize: 9, color: th.faint, opacity: 0.5, fontFamily: 'DM Sans, sans-serif' }}>{MENU_BUILD}</span>
        </div>

        <div style={{ display: 'flex', gap: SP.sm, alignItems: 'center' }}>
          <button data-testid="button-toggle-lang" onClick={onToggleLang} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            {lang === 'de' ? 'EN' : 'DE'}
          </button>

          <button data-testid="button-toggle-theme" onClick={onToggleTheme} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            {themeKey === 'dark' ? t.lightMode : t.darkMode}
          </button>

          {session && (
            <button
              data-testid="button-profile-avatar"
              onClick={profileOpen ? closeMenu : openMenu}
              style={{ width: 34, height: 34, borderRadius: 17, border: `2px solid ${profileOpen ? th.gold : th.border}`, background: photoUrl ? 'transparent' : `linear-gradient(135deg, ${th.phases.nose.dim}, ${th.phases.palate.dim})`, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: th.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 150ms', overflow: 'hidden', padding: 0 }}
            >
              {photoUrl
                ? <img src={photoUrl} alt={session.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : initial
              }
            </button>
          )}
        </div>
      </div>

      <div style={{ paddingBottom: hideTabBar ? 0 : 72, minHeight: 'calc(100dvh - 52px)' }}>
        {children}
      </div>

      {!hideTabBar && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', maxWidth: 480, height: 72, margin: '0 auto', background: th.tabBg, backdropFilter: 'blur(16px)', borderTop: `1px solid ${th.border}`, display: 'flex', zIndex: 10 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button key={tab.id} data-testid={`tab-${tab.id}`} onClick={() => onTabChange(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', minHeight: 44, position: 'relative' }}>
                {tab.icon(active, th)}
                {active && <div style={{ width: 4, height: 4, borderRadius: 2, background: th.gold, position: 'absolute', bottom: 8 }} />}
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? th.gold : th.faint, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.02em' }}>
                  {t[tab.labelKey] as string}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
