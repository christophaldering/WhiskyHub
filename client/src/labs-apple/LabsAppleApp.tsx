// CaskSense Apple — LabsAppleApp (Root)
import React, { useState, useEffect } from 'react'
import { THEMES, SP } from './theme/tokens'
import { I18N } from './theme/i18n'
import { LabsAppleLayout } from './LabsAppleLayout'
import { TastingsHub, JoinFlow } from './screens/tastings/TastingsHub'
import { SoloFlow } from './screens/solo/SoloFlow'
import { HostWizard } from './screens/host/HostWizard'
import { LiveTasting } from './screens/live/LiveTasting'
import { ResultsScreen } from './screens/results/ResultsScreen'
import { MeineWeltScreen } from './screens/meinewelt/MeineWeltScreen'
import { EntdeckenScreen, CircleScreen } from './screens/entdecken/EntdeckenCircle'
import './theme/animations.css'

type TabId = 'tastings' | 'entdecken' | 'meinewelt' | 'circle'
type SubScreen = null | 'join' | 'solo' | 'host' | 'live' | 'results'

const AuthModal: React.FC<{ th: any; t: any; onSuccess: (s: any) => void; onLogout: () => void; session: any; onClose: () => void }> = ({ th, t, onSuccess, onLogout, session, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputStyle: React.CSSProperties = { width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await fetch('/api/participants/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), pin }) })
        if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.message || t.authError); return }
        const data = await res.json()
        onSuccess(data)
      } else {
        const res = await fetch('/api/participants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.trim(), pin }) })
        if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.message || t.authError); return }
        const data = await res.json()
        onSuccess(data)
      }
    } catch { setError(t.authError) } finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div style={{ width: '90%', maxWidth: 380, background: th.cardBg, borderRadius: 20, padding: SP.lg, border: `1px solid ${th.border}` }} onClick={e => e.stopPropagation()}>
        {session ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: SP.md }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(196,160,80,0.2)', border: '2px solid rgba(196,160,80,0.5)', color: th.gold, fontSize: 22, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', marginBottom: 12 }}>
                {(session.name ?? 'C').charAt(0).toUpperCase()}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Playfair Display, serif', color: th.text }}>{session.name}</div>
              {session.email && <div style={{ fontSize: 13, color: th.muted, marginTop: 4 }}>{session.email}</div>}
            </div>
            <button onClick={() => { onLogout(); onClose() }} data-testid="apple-logout-btn" style={{ width: '100%', minHeight: 44, borderRadius: 12, background: 'none', border: `1px solid ${th.border}`, color: th.muted, fontSize: 15, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', marginBottom: 8 }}>
              {t.authLogout}
            </button>
            <button onClick={onClose} style={{ width: '100%', minHeight: 44, borderRadius: 12, background: 'none', border: 'none', color: th.faint, fontSize: 14, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
              {t.authClose}
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 600, color: th.gold, margin: `0 0 ${SP.md}px`, textAlign: 'center' }}>
              {mode === 'login' ? t.authLogin : t.authRegister}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
              {mode === 'register' && (
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t.authNamePH} style={inputStyle} data-testid="apple-auth-name" />
              )}
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t.authEmailPH} style={inputStyle} data-testid="apple-auth-email" />
              <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder={t.authPinPH} style={inputStyle} data-testid="apple-auth-pin" />
              {error && <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{error}</div>}
              <button onClick={submit} disabled={loading || !email.trim() || !pin} data-testid="apple-auth-submit" style={{ width: '100%', minHeight: 48, borderRadius: 14, background: `linear-gradient(135deg, ${th.gold}, #a88734)`, border: 'none', color: '#1a1a1a', fontSize: 16, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', opacity: loading || !email.trim() || !pin ? 0.5 : 1 }}>
                {loading ? '...' : t.authSubmit}
              </button>
            </div>
            <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }} style={{ width: '100%', background: 'none', border: 'none', color: th.gold, fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', marginTop: SP.sm, padding: '8px 0' }} data-testid="apple-auth-switch">
              {mode === 'login' ? t.authSwitchRegister : t.authSwitchLogin}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export const LabsAppleApp: React.FC = () => {
  const [themeKey, setThemeKey]   = useState<'dark' | 'light'>('dark')
  const [lang, setLang]           = useState<'de' | 'en'>('de')
  const [activeTab, setActiveTab] = useState<TabId>('tastings')
  const [subScreen, setSubScreen] = useState<SubScreen>(null)
  const [session, setSession]     = useState<any>(null)
  const [authOpen, setAuthOpen]   = useState(false)
  const [activeTastingId, setActiveTastingId] = useState<string | null>(null)
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null)

  const th = THEMES[themeKey]
  const t  = I18N[lang]

  useEffect(() => {
    const saved = localStorage.getItem('casksense-apple-session')
    if (saved) {
      try { setSession(JSON.parse(saved)) } catch {}
    }
  }, [])

  const handleLogin = (data: any) => {
    setSession(data)
    localStorage.setItem('casksense-apple-session', JSON.stringify(data))
    setAuthOpen(false)
  }

  const handleLogout = () => {
    setSession(null)
    localStorage.removeItem('casksense-apple-session')
  }

  const goBack = () => setSubScreen(null)

  const enterLive = (tastingId: string, participantId: string) => {
    setActiveTastingId(tastingId)
    setActiveParticipantId(participantId)
    setSubScreen('live')
  }

  const renderContent = () => {
    if (subScreen === 'join')    return <JoinFlow th={th} t={t} onEnterLive={enterLive} onBack={goBack} />
    if (subScreen === 'solo')    return <SoloFlow th={th} t={t} participantId={session?.id || 'solo'} onBack={goBack} />
    if (subScreen === 'host')    return <HostWizard th={th} t={t} participantId={session?.id || 'host'} onBack={goBack} onDone={() => { setSubScreen(null); setActiveTab('tastings') }} />
    if (subScreen === 'live' && activeTastingId) return (
      <LiveTasting th={th} t={t} tastingId={activeTastingId} participantId={activeParticipantId || session?.id || 'guest'}
        onResults={() => setSubScreen('results')} />
    )
    if (subScreen === 'results' && activeTastingId) return (
      <ResultsScreen th={th} t={t} tastingId={activeTastingId} participantId={activeParticipantId || session?.id || 'guest'} isHost={session?.isHost || false} />
    )

    switch (activeTab) {
      case 'tastings':  return <TastingsHub th={th} t={t} session={session} onJoin={() => setSubScreen('join')} onSolo={() => setSubScreen('solo')} onHost={() => setSubScreen('host')} />
      case 'entdecken': return <EntdeckenScreen th={th} t={t} participantId={session?.id || ''} />
      case 'meinewelt': return <MeineWeltScreen th={th} t={t} participantId={session?.id || ''} />
      case 'circle':    return <CircleScreen th={th} t={t} participantId={session?.id || ''} />
      default:          return null
    }
  }

  return (
    <>
      <LabsAppleLayout
        th={th} t={t}
        themeKey={themeKey} lang={lang}
        activeTab={activeTab} subScreen={subScreen}
        session={session}
        onTabChange={setActiveTab}
        onToggleTheme={() => setThemeKey(k => k === 'dark' ? 'light' : 'dark')}
        onToggleLang={() => setLang(l => l === 'de' ? 'en' : 'de')}
        onProfileClick={() => setAuthOpen(true)}
      >
        {renderContent()}
      </LabsAppleLayout>
      {authOpen && <AuthModal th={th} t={t} session={session} onSuccess={handleLogin} onLogout={handleLogout} onClose={() => setAuthOpen(false)} />}
    </>
  )
}

export default LabsAppleApp
