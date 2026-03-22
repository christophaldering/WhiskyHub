// CaskSense Apple — HostDashboard
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

function getBandColor(s: number) {
  if (s >= 90) return '#d4a847'; if (s >= 80) return '#86c678'; if (s >= 70) return '#7ab8c4'
  return 'rgba(200,180,160,0.5)'
}

export const HostDashboard: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [tastings, setTastings] = useState<any[]>([])
  const [stats, setStats]       = useState({ totalTastings: 0, totalGuests: 0, totalWhiskies: 0, avgScore: 0 })
  const [topWhiskies, setTop]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tastings', { headers: { 'x-participant-id': participantId } })
        const data = await res.json() || []
        setTastings(data.slice(0, 10))
        // Compute stats from tastings
        setStats({
          totalTastings: data.length,
          totalGuests: data.reduce((s: number, t: any) => s + (t.participantCount || 0), 0),
          totalWhiskies: data.reduce((s: number, t: any) => s + (t.whiskeyCount || 0), 0),
          avgScore: 0,
        })
      } catch { } finally { setLoading(false) }
    }
    load()
  }, [participantId])

  return (
    <div style={{ padding: SP.md, paddingBottom: 80, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.lg}px` }}>
        Host Dashboard
      </h1>

      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: SP.xs, marginBottom: SP.lg }}>
        {[
          { icon: <Icon.TabTastings color={th.gold} size={20} />, label: 'Tastings', value: stats.totalTastings },
          { icon: <Icon.Users color={th.phases.nose.accent} size={20} />, label: 'Gäste', value: stats.totalGuests },
          { icon: <Icon.Whisky color={th.phases.finish.accent} size={20} />, label: 'Whiskies', value: stats.totalWhiskies },
        ].map((s, i) => (
          <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.sm, textAlign: 'center' }}>
            <div style={{ marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: th.gold, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: th.faint }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: SP.xl }}><Icon.Spinner color={th.gold} size={28} /></div>}

      {/* Recent tastings */}
      {tastings.length > 0 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md, marginBottom: SP.md }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.md }}>
            Letzte Tastings
          </div>
          {tastings.map((tasting, i) => {
            const statusColor = tasting.status === 'open' ? th.green : tasting.status === 'draft' ? th.gold : th.faint
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: i < tastings.length - 1 ? `1px solid ${th.border}` : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{tasting.name}</div>
                  <div style={{ fontSize: 11, color: th.faint }}>{tasting.date}{tasting.location ? ` · ${tasting.location}` : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm }}>
                  {tasting.participantCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: th.faint }}>
                      <Icon.Users color={th.faint} size={12} />{tasting.participantCount}
                    </div>
                  )}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: statusColor + '20', color: statusColor }}>{tasting.status}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Score bar chart */}
      {tastings.some(t => t.avgScore) && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.md }}>
            Durchschnitts-Scores
          </div>
          {tastings.filter(t => t.avgScore).map((tasting, i) => {
            const pct = ((tasting.avgScore - 60) / 40) * 100
            return (
              <div key={i} style={{ marginBottom: SP.sm }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: th.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tasting.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: getBandColor(tasting.avgScore), marginLeft: 8 }}>{Math.round(tasting.avgScore)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: th.border, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${th.gold}88, ${th.gold})` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
