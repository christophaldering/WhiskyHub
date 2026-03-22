// CaskSense Apple — TastingRecap (Phase C)
// Post-Session Zusammenfassung mit Medaillen + Export
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens; t: Translations
  tastingId: string; participantId: string; onBack: () => void
}

export const TastingRecap: React.FC<Props> = ({ th, t, tastingId, participantId, onBack }) => {
  const [tasting, setTasting]   = useState<any>(null)
  const [whiskies, setWhiskies] = useState<any[]>([])
  const [ratings, setRatings]   = useState<any[]>([])
  const [parts, setParts]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/tastings/${tastingId}`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
      fetch(`/api/tastings/${tastingId}/whiskies`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
      fetch(`/api/tastings/${tastingId}/ratings`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
      fetch(`/api/tastings/${tastingId}/participants`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
    ]).then(([ta, wh, ra, pa]) => {
      setTasting(ta); setWhiskies(wh || []); setRatings(ra || []); setParts(pa || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [tastingId])

  // Calculate averages
  const avgScore = (wid: string) => {
    const rs = ratings.filter(r => r.whiskeyId === wid && r.dimension === 'overall')
    if (!rs.length) return null
    return Math.round(rs.reduce((a, b) => a + (b.score || 0), 0) / rs.length)
  }
  const variance = (wid: string) => {
    const scores = ratings.filter(r => r.whiskeyId === wid && r.dimension === 'overall').map(r => r.score || 0)
    if (scores.length < 2) return 0
    const m = scores.reduce((a, b) => a + b, 0) / scores.length
    return Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - m, 2), 0) / scores.length)
  }

  const ranked = whiskies
    .map(w => ({ ...w, avg: avgScore(w.id), var: variance(w.id) }))
    .filter(w => w.avg !== null)
    .sort((a, b) => (b.avg || 0) - (a.avg || 0))

  const medals = ['Gold', 'Silber', 'Bronze']
  const medalColors = [th.gold, '#a8b8c8', '#c47a3a']

  const print = () => {
    setPrinting(true)
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recap — ${tasting?.name}</title>
    <style>body{font-family:Arial,sans-serif;margin:20px;color:#1a1a1a}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px;border:1px solid #ccc;text-align:left}@media print{button{display:none}}</style></head><body>
    <h1>${tasting?.name || 'Tasting'}</h1>
    <p>${new Date(tasting?.date || '').toLocaleDateString('de')} · ${parts.length} Teilnehmer · ${whiskies.length} Whiskies</p>
    <table><tr><th>#</th><th>Whisky</th><th>Ø Score</th><th>Streuung</th></tr>
    ${ranked.map((w, i) => `<tr><td>${i+1}</td><td>${w.name || `Dram ${i+1}`}</td><td>${w.avg}</td><td>${w.var.toFixed(1)}</td></tr>`).join('')}
    </table><script>setTimeout(()=>window.print(),400)</script></body></html>`
    const win = window.open('', '_blank'); if (win) { win.document.write(html); win.document.close() }
    setTimeout(() => setPrinting(false), 500)
  }

  if (loading) return <div style={{ minHeight: '100%', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Spinner color={th.gold} size={28} /></div>

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 100 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px`, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600 }}>Auswertung</span>
        <button onClick={print} disabled={printing} style={{ marginLeft: 'auto', height: 36, padding: '0 12px', borderRadius: 10, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon.Printer color={th.muted} size={14} />Drucken
        </button>
      </div>

      <div style={{ padding: SP.md }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{tasting?.name}</h1>
        <div style={{ fontSize: 13, color: th.faint, marginBottom: SP.lg }}>
          {new Date(tasting?.date || '').toLocaleDateString('de')} · {parts.length} Teilnehmer · {whiskies.length} Whiskies
        </div>

        {/* Podium: top 3 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: SP.md, marginBottom: SP.xl }}>
          {ranked.slice(0, 3).map((w, i) => {
            const heightMap = [120, 96, 80]
            return (
              <div key={w.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 20 }}>
                  {i === 0 ? <Icon.Medal color={th.gold} size={24} /> : i === 1 ? <Icon.Medal color='#a8b8c8' size={24} /> : <Icon.Medal color='#c47a3a' size={24} />}
                </div>
                <div style={{ width: 88, height: heightMap[i], borderRadius: '10px 10px 0 0', background: `${medalColors[i]}20`, border: `1px solid ${medalColors[i]}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: medalColors[i] }}>{w.avg}</div>
                </div>
                <div style={{ fontSize: 11, color: th.muted, textAlign: 'center', maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name || `Dram ${ranked.indexOf(w)+1}`}</div>
              </div>
            )
          })}
        </div>

        {/* Full ranking */}
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 60px 60px', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${th.border}` }}>
            {['#', 'Whisky', 'Score', 'Streuung'].map(h => <div key={h} style={{ fontSize: 11, color: th.faint, fontWeight: 600 }}>{h}</div>)}
          </div>
          {ranked.map((w, i) => (
            <div key={w.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 60px 60px', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${th.border}`, alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? medalColors[i] : th.faint }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 14, color: th.text, fontWeight: 500 }}>{w.name || `Dram ${i + 1}`}</div>
                {w.distillery && <div style={{ fontSize: 11, color: th.faint }}>{w.distillery}</div>}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: w.avg >= 85 ? th.gold : th.text }}>{w.avg}</div>
              <div style={{ fontSize: 13, color: w.var > 5 ? th.phases.finish.accent : th.green }}>{w.var.toFixed(1)}</div>
            </div>
          ))}
        </div>

        {/* Most divisive */}
        {ranked.length > 0 && (
          <div style={{ marginTop: SP.lg, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md }}>
            <div style={{ fontSize: 12, color: th.phases.finish.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: SP.xs }}>
              Umstrittenster Dram
            </div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18 }}>
              {ranked.sort((a, b) => b.var - a.var)[0]?.name} · Streuung: ±{ranked.sort((a, b) => b.var - a.var)[0]?.var.toFixed(1)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
