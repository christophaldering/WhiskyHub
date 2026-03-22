// CaskSense Apple — LabsAppleApp (Root) v2 — mit Auth-Gate
import React, { useState, useEffect } from 'react'
import { THEMES } from './theme/tokens'
import { I18N } from './theme/i18n'
import { LabsAppleLayout } from './LabsAppleLayout'
import { AuthScreen, VerificationBanner } from './screens/auth/AuthScreen'
import { TastingsHub, JoinFlow } from './screens/tastings/TastingsHub'
import { SoloFlow } from './screens/solo/SoloFlow'
import { HostWizard } from './screens/host/HostWizard'
import { HostDashboard } from './screens/host/HostDashboard'
import { LiveTasting } from './screens/live/LiveTasting'
import { ResultsScreen } from './screens/results/ResultsScreen'
import { MeineWeltScreen } from './screens/meinewelt/MeineWeltScreen'
import { EntdeckenScreen, CircleScreen } from './screens/entdecken/EntdeckenCircle'
import './theme/animations.css'

type TabId = 'tastings' | 'entdecken' | 'meinewelt' | 'circle'
type SubScreen = null | 'join' | 'solo' | 'host' | 'host-dashboard' | 'live' | 'results'

export const LabsAppleApp: React.FC = () => {
  const [themeKey, setThemeKey]       = useState<'dark' | 'light'>('dark')
  const [lang, setLang]               = useState<'de' | 'en'>('de')
  const [activeTab, setActiveTab]     = useState<TabId>('tastings')
  const [subScreen, setSubScreen]     = useState<SubScreen>(null)
  const [session, setSession]         = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTastingId, setActiveTastingId]         = useState<string | null>(null)
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null)

  const th = THEMES[themeKey]
  const t  = I18N[lang]

  // Check session on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.id) setSession(data) })
      .catch(() => {})
      .finally(() => setAuthChecked(true))
  }, [])

  const handleLogin = (data: any) => {
    setSession(data)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch { }
    setSession(null)
    setSubScreen(null)
    setActiveTab('tastings')
  }

  const goBack = () => setSubScreen(null)

  const enterLive = (tastingId: string, participantId: string) => {
    setActiveTastingId(tastingId)
    setActiveParticipantId(participantId)
    setSubScreen('live')
  }

  // Loading
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100dvh', background: THEMES.dark.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, border: `2px solid ${THEMES.dark.gold}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  // Auth gate
  if (!session) {
    return <AuthScreen th={th} t={t} onLogin={handleLogin} />
  }

  // Email verification banner (grace period: within 24h, not guest, not @casksense.local)
  const isGuest = !session.email
  const isLocal = session.email?.endsWith('@casksense.local')
  const isVerified = session.emailVerified
  const withinGrace = session.createdAt && (Date.now() - new Date(session.createdAt).getTime()) < 24 * 60 * 60 * 1000
  const showVerifyBanner = !isGuest && !isLocal && !isVerified && withinGrace

  const renderContent = () => {
    if (subScreen === 'join')           return <JoinFlow th={th} t={t} onEnterLive={enterLive} onBack={goBack} />
    if (subScreen === 'solo')           return <SoloFlow th={th} t={t} participantId={session?.id || 'solo'} onBack={goBack} />
    if (subScreen === 'host')           return <HostWizard th={th} t={t} participantId={session?.id || ''} onBack={goBack} onDone={() => { setSubScreen(null); setActiveTab('tastings') }} />
    if (subScreen === 'host-dashboard') return <HostDashboard th={th} t={t} participantId={session?.id || ''} onBack={goBack} />
    if (subScreen === 'live' && activeTastingId) return (
      <LiveTasting th={th} t={t} tastingId={activeTastingId} participantId={activeParticipantId || session?.id || 'guest'} lang={lang} onResults={() => setSubScreen('results')} />
    )
    if (subScreen === 'results' && activeTastingId) return (
      <ResultsScreen th={th} t={t} tastingId={activeTastingId} participantId={activeParticipantId || session?.id || 'guest'} isHost={session?.isHost || false} />
    )

    switch (activeTab) {
      case 'tastings':  return <TastingsHub th={th} t={t} session={session} onJoin={() => setSubScreen('join')} onSolo={() => setSubScreen('solo')} onHost={() => setSubScreen('host')} onHostDashboard={() => setSubScreen('host-dashboard')} />
      case 'entdecken': return <EntdeckenScreen th={th} t={t} participantId={session?.id || ''} lang={lang} />
      case 'meinewelt': return <MeineWeltScreen th={th} t={t} participantId={session?.id || ''} lang={lang} />
      case 'circle':    return <CircleScreen th={th} t={t} participantId={session?.id || ''} />
      default:          return null
    }
  }

  return (
    <LabsAppleLayout
      th={th} t={t}
      themeKey={themeKey} lang={lang}
      activeTab={activeTab} subScreen={subScreen}
      session={session}
      onTabChange={setActiveTab}
      onToggleTheme={() => setThemeKey(k => k === 'dark' ? 'light' : 'dark')}
      onToggleLang={() => setLang(l => l === 'de' ? 'en' : 'de')}
      onLogout={handleLogout}
    >
      {showVerifyBanner && <VerificationBanner th={th} t={t} email={session.email} />}
      {renderContent()}
    </LabsAppleLayout>
  )
}

export default LabsAppleApp
