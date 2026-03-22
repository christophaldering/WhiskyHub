// CaskSense Apple — LabsAppleLayout
import React from 'react'
import { ThemeTokens, SP } from './theme/tokens'
import { Translations } from './theme/i18n'
import * as Icon from './icons/Icons'

type TabId = 'tastings' | 'entdecken' | 'meinewelt' | 'circle'

interface Props {
  th:         ThemeTokens
  t:          Translations
  themeKey:   'dark' | 'light'
  lang:       'de' | 'en'
  activeTab:  TabId
  subScreen:  string | null
  onTabChange: (tab: TabId) => void
  onToggleTheme: () => void
  onToggleLang:  () => void
  children:   React.ReactNode
}

const TABS: { id: TabId; labelKey: keyof Translations; icon: (active: boolean, th: ThemeTokens) => React.ReactNode }[] = [
  { id: 'tastings',  labelKey: 'tabTastings',  icon: (a, th) => <Icon.TabTastings color={a ? th.gold : th.faint} size={24} /> },
  { id: 'entdecken', labelKey: 'tabEntdecken', icon: (a, th) => <Icon.TabDiscover color={a ? th.gold : th.faint} size={24} /> },
  { id: 'meinewelt', labelKey: 'tabMeineWelt', icon: (a, th) => <Icon.TabWorld color={a ? th.gold : th.faint} size={24} /> },
  { id: 'circle',    labelKey: 'tabCircle',    icon: (a, th) => <Icon.TabCircle color={a ? th.gold : th.faint} size={24} /> },
]

export const LabsAppleLayout: React.FC<Props> = ({ th, t, themeKey, lang, activeTab, subScreen, onTabChange, onToggleTheme, onToggleLang, children }) => {
  const hideTabBar = subScreen !== null

  return (
    <div style={{ minHeight: '100vh', background: th.bg, color: th.text, position: 'relative', maxWidth: 480, margin: '0 auto' }}>
      {/* Top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, height: 52, background: th.headerBg, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${SP.md}px`, borderBottom: `1px solid ${th.border}` }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 600, color: th.gold, letterSpacing: '0.04em' }}>{t.appName}</span>
        <div style={{ display: 'flex', gap: SP.sm }}>
          <button onClick={onToggleLang} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
          <button onClick={onToggleTheme} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            {themeKey === 'dark' ? t.lightMode : t.darkMode}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: hideTabBar ? 0 : 72, minHeight: 'calc(100vh - 52px)' }}>
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
