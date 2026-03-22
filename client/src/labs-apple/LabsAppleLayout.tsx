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

export const LabsAppleLayout: React.FC<Props> = ({
  th, t, themeKey, lang, activeTab, subScreen,
  session, onTabChange, onToggleTheme, onToggleLang, onLogout, children
}) => {
  const [profileOpen, setProfileOpen] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(session?.profilePhotoUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const hideTabBar = subScreen !== null

  const initial = session?.name?.[0]?.toUpperCase() || '?'
  const isGuest = !session?.email
  const isAdmin = session?.isAdmin || session?.role === 'admin'

  const openMenu = useCallback(() => {
    setProfileOpen(true)
    dialogRef.current?.showModal()
  }, [])

  const closeMenu = useCallback(() => {
    dialogRef.current?.close()
    setProfileOpen(false)
  }, [])

  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    const onClose = () => setProfileOpen(false)
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
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

      <div style={{ position: 'sticky', top: 0, zIndex: 100, height: 52, background: th.headerBg, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${SP.md}px`, borderBottom: `1px solid ${th.border}` }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: th.gold, letterSpacing: '0.04em' }}>
          {t.appName}
        </span>

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
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, height: 72, background: th.tabBg, backdropFilter: 'blur(16px)', borderTop: `1px solid ${th.border}`, display: 'flex', zIndex: 20 }}>
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

      <dialog
        ref={dialogRef}
        data-testid="profile-dialog"
        onClick={(e) => { if (e.target === dialogRef.current) closeMenu() }}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100dvh',
          maxWidth: '100vw',
          maxHeight: '100dvh',
          margin: 0,
          padding: 0,
          border: 'none',
          background: 'transparent',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <div
          data-testid="profile-menu"
          style={{
            marginTop: 56,
            marginRight: 16,
            marginLeft: 'auto',
            width: 220,
            maxWidth: 'calc(100vw - 32px)',
            background: th.bgCard,
            border: `1px solid ${th.border}`,
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: SP.md, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, border: `2px solid ${th.gold}44`, background: photoUrl ? 'transparent' : `linear-gradient(135deg, ${th.phases.nose.dim}, ${th.phases.palate.dim})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: th.gold, overflow: 'hidden' }}>
                {photoUrl
                  ? <img src={photoUrl} alt={session?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initial
                }
              </div>
              <button
                data-testid="button-photo-upload-mini"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, background: th.gold, border: `2px solid ${th.bgCard}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
              >
                {photoUploading
                  ? <Icon.Spinner color="#1a0f00" size={10} />
                  : <Icon.Camera color="#1a0f00" size={10} />
                }
              </button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: th.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.name}</div>
              <div style={{ fontSize: 11, color: th.faint, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isGuest ? (lang === 'de' ? 'Gast' : 'Guest') : session?.email}
              </div>
            </div>
          </div>

          <button
            data-testid="button-edit-profile"
            onClick={() => { closeMenu(); onTabChange('meinewelt') }}
            style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${SP.md}px`, background: 'none', border: 'none', borderBottom: `1px solid ${th.border}`, cursor: 'pointer', color: th.text, fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}
          >
            <Icon.Profile color={th.muted} size={16} />
            {lang === 'de' ? 'Profil bearbeiten' : 'Edit profile'}
          </button>

          <button
            data-testid="button-change-photo"
            onClick={() => { closeMenu(); fileInputRef.current?.click() }}
            style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${SP.md}px`, background: 'none', border: 'none', borderBottom: `1px solid ${th.border}`, cursor: 'pointer', color: th.text, fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}
          >
            <Icon.Camera color={th.muted} size={16} />
            {lang === 'de' ? 'Profilfoto ändern' : 'Change photo'}
          </button>

          {isAdmin && (
            <button
              data-testid="button-admin"
              onClick={() => { closeMenu(); (window as any).__casksenseNav?.('admin') }}
              style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${SP.md}px`, background: 'none', border: 'none', borderBottom: `1px solid ${th.border}`, cursor: 'pointer', color: th.gold, fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}
            >
              <Icon.Settings color={th.gold} size={16} />
              Admin
            </button>
          )}

          {onLogout && (
            <button
              data-testid="button-logout"
              onClick={() => { closeMenu(); onLogout() }}
              style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${SP.md}px`, background: 'none', border: 'none', cursor: 'pointer', color: '#e06060', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}
            >
              <Icon.Back color="#e06060" size={16} />
              {t.authLogout}
            </button>
          )}
        </div>
      </dialog>

      <style>{`
        dialog[data-testid="profile-dialog"]::backdrop {
          background: rgba(0,0,0,0.3);
        }
        dialog[data-testid="profile-dialog"][open] {
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  )
}
