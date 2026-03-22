// CaskSense Apple — Recommendations
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

const FACTORS = [
  { id: 'region',  label: 'Region'    },
  { id: 'cask',    label: 'Fass'      },
  { id: 'peat',    label: 'Torf'      },
  { id: 'age',     label: 'Alter'     },
  { id: 'abv',     label: 'Alkohol'   },
]

export const Recommendations: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [recos, setRecos]     = useState<any[]>([])
  const [factors, setFactors] = useState<Record<string, boolean>>({ region: true, cask: true, peat: true, age: false, abv: false })
  const [ratingCount, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/participants/${participantId}/recommendations`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json())
      .then(d => { setRecos(d?.recommendations || d || []); setCount(d?.ratingCount || 12) })
      .catch(() => {
        // Demo data
        setRecos([
          { name: 'Glenfarclas 15', distillery: 'Glenfarclas', region: 'Speyside', matchScore: 94, reason: 'Passt zu deiner Sherry-Präferenz und Speyside-Affinität.' },
          { name: 'GlenDronach 12', distillery: 'GlenDronach', region: 'Highland', matchScore: 88, reason: 'Kräftiger Sherryfass-Charakter, ähnlich deinen Top-Bewertungen.' },
          { name: 'Springbank 10', distillery: 'Springbank', region: 'Campbeltown', matchScore: 82, reason: 'Komplexität und Balance liegen in deinem Sweet Spot.' },
          { name: 'Aberfeldy 12', distillery: 'Aberfeldy', region: 'Highland', matchScore: 77, reason: 'Honig-Noten und milde Würze nach deinem Geschmack.' },
          { name: 'Glenmorangie 10', distillery: 'Glenmorangie', region: 'Highland', matchScore: 74, reason: 'Zugänglich und elegant — gut für deinen Einstieg in Highlands.' },
        ]); setCount(12)
      })
      .finally(() => setLoading(false))
  }, [participantId])

  if (ratingCount < 10) return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.lg}px` }}>{t.mwRecoTitle}</h1>
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.xl, textAlign: 'center' }}>
        <Icon.Lock color={th.faint} size={32} />
        <div style={{ fontSize: 15, color: th.muted, margin: `${SP.md}px 0 ${SP.sm}px` }}>{t.mwRecoLocked}</div>
        <div style={{ height: 6, borderRadius: 3, background: th.border, overflow: 'hidden', maxWidth: 200, margin: '0 auto' }}>
          <div style={{ width: `${Math.min(ratingCount, 10) * 10}%`, height: '100%', background: th.phases.overall.accent }} />
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.mwRecoTitle}</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>{t.mwRecoSub}</p>

      {/* Factor toggles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.xs, marginBottom: SP.lg }}>
        {FACTORS.map(f => (
          <button key={f.id} onClick={() => setFactors(prev => ({ ...prev, [f.id]: !prev[f.id] }))}
            style={{ height: 44, padding: '0 16px', borderRadius: 22, cursor: 'pointer', border: 'none', background: factors[f.id] ? th.phases.palate.dim : th.bgCard, color: factors[f.id] ? th.phases.palate.accent : th.faint, fontSize: 13, fontWeight: factors[f.id] ? 700 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms' }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: SP.xl }}><Icon.Spinner color={th.gold} size={28} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
          {recos.map((r, i) => (
            <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md, animation: `fadeUp 300ms ease ${i * 60}ms both` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SP.sm }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: th.faint }}>{r.distillery}{r.region ? ` · ${r.region}` : ''}</div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: r.matchScore >= 90 ? th.gold : r.matchScore >= 80 ? th.green : th.muted, lineHeight: 1 }}>{r.matchScore}%</div>
                  <div style={{ fontSize: 10, color: th.faint }}>Match</div>
                </div>
              </div>
              {/* Match bar */}
              <div style={{ height: 4, borderRadius: 2, background: th.border, marginBottom: SP.xs, overflow: 'hidden' }}>
                <div style={{ width: `${r.matchScore}%`, height: '100%', background: r.matchScore >= 90 ? `linear-gradient(90deg, ${th.gold}, ${th.amber})` : th.phases.overall.accent, transition: 'width 0.6s ease' }} />
              </div>
              {r.reason && <div style={{ fontSize: 13, color: th.muted, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', lineHeight: 1.5 }}>{r.reason}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
