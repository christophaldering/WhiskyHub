// CaskSense Apple — PrintableSheets (Phase B)
// Druckbare Bewertungsbögen mit personalisiertem QR-Code
// Kein jsPDF nötig — wir öffnen ein neues Fenster mit druckbarem HTML
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens; t: Translations
  tastingId: string; participantId: string; onBack: () => void
}

export const PrintableSheets: React.FC<Props> = ({ th, t, tastingId, participantId, onBack }) => {
  const [tasting, setTasting]   = useState<any>(null)
  const [whiskies, setWhiskies] = useState<any[]>([])
  const [parts, setParts]       = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading]   = useState(true)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/tastings/${tastingId}`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
      fetch(`/api/tastings/${tastingId}/whiskies`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
      fetch(`/api/tastings/${tastingId}/participants`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
    ]).then(([ta, wh, pa]) => {
      setTasting(ta); setWhiskies(wh || []); setParts(pa || [])
      setSelected((pa || []).map((p: any) => p.id))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [tastingId])

  const togglePart = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const generateHTML = (p: any) => {
    const joinUrl = `${window.location.origin}/labs-apple?code=${tasting?.code}`
    const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(joinUrl)}&margin=5`
    const blind   = tasting?.format === 'blind'

    const dims = ['Nase', 'Gaumen', 'Abgang', 'Gesamt']
    const wrows = whiskies.map((w, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #ccc;font-weight:600">${blind ? `Sample ${i+1}` : (w.name || `Dram ${i+1}`)}</td>
        ${dims.map(() => `<td style="padding:8px;border:1px solid #ccc;min-width:60px"></td>`).join('')}
        <td style="padding:8px;border:1px solid #ccc;min-width:120px"></td>
      </tr>`).join('')

    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
    <title>CaskSense — ${p.name}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;margin:0;padding:20px}
      h1{font-size:20px;margin:0 0 4px}
      h2{font-size:14px;margin:0 0 16px;color:#555}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      th{background:#1a1a1a;color:#fff;padding:8px;border:1px solid #1a1a1a;text-align:left}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
      .info{flex:1}
      .qr{text-align:right}
      @media print{body{padding:0}button{display:none}}
    </style></head><body>
    <div class="header">
      <div class="info">
        <h1>${tasting?.name || 'Tasting'}</h1>
        <h2>Bewertungsbogen · ${p.name}</h2>
        <div style="font-size:11px;color:#777">${tasting?.date ? new Date(tasting.date).toLocaleDateString('de') : ''}</div>
      </div>
      <div class="qr">
        <img src="${qrUrl}" width="100" height="100" />
        <div style="font-size:10px;color:#999;text-align:center;margin-top:4px">${tasting?.code || ''}</div>
      </div>
    </div>
    <table>
      <tr>
        <th style="min-width:160px">Whisky</th>
        ${dims.map(d => `<th>${d}</th>`).join('')}
        <th>Notizen</th>
      </tr>
      ${wrows}
    </table>
    <div style="margin-top:32px;font-size:10px;color:#aaa;text-align:center">CaskSense · casksense.de</div>
    <script>setTimeout(()=>window.print(),400)</script>
    </body></html>`
  }

  const printSelected = () => {
    setPrinting(true)
    const selectedParts = parts.filter(p => selected.includes(p.id))
    selectedParts.forEach((p, i) => {
      setTimeout(() => {
        const w = window.open('', `_blank_${p.id}`, 'width=800,height=600')
        if (w) { w.document.write(generateHTML(p)); w.document.close() }
        if (i === selectedParts.length - 1) setPrinting(false)
      }, i * 200)
    })
  }

  if (loading) return <div style={{ minHeight: '100%', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Spinner color={th.gold} size={28} /></div>

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 100 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px`, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
      </div>

      <div style={{ padding: SP.md }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Bewertungsbögen</h1>
        <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>
          Pro Teilnehmer einen Bogen mit QR-Code und Bewertungstabelle drucken.
        </p>

        {/* Info */}
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.lg }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: SP.xs }}>{tasting?.name}</div>
          <div style={{ fontSize: 12, color: th.faint }}>{whiskies.length} Whiskies · {tasting?.format === 'blind' ? 'Blind' : 'Offen'} · {parts.length} Teilnehmer</div>
        </div>

        {/* Select participants */}
        <div style={{ fontSize: 13, fontWeight: 600, color: th.muted, marginBottom: SP.sm, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Teilnehmer auswählen</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: SP.sm, gap: SP.sm }}>
          <button onClick={() => setSelected(parts.map(p => p.id))} style={{ height: 36, padding: '0 12px', borderRadius: 10, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 12 }}>Alle</button>
          <button onClick={() => setSelected([])} style={{ height: 36, padding: '0 12px', borderRadius: 10, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 12 }}>Keine</button>
        </div>

        {parts.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${th.border}`, cursor: 'pointer' }} onClick={() => togglePart(p.id)}>
            <div style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${selected.includes(p.id) ? th.gold : th.border}`, background: selected.includes(p.id) ? `${th.gold}20` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {selected.includes(p.id) && <Icon.Check color={th.gold} size={12} />}
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: th.phases.nose.accent, flexShrink: 0 }}>
              {(p.name || '?')[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 15, color: th.text }}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Print CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: `${SP.md}px ${SP.md}px ${SP.xl}px`, background: th.bg, borderTop: `1px solid ${th.border}` }}>
        <button onClick={printSelected} disabled={!selected.length || printing} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: !selected.length ? 'default' : 'pointer', background: !selected.length ? th.bgCard : `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: !selected.length ? th.faint : '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {printing ? <Icon.Spinner color={th.faint} size={20} /> : <><Icon.Printer color="#1a0f00" size={20} />{selected.length} {selected.length === 1 ? 'Bogen' : 'Bögen'} drucken</>}
        </button>
      </div>
    </div>
  )
}
