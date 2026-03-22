// CaskSense Apple — LabsAppleApp (Root) — Phase A
// Neu: Auto-Resume, Heartbeat, vollständige Session-Persistenz
import React, { useState, useEffect, useRef } from 'react'
import { THEMES } from './theme/tokens'
import { I18N } from './theme/i18n'
import { LabsAppleLayout } from './LabsAppleLayout'
import { AuthScreen, VerificationBanner } from './screens/auth/AuthScreen'
import { TastingsHub, JoinFlow } from './screens/tastings/TastingsHub'
import { SoloFlow } from './screens/solo/SoloFlow'
import { HostWizard } from './screens/host/HostWizard'
import { HostDashboard } from './screens/host/HostDashboard'
import { HostCockpit } from './screens/host/HostCockpit'
import { PrintableSheets } from './screens/host/PrintableSheets'
import { PaperScan } from './screens/host/PaperScan'
import { TastingDetail } from './screens/tastings/TastingDetail'
import { TastingRecap } from './screens/results/TastingRecap'
import { SessionNarrative } from './screens/results/SessionNarrative'
import { AdminScreen } from './screens/admin/AdminScreen'
import { MakingOf } from './screens/entdecken/MakingOf'
import { LiveTasting } from './screens/live/LiveTasting'
import { ResultsScreen } from './screens/results/ResultsScreen'
import { MeineWeltScreen } from './screens/meinewelt/MeineWeltScreen'
import { EntdeckenScreen, CircleScreen } from './screens/entdecken/EntdeckenCircle'
import './theme/animations.css'
import { LabsErrorBoundary } from './LabsErrorBoundary'

type TabId = 'tastings' | 'entdecken' | 'meinewelt' | 'circle'
type SubScreen = null | 'join' | 'solo' | 'host' | 'host-dashboard' | 'live' | 'results' | 'tasting-detail' | 'host-cockpit' | 'print-sheets' | 'paper-scan' | 'recap' | 'narrative' | 'admin' | 'making-of' | 'tasting-detail' | 'paper-scan' | 'cockpit' | 'print-sheets' | 'recap' | 'admin'

const SESSION_KEY = 'casksense_apple_session'

export const LabsAppleApp: React.FC = () => {
  const [themeKey, setThemeKey]       = useState<'dark' | 'light'>(() => (localStorage.getItem('casksense_theme') as any) || 'dark')
  const [lang, setLang]               = useState<'de' | 'en'>(() => (localStorage.getItem('casksense_lang') as any) || 'de')
  const [activeTab, setActiveTab]     = useState<TabId>('tastings')
  const [subScreen, setSubScreen]     = useState<SubScreen>(null)
  const [session, setSession]         = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeTastingId, setActiveTastingId]         = useState<string | null>(null)
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null)
  const [activeIsHost, setActiveIsHost]               = useState(false)
  const [isHostForActive, setIsHostForActive]         = useState(false)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const th = THEMES[themeKey]
  // Expose nav for layout admin link
  React.useEffect(() => { (window as any).__casksenseNav = (screen: string) => setSubScreen(screen as any) }, [setSubScreen])
  const t  = I18N[lang]

  useEffect(() => {
    const tryAutoResume = async () => {
      const cached = localStorage.getItem(SESSION_KEY)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed?.id) {
            const res = await fetch(`/api/participants/${parsed.id}`, { headers: { 'x-participant-id': parsed.id } })
            if (res.ok) {
              const fresh = await res.json()
              setSession(fresh)
              localStorage.setItem(SESSION_KEY, JSON.stringify({ id: fresh.id, name: fresh.name, email: fresh.email }))
              setAuthChecked(true)
              return
            }
          }
        } catch { }
        localStorage.removeItem(SESSION_KEY)
      }
      setAuthChecked(true)
    }
    tryAutoResume()
  }, [])

  // ── Heartbeat alle 5 Min ──────────────────────────────────────────────
  useEffect(() => {
    if (!session?.id) { if (heartbeatRef.current) clearInterval(heartbeatRef.current); return }
    const beat = () => fetch('/api/heartbeat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-participant-id': session.id }, body: JSON.stringify({ participantId: session.id }) }).catch(() => {})
    beat()
    heartbeatRef.current = setInterval(beat, 5 * 60 * 1000)
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current) }
  }, [session?.id])

  // ── Theme + Lang Persistenz ───────────────────────────────────────────
  const toggleTheme = () => setThemeKey(k => { const n = k === 'dark' ? 'light' : 'dark'; localStorage.setItem('casksense_theme', n); return n })
  const toggleLang  = () => setLang(l => { const n = l === 'de' ? 'en' : 'de'; localStorage.setItem('casksense_lang', n); return n })

  const handleLogin = (data: any) => {
    setSession(data)
    if (data?.id) localStorage.setItem(SESSION_KEY, JSON.stringify({ id: data.id, name: data.name, email: data.email }))
  }

  const handleLogout = () => {
    setSession(null)
    localStorage.removeItem(SESSION_KEY)
    setSubScreen(null)
    setActiveTab('tastings')
  }

  const goBack = () => setSubScreen(null)
  const enterLive = (tastingId: string, participantId: string, isHost = false) => {
    setActiveTastingId(tastingId); setActiveParticipantId(participantId); setIsHostForActive(isHost); setSubScreen('live')
  }
  const openDetail = (tastingId: string, isHost = false) => {
    setActiveTastingId(tastingId); setIsHostForActive(isHost); setSubScreen('tasting-detail')
  }

  // Loading splash
  if (!authChecked) return (
    <div style={{ minHeight: '100dvh', background: THEMES.dark.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 26, border: `2px solid ${THEMES.dark.gold}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, color: THEMES.dark.gold, letterSpacing: '0.04em' }}>CaskSense</div>
    </div>
  )

  // Auth gate
  if (!session) return <AuthScreen th={th} t={t} onLogin={handleLogin} />

  const isGuest      = !session.email
  const isLocal      = session.email?.endsWith('@casksense.local')
  const isVerified   = session.emailVerified
  const withinGrace  = session.createdAt && (Date.now() - new Date(session.createdAt).getTime()) < 24 * 60 * 60 * 1000
  const showVerify   = !isGuest && !isLocal && !isVerified && withinGrace

  const renderContent = () => {
    if (subScreen === 'join')           return <JoinFlow th={th} t={t} onEnterLive={enterLive} onBack={goBack} />
    if (subScreen === 'solo')           return <SoloFlow th={th} t={t} participantId={session?.id || 'solo'} onBack={goBack} />
    if (subScreen === 'tasting-detail' && activeTastingId) return (
      <TastingDetail th={th} t={t} tastingId={activeTastingId} participantId={activeParticipantId || session?.id || ''} isHost={activeIsHost} onBack={goBack} onEnterLive={() => setSubScreen('live')} />
    )
    if (subScreen === 'host-cockpit' && activeTastingId) return (
      <HostCockpit th={th} t={t} tastingId={activeTastingId} participantId={session?.id || ''} onClose={goBack} />
    )
    if (subScreen === 'print-sheets' && activeTastingId) return (
      <PrintableSheets th={th} t={t} tastingId={activeTastingId} participantId={session?.id || ''} onBack={goBack} />
    )
    if (subScreen === 'paper-scan' && activeTastingId) return (
      <PaperScan th={th} t={t} tastingId={activeTastingId} participantId={session?.id || ''} onBack={goBack} />
    )
    if (subScreen === 'recap' && activeTastingId) return (
      <TastingRecap th={th} t={t} tastingId={activeTastingId} participantId={session?.id || ''} onBack={goBack} />
    )
    if (subScreen === 'narrative' && activeTastingId) return (
      <SessionNarrative th={th} t={t} tastingId={activeTastingId} participantId={session?.id || ''} isHost={activeIsHost} lang={lang} onBack={goBack} />
    )
    if (subScreen === 'admin') return <AdminScreen th={th} t={t} participantId={session?.id || ''} onBack={goBack} />
    if (subScreen === 'making-of') return <MakingOf th={th} t={t} participantId={session?.id || ''} onBack={goBack} />
    if (subScreen === 'host')           return <HostWizard th={th} t={t} participantId={session?.id || ''} onBack={goBack} onDone={() => { setSubScreen(null); setActiveTab('tastings') }} />
    if (subScreen === 'host-dashboard') return <HostDashboard th={th} t={t} participantId={session?.id || ''} onBack={goBack} />
    if (subScreen === 'live' && activeTastingId) return (
      <LiveTasting th={th} t={t} tastingId={activeTastingId} participantId={activeParticipantId || session?.id || 'guest'} lang={lang} onResults={() => setSubScreen('results')} />
    )
    if (subScreen === 'results' && activeTastingId) return (
      <ResultsScreen th={th} t={t} tastingId={activeTastingId} participantId={activeParticipantId || session?.id || 'guest'} isHost={session?.isHost || false} onBack={goBack} />
    )
    if (subScreen === 'tasting-detail' && activeTastingId) return (
      <TastingDetail th={th} t={t} tastingId={activeTastingId} participantId={session?.id || ''} isHost={isHostForActive} onBack={goBack} onEnterLive={() => { setSubScreen('live') }} />
    )
    if (subScreen === 'paper-scan' && activeTastingId) return (
      <PaperScan th={th} t={t} tastingId={activeTastingId} participantId={session?.id || ''} onBack={goBack} />
    )
    if (subScreen === 'cockpit' && activeTastingId) return (
      <HostCockpit th={th} t={t} tastingId={activeTastingId} participantId={session?.id || ''} onClose={goBack} />
    )
    if (subScreen === 'print-sheets' && activeTastingId) return (
      <PrintableSheets th={th} t={t} tastingId={activeTastingId} participantId={session?.id || ''} onBack={goBack} />
    )
    if (subScreen === 'recap' && activeTastingId) return (
      <TastingRecap th={th} t={t} tastingId={activeTastingId} participantId={session?.id || ''} onBack={goBack} />
    )
    if (subScreen === 'admin') return (
      <AdminScreen th={th} t={t} participantId={session?.id || ''} onBack={goBack} />
    )
    switch (activeTab) {
      case 'tastings':  return <TastingsHub th={th} t={t} session={session}
        onJoin={() => setSubScreen('join')}
        onSolo={() => setSubScreen('solo')}
        onHost={() => setSubScreen('host')}
        onHostDashboard={() => setSubScreen('host-dashboard')}
        onTastingDetail={(id, isHost) => { setActiveTastingId(id); setActiveIsHost(isHost); setSubScreen('tasting-detail') }}
        onCockpit={(id) => { setActiveTastingId(id); setSubScreen('host-cockpit') }}
        onPrintSheets={(id) => { setActiveTastingId(id); setSubScreen('print-sheets') }}
        onPaperScan={(id) => { setActiveTastingId(id); setSubScreen('paper-scan') }}
        onResults={(id) => { setActiveTastingId(id); setSubScreen('results') }}
      />
      case 'entdecken': return <EntdeckenScreen th={th} t={t} participantId={session?.id || ''} lang={lang} />
      case 'meinewelt': return <MeineWeltScreen th={th} t={t} participantId={session?.id || ''} lang={lang} />
      case 'circle':    return <CircleScreen th={th} t={t} participantId={session?.id || ''} />
      default:          return null
    }
  }

  return (
    <LabsErrorBoundary th={th}>
    <LabsAppleLayout th={th} t={t} themeKey={themeKey} lang={lang} activeTab={activeTab} subScreen={subScreen} session={session} onTabChange={(tab) => { setSubScreen(null); setActiveTab(tab); }} onToggleTheme={toggleTheme} onToggleLang={toggleLang} onLogout={handleLogout}>
      {showVerify && <VerificationBanner th={th} t={t} email={session.email} />}
      {renderContent()}
    </LabsAppleLayout>
    </LabsErrorBoundary>
  )
}

export default LabsAppleApp
