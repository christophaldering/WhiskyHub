import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
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

function ProfileRow({ icon, label, color, borderBottom, onClick, th }: {
  icon: React.ReactNode, label: string, color: string, borderBottom: boolean, onClick: () => void, th: ThemeTokens
}) {
  return (
    <button
      data-testid={`button-profile-${label.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
      style={{
        width: '100%', minHeight: 48, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', background: 'none', border: 'none',
        borderBottom: borderBottom ? `1px solid ${th.border}` : 'none',
        cursor: 'pointer', color, fontSize: 15, fontFamily: 'DM Sans, sans-serif',
        textAlign: 'left',
      }}
    >
      {icon}
      {label}
    </button>
  )
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

  const closeProfile = () => setProfileOpen(false)

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

  const svgProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  return (
    <div style={{ minHeight: '100dvh', background: th.bg, color: th.text, maxWidth: 480, margin: '0 auto' }}>

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
              onClick={() => setProfileOpen(!profileOpen)}
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

      {profileOpen && createPortal(
        <div
          data-testid="profile-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closeProfile() }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <div
            data-testid="profile-sheet"
            style={{
              width: '100%',
              maxWidth: 480,
              background: th.bgCard,
              borderRadius: '20px 20px 0 0',
              padding: '0 0 calc(20px + env(safe-area-inset-bottom, 0px))',
              maxHeight: '80vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${th.border}` }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: th.text, margin: 0, fontFamily: 'Playfair Display, serif' }}>
                {lang === 'de' ? 'Profil' : 'Profile'}
              </h2>
              <button
                data-testid="button-close-profile"
                onClick={closeProfile}
                style={{ width: 32, height: 32, borderRadius: 16, border: 'none', background: th.border, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={th.muted} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 24,
                border: `2px solid ${th.gold}44`,
                background: photoUrl ? 'transparent' : `linear-gradient(135deg, ${th.phases.nose.dim}, ${th.phases.palate.dim})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {photoUrl
                  ? <img src={photoUrl} alt={session?.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                  : <span style={{ fontSize: 20, fontWeight: 700, color: th.gold }}>{initial}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: th.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session?.name || ''}
                </div>
                <div style={{ fontSize: 13, color: th.faint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isGuest ? (lang === 'de' ? 'Gast' : 'Guest') : (session?.email || '')}
                </div>
              </div>
            </div>

            <div style={{ padding: '8px 0' }}>
              <ProfileRow
                th={th}
                icon={<svg {...svgProps} stroke={th.muted}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                label={lang === 'de' ? 'Profil bearbeiten' : 'Edit Profile'}
                color={th.text}
                borderBottom={true}
                onClick={() => { closeProfile(); onTabChange('meinewelt') }}
              />
              <ProfileRow
                th={th}
                icon={<svg {...svgProps} stroke={th.muted}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
                label={lang === 'de' ? 'Profilfoto aendern' : 'Change Photo'}
                color={th.text}
                borderBottom={true}
                onClick={() => { closeProfile(); fileInputRef.current?.click() }}
              />
              {isAdmin && (
                <ProfileRow
                  th={th}
                  icon={<svg {...svgProps} stroke={th.gold}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
                  label="Admin"
                  color={th.gold}
                  borderBottom={true}
                  onClick={() => { closeProfile(); (window as any).__casksenseNav?.('admin') }}
                />
              )}
              {onLogout && (
                <ProfileRow
                  th={th}
                  icon={<svg {...svgProps} stroke="#e06060"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>}
                  label={lang === 'de' ? 'Abmelden' : 'Sign Out'}
                  color="#e06060"
                  borderBottom={false}
                  onClick={() => { closeProfile(); onLogout() }}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
