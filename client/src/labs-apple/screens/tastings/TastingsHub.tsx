// CaskSense Apple — TastingsHub + JoinFlow
import React, { useState, useEffect, useRef } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

// ── JoinFlow ─────────────────────────────────────────────────────────────
interface JoinProps {
  th: ThemeTokens; t: Translations
  onEnterLive: (tastingId: string, participantId: string) => void
  onBack: () => void
}

export const JoinFlow: React.FC<JoinProps> = ({ th, t, onEnterLive, onBack }) => {
  const [step, setStep]         = useState<'code' | 'name' | 'lobby'>('code')
  const [code, setCode]         = useState('')
  const [name, setName]         = useState('')
  const [tasting, setTasting]   = useState<any>(null)
  const [participants, setParts] = useState<any[]>([])
  const [error, setError]       = useState('')
  const [session, setSession]   = useState<any>(null)
  const [visible, setVisible]   = useState(true)

  const inputStyle = { width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 18, padding: '10px 14px', outline: 'none', fontFamily: 'Cormorant Garamond, serif', boxSizing: 'border-box' as const, letterSpacing: '0.12em', textTransform: 'uppercase' as const }

  // Load session
  useEffect(() => {
    fetch('/api/auth/me', { headers: { 'x-participant-id': '' } }).then(r => r.ok ? r.json() : null).then(data => setSession(data && typeof data === 'object' ? data : null)).catch(() => {})
  }, [])

  // SSE in lobby
  useEffect(() => {
    if (step !== 'lobby' || !tasting?.id) return
    let es: EventSource | null = null
    try {
      es = new EventSource(`/api/tastings/${tasting.id}/events?participantId=${session?.id}`)
      es.addEventListener('status_changed', () => {
        if (tasting?.status === 'open') onEnterLive(tasting.id, session?.id || 'guest')
      })
    } catch { }
    return () => es?.close()
  }, [step, tasting?.id])

  // Polling in lobby
  useEffect(() => {
    if (step !== 'lobby' || !tasting?.id) return
    const load = async () => {
      const [tRes, pRes] = await Promise.all([
        fetch(`/api/tastings/${tasting.id}`, { headers: { 'x-participant-id': session?.id || '' } }),
        fetch(`/api/tastings/${tasting.id}/participants`, { headers: { 'x-participant-id': session?.id || '' } }),
      ])
      if (tRes.ok) { const t2 = await tRes.json(); setTasting(t2); if (t2.status === 'open') onEnterLive(t2.id, session?.id || 'guest') }
      if (pRes.ok) setParts(await pRes.json())
    }
    load(); const id = setInterval(load, 5000); return () => clearInterval(id)
  }, [step, tasting?.id])

  const transition = (nextStep: 'code' | 'name' | 'lobby') => {
    setVisible(false); setTimeout(() => { setStep(nextStep); setVisible(true) }, 200)
  }

  const findTasting = async () => {
    setError('')
    try {
      const res = await fetch(`/api/tastings?code=${code.trim().toUpperCase()}`, { headers: { 'x-participant-id': session?.id || '' } })
      if (!res.ok) throw new Error('404')
      const data = await res.json()
      const found = Array.isArray(data) ? data[0] : data
      if (!found) { setError('Code nicht gefunden'); return }
      setTasting(found)
      if (session?.name) { setName(session.name); transition('lobby') } else { transition('name') }
    } catch { setError('Code nicht gefunden') }
  }

  const enterTasting = async () => {
    setError('')
    try {
      let pid = session?.id
      if (!pid) {
        const gRes = await fetch('/api/auth/guest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
        const g = await gRes.json(); pid = g.id
      }
      await fetch(`/api/tastings/${tasting.id}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-participant-id': pid }, body: JSON.stringify({ name }) })
      setSession((s: any) => ({ ...s, id: pid, name }))
      const [tRes, pRes] = await Promise.all([
        fetch(`/api/tastings/${tasting.id}`, { headers: { 'x-participant-id': pid } }),
        fetch(`/api/tastings/${tasting.id}/participants`, { headers: { 'x-participant-id': pid } }),
      ])
      if (tRes.ok) { const t2 = await tRes.json(); setTasting(t2); if (t2.status === 'open') { onEnterLive(t2.id, pid); return } }
      if (pRes.ok) setParts(await pRes.json())
      transition('lobby')
    } catch (e: any) {
      if (e?.status === 409) setError('Du bist bereits beigetreten.')
      else setError('Fehler beim Beitreten.')
    }
  }

  const hostName = participants.find(p => p.isHost)?.name || 'Host'

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', opacity: visible ? 1 : 0, transition: 'opacity 200ms' }}>
      {/* Step: Code */}
      {step === 'code' && (
        <div style={{ padding: `${SP.md}px ${SP.md}px`, paddingBottom: 120 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.joinTitle}</h1>
          <p style={{ fontSize: 15, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{t.joinNoAcc}</p>
          <label style={{ fontSize: 11, color: th.muted, display: 'block', marginBottom: SP.xs, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.joinCodeLabel}</label>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder={t.joinCodePH} style={inputStyle} onKeyDown={e => e.key === 'Enter' && code.trim() && findTasting()} autoFocus />
          {error && <div style={{ fontSize: 13, color: '#e06060', marginTop: SP.sm }}>{error}</div>}
          <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
            <button disabled={!code.trim()} onClick={findTasting} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: code.trim() ? 'pointer' : 'not-allowed', background: code.trim() ? `linear-gradient(135deg, ${th.gold}, ${th.amber})` : th.bgCard, color: code.trim() ? '#1a0f00' : th.faint, fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', opacity: code.trim() ? 1 : 0.4 }}>{t.joinCTA}</button>
          </div>
        </div>
      )}

      {/* Step: Name */}
      {step === 'name' && (
        <div style={{ padding: `${SP.md}px ${SP.md}px`, paddingBottom: 120 }}>
          <button onClick={() => transition('code')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.joinNameQ}</h1>
          <p style={{ fontSize: 15, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{t.joinNameSub}</p>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.joinNamePH} style={{ ...inputStyle, letterSpacing: 'normal', textTransform: 'none', fontFamily: 'Cormorant Garamond, serif', fontSize: 22 }} autoFocus onKeyDown={e => e.key === 'Enter' && name.trim() && enterTasting()} />
          {error && <div style={{ fontSize: 13, color: '#e06060', marginTop: SP.sm }}>{error}</div>}
          <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
            <button disabled={!name.trim()} onClick={enterTasting} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed', background: name.trim() ? `linear-gradient(135deg, ${th.gold}, ${th.amber})` : th.bgCard, color: name.trim() ? '#1a0f00' : th.faint, fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', opacity: name.trim() ? 1 : 0.4 }}>{t.joinEnter}</button>
          </div>
        </div>
      )}

      {/* Step: Lobby */}
      {step === 'lobby' && (
        <div style={{ padding: `${SP.md}px`, paddingBottom: 120 }}>
          <div style={{ textAlign: 'center', padding: `${SP.xl}px 0 ${SP.lg}px` }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#1a0f00', margin: '0 auto 12px', fontFamily: 'DM Sans, sans-serif' }}>
              {(name || 'G')[0].toUpperCase()}
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: 0 }}>Willkommen, {name}!</h1>
          </div>

          {/* Participants */}
          <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md, marginBottom: SP.md }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: th.faint, marginBottom: SP.sm }}>{t.participantsLabel}</div>
            {participants.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: th.phases.nose.accent }}>{(p.name || '?')[0].toUpperCase()}</div>
                <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
                {p.isHost && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: `${th.amber}20`, color: th.amber }}>{t.hostLabel}</span>}
                {p.id === session?.id && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: `${th.gold}20`, color: th.gold }}>{t.youLabel}</span>}
                <div style={{ width: 8, height: 8, borderRadius: 4, background: th.green }} />
              </div>
            ))}
          </div>

          {/* Waiting card */}
          <div style={{ background: `${th.gold}10`, border: `1px solid ${th.gold}33`, borderRadius: 20, padding: SP.md }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon.Live color={th.green} size={16} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{hostName} {t.joinWaiting}</span>
            </div>
            <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontStyle: 'italic', color: th.muted }}>{t.joinPour}</span>
          </div>

          <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
            <button onClick={() => tasting && onEnterLive(tasting.id, session?.id || 'guest')} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
              Zur Bewertung →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TastingsHub ───────────────────────────────────────────────────────────
interface HubProps {
  th: ThemeTokens; t: Translations
  onJoin: () => void; onSolo: () => void; onHost: () => void
  session: any
}

export const TastingsHub: React.FC<HubProps> = ({ th, t, onJoin, onSolo, onHost, session }) => {
  const [recentTastings, setRecent] = useState<any[]>([])

  useEffect(() => {
    if (!session?.id) return
    fetch('/api/tastings', { headers: { 'x-participant-id': session.id } })
      .then(r => r.ok ? r.json() : []).then(data => setRecent((Array.isArray(data) ? data : []).slice(0, 3))).catch(() => {})
  }, [session?.id])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Guten Morgen.'
    if (h < 18) return 'Guten Tag.'
    return 'Guten Abend.'
  })()

  const actions = [
    { id: 'join', icon: <Icon.Join color={th.phases.nose.accent} size={32} />, label: t.hubJoin, desc: t.hubJoinDesc, phaseId: 'nose' as const, action: onJoin },
    { id: 'solo', icon: <Icon.Solo color={th.phases.palate.accent} size={32} />, label: t.hubSolo, desc: t.hubSoloDesc, phaseId: 'palate' as const, action: onSolo },
    { id: 'host', icon: <Icon.Host color={th.phases.finish.accent} size={32} />, label: t.hubHost, desc: t.hubHostDesc, phaseId: 'finish' as const, action: onHost },
  ]

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      {/* Glow background */}
      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, height: 400, background: `radial-gradient(ellipse at 50% 100%, ${th.phases.palate.glow}, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ padding: `${SP.lg}px 0 ${SP.xl}px` }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, fontWeight: 600, margin: 0 }}>{session?.name ? `${greeting.replace('.', ',')} ${session.name}.` : greeting}</h1>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontStyle: 'italic', color: th.muted, margin: `${SP.xs}px 0 0` }}>{t.hubSub}</p>
        </div>

        {/* Action cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm, marginBottom: SP.xl }}>
          {actions.map((action, i) => (
            <button key={action.id} onClick={action.action} style={{
              display: 'flex', alignItems: 'center', gap: SP.md, padding: SP.lg,
              background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, cursor: 'pointer',
              textAlign: 'left', transition: 'all 200ms',
              animation: `fadeUp 300ms ease both`, animationDelay: `${i * 80}ms`,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = th.phases[action.phaseId].accent; (e.currentTarget as HTMLElement).style.background = th.phases[action.phaseId].dim }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = th.border; (e.currentTarget as HTMLElement).style.background = th.bgCard }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 16, background: th.phases[action.phaseId].dim, border: `1px solid ${th.phases[action.phaseId].accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {action.icon}
              </div>
              <div>
                <div style={{ fontSize: 18, fontFamily: 'Playfair Display, serif', fontWeight: 600, marginBottom: 4 }}>{action.label}</div>
                <div style={{ fontSize: 14, color: th.muted }}>{action.desc}</div>
              </div>
              <Icon.ChevronRight color={th.faint} size={20} />
            </button>
          ))}
        </div>

        {/* Recent */}
        {recentTastings.length > 0 && (
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: th.faint, marginBottom: SP.sm }}>{t.hubRecent}</div>
            {recentTastings.map((tasting, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{tasting.name}</div>
                  <div style={{ fontSize: 12, color: th.faint }}>{tasting.date}</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: tasting.status === 'open' ? `${th.green}20` : th.bgCard, color: tasting.status === 'open' ? th.green : th.faint }}>{tasting.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
