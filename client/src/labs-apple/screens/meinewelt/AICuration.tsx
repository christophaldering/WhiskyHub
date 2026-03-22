// CaskSense Apple — AICuration (Phase C)
// KI-gestützte Whisky-Empfehlungen basierend auf Lineup-Kontext
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const AICuration: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [tastings, setTastings]   = useState<any[]>([])
  const [selected, setSelected]   = useState<string>('')
  const [curations, setCurations] = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/tastings?participantId=${participantId}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(d => setTastings(d || [])).catch(() => {})
  }, [participantId])

  const generate = async () => {
    if (!selected) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/tastings/${selected}/ai-curation`, { method: 'POST', headers: { 'x-participant-id': participantId } })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Fehler') }
      const data = await res.json()
      setCurations(data?.suggestions || data || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>KI-Kuration</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>Wähle ein Tasting — die KI empfiehlt passende Ergänzungen zum Lineup.</p>

      {/* Tasting picker */}
      <div style={{ marginBottom: SP.md }}>
        <select value={selected} onChange={e => setSelected(e.target.value)} style={{ width: '100%', height: 52, borderRadius: 14, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '0 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}>
          <option value="">Tasting auswählen…</option>
          {tastings.map(ta => <option key={ta.id} value={ta.id}>{ta.name}</option>)}
        </select>
      </div>

      <button onClick={generate} disabled={!selected || loading} style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: !selected ? 'default' : 'pointer', background: !selected ? th.bgCard : `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: !selected ? th.faint : '#1a0f00', fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', marginBottom: SP.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <><Icon.Spinner color={th.faint} size={20} />KI denkt nach…</> : 'Empfehlungen generieren'}
      </button>

      {error && <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(200,60,60,0.12)', border: '1px solid rgba(200,60,60,0.3)', marginBottom: SP.md, fontSize: 14, color: '#e06060' }}>{error}</div>}

      {curations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
          {curations.map((c, i) => (
            <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md, animation: `fadeUp 300ms ease ${i * 60}ms both` }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700, marginBottom: SP.xs }}>{c.name || c.whiskyName || '—'}</div>
              {(c.distillery || c.region) && <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm }}>{[c.distillery, c.region].filter(Boolean).join(' · ')}</div>}
              {c.reason && <div style={{ fontSize: 14, color: th.muted, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', lineHeight: 1.5 }}>{c.reason}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
