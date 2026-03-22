// CaskSense Apple — AuthScreen
// Login · Registrieren · Gast-Modus
// APIs: POST /api/participants/login, POST /api/participants
import React, { useState } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th:       ThemeTokens
  t:        Translations
  onLogin:  (session: any) => void
}

type AuthMode = 'welcome' | 'login' | 'register' | 'guest'

const Field: React.FC<{ label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; th: ThemeTokens; autoFocus?: boolean }> = ({ label, type = 'text', value, onChange, placeholder, th, autoFocus }) => (
  <div style={{ marginBottom: SP.md }}>
    <label style={{ display: 'block', fontSize: 11, color: th.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{ width: '100%', minHeight: 52, borderRadius: 14, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 17, fontFamily: 'DM Sans, sans-serif', padding: '0 16px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms' }}
      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = th.gold }}
      onBlur={e => { (e.target as HTMLInputElement).style.borderColor = th.border }}
    />
  </div>
)

const ErrorBanner: React.FC<{ msg: string; th: ThemeTokens }> = ({ msg, th }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 12, background: 'rgba(200,60,60,0.12)', border: '1px solid rgba(200,60,60,0.25)', marginBottom: SP.md }}>
    <Icon.AlertTriangle color="#e06060" size={16} />
    <span style={{ fontSize: 14, color: '#e06060', lineHeight: 1.4 }}>{msg}</span>
  </div>
)

const LoginView: React.FC<{ th: ThemeTokens; t: Translations; onSuccess: (s: any) => void; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSuccess, onSwitch }) => {
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const tx = t as any

  const submit = async () => {
    if (!email || !pass) { setError(tx.authMissingFields); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/participants/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, pin: pass }) })
      if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.message || data.error || tx.authLoginError); return }
      const data = await res.json()
      onSuccess(data)
    } catch { setError(tx.authNetworkError) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{tx.authLoginTitle}</h2>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{tx.authLoginSub}</p>
      {error && <ErrorBanner msg={error} th={th} />}
      <Field label={tx.authEmail} type="email" value={email} onChange={setEmail} placeholder="name@example.com" th={th} autoFocus />
      <Field label={tx.authPassword} type="password" value={pass} onChange={setPass} placeholder="••••••••" th={th} />
      <button data-testid="button-login" onClick={submit} disabled={loading || !email || !pass} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: loading ? 'default' : 'pointer', background: !email || !pass ? th.bgCard : `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: !email || !pass ? th.faint : '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 150ms' }}>
        {loading ? <Icon.Spinner color={th.faint} size={20} /> : tx.authLoginBtn}
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: SP.md }}>
        <button data-testid="link-to-register" onClick={() => onSwitch('register')} style={{ background: 'none', border: 'none', color: th.phases.nose.accent, cursor: 'pointer', fontSize: 14, minHeight: 44, padding: 0 }}>{tx.authToRegister}</button>
        <button data-testid="link-to-guest" onClick={() => onSwitch('guest')} style={{ background: 'none', border: 'none', color: th.muted, cursor: 'pointer', fontSize: 14, minHeight: 44, padding: 0 }}>{tx.authGuestLink}</button>
      </div>
    </div>
  )
}

const RegisterView: React.FC<{ th: ThemeTokens; t: Translations; onSuccess: (s: any) => void; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSuccess, onSwitch }) => {
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [pass2, setPass2]   = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const tx = t as any

  const submit = async () => {
    if (!name || !email || !pass) { setError(tx.authMissingFields); return }
    if (pass !== pass2) { setError(tx.authPasswordMismatch); return }
    if (pass.length < 4) { setError(tx.authPasswordTooShort); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/participants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, pin: pass }) })
      if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.message || data.error || tx.authRegisterError); return }
      const data = await res.json()
      onSuccess(data)
    } catch { setError(tx.authNetworkError) }
    finally { setLoading(false) }
  }

  const ready = name && email && pass && pass2

  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{tx.authRegisterTitle}</h2>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{tx.authRegisterSub}</p>
      {error && <ErrorBanner msg={error} th={th} />}
      <Field label={tx.authName} value={name} onChange={setName} placeholder="Dein Name" th={th} autoFocus />
      <Field label={tx.authEmail} type="email" value={email} onChange={setEmail} placeholder="name@example.com" th={th} />
      <Field label={tx.authPassword} type="password" value={pass} onChange={setPass} placeholder="min. 4 Zeichen" th={th} />
      <Field label={tx.authPasswordConfirm} type="password" value={pass2} onChange={setPass2} placeholder="Wiederholen" th={th} />
      <button data-testid="button-register" onClick={submit} disabled={loading || !ready} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: !ready ? 'default' : 'pointer', background: !ready ? th.bgCard : `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: !ready ? th.faint : '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 150ms' }}>
        {loading ? <Icon.Spinner color={th.faint} size={20} /> : tx.authRegisterBtn}
      </button>
      <div style={{ marginTop: SP.md, textAlign: 'center' }}>
        <button data-testid="link-to-login" onClick={() => onSwitch('login')} style={{ background: 'none', border: 'none', color: th.phases.nose.accent, cursor: 'pointer', fontSize: 14, minHeight: 44 }}>{tx.authToLogin}</button>
      </div>
    </div>
  )
}

const GuestView: React.FC<{ th: ThemeTokens; t: Translations; onSuccess: (s: any) => void; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSuccess, onSwitch }) => {
  const [name, setName]   = useState('')
  const [mode, setMode]   = useState<'standard' | 'ultra'>('standard')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const tx = t as any

  const submit = async () => {
    if (!name.trim()) { setError(tx.authNameRequired); return }
    setLoading(true); setError('')
    try {
      const body: any = { name: name.trim() }
      const res = await fetch('/api/participants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.message || tx.authGuestError); return }
      const data = await res.json()
      onSuccess(data)
    } catch { setError(tx.authNetworkError) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{tx.authGuestTitle}</h2>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{tx.authGuestSub}</p>
      {error && <ErrorBanner msg={error} th={th} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
        {[
          { id: 'standard' as const, label: tx.authGuestStandard, sub: tx.authGuestStandardDesc },
          { id: 'ultra' as const, label: tx.authGuestUltra, sub: tx.authGuestUltraDesc },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ minHeight: 80, borderRadius: 16, cursor: 'pointer', border: `1px solid ${mode === m.id ? th.gold : th.border}`, background: mode === m.id ? `${th.gold}10` : th.bgCard, padding: SP.sm, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, textAlign: 'left', transition: 'all 150ms' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: mode === m.id ? th.gold : th.text }}>{m.label}</div>
            <div style={{ fontSize: 11, color: th.faint, lineHeight: 1.4 }}>{m.sub}</div>
          </button>
        ))}
      </div>

      <Field label={tx.authName} value={name} onChange={setName} placeholder={tx.authNamePH} th={th} autoFocus />
      <button data-testid="button-guest" onClick={submit} disabled={loading || !name.trim()} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: !name.trim() ? 'default' : 'pointer', background: !name.trim() ? th.bgCard : `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: !name.trim() ? th.faint : '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <Icon.Spinner color={th.faint} size={20} /> : tx.authGuestBtn}
      </button>
      <div style={{ marginTop: SP.md, textAlign: 'center' }}>
        <button data-testid="link-to-login-from-guest" onClick={() => onSwitch('login')} style={{ background: 'none', border: 'none', color: th.phases.nose.accent, cursor: 'pointer', fontSize: 14, minHeight: 44 }}>{tx.authToLogin}</button>
      </div>
    </div>
  )
}

const WelcomeView: React.FC<{ th: ThemeTokens; t: Translations; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSwitch }) => {
  const tx = t as any
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 22, background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: `0 auto ${SP.lg}px` }}>
        <Icon.Whisky color="#1a0f00" size={36} />
      </div>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>CaskSense</h1>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontStyle: 'italic', color: th.muted, margin: `0 0 ${SP.xxxl}px` }}>{tx.authWelcomeSub}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
        <button data-testid="button-go-login" onClick={() => onSwitch('login')} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
          {tx.authLoginBtn}
        </button>
        <button data-testid="button-go-register" onClick={() => onSwitch('register')} style={{ width: '100%', height: 56, borderRadius: 16, border: `1px solid ${th.gold}`, background: 'transparent', cursor: 'pointer', color: th.gold, fontSize: 17, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
          {tx.authRegisterBtn}
        </button>
        <button data-testid="button-go-guest" onClick={() => onSwitch('guest')} style={{ width: '100%', height: 52, borderRadius: 16, border: `1px solid ${th.border}`, background: 'transparent', cursor: 'pointer', color: th.muted, fontSize: 15, fontFamily: 'DM Sans, sans-serif' }}>
          {tx.authGuestBtn}
        </button>
      </div>
    </div>
  )
}

export const VerificationBanner: React.FC<{ th: ThemeTokens; t: Translations; email: string }> = ({ th, t, email }) => {
  const tx = t as any
  return (
    <div style={{ background: `${th.gold}15`, border: `1px solid ${th.gold}44`, borderRadius: 14, padding: `${SP.sm}px ${SP.md}px`, margin: `${SP.sm}px ${SP.md}px`, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon.Mail color={th.gold} size={16} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: th.gold }}>{tx.authVerifyReminder}</div>
        <div style={{ fontSize: 11, color: th.muted }}>{email}</div>
      </div>
    </div>
  )
}

export const AuthScreen: React.FC<Props> = ({ th, t, onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('welcome')

  const containerStyle: React.CSSProperties = {
    minHeight: '100dvh',
    background: th.bg,
    color: th.text,
    fontFamily: 'DM Sans, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: `${SP.xl}px ${SP.lg}px`,
    overflowY: 'auto',
  }

  return (
    <div style={containerStyle}>
      {mode !== 'welcome' && (
        <button onClick={() => setMode('welcome')} style={{ position: 'absolute', top: SP.lg, left: SP.md, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
      )}

      <div style={{ maxWidth: 400, width: '100%', margin: '0 auto', animation: 'fadeUp 300ms ease' }}>
        {mode === 'welcome'  && <WelcomeView th={th} t={t} onSwitch={setMode} />}
        {mode === 'login'    && <LoginView th={th} t={t} onSuccess={onLogin} onSwitch={setMode} />}
        {mode === 'register' && <RegisterView th={th} t={t} onSuccess={onLogin} onSwitch={setMode} />}
        {mode === 'guest'    && <GuestView th={th} t={t} onSuccess={onLogin} onSwitch={setMode} />}
      </div>

      <div style={{ textAlign: 'center', marginTop: SP.xl, fontSize: 11, color: th.faint }}>
        CaskSense · Dein Gaumen. Deine Geschichte.
      </div>
    </div>
  )
}
