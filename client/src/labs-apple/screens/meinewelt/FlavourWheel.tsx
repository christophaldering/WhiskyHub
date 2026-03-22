// CaskSense Apple — FlavourWheel (reines CSS/SVG, kein Recharts nötig)
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import { FLAVOR_CATEGORIES } from '../../data/flavor-data'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; lang: 'de' | 'en'; onBack: () => void }

interface CatCount { id: string; label: string; count: number; color: string; descriptors: { label: string; count: number }[] }

export const FlavourWheel: React.FC<Props> = ({ th, t, participantId, lang, onBack }) => {
  const [data, setData]       = useState<CatCount[]>([])
  const [active, setActive]   = useState<string | null>(null)
  const [hidden, setHidden]   = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/journal?limit=500`, { headers: { 'x-participant-id': participantId } })
        const entries = (await res.json()) || []
        // Count tag frequencies
        const tagCounts = new Map<string, number>()
        entries.forEach((e: any) => {
          const tags: string[] = []
          if (e.flavorTags) {
            if (typeof e.flavorTags === 'string') tags.push(...e.flavorTags.split(',').map((s: string) => s.trim()))
            else if (Array.isArray(e.flavorTags)) tags.push(...e.flavorTags.flat())
          }
          const notes = [e.notes, e.noseNotes, e.palateNotes, e.finishNotes].filter(Boolean).join(' ')
          FLAVOR_CATEGORIES.forEach(cat => {
            cat.descriptors.forEach(d => {
              const term = lang === 'de' ? d.de : d.en
              if (tags.includes(term) || notes.toLowerCase().includes(term.toLowerCase())) {
                tagCounts.set(term, (tagCounts.get(term) || 0) + 1)
              }
            })
          })
        })
        // Build cat data
        const catData: CatCount[] = FLAVOR_CATEGORIES.map(cat => {
          const descriptors = cat.descriptors.map(d => {
            const label = lang === 'de' ? d.de : d.en
            return { label, count: tagCounts.get(label) || 0 }
          }).filter(d => d.count > 0).sort((a, b) => b.count - a.count)
          const count = descriptors.reduce((s, d) => s + d.count, 0)
          return { id: cat.id, label: lang === 'de' ? cat.de : cat.en, count, color: cat.color, descriptors }
        }).filter(c => c.count > 0).sort((a, b) => b.count - a.count)
        setData(catData)
      } catch { } finally { setLoading(false) }
    }
    load()
  }, [participantId, lang])

  const visible = data.filter(c => !hidden.has(c.id))
  const total = visible.reduce((s, c) => s + c.count, 0)
  const topCat = data[0]
  const totalMentions = data.reduce((s, c) => s + c.count, 0)

  // SVG donut chart
  const SIZE = 220, CX = 110, CY = 110, R_OUTER = 90, R_INNER = 52
  let angle = -Math.PI / 2
  const slices = visible.map(cat => {
    const frac = total > 0 ? cat.count / total : 0
    const sweep = frac * Math.PI * 2
    const start = angle
    angle += sweep
    const x1 = CX + R_OUTER * Math.cos(start)
    const y1 = CY + R_OUTER * Math.sin(start)
    const x2 = CX + R_OUTER * Math.cos(start + sweep)
    const y2 = CY + R_OUTER * Math.sin(start + sweep)
    const xi1 = CX + R_INNER * Math.cos(start + sweep)
    const yi1 = CY + R_INNER * Math.sin(start + sweep)
    const xi2 = CX + R_INNER * Math.cos(start)
    const yi2 = CY + R_INNER * Math.sin(start)
    const large = sweep > Math.PI ? 1 : 0
    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${xi1.toFixed(2)} ${yi1.toFixed(2)} A ${R_INNER} ${R_INNER} 0 ${large} 0 ${xi2.toFixed(2)} ${yi2.toFixed(2)} Z`
    return { ...cat, d, midAngle: start + sweep / 2 }
  })

  const activeData = active ? data.find(c => c.id === active) : null

  return (
    <div style={{ padding: SP.md, paddingBottom: 80, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.mwWheelTitle}</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>{t.mwWheelSub}</p>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Icon.Spinner color={th.gold} size={32} /></div>}

      {!loading && data.length === 0 && (
        <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>
          {lang === 'de' ? 'Noch keine Aroma-Daten vorhanden.' : 'No aroma data yet.'}
        </div>
      )}

      {!loading && data.length > 0 && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: SP.xs, marginBottom: SP.lg }}>
            {[
              { label: lang === 'de' ? 'Gesamt' : 'Total', value: totalMentions },
              { label: lang === 'de' ? 'Top-Aroma' : 'Top aroma', value: topCat?.label || '—' },
              { label: lang === 'de' ? 'Kategorien' : 'Categories', value: data.length },
            ].map((s, i) => (
              <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 12, padding: `${SP.sm}px`, textAlign: 'center' }}>
                <div style={{ fontSize: i === 1 ? 11 : 20, fontWeight: 700, color: th.gold, lineHeight: 1.2, marginBottom: 3, wordBreak: 'break-word' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: th.faint }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Donut chart */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: SP.md }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              {slices.map((s, i) => (
                <path key={i} d={s.d} fill={s.color} fillOpacity={active === s.id ? 1 : active ? 0.35 : 0.75}
                  stroke={th.bg} strokeWidth={2} style={{ cursor: 'pointer', transition: 'fill-opacity 200ms' }}
                  onClick={() => setActive(active === s.id ? null : s.id)} />
              ))}
              {/* Center */}
              <circle cx={CX} cy={CY} r={R_INNER - 2} fill={th.bg} />
              {activeData ? (
                <>
                  <text x={CX} y={CY - 8} textAnchor="middle" fill={activeData.color} fontSize={13} fontWeight={700}>{activeData.label}</text>
                  <text x={CX} y={CY + 10} textAnchor="middle" fill={th.muted} fontSize={11}>{activeData.count}</text>
                </>
              ) : (
                <text x={CX} y={CY + 5} textAnchor="middle" fill={th.faint} fontSize={12}>{totalMentions}</text>
              )}
            </svg>
          </div>

          {/* Active category detail */}
          {activeData && (
            <div style={{ background: th.bgCard, border: `1px solid ${activeData.color}44`, borderRadius: 16, padding: SP.md, marginBottom: SP.md }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: activeData.color, marginBottom: SP.sm }}>{activeData.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.xs }}>
                {activeData.descriptors.slice(0, 10).map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12, background: activeData.color + '15', border: `1px solid ${activeData.color}33` }}>
                    <span style={{ fontSize: 12, color: th.text }}>{d.label}</span>
                    <span style={{ fontSize: 10, color: activeData.color, fontWeight: 700 }}>×{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend toggles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.xs }}>
            {data.map((cat, i) => (
              <button key={i} onClick={() => setHidden(h => { const n = new Set(h); n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id); return n })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', borderRadius: 18, border: `1px solid ${hidden.has(cat.id) ? th.border : cat.color + '66'}`, background: hidden.has(cat.id) ? 'none' : cat.color + '12', cursor: 'pointer', opacity: hidden.has(cat.id) ? 0.4 : 1, transition: 'all 150ms' }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: cat.color }} />
                <span style={{ fontSize: 12, color: th.text }}>{cat.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
