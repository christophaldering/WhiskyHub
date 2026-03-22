// CaskSense Apple — WhiskyCompare (Du vs. Plattform + Radar Overlay)
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; lang: 'de' | 'en'; onBack: () => void }

interface CompareEntry {
  id: string; name: string; distillery?: string; region?: string
  yourScore: number; platformScore: number; delta: number
  dimensions?: Record<string, number>
}

type SortMode = 'delta-desc' | 'delta-asc' | 'your' | 'platform' | 'alpha'
type Direction = 'all' | 'above' | 'below'

// Simple SVG Radar
const RadarChart: React.FC<{ entries: CompareEntry[]; th: ThemeTokens; size?: number }> = ({ entries, th, size = 200 }) => {
  const dims = ['nose', 'palate', 'finish', 'overall']
  const labels = ['Nase', 'Gaumen', 'Abgang', 'Gesamt']
  const CX = size / 2, CY = size / 2, R = size * 0.38
  const colors = [th.gold, th.phases.nose.accent, '#86c678', th.phases.finish.accent]

  const angleFor = (i: number) => (i / dims.length) * Math.PI * 2 - Math.PI / 2
  const toXY = (angle: number, r: number) => ({ x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) })

  const normalize = (v: number) => Math.max(0, Math.min(1, (v - 60) / 40))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={dims.map((_, i) => { const { x, y } = toXY(angleFor(i), R * f); return `${x},${y}` }).join(' ')} fill="none" stroke={th.border} strokeWidth={1} />
      ))}
      {/* Axes */}
      {dims.map((_, i) => {
        const { x, y } = toXY(angleFor(i), R)
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke={th.border} strokeWidth={1} />
      })}
      {/* Labels */}
      {dims.map((_, i) => {
        const { x, y } = toXY(angleFor(i), R + 16)
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={th.faint} fontSize={9}>{labels[i]}</text>
      })}
      {/* Polygons */}
      {entries.slice(0, 3).map((entry, ei) => {
        const points = dims.map((dim, i) => {
          const val = entry.dimensions?.[dim] || entry.yourScore
          const { x, y } = toXY(angleFor(i), R * normalize(val))
          return `${x},${y}`
        }).join(' ')
        return (
          <polygon key={ei} points={points} fill={colors[ei]} fillOpacity={0.15} stroke={colors[ei]} strokeWidth={2} />
        )
      })}
    </svg>
  )
}

function getBandColor(d: number) { return d > 3 ? '#86c678' : d < -3 ? '#e06060' : '#d4a847' }

export const WhiskyCompare: React.FC<Props> = ({ th, t, participantId, lang, onBack }) => {
  const [entries, setEntries] = useState<CompareEntry[]>([])
  const [search, setSearch]   = useState('')
  const [sort, setSort]       = useState<SortMode>('delta-desc')
  const [dir, setDir]         = useState<Direction>('all')
  const [radarSelection, setRadarSel] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/participants/${participantId}/compare`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [participantId])

  const filtered = entries
    .filter(e => !search || (e.name || '').toLowerCase().includes(search.toLowerCase()))
    .filter(e => dir === 'all' || (dir === 'above' ? e.delta > 0 : e.delta < 0))
    .sort((a, b) => {
      if (sort === 'delta-desc') return b.delta - a.delta
      if (sort === 'delta-asc')  return a.delta - b.delta
      if (sort === 'your')       return b.yourScore - a.yourScore
      if (sort === 'platform')   return b.platformScore - a.platformScore
      return a.name.localeCompare(b.name)
    })

  const radarEntries = entries.filter(e => radarSelection.includes(e.id))

  const exportCSV = () => {
    const rows = [['Name', 'Your Score', 'Platform', 'Delta'], ...filtered.map(e => [e.name, e.yourScore, e.platformScore, e.delta])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'whisky-compare.csv'; a.click()
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.mwCompareTitle}</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>{t.mwCompareSub}</p>

      {/* Filters */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={lang === 'de' ? 'Whisky suchen...' : 'Search whisky...'} style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, padding: '0 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }} />

      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.sm, flexWrap: 'wrap' }}>
        {([['delta-desc', '▼ Delta'], ['delta-asc', '▲ Delta'], ['your', 'Mein Score'], ['alpha', 'A–Z']] as [SortMode, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setSort(id)} style={{ height: 36, padding: '0 12px', borderRadius: 18, border: 'none', cursor: 'pointer', background: sort === id ? th.gold : th.bgCard, color: sort === id ? '#1a0f00' : th.muted, fontSize: 12, fontWeight: sort === id ? 700 : 400 }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.lg }}>
        {([['all', lang === 'de' ? 'Alle' : 'All'], ['above', '▲ Drüber'], ['below', '▼ Drunter']] as [Direction, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setDir(id)} style={{ height: 32, padding: '0 12px', borderRadius: 16, border: `1px solid ${dir === id ? th.phases.nose.accent : th.border}`, background: dir === id ? th.phases.nose.dim : 'none', cursor: 'pointer', color: dir === id ? th.phases.nose.accent : th.muted, fontSize: 12 }}>{label}</button>
        ))}
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: SP.xl }}><Icon.Spinner color={th.gold} size={28} /></div>}

      {/* List */}
      {filtered.map((entry, i) => {
        const inRadar = radarSelection.includes(entry.id)
        const pctYou  = ((entry.yourScore - 60) / 40) * 100
        const pctPlat = ((entry.platformScore - 60) / 40) * 100
        return (
          <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, marginBottom: SP.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SP.sm }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{entry.name}</div>
                {entry.region && <div style={{ fontSize: 11, color: th.faint }}>{entry.region}</div>}
              </div>
              <div style={{ display: 'flex', gap: SP.sm, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: getBandColor(entry.delta) + '20', color: getBandColor(entry.delta) }}>
                  {entry.delta > 0 ? '+' : ''}{entry.delta}
                </span>
                <button onClick={() => setRadarSel(s => s.includes(entry.id) ? s.filter(x => x !== entry.id) : s.length < 3 ? [...s, entry.id] : s)}
                  style={{ height: 32, width: 32, borderRadius: 16, border: `1px solid ${inRadar ? th.gold : th.border}`, background: inRadar ? `${th.gold}20` : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon.Compare color={inRadar ? th.gold : th.faint} size={14} />
                </button>
              </div>
            </div>
            {/* Dual bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: th.gold, width: 28, textAlign: 'right' }}>{entry.yourScore}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: th.border, overflow: 'hidden' }}>
                  <div style={{ width: `${pctYou}%`, height: '100%', background: th.gold }} />
                </div>
                <span style={{ fontSize: 10, color: th.faint, width: 20 }}>Du</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: th.phases.nose.accent, width: 28, textAlign: 'right' }}>{entry.platformScore}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: th.border, overflow: 'hidden' }}>
                  <div style={{ width: `${pctPlat}%`, height: '100%', background: th.phases.nose.accent }} />
                </div>
                <span style={{ fontSize: 10, color: th.faint, width: 20 }}>Ø</span>
              </div>
            </div>
          </div>
        )
      })}

      {/* Radar overlay */}
      {radarEntries.length > 0 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md, marginTop: SP.lg }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: th.muted, marginBottom: SP.md }}>
            {lang === 'de' ? 'Radar-Vergleich' : 'Radar comparison'} ({radarEntries.length})
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart entries={radarEntries} th={th} size={200} />
          </div>
          <div style={{ display: 'flex', gap: SP.sm, flexWrap: 'wrap', marginTop: SP.sm }}>
            {radarEntries.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: th.muted }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: [th.gold, th.phases.nose.accent, '#86c678'][i] }} />
                {e.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV Export */}
      {filtered.length > 0 && (
        <button onClick={exportCSV} style={{ marginTop: SP.lg, display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 14 }}>
          <Icon.Download color={th.muted} size={16} />CSV Export
        </button>
      )}
    </div>
  )
}
