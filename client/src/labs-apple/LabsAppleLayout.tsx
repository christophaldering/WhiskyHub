// CaskSense Apple — LabsAppleLayout (v2 — mit Session/Logout)
import React, { useState } from 'react'
import { ThemeTokens, SP } from './theme/tokens'
import { Translations } from './theme/i18n'
import * as Icon from './icons/Icons'

type TabId = 'tastings' | 'entdecken' | 'meinewelt' | 'circle'

interface Props {
  th:             ThemeTokens
  t:              Translations
  themeKey:       'dark' | 'light'
  lang:           'de' | 'en'
  activeTab:      TabId
  subScreen:      string | null
  session?:       any
  onTabChange:    (tab: TabId) => void
  onToggleTheme:  () => void
  onToggleLang:   () => void
  onLogout?:      () => void
  children:       React.ReactNode
}

const TABS: { id: TabId; labelKey: keyof Translations; icon: (active: boolean, th: ThemeTokens) => React.ReactNode }[] = [
  { id: 'tastings',  labelKey: 'tabTastings',  icon: (a, th) => <Icon.TabTastings color={a ? th.gold : th.faint} size={24} /> },
  { id: 'entdecken', labelKey: 'tabEntdecken', icon: (a, th) => <Icon.TabDiscover color={a ? th.gold : th.faint} size={24} /> },
  { id: 'meinewelt', labelKey: 'tabMeineWelt', icon: (a, th) => <Icon.TabWorld color={a ? th.gold : th.faint} size={24} /> },
  { id: 'circle',    labelKey: 'tabCircle',    icon: (a, th) => <Icon.TabCircle color={a ? th.gold : th.faint} size={24} /> },
]

export const LabsAppleLayout: React.FC<Props> = ({
  th, t, themeKey, lang, activeTab, subScreen,
  session, onTabChange, onToggleTheme, onToggleLang, onLogout, children
}) => {
  const [profileOpen, setProfileOpen] = useState(false)
  const hideTabBar = subScreen !== null

  const initial = session?.name?.[0]?.toUpperCase() || '?'
  const isGuest = !session?.email

  return (
    <div style={{ minHeight: '100dvh', background: th.bg, color: th.text, position: 'relative', maxWidth: 480, margin: '0 auto' }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, height: 52, background: th.headerBg, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${SP.md}px`, borderBottom: `1px solid ${th.border}` }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: th.gold, letterSpacing: '0.04em' }}>{t.appName}</span>

        <div style={{ display: 'flex', gap: SP.sm, alignItems: 'center' }}>
          {/* Lang toggle */}
          <button onClick={onToggleLang} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
          {/* Theme toggle */}
          <button onClick={onToggleTheme} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            {themeKey === 'dark' ? t.lightMode : t.darkMode}
          </button>
          {/* Profile avatar */}
          {session && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setProfileOpen(o => !o)} style={{ width: 34, height: 34, borderRadius: 17, border: `2px solid ${profileOpen ? th.gold : th.border}`, background: `linear-gradient(135deg, ${th.phases.nose.dim}, ${th.phases.palate.dim})`, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: th.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 150ms' }}>
                {initial}
              </button>
              {/* Profile dropdown */}
              {profileOpen && (
                <div style={{ position: 'absolute', top: 42, right: 0, width: 200, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 50, overflow: 'hidden' }}>
                  <div style={{ padding: `${SP.md}px`, borderBottom: `1px solid ${th.border}` }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: th.text }}>{session.name}</div>
                    <div style={{ fontSize: 12, color: th.faint, marginTop: 2 }}>
                      {isGuest ? (lang === 'de' ? 'Gast' : 'Guest') : session.email}
                    </div>
                  </div>
                  {onLogout && (
                    <button onClick={() => { setProfileOpen(false); onLogout() }} style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${SP.md}px`, background: 'none', border: 'none', cursor: 'pointer', color: '#e06060', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>
                      <Icon.Back color="#e06060" size={16} />
                      {(t as any).authLogout || (lang === 'de' ? 'Abmelden' : 'Sign out')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop for dropdown */}
      {profileOpen && <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}

      {/* Content */}
      <div style={{ paddingBottom: hideTabBar ? 0 : 72, minHeight: 'calc(100dvh - 52px)' }}>
        {children}
      </div>

      {/* Bottom tab bar */}
      {!hideTabBar && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, height: 72, background: th.tabBg, backdropFilter: 'blur(16px)', borderTop: `1px solid ${th.border}`, display: 'flex', zIndex: 20 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', minHeight: 44 }}>
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
