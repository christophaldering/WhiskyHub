// CaskSense Apple — AuthScreen
// Login / Registrieren / Gast-Modus / PIN vergessen / E-Mail-Verifizierung / Consent Gate / Blocked
// APIs: POST /api/participants/login, POST /api/participants, POST /api/participants/forgot-pin, POST /api/participants/reset-pin
import React, { useState } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'
import { participantApi } from '../../../lib/api'

interface Props {
  th:       ThemeTokens
  t:        Translations
  onLogin:  (session: any) => void
}

type AuthMode = 'welcome' | 'login' | 'register' | 'guest' | 'forgotPin' | 'forgotPinVerify' | 'forgotPinDone' | 'verify' | 'blocked' | 'consentGate'

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement>) => {
  setTimeout(() => {
    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 350)
}

const PasswordField: React.FC<{
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  th: ThemeTokens; show: boolean; onToggle: () => void; autoFocus?: boolean;
  testId?: string; toggleTestId?: string; onKeyDown?: (e: React.KeyboardEvent) => void
}> = ({ label, value, onChange, placeholder, th, show, onToggle, autoFocus, testId, toggleTestId, onKeyDown }) => (
  <div style={{ marginBottom: SP.md }}>
    <label style={{ display: 'block', fontSize: 11, color: th.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        data-testid={testId}
        onKeyDown={onKeyDown}
        style={{ width: '100%', minHeight: 52, borderRadius: 14, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 17, fontFamily: 'DM Sans, sans-serif', padding: '0 44px 0 16px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms' }}
        onFocus={e => { (e.target as HTMLInputElement).style.borderColor = th.gold; scrollInputIntoView(e) }}
        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = th.border }}
      />
      <button
        type="button"
        onClick={onToggle}
        data-testid={toggleTestId}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 6, minHeight: 44, display: 'flex', alignItems: 'center' }}
      >
        {show ? <Icon.EyeOff color={th.muted} size={18} /> : <Icon.Eye color={th.muted} size={18} />}
      </button>
    </div>
  </div>
)

const Field: React.FC<{ label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; th: ThemeTokens; autoFocus?: boolean; testId?: string; onKeyDown?: (e: React.KeyboardEvent) => void; inputMode?: string; maxLength?: number; style?: React.CSSProperties }> = ({ label, type = 'text', value, onChange, placeholder, th, autoFocus, testId, onKeyDown, inputMode, maxLength, style }) => (
  <div style={{ marginBottom: SP.md }}>
    <label style={{ display: 'block', fontSize: 11, color: th.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      data-testid={testId}
      onKeyDown={onKeyDown}
      inputMode={inputMode as any}
      maxLength={maxLength}
      style={{ width: '100%', minHeight: 52, borderRadius: 14, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 17, fontFamily: 'DM Sans, sans-serif', padding: '0 16px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms', ...style }}
      onFocus={e => { (e.target as HTMLInputElement).style.borderColor = th.gold; scrollInputIntoView(e) }}
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

const PrimaryButton: React.FC<{ onClick: () => void; disabled?: boolean; loading?: boolean; loadingText?: string; text: string; th: ThemeTokens; testId?: string }> = ({ onClick, disabled, loading, loadingText, text, th, testId }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    disabled={disabled || loading}
    style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: disabled || loading ? 'default' : 'pointer', background: disabled ? th.bgCard : `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: disabled ? th.faint : '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 150ms' }}
  >
    {loading ? <><Icon.Spinner color={th.faint} size={20} />{loadingText}</> : text}
  </button>
)

const Checkbox: React.FC<{ checked: boolean; onChange: (v: boolean) => void; th: ThemeTokens; testId?: string; children: React.ReactNode }> = ({ checked, onChange, th, testId, children }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: SP.md }}>
    <button
      type="button"
      data-testid={testId}
      onClick={() => onChange(!checked)}
      style={{ width: 22, height: 22, minWidth: 22, borderRadius: 6, border: `1.5px solid ${checked ? th.gold : th.border}`, background: checked ? `${th.gold}20` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1, transition: 'all 150ms' }}
    >
      {checked && <Icon.Check color={th.gold} size={14} />}
    </button>
    <div style={{ flex: 1, fontSize: 13, color: th.muted, lineHeight: 1.5 }}>{children}</div>
  </div>
)

const LoginView: React.FC<{ th: ThemeTokens; t: Translations; onSuccess: (s: any) => void; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSuccess, onSwitch }) => {
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const tx = t as any

  const submit = async () => {
    if (!email || !pass) { setError(tx.authMissingFields); return }
    if (!validateEmail(email.trim())) { setError(tx.authInvalidEmail); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/participants/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), pin: pass }) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.code === 'EMAIL_VERIFICATION_EXPIRED' || (data.message && data.message.includes('nicht rechtzeitig bestätigt'))) {
          onSwitch('blocked')
          sessionStorage.setItem('auth_blocked_email', data.adminEmail || '')
          sessionStorage.setItem('auth_blocked_pid', data.participantId || '')
          return
        }
        setError(data.message || data.error || tx.authLoginError); return
      }
      const data = await res.json()
      if (!data.privacyConsentAt) {
        sessionStorage.setItem('auth_pending_login', JSON.stringify(data))
        onSwitch('consentGate')
      } else {
        onSuccess(data)
      }
    } catch { setError(tx.authNetworkError) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{tx.authLoginTitle}</h2>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{tx.authLoginSub}</p>
      {error && <ErrorBanner msg={error} th={th} />}
      <Field label={tx.authEmail} type="email" value={email} onChange={setEmail} placeholder="name@example.com" th={th} autoFocus testId="input-login-email" />
      <PasswordField label={tx.authPassword} value={pass} onChange={setPass} placeholder="********" th={th} show={showPass} onToggle={() => setShowPass(!showPass)} testId="input-login-password" toggleTestId="button-toggle-login-pin" onKeyDown={e => e.key === 'Enter' && submit()} />
      <PrimaryButton testId="button-login" onClick={submit} disabled={!email || !pass} loading={loading} text={tx.authLoginBtn} th={th} />
      <div style={{ marginTop: SP.sm }}>
        <button data-testid="button-forgot-pin" onClick={() => onSwitch('forgotPin')} style={{ background: 'none', border: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, minHeight: 44, padding: 0, textDecoration: 'underline' }}>{tx.authForgotPin}</button>
      </div>
      <p style={{ fontSize: 10, color: th.faint, marginTop: SP.sm, lineHeight: 1.5 }}>
        {tx.authLoginPrivacyNotice}{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: th.phases.nose.accent, textDecoration: 'underline' }} data-testid="link-login-privacy">{tx.authPrivacyLink}</a>
      </p>
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
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [newsletterOptIn, setNewsletterOptIn] = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const tx = t as any

  const submit = async () => {
    if (!name || !email || !pass) { setError(tx.authMissingFields); return }
    if (!validateEmail(email.trim())) { setError(tx.authInvalidEmail); return }
    if (pass !== pass2) { setError(tx.authPasswordMismatch); return }
    if (pass.length < 4) { setError(tx.authPasswordTooShort); return }
    if (!privacyConsent) { setError(tx.authPrivacyConsentRequired); return }
    setLoading(true); setError('')
    try {
      const participant = await participantApi.loginOrCreate(name.trim(), pass, email.trim(), newsletterOptIn, true)
      if (!participant.emailVerified) {
        sessionStorage.setItem('auth_pending_verify', JSON.stringify({ id: participant.id, name: participant.name, role: participant.role, email: participant.email }))
        onSwitch('verify')
      } else {
        onSuccess(participant)
      }
    } catch (e: any) { setError(e.message || tx.authRegisterError) }
    finally { setLoading(false) }
  }

  const ready = name && email && pass && pass2 && privacyConsent

  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{tx.authRegisterTitle}</h2>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{tx.authRegisterSub}</p>
      {error && <ErrorBanner msg={error} th={th} />}
      <Field label={tx.authName} value={name} onChange={setName} placeholder="Dein Name" th={th} autoFocus testId="input-register-name" />
      <Field label={tx.authEmail} type="email" value={email} onChange={setEmail} placeholder="name@example.com" th={th} testId="input-register-email" />
      {email.trim() && (
        <Checkbox checked={newsletterOptIn} onChange={setNewsletterOptIn} th={th} testId="checkbox-newsletter">
          <span style={{ fontWeight: 600 }}>{tx.authNewsletterOptIn}</span>
          <br />
          <span style={{ fontSize: 11, color: th.faint }}>{tx.authNewsletterHint}</span>
        </Checkbox>
      )}
      <PasswordField label={tx.authPassword} value={pass} onChange={setPass} placeholder="min. 4 Zeichen" th={th} show={showPass} onToggle={() => setShowPass(!showPass)} testId="input-register-password" toggleTestId="button-toggle-register-pin" />
      <PasswordField label={tx.authPasswordConfirm} value={pass2} onChange={setPass2} placeholder="Wiederholen" th={th} show={showPass2} onToggle={() => setShowPass2(!showPass2)} testId="input-register-password2" toggleTestId="button-toggle-register-pin2" />
      <Checkbox checked={privacyConsent} onChange={setPrivacyConsent} th={th} testId="checkbox-privacy-consent">
        {tx.authConsentCheckLabel}{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: th.phases.nose.accent, textDecoration: 'underline' }}>{tx.authConsentPrivacyLink}</a>{' '}
        {tx.authConsentAnd}{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: th.phases.nose.accent, textDecoration: 'underline' }}>{tx.authConsentTermsLink}</a>
      </Checkbox>
      <PrimaryButton testId="button-register" onClick={submit} disabled={!ready} loading={loading} text={tx.authRegisterBtn} th={th} />
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

      <Field label={tx.authName} value={name} onChange={setName} placeholder={tx.authNamePH} th={th} autoFocus testId="input-guest-name" />
      <PrimaryButton testId="button-guest" onClick={submit} disabled={!name.trim()} loading={loading} text={tx.authGuestBtn} th={th} />
      <div style={{ marginTop: SP.md, textAlign: 'center' }}>
        <button data-testid="link-to-login-from-guest" onClick={() => onSwitch('login')} style={{ background: 'none', border: 'none', color: th.phases.nose.accent, cursor: 'pointer', fontSize: 14, minHeight: 44 }}>{tx.authToLogin}</button>
      </div>
    </div>
  )
}

const ForgotPinView: React.FC<{ th: ThemeTokens; t: Translations; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSwitch }) => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const tx = t as any

  const submit = async () => {
    if (!email.trim()) { setError(tx.authMissingFields); return }
    if (!validateEmail(email.trim())) { setError(tx.authInvalidEmail); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/participants/forgot-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) })
      const data = await res.json().catch(() => ({ message: 'Request failed' }))
      if (!res.ok) throw new Error(data.message || 'Failed')
      sessionStorage.setItem('auth_reset_pid', data.participantId)
      onSwitch('forgotPinVerify')
    } catch (e: any) { setError(e.message || 'Failed to send reset code') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{tx.authForgotPinTitle}</h2>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{tx.authForgotPinSub}</p>
      {error && <ErrorBanner msg={error} th={th} />}
      <Field label={tx.authEmail} type="email" value={email} onChange={setEmail} placeholder="name@example.com" th={th} autoFocus testId="input-reset-email" onKeyDown={e => e.key === 'Enter' && submit()} />
      <PrimaryButton testId="button-send-reset-code" onClick={submit} disabled={!email.trim()} loading={loading} loadingText={tx.authForgotPinSending} text={tx.authForgotPinSend} th={th} />
    </div>
  )
}

const ForgotPinVerifyView: React.FC<{ th: ThemeTokens; t: Translations; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSwitch }) => {
  const [code, setCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [showNewPin, setShowNewPin] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const tx = t as any

  const submit = async () => {
    if (!code.trim() || !newPin.trim()) { setError(tx.authForgotPinCodeAndPinRequired); return }
    if (newPin.length < 4) { setError(tx.authForgotPinPinTooShort); return }
    setLoading(true); setError('')
    try {
      const participantId = sessionStorage.getItem('auth_reset_pid') || ''
      const res = await fetch('/api/participants/reset-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantId, code: code.trim(), newPin }) })
      const data = await res.json().catch(() => ({ message: 'Request failed' }))
      if (!res.ok) throw new Error(data.message || 'Failed')
      onSwitch('forgotPinDone')
    } catch (e: any) { setError(e.message || 'Failed to reset PIN') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{tx.authForgotPinVerifyTitle}</h2>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{tx.authForgotPinVerifySub}</p>
      {error && <ErrorBanner msg={error} th={th} />}
      <Field
        label={tx.authForgotPinCode}
        value={code}
        onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
        placeholder={tx.authForgotPinCodePH}
        th={th}
        autoFocus
        testId="input-reset-code"
        inputMode="numeric"
        maxLength={6}
        style={{ textAlign: 'center', fontSize: 24, letterSpacing: '0.5em', fontFamily: 'monospace' }}
      />
      <PasswordField label={tx.authForgotPinNewPin} value={newPin} onChange={setNewPin} placeholder={tx.authForgotPinNewPinPH} th={th} show={showNewPin} onToggle={() => setShowNewPin(!showNewPin)} testId="input-new-pin" toggleTestId="button-toggle-new-pin-visibility" onKeyDown={e => e.key === 'Enter' && submit()} />
      <PrimaryButton testId="button-reset-pin" onClick={submit} disabled={code.length < 6} loading={loading} loadingText={tx.authForgotPinResetting} text={tx.authForgotPinReset} th={th} />
    </div>
  )
}

const ForgotPinDoneView: React.FC<{ th: ThemeTokens; t: Translations; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSwitch }) => {
  const tx = t as any
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ margin: `0 auto ${SP.lg}px` }}>
        <Icon.CheckCircle color={th.green} size={56} />
      </div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.sm}px` }}>{tx.authForgotPinDoneTitle}</h2>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }} data-testid="text-reset-success">{tx.authForgotPinDoneMsg}</p>
      <PrimaryButton testId="button-back-to-login-done" onClick={() => onSwitch('login')} text={tx.authForgotPinBackToLogin} th={th} />
    </div>
  )
}

const VerifyView: React.FC<{ th: ThemeTokens; t: Translations; onSuccess: (s: any) => void; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSuccess, onSwitch }) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const tx = t as any

  const pending = JSON.parse(sessionStorage.getItem('auth_pending_verify') || '{}')

  const submit = async () => {
    if (!code.trim()) { setError(tx.authVerifyCodeHint); return }
    setLoading(true); setError('')
    try {
      const verified = await participantApi.verify(pending.id, code.trim())
      sessionStorage.removeItem('auth_pending_verify')
      onSuccess(verified)
    } catch (e: any) { setError(e.message || 'Invalid code') }
    finally { setLoading(false) }
  }

  const resend = async () => {
    if (!pending.id) return
    setResendLoading(true); setResendSuccess(false)
    try {
      await participantApi.resendVerification(pending.id)
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (e: any) { setError(e.message || 'Failed to resend') }
    finally { setResendLoading(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: SP.sm }}>
        <Icon.Mail color={th.gold} size={24} />
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: 0 }}>{tx.authVerifyTitle}</h2>
      </div>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{tx.authVerifySub}{pending.email ? ` (${pending.email})` : ''}</p>
      {error && <ErrorBanner msg={error} th={th} />}
      <Field
        label={tx.authVerifyCodeLabel}
        value={code}
        onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
        placeholder={tx.authVerifyCodePH}
        th={th}
        autoFocus
        testId="input-verify-code"
        inputMode="numeric"
        maxLength={6}
        style={{ textAlign: 'center', fontSize: 24, letterSpacing: '0.5em', fontFamily: 'monospace' }}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      <p style={{ fontSize: 11, color: th.faint, marginTop: -SP.sm, marginBottom: SP.md }}>{tx.authVerifyCodeHint}</p>
      <PrimaryButton testId="button-verify" onClick={submit} disabled={code.length < 6} loading={loading} loadingText={tx.authVerifyVerifying} text={tx.authVerifyConfirm} th={th} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: SP.md }}>
        <button data-testid="button-back-to-login" onClick={() => { sessionStorage.removeItem('auth_pending_verify'); onSwitch('login') }} style={{ background: 'none', border: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, minHeight: 44, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon.Back color={th.muted} size={14} />{tx.authVerifyBackToLogin}
        </button>
        <button data-testid="button-resend-code" onClick={resend} disabled={resendLoading} style={{ background: 'none', border: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, minHeight: 44, textDecoration: 'underline', opacity: resendLoading ? 0.5 : 1 }}>
          {resendLoading ? tx.authVerifyResending : resendSuccess ? tx.authVerifyResent : tx.authVerifyResend}
        </button>
      </div>
    </div>
  )
}

const BlockedView: React.FC<{ th: ThemeTokens; t: Translations; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSwitch }) => {
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const tx = t as any

  const adminEmail = sessionStorage.getItem('auth_blocked_email') || ''
  const blockedPid = sessionStorage.getItem('auth_blocked_pid') || ''

  const resend = async () => {
    if (!blockedPid) return
    setResendLoading(true); setResendSuccess(false)
    try {
      await participantApi.resendVerification(blockedPid)
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch { /* silently fail */ }
    finally { setResendLoading(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: SP.sm }}>
        <Icon.AlertTriangle color="#e06060" size={24} />
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: 0, color: '#e06060' }}>{tx.authBlockedTitle}</h2>
      </div>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>{tx.authBlockedSub}</p>
      <p style={{ fontSize: 14, color: th.muted, marginBottom: SP.md }} data-testid="text-verification-blocked-message">{tx.authBlockedMsg}</p>
      {adminEmail && (
        <div style={{ borderRadius: 14, padding: '14px 16px', background: th.bgCard, border: `1px solid ${th.border}`, marginBottom: SP.lg }}>
          <a href={`mailto:${adminEmail}`} style={{ fontSize: 15, fontWeight: 600, color: th.phases.nose.accent, textDecoration: 'none' }} data-testid="link-admin-email">{adminEmail}</a>
        </div>
      )}
      {blockedPid && (
        <div style={{ borderTop: `1px solid ${th.border}`, paddingTop: SP.md, marginBottom: SP.md }}>
          <p style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm }}>{tx.authBlockedResendHint}</p>
          <button data-testid="button-blocked-resend" onClick={resend} disabled={resendLoading} style={{ width: '100%', height: 48, borderRadius: 14, border: `1px solid ${th.border}`, background: 'transparent', cursor: 'pointer', color: th.text, fontSize: 14, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: resendLoading ? 0.5 : 1, transition: 'all 150ms' }}>
            <Icon.Mail color={th.muted} size={16} />
            {resendLoading ? tx.authVerifyResending : resendSuccess ? tx.authVerifyResent : tx.authBlockedResend}
          </button>
        </div>
      )}
      <button data-testid="button-back-from-blocked" onClick={() => { sessionStorage.removeItem('auth_blocked_email'); sessionStorage.removeItem('auth_blocked_pid'); onSwitch('login') }} style={{ width: '100%', height: 48, borderRadius: 14, border: `1px solid ${th.border}`, background: 'transparent', cursor: 'pointer', color: th.text, fontSize: 14, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 150ms' }}>
        <Icon.Back color={th.muted} size={16} />{tx.authBlockedBack}
      </button>
    </div>
  )
}

const ConsentGateView: React.FC<{ th: ThemeTokens; t: Translations; onSuccess: (s: any) => void; onSwitch: (m: AuthMode) => void }> = ({ th, t, onSuccess, onSwitch }) => {
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const tx = t as any

  const pending = JSON.parse(sessionStorage.getItem('auth_pending_login') || '{}')

  const accept = async () => {
    setLoading(true); setError('')
    try {
      sessionStorage.setItem('session_pid', pending.id)
      await participantApi.acceptPrivacyConsent(pending.id)
      sessionStorage.removeItem('auth_pending_login')
      onSuccess({ id: pending.id, name: pending.name, role: pending.role, canAccessWhiskyDb: pending.canAccessWhiskyDb })
    } catch (e: any) { setError(e.message || 'Failed to save consent') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: SP.sm }}>
        <Icon.Shield color={th.gold} size={24} />
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: 0 }}>{tx.authConsentTitle}</h2>
      </div>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>{tx.authConsentSub}</p>
      <p style={{ fontSize: 14, color: th.muted, marginBottom: SP.lg, lineHeight: 1.6 }}>{tx.authConsentText}</p>
      <Checkbox checked={consent} onChange={setConsent} th={th} testId="checkbox-consent-gate">
        {tx.authConsentCheckLabel}{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: th.phases.nose.accent, textDecoration: 'underline' }}>{tx.authConsentPrivacyLink}</a>{' '}
        {tx.authConsentAnd}{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: th.phases.nose.accent, textDecoration: 'underline' }}>{tx.authConsentTermsLink}</a>
      </Checkbox>
      {error && <ErrorBanner msg={error} th={th} />}
      <div style={{ display: 'flex', gap: SP.sm }}>
        <button data-testid="button-consent-cancel" onClick={() => { sessionStorage.removeItem('session_pid'); sessionStorage.removeItem('auth_pending_login'); onSwitch('login') }} style={{ flex: 1, height: 56, borderRadius: 16, border: `1px solid ${th.border}`, background: 'transparent', cursor: 'pointer', color: th.text, fontSize: 16, fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms' }}>
          {tx.authConsentCancel}
        </button>
        <PrimaryButton testId="button-consent-accept" onClick={accept} disabled={!consent} loading={loading} loadingText={tx.authConsentAccepting} text={tx.authConsentAccept} th={th} />
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

const backTarget = (mode: AuthMode): AuthMode | null => {
  switch (mode) {
    case 'login': case 'register': case 'guest': return 'welcome'
    case 'forgotPin': return 'login'
    case 'forgotPinVerify': return 'forgotPin'
    case 'forgotPinDone': return null
    case 'verify': return null
    case 'blocked': return null
    case 'consentGate': return null
    default: return null
  }
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
    padding: `${SP.xl}px ${SP.lg}px`,
    paddingBottom: `calc(${SP.xl}px + env(safe-area-inset-bottom, 0px) + 40px)`,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  }

  const back = backTarget(mode)

  return (
    <div style={containerStyle}>
      {back && (
        <button onClick={() => setMode(back)} style={{ position: 'absolute', top: SP.lg, left: SP.md, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, zIndex: 1 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
      )}

      <div style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ maxWidth: 400, width: '100%', margin: '0 auto', animation: 'fadeUp 300ms ease' }}>
          {mode === 'welcome'        && <WelcomeView th={th} t={t} onSwitch={setMode} />}
          {mode === 'login'          && <LoginView th={th} t={t} onSuccess={onLogin} onSwitch={setMode} />}
          {mode === 'register'       && <RegisterView th={th} t={t} onSuccess={onLogin} onSwitch={setMode} />}
          {mode === 'guest'          && <GuestView th={th} t={t} onSuccess={onLogin} onSwitch={setMode} />}
          {mode === 'forgotPin'      && <ForgotPinView th={th} t={t} onSwitch={setMode} />}
          {mode === 'forgotPinVerify' && <ForgotPinVerifyView th={th} t={t} onSwitch={setMode} />}
          {mode === 'forgotPinDone'  && <ForgotPinDoneView th={th} t={t} onSwitch={setMode} />}
          {mode === 'verify'         && <VerifyView th={th} t={t} onSuccess={onLogin} onSwitch={setMode} />}
          {mode === 'blocked'        && <BlockedView th={th} t={t} onSwitch={setMode} />}
          {mode === 'consentGate'    && <ConsentGateView th={th} t={t} onSuccess={onLogin} onSwitch={setMode} />}
        </div>
      </div>

      <div style={{ flex: '0 0 auto', textAlign: 'center', marginTop: SP.xl, fontSize: 11, color: th.faint }}>
        CaskSense - Dein Gaumen. Deine Geschichte.
      </div>
    </div>
  )
}
