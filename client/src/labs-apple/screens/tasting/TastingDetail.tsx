// CaskSense Apple — TastingDetail (Phase B)
// QR-Code, Join-Code, E-Mail Einladungen
import React, { useState, useEffect, useRef } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th:            ThemeTokens
  t:             Translations
  tastingId:     string
  participantId: string
  isHost:        boolean
  onBack:        () => void
  onJoinLive:    () => void
}

// ── QR Code Generator (pure canvas, no external lib needed) ───────────────
// Uses a simple QR-code via API endpoint or fallback to text display
const QRDisplay: React.FC<{ th: ThemeTokens; value: string; size?: number }> = ({ th, value, size = 160 }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    // Try to generate via qrcode API or use a QR service
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=0e0b05&color=d4a847&format=png`
    setDataUrl(url)
  }, [value, size])

  if (!dataUrl) return (
    <div style={{ width: size, height: size, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon.Spinner color={th.gold} size={24} />
    </div>
  )

  return (
    <img src={dataUrl} alt="QR Code" width={size} height={size}
      style={{ borderRadius: 12, border: `2px solid ${th.gold}44` }}
      onError={() => setDataUrl(null)} />
  )
}

// ── InvitePanel ───────────────────────────────────────────────────────────
const InvitePanel: React.FC<{ th: ThemeTokens; t: Translations; tastingId: string; participantId: string }> = ({ th, t, tastingId, participantId }) => {
  const [open, setOpen]         = useState(false)
  const [emails, setEmails]     = useState('')
  const [note, setNote]         = useState('')
  const [sending, setSending]   = useState(false)
  const [result, setResult]     = useState<{ sent: string[]; failed: string[] } | null>(null)

  const send = async () => {
    const list = emails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean)
    if (!list.length) return
    setSending(true); setResult(null)
    try {
      const res = await fetch(`/api/tastings/${tastingId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({ emails: list, note: note.trim() || undefined })
      })
      const data = await res.json()
      setResult({ sent: data.sent || list, failed: data.failed || [] })
      if (!data.failed?.length) setEmails('')
    } catch { setResult({ sent: [], failed: emails.split(/[\n,;]+/).map(e => e.trim()).filter(Boolean) }) }
    finally { setSending(false) }
  }

  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, overflow: 'hidden', marginTop: SP.md }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', minHeight: 52, display: 'flex', alignItems: 'center', gap: 10, padding: `0 ${SP.md}px`, background: 'none', border: 'none', cursor: 'pointer', color: th.text }}>
        <Icon.Mail color={th.phases.nose.accent} size={20} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 600 }}>{t.tdInviteTitle}</span>
        <Icon.ChevronDown color={th.faint} size={16} />
      </button>
      {open && (
        <div style={{ padding: `0 ${SP.md}px ${SP.md}px` }}>
          <textarea value={emails} onChange={e => setEmails(e.target.value)}
            placeholder={t.tdInviteEmails}
            rows={3}
            style={{ width: '100%', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, padding: '10px 12px', resize: 'none', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }} />
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder={t.tdInviteNote}
            style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, padding: '0 12px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }} />
          <button onClick={send} disabled={sending || !emails.trim()}
            style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', cursor: !emails.trim() ? 'default' : 'pointer', background: !emails.trim() ? th.border : `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: !emails.trim() ? th.faint : '#1a0f00', fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {sending ? <Icon.Spinner color={th.faint} size={18} /> : t.tdInviteSend}
          </button>
          {result && (
            <div style={{ marginTop: SP.sm }}>
              {result.sent.map((e, i) => <div key={i} style={{ fontSize: 12, color: th.green, display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}><Icon.Check color={th.green} size={12} />{e}</div>)}
              {result.failed.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#e06060', display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}><Icon.AlertTriangle color="#e06060" size={12} />{e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── TastingDetail (Root) ──────────────────────────────────────────────────
export const TastingDetail: React.FC<Props> = ({ th, t, tastingId, participantId, isHost, onBack, onJoinLive }) => {
  const [tasting, setTasting] = useState<any>(null)
  const [copied, setCopied]   = useState<'code' | 'link' | null>(null)

  useEffect(() => {
    fetch(`/api/tastings/${tastingId}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(setTasting).catch(() => {})
  }, [tastingId])

  const joinLink = `${window.location.origin}/labs-apple?code=${tasting?.code}`

  const copy = async (type: 'code' | 'link') => {
    await navigator.clipboard.writeText(type === 'code' ? tasting?.code : joinLink).catch(() => {})
    setCopied(type); setTimeout(() => setCopied(null), 2000)
  }

  const downloadQR = () => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(joinLink)}&bgcolor=0e0b05&color=d4a847&format=png`
    const a = document.createElement('a'); a.href = url; a.download = `casksense-${tasting?.code}-qr.png`; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  if (!tasting) return (
    <div style={{ minHeight: '100%', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon.Spinner color={th.gold} size={32} />
    </div>
  )

  const statusColor = tasting.status === 'open' ? th.green : tasting.status === 'draft' ? th.gold : th.faint

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px`, borderBottom: `1px solid ${th.border}` }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: 0 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
      </div>

      <div style={{ padding: SP.md }}>
        {/* Title + Status */}
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{tasting.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.lg }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: statusColor }} />
          <span style={{ fontSize: 13, color: statusColor, fontWeight: 600 }}>{tasting.status}</span>
          {tasting.date && <span style={{ fontSize: 13, color: th.faint }}>· {new Date(tasting.date).toLocaleDateString('de')}</span>}
          {tasting.location && <span style={{ fontSize: 13, color: th.faint }}>· {tasting.location}</span>}
        </div>

        {/* QR Code */}
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg, textAlign: 'center', marginBottom: SP.md }}>
          <QRDisplay th={th} value={joinLink} size={180} />
          <div style={{ marginTop: SP.md, display: 'flex', justifyContent: 'center', gap: SP.sm }}>
            <button onClick={() => copy('link')} style={{ height: 40, padding: '0 16px', borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', cursor: 'pointer', color: th.muted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              {copied === 'link' ? <Icon.Check color={th.green} size={14} /> : <Icon.Copy color={th.muted} size={14} />}
              {copied === 'link' ? t.tdCopied : t.tdCopyLink}
            </button>
            <button onClick={downloadQR} style={{ height: 40, padding: '0 16px', borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', cursor: 'pointer', color: th.muted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon.Download color={th.muted} size={14} />{t.tdDownloadQR}
            </button>
          </div>
        </div>

        {/* Join Code */}
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.md }}>
          <div style={{ fontSize: 11, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.sm }}>{t.tdJoinCode}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
            <div style={{ flex: 1, fontFamily: 'Playfair Display, serif', fontSize: 36, fontWeight: 700, color: th.gold, letterSpacing: '0.12em' }}>{tasting.code}</div>
            <button onClick={() => copy('code')} style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {copied === 'code' ? <Icon.Check color={th.green} size={18} /> : <Icon.Copy color={th.muted} size={18} />}
            </button>
          </div>
        </div>

        {/* Invite Panel (host only) */}
        {isHost && <InvitePanel th={th} t={t} tastingId={tastingId} participantId={participantId} />}

        {/* CTA */}
        {(tasting.status === 'open' || tasting.status === 'draft') && (
          <button onClick={onJoinLive} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', marginTop: SP.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon.Live color="#1a0f00" size={20} />{t.tdJoinLive}
          </button>
        )}
      </div>
    </div>
  )
}
