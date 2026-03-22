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
    try { const s = localStorage.getItem('casksense_apple_session'); if (s) { const p = JSON.parse(s); if (p?.id) setSession(p) } } catch {}
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
        const gRes = await fetch('/api/participants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
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
  onHostDashboard?: () => void
  onTastingDetail?: (id: string, isHost: boolean) => void
  onCockpit?: (id: string) => void
  onPrintSheets?: (id: string) => void
  onPaperScan?: (id: string) => void
  onResults?: (id: string) => void
  session: any
}

const TastingHistoryView: React.FC<{ th: ThemeTokens; t: Translations; tastings: any[]; onBack: () => void; session: any; onResults?: (id: string) => void; onTastingDetail?: (id: string, isHost: boolean) => void }> = ({ th, t, tastings, onBack, session, onResults, onTastingDetail }) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all')

  const filtered = tastings.filter(tasting => {
    if (search) {
      const name = (tasting.name || tasting.title || '').toLowerCase()
      if (!name.includes(search.toLowerCase())) return false
    }
    if (statusFilter === 'open' && tasting.status !== 'open') return false
    if (statusFilter === 'closed' && !['closed', 'reveal', 'archived'].includes(tasting.status)) return false
    return true
  }).sort((a, b) => {
    const da = new Date(a.date || a.createdAt || 0).getTime()
    const db = new Date(b.date || b.createdAt || 0).getTime()
    return db - da
  })

  const filters = [
    { id: 'all' as const, label: t.historyStatusAll },
    { id: 'open' as const, label: t.historyStatusOpen },
    { id: 'closed' as const, label: t.historyStatusClosed },
  ]

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} data-testid="button-back-history" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }} data-testid="text-history-title">{t.historyOwnTitle}</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.md}px` }}>{t.historyOwnSub}</p>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t.historySearchPH}
        data-testid="input-history-search"
        style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }}
      />

      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setStatusFilter(f.id)} data-testid={`filter-status-${f.id}`} style={{
            height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer',
            background: statusFilter === f.id ? th.gold : th.bgCard,
            color: statusFilter === f.id ? '#1a0f00' : th.muted,
            fontSize: 12, fontWeight: statusFilter === f.id ? 700 : 400,
          }}>{f.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: th.muted, marginBottom: SP.sm }}>{filtered.length} Tastings</div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: SP.xl }} data-testid="text-history-empty">
          <Icon.History color={th.faint} size={36} />
          <div style={{ fontSize: 14, color: th.muted, marginTop: SP.sm }}>
            {search ? 'Keine Ergebnisse.' : 'Noch keine Tastings.'}
          </div>
        </div>
      ) : (
        filtered.map((tasting, i) => {
          const isHost = tasting.hostId === session?.id
          const canViewResults = ['closed', 'archived', 'reveal'].includes(tasting.status)
          const isOpen = tasting.status === 'open'
          const isClickable = canViewResults || isOpen
          const handleClick = () => {
            if (canViewResults && onResults) onResults(tasting.id)
            else if (isOpen && onTastingDetail) onTastingDetail(tasting.id, isHost)
          }
          return (
            <button key={tasting.id || i} data-testid={`history-card-${tasting.id}`} onClick={isClickable ? handleClick : undefined} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${th.border}`, gap: 10, width: '100%', background: 'none', border: 'none', borderBottomStyle: 'solid', borderBottomWidth: 1, borderBottomColor: th.border, cursor: isClickable ? 'pointer' : 'default', textAlign: 'left', color: th.text }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{tasting.name || tasting.title}</div>
                <div style={{ fontSize: 12, color: th.faint }}>
                  {tasting.date ? new Date(tasting.date).toLocaleDateString('de') : ''}
                  {tasting.location ? ` · ${tasting.location}` : ''}
                  {isHost ? ' · Host' : ''}
                </div>
              </div>
              {canViewResults ? (
                <span style={{ fontSize: 12, color: th.gold, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {t.resultsTitle} <Icon.ChevronRight color={th.gold} size={14} />
                </span>
              ) : (
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 10,
                  background: tasting.status === 'open' ? `${th.green}20` : th.bgCard,
                  color: tasting.status === 'open' ? th.green : th.faint,
                }}>{tasting.status}</span>
              )}
            </button>
          )
        })
      )}
    </div>
  )
}

export const TastingsHub: React.FC<HubProps> = ({ th, t, onJoin, onSolo, onHost, onHostDashboard, onTastingDetail, onCockpit, onPrintSheets, onPaperScan, onResults, session }) => {
  const [allTastings, setAllTastings] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [detailId, setDetailId]   = useState<string | null>(null)
  const [recapId, setRecapId]     = useState<string | null>(null)
  const [paperScanId, setPaperScanId] = useState<string | null>(null)
  const [printId, setPrintId]     = useState<string | null>(null)

  useEffect(() => {
    if (!session?.id) return
    fetch('/api/tastings', { headers: { 'x-participant-id': session.id } })
      .then(r => r.json()).then(data => setAllTastings(data || [])).catch(() => {})
  }, [session?.id])

  const recentTastings = allTastings.slice(0, 3)

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

  if (showHistory) {
    return <TastingHistoryView th={th} t={t} tastings={allTastings} onBack={() => setShowHistory(false)} session={session} onResults={onResults} onTastingDetail={onTastingDetail} />
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      {/* Glow background */}
      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, height: 400, background: `radial-gradient(ellipse at 50% 100%, ${th.phases.palate.glow}, transparent 70%)`, pointerEvents: 'none', zIndex: -1 }} />

      <div>
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
              animation: `fadeUp 300ms ease forwards`, animationDelay: `${i * 80}ms`,
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: th.faint }}>{t.hubRecent}</div>
              {allTastings.length > 3 && (
                <button onClick={() => setShowHistory(true)} data-testid="button-show-all-tastings" style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: th.gold, fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'DM Sans, sans-serif',
                }}>{t.historyShowAll} ({allTastings.length})</button>
              )}
            </div>
            {recentTastings.map((tasting, i) => {
              const canViewResults = ['closed', 'archived', 'reveal'].includes(tasting.status)
              const isOpen = tasting.status === 'open'
              const isClickable = canViewResults || isOpen
              const handleClick = () => {
                if (canViewResults && onResults) onResults(tasting.id)
                else if (isOpen && onTastingDetail) onTastingDetail(tasting.id, tasting.hostId === session?.id)
              }
              return (
                <button
                  key={i}
                  data-testid={`recent-tasting-${tasting.id}`}
                  onClick={isClickable ? handleClick : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '10px 0', width: '100%',
                    borderBottom: `1px solid ${th.border}`, background: 'none', border: 'none',
                    borderBottomStyle: 'solid', borderBottomWidth: 1, borderBottomColor: th.border,
                    cursor: isClickable ? 'pointer' : 'default', textAlign: 'left', color: th.text,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{tasting.name}</div>
                    <div style={{ fontSize: 12, color: th.faint }}>{tasting.date}</div>
                  </div>
                  {canViewResults ? (
                    <span style={{ fontSize: 12, color: th.gold, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t.resultsTitle} <Icon.ChevronRight color={th.gold} size={14} />
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: isOpen ? `${th.green}20` : th.bgCard, color: isOpen ? th.green : th.faint }}>{tasting.status}</span>
                  )}
                </button>
              )
            })}
            {allTastings.length > 3 && (
              <button onClick={() => setShowHistory(true)} data-testid="button-show-all-tastings-bottom" style={{
                width: '100%', marginTop: SP.sm, padding: '10px 0', background: 'none', border: `1px solid ${th.border}`, borderRadius: 12, cursor: 'pointer',
                color: th.gold, fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
              }}>{t.historyShowAll}</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
