// CaskSense Apple — HostCockpit (Phase B)
// Desktop 3-spalten Live-Cockpit für Host
// Nur sichtbar wenn viewport >= 900px
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens; t: Translations
  tastingId: string; participantId: string; onClose: () => void
}

export const HostCockpit: React.FC<Props> = ({ th, t, tastingId, participantId, onClose }) => {
  const [tasting, setTasting]   = useState<any>(null)
  const [whiskies, setWhiskies] = useState<any[]>([])
  const [parts, setParts]       = useState<any[]>([])
  const [ratings, setRatings]   = useState<any[]>([])
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const load = async () => {
    try {
      const [tr, wr, pr, rr] = await Promise.all([
        fetch(`/api/tastings/${tastingId}`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
        fetch(`/api/tastings/${tastingId}/whiskies`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
        fetch(`/api/tastings/${tastingId}/participants`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
        fetch(`/api/tastings/${tastingId}/ratings`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
      ])
      setTasting(tr); setWhiskies(wr || []); setParts(pr || []); setRatings(rr || [])
    } catch { }
  }

  useEffect(() => { load(); const id = setInterval(load, 3000); return () => clearInterval(id) }, [tastingId])

  const action = async (endpoint: string, label: string) => {
    setActionMsg(null)
    try {
      const res = await fetch(`/api/tastings/${tastingId}/${endpoint}`, { method: 'POST', headers: { 'x-participant-id': participantId } })
      if (!res.ok) { const d = await res.json(); setActionMsg(d.error || 'Fehler'); setTimeout(() => setActionMsg(null), 3000) }
      else { load(); setActionMsg(`${label} erfolgreich`); setTimeout(() => setActionMsg(null), 2000) }
    } catch { setActionMsg('Netzwerkfehler'); setTimeout(() => setActionMsg(null), 3000) }
  }

  // Per-whisky rating counts
  const ratingCountForWhisky = (wid: string) => ratings.filter(r => r.whiskeyId === wid).length

  // Participant rating status
  const partStatus = (pid: string) => {
    const pr = ratings.filter(r => r.participantId === pid)
    if (!pr.length) return 'none'
    if (pr.length >= whiskies.length * 4) return 'all'
    return 'partial'
  }

  const colStyle = (width: number, extra?: React.CSSProperties): React.CSSProperties => ({
    width, minWidth: width, maxWidth: width, height: '100%', overflowY: 'auto', ...extra
  })

  const sectionTitle = (label: string) => (
    <div style={{ fontSize: 11, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.sm, paddingBottom: SP.xs, borderBottom: `1px solid ${th.border}` }}>{label}</div>
  )

  const actionBtn = (label: string, endpoint: string, color = th.gold) => (
    <button onClick={() => action(endpoint, label)} style={{ width: '100%', height: 44, borderRadius: 10, border: `1px solid ${color}33`, background: `${color}10`, color, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', marginBottom: SP.xs }}>
      {label}
    </button>
  )

  const statusColor = (s: string) => s === 'all' ? th.green : s === 'partial' ? th.gold : th.faint

  const guidedIdx = tasting?.guidedWhiskyIndex || 0
  const total = whiskies.length

  return (
    <div style={{ position: 'fixed', inset: 0, background: th.bg, zIndex: 100, display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif', color: th.text }}>
      {/* Top bar */}
      <div style={{ height: 48, background: th.headerBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', padding: `0 ${SP.md}px`, gap: 12, flexShrink: 0 }}>
        <Icon.Host color={th.gold} size={18} />
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600, color: th.gold }}>{tasting?.name || 'Cockpit'}</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${tasting?.status === 'open' ? th.green : th.faint}15`, color: tasting?.status === 'open' ? th.green : th.faint, marginLeft: 4 }}>
          {tasting?.status || '—'}
        </span>
        {actionMsg && <span style={{ fontSize: 12, color: th.phases.nose.accent, marginLeft: SP.sm }}>{actionMsg}</span>}
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13 }}>
          Schließen
        </button>
      </div>

      {/* 3 Columns */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 1, background: th.border }}>

        {/* ─ Col 1: Controls (280px) ─ */}
        <div style={{ ...colStyle(280), background: th.bg, padding: SP.md }}>
          {sectionTitle('Session-Status')}
          <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 12, padding: SP.md, marginBottom: SP.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP.xs }}>
              <span style={{ fontSize: 13, color: th.muted }}>Format</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{tasting?.format === 'blind' ? 'Blind' : 'Offen'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP.xs }}>
              <span style={{ fontSize: 13, color: th.muted }}>Dram</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: th.gold }}>{guidedIdx + 1} / {total || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: th.muted }}>Teilnehmer</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{parts.length}</span>
            </div>
          </div>

          {sectionTitle('Steuerung')}
          {tasting?.status === 'draft'  && actionBtn('Tasting starten', 'start', th.green)}
          {tasting?.status === 'open'   && actionBtn('Nächster Dram →', 'guided-advance', th.gold)}
          {tasting?.status === 'open'   && actionBtn('Flasche aufdecken', `reveal?step=${(tasting.guidedRevealStep || 0) + 1}`, th.phases.palate.accent)}
          {tasting?.status === 'open'   && actionBtn('Tasting beenden', 'close', '#e06060')}
          {tasting?.status === 'closed' && actionBtn('Auswertung starten', 'reveal', th.phases.nose.accent)}

          {sectionTitle('Lineup')}
          {whiskies.map((w, i) => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${th.border}` }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: i === guidedIdx ? th.phases.overall.dim : th.bgCard, border: `1px solid ${i === guidedIdx ? th.phases.overall.accent : th.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i === guidedIdx ? th.phases.overall.accent : th.faint, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: i === guidedIdx ? th.gold : th.text, fontWeight: i === guidedIdx ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tasting?.format === 'blind' && (tasting.guidedRevealStep || 0) < 1 ? `Sample ${i + 1}` : (w.name || `Dram ${i + 1}`)}
                </div>
              </div>
              <span style={{ fontSize: 10, color: th.faint }}>{ratingCountForWhisky(w.id)}/{parts.length}</span>
            </div>
          ))}
        </div>

        {/* ─ Col 2: Participants (flex) ─ */}
        <div style={{ flex: 1, background: th.bg, padding: SP.md, overflowY: 'auto' }}>
          {sectionTitle(`Teilnehmer · ${parts.length}`)}
          {/* Group by status */}
          {(['all', 'partial', 'none'] as const).map(status => {
            const group = parts.filter(p => partStatus(p.id) === status)
            if (!group.length) return null
            const label = status === 'all' ? 'Alle bewertet' : status === 'partial' ? 'Am Bewerten' : 'Noch nicht gestartet'
            const color = statusColor(status)
            return (
              <div key={status} style={{ marginBottom: SP.lg }}>
                <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: SP.sm }}>{label} · {group.length}</div>
                {group.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${th.border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: th.phases.nose.accent, flexShrink: 0 }}>
                      {(p.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: th.text }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: th.faint }}>{p.source === 'paper' ? 'Papier' : 'App'}</div>
                    </div>
                    {/* Per-whisky dots */}
                    <div style={{ display: 'flex', gap: 3 }}>
                      {whiskies.map((w, i) => {
                        const hasRating = ratings.some(r => r.participantId === p.id && r.whiskeyId === w.id)
                        return <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: hasRating ? th.green : th.border }} />
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* ─ Col 3: Current Dram Details (360px) ─ */}
        <div style={{ ...colStyle(360), background: th.bg, padding: SP.md }}>
          {sectionTitle(`Dram ${guidedIdx + 1} von ${total}`)}
          {whiskies[guidedIdx] && (
            <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.md }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, marginBottom: SP.xs }}>
                {tasting?.format === 'blind' && (tasting.guidedRevealStep || 0) < 1 ? `Sample ${guidedIdx + 1}` : whiskies[guidedIdx].name}
              </div>
              {(tasting.guidedRevealStep || 0) > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: SP.xs }}>
                  {[whiskies[guidedIdx].region, whiskies[guidedIdx].cask, whiskies[guidedIdx].age ? `${whiskies[guidedIdx].age}y` : null, whiskies[guidedIdx].abv ? `${whiskies[guidedIdx].abv}%` : null].filter(Boolean).map((v: any, i: number) => (
                    <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: th.phases.palate.dim, color: th.phases.palate.accent }}>{v}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {sectionTitle('Auflösungs-Status')}
          <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, marginBottom: SP.md }}>
            {['Name', 'Details', 'Foto'].map((step, i) => {
              const revealed = (tasting?.guidedRevealStep || 0) > i
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 2 ? `1px solid ${th.border}` : 'none' }}>
                  {revealed ? <Icon.Eye color={th.green} size={14} /> : <Icon.EyeOff color={th.faint} size={14} />}
                  <span style={{ fontSize: 13, color: revealed ? th.text : th.faint }}>{step}</span>
                  <span style={{ fontSize: 11, color: revealed ? th.green : th.faint, marginLeft: 'auto' }}>{revealed ? 'Sichtbar' : 'Verborgen'}</span>
                </div>
              )
            })}
          </div>

          {sectionTitle('Bewertungs-Fortschritt')}
          {whiskies.map((w, i) => {
            const count = ratingCountForWhisky(w.id)
            const pct   = parts.length > 0 ? (count / parts.length) * 100 : 0
            return (
              <div key={w.id} style={{ marginBottom: SP.sm }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: i === guidedIdx ? th.gold : th.muted }}>{i + 1}. {tasting?.format === 'blind' ? `Sample ${i+1}` : (w.name || `Dram ${i+1}`)}</span>
                  <span style={{ fontSize: 12, color: th.faint }}>{count}/{parts.length}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: th.border, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: i === guidedIdx ? th.gold : th.phases.overall.accent, transition: 'width 0.3s' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
