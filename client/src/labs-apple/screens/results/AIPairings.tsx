// CaskSense Apple — AIPairings
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; lang: 'de' | 'en'; onBack: () => void }

export const AIPairings: React.FC<Props> = ({ th, t, participantId, lang, onBack }) => {
  const [tastings, setTastings]   = useState<any[]>([])
  const [selected, setSelected]   = useState<string | null>(null)
  const [pairings, setPairings]   = useState<any[]>([])
  const [loading, setLoading]     = useState(false)
  const [loadingTast, setLT]      = useState(true)

  useEffect(() => {
    fetch('/api/tastings', { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => setTastings((data || []).filter((t: any) => t.status !== 'draft').slice(0, 10))).catch(() => {}).finally(() => setLT(false))
  }, [participantId])

  const loadPairings = async (tastingId: string) => {
    setSelected(tastingId); setLoading(true); setPairings([])
    try {
      const res = await fetch(`/api/tastings/${tastingId}/pairings`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId }, body: JSON.stringify({ language: lang }) })
      const data = await res.json()
      setPairings(data?.pairings || [])
    } catch { } finally { setLoading(false) }
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>
        {lang === 'de' ? 'Food Pairings' : 'Food Pairings'}
      </h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>
        {lang === 'de' ? 'KI-Empfehlungen für dein Lineup' : 'AI recommendations for your lineup'}
      </p>

      {/* Tasting selection */}
      <div style={{ marginBottom: SP.lg }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.sm }}>
          {lang === 'de' ? 'Tasting auswählen' : 'Select tasting'}
        </div>
        {loadingTast && <Icon.Spinner color={th.gold} size={24} />}
        {tastings.map(tasting => (
          <button key={tasting.id} onClick={() => loadPairings(tasting.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${SP.sm}px ${SP.md}px`, minHeight: 52, background: selected === tasting.id ? th.phases.palate.dim : th.bgCard, border: `1px solid ${selected === tasting.id ? th.phases.palate.accent : th.border}`, borderRadius: 14, cursor: 'pointer', marginBottom: SP.xs, transition: 'all 150ms' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{tasting.name}</div>
              <div style={{ fontSize: 11, color: th.faint }}>{tasting.date}</div>
            </div>
            {selected === tasting.id && loading ? <Icon.Spinner color={th.gold} size={18} /> : <Icon.ChevronRight color={th.faint} size={16} />}
          </button>
        ))}
      </div>

      {/* Pairings */}
      {pairings.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.md }}>
            {lang === 'de' ? 'Pairing-Vorschläge' : 'Pairing Suggestions'}
          </div>
          {pairings.map((p: any, i: number) => (
            <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.sm }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: SP.xs }}>{p.whiskyName || `Whisky ${i + 1}`}</div>
              {p.suggestions?.map((s: any, j: number) => (
                <div key={j} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: j > 0 ? `1px solid ${th.border}` : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: th.gold, marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s.food || s.name}</div>
                    <div style={{ fontSize: 13, color: th.muted, lineHeight: 1.5 }}>{s.reason || s.description}</div>
                  </div>
                </div>
              ))}
              {typeof p === 'string' && <div style={{ fontSize: 14, color: th.muted, lineHeight: 1.6 }}>{p}</div>}
            </div>
          ))}
        </div>
      )}

      {selected && !loading && pairings.length === 0 && (
        <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 15 }}>
          {lang === 'de' ? 'Keine Pairings gefunden.' : 'No pairings found.'}
        </div>
      )}
    </div>
  )
}
