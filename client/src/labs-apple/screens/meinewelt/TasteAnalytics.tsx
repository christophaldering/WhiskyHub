// CaskSense Apple — TasteAnalytics
// SVG Zeitreihen-Chart + Trendanalyse + Konsistenz-Karte
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }
interface DataPoint { month: string; avg: number; count: number }

function detectTrend(pts: DataPoint[]): 'rising' | 'dropping' | 'stable' {
  if (pts.length < 4) return 'stable'
  const recent  = pts.slice(-3).reduce((a, b) => a + b.avg, 0) / 3
  const earlier = pts.slice(-6, -3).reduce((a, b) => a + b.avg, 0) / Math.max(pts.slice(-6, -3).length, 1)
  if (recent - earlier > 1.5) return 'rising'
  if (earlier - recent > 1.5) return 'dropping'
  return 'stable'
}

function stdDev(pts: DataPoint[]): number {
  if (pts.length < 2) return 0
  const m = pts.reduce((a, b) => a + b.avg, 0) / pts.length
  return Math.sqrt(pts.reduce((a, b) => a + Math.pow(b.avg - m, 2), 0) / pts.length)
}

export const TasteAnalytics: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [data, setData]     = useState<DataPoint[]>([])
  const [ratingCount, setCount] = useState(0)
  const [insight, setInsight]   = useState<{ message: string; type: string } | null>(null)

  function mockData(): DataPoint[] {
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (7 - i))
      return { month: d.toLocaleDateString('de', { month: 'short', year: '2-digit' }), avg: 75 + Math.random() * 12, count: Math.floor(Math.random() * 5) + 1 }
    })
  }

  useEffect(() => {
    fetch(`/api/participants/${participantId}/insights`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(d => { if (d?.message) setInsight(d) }).catch(() => {})
    fetch(`/api/participants/${participantId}/flavor-profile?period=all`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json())
      .then(d => { setData(d?.timeSeries || mockData()); setCount(d?.ratingCount || 0) })
      .catch(() => { setData(mockData()) })
  }, [participantId])

  const trend = detectTrend(data)
  const sd    = stdDev(data)
  const consistency = Math.max(0, Math.round(100 - sd * 5))

  const W = 340, H = 160, PAD = 24
  const toX = (i: number) => PAD + (data.length > 1 ? i * (W - PAD * 2) / (data.length - 1) : 0)
  const toY = (v: number) => H - PAD - ((v - 60) / 40) * (H - PAD * 2)
  const pathD = data.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(pt.avg)}`).join(' ')

  const TrendIcon = trend === 'rising' ? Icon.TrendUp : trend === 'dropping' ? Icon.TrendDown : Icon.Analytics
  const trendColor = trend === 'rising' ? th.green : trend === 'dropping' ? '#e06060' : th.gold
  const trendLabel = trend === 'rising' ? t.mwTrendRising : trend === 'dropping' ? t.mwTrendDropping : t.mwTrendStable

  if (ratingCount < 10) return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.lg}px` }}>{t.mwAnalyticsTitle}</h1>
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.xl, textAlign: 'center' }}>
        <Icon.Lock color={th.faint} size={32} />
        <div style={{ fontSize: 15, color: th.muted, margin: `${SP.md}px 0 ${SP.sm}px` }}>{t.mwUnlockAt}</div>
        <div style={{ height: 6, borderRadius: 3, background: th.border, overflow: 'hidden', maxWidth: 200, margin: '0 auto' }}>
          <div style={{ width: `${Math.min(ratingCount, 10) * 10}%`, height: '100%', background: th.phases.overall.accent }} />
        </div>
        <div style={{ fontSize: 12, color: th.faint, marginTop: SP.xs }}>{t.mwUnlockProgress.replace('{n}', String(Math.max(0, 10 - ratingCount)))}</div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.mwAnalyticsTitle}</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>{t.mwAnalyticsSub}</p>

      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md, marginBottom: SP.md, overflow: 'hidden' }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {[70, 75, 80, 85, 90].map(v => (
            <g key={v}>
              <line x1={PAD} y1={toY(v)} x2={W - PAD} y2={toY(v)} stroke={th.border} strokeWidth="1" />
              <text x={PAD - 4} y={toY(v) + 4} textAnchor="end" fontSize="9" fill={th.faint}>{v}</text>
            </g>
          ))}
          {data.length > 1 && <path d={`${pathD} L ${toX(data.length - 1)} ${H - PAD} L ${toX(0)} ${H - PAD} Z`} fill={`${th.gold}15`} />}
          {data.length > 1 && <path d={pathD} fill="none" stroke={th.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          {data.map((pt, i) => <circle key={i} cx={toX(i)} cy={toY(pt.avg)} r="4" fill={th.gold} />)}
          {data.map((pt, i) => <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="9" fill={th.faint}>{pt.month}</text>)}
        </svg>
      </div>

      {/* AI Insight Card */}
      {insight && (
        <div style={{ background: `${th.phases.palate.dim}`, border: `1px solid ${th.phases.palate.accent}44`, borderRadius: 16, padding: SP.md, marginBottom: SP.md, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Icon.Insight color={th.phases.palate.accent} size={20} />
          <div>
            <div style={{ fontSize: 11, color: th.phases.palate.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              KI-Analyse · {insight.type || 'Insight'}
            </div>
            <div style={{ fontSize: 14, color: th.muted, lineHeight: 1.5, fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic' }}>{insight.message}</div>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.md }}>
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md }}>
          <TrendIcon color={trendColor} size={24} />
          <div style={{ fontSize: 14, fontWeight: 700, color: trendColor, marginTop: SP.xs }}>{trendLabel}</div>
          <div style={{ fontSize: 11, color: th.faint }}>Letzte 3 Monate</div>
        </div>
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, border: `3px solid ${consistency > 70 ? th.green : consistency > 50 ? th.gold : th.amber}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: SP.xs }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: th.text }}>{consistency}</span>
          </div>
          <div style={{ fontSize: 11, color: th.faint, textAlign: 'center' }}>{t.mwConsistency}</div>
        </div>
      </div>

      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md }}>
        <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Statistiken</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
          {[
            { label: 'Bewertungen', value: ratingCount },
            { label: 'Monate aktiv', value: data.filter(d => d.count > 0).length },
            { label: 'Ø / Monat', value: data.length > 0 ? Math.round(data.reduce((a, b) => a + b.count, 0) / data.length) : 0 },
            { label: 'Std.-Abw.', value: sd.toFixed(1) },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 18, fontWeight: 700, color: th.gold }}>{s.value}</div>
              <div style={{ fontSize: 11, color: th.faint }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
