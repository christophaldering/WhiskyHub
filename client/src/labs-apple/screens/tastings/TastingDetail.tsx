// CaskSense Apple — TastingDetail (Phase B)
// QR-Code, Join-Code, E-Mail-Einladungen, Teilnehmer-Status
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens; t: Translations
  tastingId: string; participantId: string
  isHost: boolean; onBack: () => void; onEnterLive: () => void
}

const QRDisplay: React.FC<{ code: string; th: ThemeTokens }> = ({ code, th }) => {
  const joinUrl = `${window.location.origin}/labs-apple?code=${code}`
  const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&margin=10`
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(joinUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }
  const dl = () => { const a = document.createElement('a'); a.href = qrUrl; a.download = `casksense-${code}.png`; a.click() }

  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.md }}>Einladungs-QR</div>
      <div style={{ width: 160, height: 160, borderRadius: 16, overflow: 'hidden', margin: '0 auto', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={qrUrl} alt={`QR ${code}`} width={160} height={160} style={{ display: 'block' }} />
      </div>
      <div style={{ margin: `${SP.lg}px 0 ${SP.md}px` }}>
        <div style={{ fontSize: 11, color: th.faint, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Code</div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 36, fontWeight: 700, color: th.gold, letterSpacing: '0.15em' }}>{code}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
        <button onClick={copy} style={{ height: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: copied ? th.green : th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon.Copy color={copied ? th.green : th.muted} size={14} />{copied ? 'Kopiert!' : 'Link kopieren'}
        </button>
        <button onClick={dl} style={{ height: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon.Download color={th.muted} size={14} />QR laden
        </button>
      </div>
    </div>
  )
}

const EmailInvite: React.FC<{ th: ThemeTokens; tastingId: string; participantId: string }> = ({ th, tastingId, participantId }) => {
  const [open, setOpen] = useState(false)
  const [emails, setEmails] = useState('')
  const [note, setNote]   = useState('')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const send = async () => {
    const list = emails.split(/[\n,;]/).map(e => e.trim()).filter(Boolean)
    if (!list.length) return
    setSending(true)
    try {
      const res = await fetch(`/api/tastings/${tastingId}/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId }, body: JSON.stringify({ emails: list, note }) })
      const data = await res.json()
      setResults(data?.results || list.map(e => ({ email: e, status: res.ok ? 'sent' : 'failed' })))
      if (res.ok) setEmails('')
    } catch { setResults(emails.split(/[\n,;]/).map(e => ({ email: e.trim(), status: 'failed' }))) }
    finally { setSending(false) }
  }

  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, overflow: 'hidden', marginTop: SP.md }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', minHeight: 52, display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${SP.md}px`, background: 'none', border: 'none', cursor: 'pointer' }}>
        <Icon.Mail color={open ? th.gold : th.muted} size={18} />
        <span style={{ flex: 1, fontSize: 15, fontWeight: open ? 600 : 400, textAlign: 'left', color: open ? th.gold : th.muted }}>Per E-Mail einladen</span>
        <Icon.ChevronDown color={th.faint} size={16} />
      </button>
      {open && (
        <div style={{ padding: SP.md, borderTop: `1px solid ${th.border}` }}>
          <textarea value={emails} onChange={e => setEmails(e.target.value)} placeholder="E-Mail-Adressen (eine pro Zeile)" rows={4}
            style={{ width: '100%', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, fontFamily: 'DM Sans, sans-serif', padding: '10px 12px', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: SP.sm }} />
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Persönliche Notiz (optional)" rows={2}
            style={{ width: '100%', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', padding: '10px 12px', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: SP.md }} />
          <button onClick={send} disabled={sending || !emails.trim()} style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', cursor: !emails.trim() ? 'default' : 'pointer', background: !emails.trim() ? th.bgCard : `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: !emails.trim() ? th.faint : '#1a0f00', fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {sending ? <Icon.Spinner color={th.faint} size={18} /> : 'Einladungen versenden'}
          </button>
          {results.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${th.border}` }}>
              {r.status === 'sent' ? <Icon.Check color={th.green} size={14} /> : <Icon.AlertTriangle color="#e06060" size={14} />}
              <span style={{ fontSize: 13, color: r.status === 'sent' ? th.green : '#e06060' }}>{r.email}</span>
              <span style={{ fontSize: 11, color: th.faint, marginLeft: 'auto' }}>{r.status === 'sent' ? 'Gesendet' : 'Fehler'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const TastingDetail: React.FC<Props> = ({ th, t, tastingId, participantId, isHost, onBack, onEnterLive }) => {
  const [tasting, setTasting] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [parts, setParts]     = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch(`/api/tastings/${tastingId}`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
      fetch(`/api/tastings/${tastingId}/participants`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
    ]).then(([t2, p]) => { setTasting(t2); setParts(p || []) }).catch(() => {}).finally(() => setLoading(false))
  }, [tastingId])

  if (loading) return <div style={{ minHeight: '100%', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Spinner color={th.gold} size={32} /></div>

  const sColor = (s: string) => s === 'open' ? th.green : s === 'draft' ? th.gold : th.faint
  const sLabel: Record<string, string> = { draft: 'Vorbereitung', open: 'Läuft', closed: 'Beendet', reveal: 'Auflösung', archived: 'Archiviert' }

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 100 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px`, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
        <div style={{ flex: 1 }} />
        {tasting?.status && <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: `${sColor(tasting.status)}15`, color: sColor(tasting.status), fontWeight: 600 }}>{sLabel[tasting.status] || tasting.status}</span>}
      </div>

      <div style={{ padding: SP.md }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{tasting?.name || '—'}</h1>
        {tasting?.date && <div style={{ fontSize: 13, color: th.faint, marginBottom: SP.lg }}>{new Date(tasting.date).toLocaleDateString('de', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}{tasting.location ? ` · ${tasting.location}` : ''}</div>}

        {(tasting?.status === 'open' || tasting?.status === 'draft') && (
          <button onClick={onEnterLive} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', marginBottom: SP.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon.Live color="#1a0f00" size={20} />{tasting?.status === 'open' ? 'Zum Live-Tasting' : 'Bereit machen'}
          </button>
        )}

        {isHost && tasting?.code && <><QRDisplay code={tasting.code} th={th} /><EmailInvite th={th} tastingId={tastingId} participantId={participantId} /></>}

        <div style={{ marginTop: SP.lg, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md }}>
          <div style={{ fontSize: 11, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: SP.md }}>Teilnehmer · {parts.length}</div>
          {parts.length === 0 && <div style={{ textAlign: 'center', padding: SP.lg, color: th.faint, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>Noch niemand beigetreten</div>}
          {parts.map(p => {
            const sc = p.ratingStatus === 'all' ? th.green : p.ratingStatus === 'partial' ? th.gold : th.faint
            const sl = p.ratingStatus === 'all' ? 'Fertig' : p.ratingStatus === 'partial' ? 'Am Bewerten' : 'Wartet'
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: th.phases.nose.accent, flexShrink: 0 }}>{(p.name || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: p.id === participantId ? 700 : 400, color: p.id === participantId ? th.gold : th.text }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: th.faint }}>{p.source === 'paper' ? 'Papier' : 'App'}</div>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${sc}15`, color: sc }}>{sl}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
