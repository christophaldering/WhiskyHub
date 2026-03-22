// CaskSense Apple — ConnoisseurReport (Phase C)
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; participantId: string; lang: 'de' | 'en'; onBack: () => void }

const MD: React.FC<{ text: string; th: ThemeTokens }> = ({ text, th }) => (
  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, lineHeight: 1.8, color: th.muted }}>
    {text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, color: th.text, margin: '20px 0 8px' }}>{line.slice(3)}</h3>
      if (line.startsWith('# '))  return <h2 key={i} style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, color: th.gold, margin: '24px 0 10px' }}>{line.slice(2)}</h2>
      if (line.startsWith('- '))  return <div key={i} style={{ paddingLeft: 16, marginBottom: 4 }}>· {line.slice(2)}</div>
      if (!line.trim())           return <div key={i} style={{ height: 12 }} />
      const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
      return <p key={i} style={{ margin: '0 0 8px' }} dangerouslySetInnerHTML={{ __html: html }} />
    })}
  </div>
)

export const ConnoisseurReport: React.FC<Props> = ({ th, t, participantId, lang, onBack }) => {
  const [reports, setReports]     = useState<any[]>([])
  const [current, setCurrent]     = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError]         = useState('')
  const [prompt, setPrompt]       = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [tab, setTab]             = useState<'report' | 'whiskies' | 'aromas'>('report')

  const load = () => {
    fetch(`/api/participants/${participantId}/connoisseur-reports`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => { setReports(data || []); if (data?.length) setCurrent(data[0]) }).catch(() => {})
  }
  useEffect(() => { load() }, [participantId])

  const generate = async () => {
    setGenerating(true); setError('')
    try {
      const res = await fetch(`/api/participants/${participantId}/connoisseur-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({ language: lang, customPrompt: prompt || undefined })
      })
      if (!res.ok) throw new Error((await res.json()).message || 'Fehler')
      const data = await res.json()
      setCurrent(data); load()
    } catch (e: any) { setError(e.message) }
    finally { setGenerating(false) }
  }

  const deleteReport = async (id: string) => {
    if (!confirm('Report löschen?')) return
    await fetch(`/api/participants/${participantId}/connoisseur-report/${id}`, { method: 'DELETE', headers: { 'x-participant-id': participantId } })
    load(); if (current?.id === id) setCurrent(null)
  }

  const copyText = () => { try { navigator.clipboard.writeText(current?.summary || current?.report || '') } catch { } }

  const snap = current?.dataSnapshot || {}

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 80 }}>
      <div style={{ padding: SP.md }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Connoisseur Report</h1>
        <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>KI-generiertes persönliches Geschmacksprofil — basierend auf all deinen Bewertungen.</p>

        {/* Generate section */}
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md, marginBottom: SP.lg }}>
          <div style={{ display: 'flex', gap: SP.sm, marginBottom: SP.sm }}>
            <button onClick={() => {}} style={{ flex: 1, height: 36, borderRadius: 18, border: 'none', background: lang === 'de' ? th.gold : th.bgCard, color: lang === 'de' ? '#1a0f00' : th.muted, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>DE</button>
            <button onClick={() => {}} style={{ flex: 1, height: 36, borderRadius: 18, border: 'none', background: lang === 'en' ? th.gold : th.bgCard, color: lang === 'en' ? '#1a0f00' : th.muted, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>EN</button>
          </div>

          <button onClick={() => setShowPrompt(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.phases.nose.accent, cursor: 'pointer', fontSize: 13, minHeight: 36, padding: 0, marginBottom: SP.sm }}>
            <Icon.Edit color={th.phases.nose.accent} size={14} />
            {showPrompt ? 'Prompt ausblenden' : 'Eigenen Prompt hinzufügen'}
          </button>
          {showPrompt && (
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Betone meine Entwicklung über die Zeit…" rows={3} maxLength={500}
              style={{ width: '100%', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, padding: '10px 12px', resize: 'none', outline: 'none', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', boxSizing: 'border-box', marginBottom: SP.sm }} />
          )}

          {error && <div style={{ fontSize: 13, color: '#e06060', marginBottom: SP.sm }}>{error}</div>}

          <button onClick={generate} disabled={generating} style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer', background: generating ? th.bgCard : `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: generating ? th.faint : '#1a0f00', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {generating ? <><Icon.Spinner color={th.faint} size={18} />Wird generiert…</> : current ? 'Neu generieren' : 'Report generieren'}
          </button>
        </div>

        {/* Current report */}
        {current && (
          <>
            {/* Stat cards */}
            {snap.avgScore && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.md }}>
                {[
                  { label: 'Ø Score', value: Math.round(snap.avgScore) },
                  { label: 'vs Gruppe', value: snap.vsGroupDelta ? `${snap.vsGroupDelta > 0 ? '+' : ''}${snap.vsGroupDelta}` : '—' },
                  { label: 'Höchster', value: snap.highestWhisky?.name?.substring(0, 14) || '—' },
                  { label: 'Niedrigster', value: snap.lowestWhisky?.name?.substring(0, 14) || '—' },
                ].map((s, i) => (
                  <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: th.gold, lineHeight: 1.2 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: th.faint, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md }}>
              {(['report', 'whiskies', 'aromas'] as const).map(tb => (
                <button key={tb} onClick={() => setTab(tb)} style={{ flex: 1, height: 40, borderRadius: 20, border: 'none', cursor: 'pointer', background: tab === tb ? th.gold : th.bgCard, color: tab === tb ? '#1a0f00' : th.muted, fontSize: 13, fontWeight: tab === tb ? 700 : 400 }}>
                  {tb === 'report' ? 'Report' : tb === 'whiskies' ? 'Whiskies' : 'Aromen'}
                </button>
              ))}
            </div>

            {tab === 'report' && current.report && <MD text={current.report} th={th} />}
            {tab === 'whiskies' && snap.whiskySummaries && (
              <div>
                {(snap.whiskySummaries || []).map((w: any, i: number) => (
                  <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, marginBottom: SP.sm }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SP.xs }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{w.name}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: th.gold }}>{w.score}</span>
                    </div>
                    {w.note && <div style={{ fontSize: 14, color: th.muted, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>{w.note}</div>}
                  </div>
                ))}
              </div>
            )}
            {tab === 'aromas' && snap.regionBreakdown && (
              <div>
                {Object.entries(snap.regionBreakdown || {}).map(([region, count]) => (
                  <div key={region} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: SP.sm }}>
                    <span style={{ width: 100, fontSize: 13, color: th.muted, flexShrink: 0 }}>{region}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: th.border, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min((count as number) * 10, 100)}%`, height: '100%', background: th.gold }} />
                    </div>
                    <span style={{ fontSize: 13, color: th.gold, width: 20, textAlign: 'right' }}>{count as number}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: SP.sm, marginTop: SP.lg }}>
              <button onClick={copyText} style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon.Copy color={th.muted} size={16} />Kopieren
              </button>
              <button onClick={() => deleteReport(current.id)} style={{ height: 44, width: 44, borderRadius: 12, border: `1px solid rgba(200,60,60,0.3)`, background: 'rgba(200,60,60,0.1)', color: '#e06060', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon.Trash color="#e06060" size={18} />
              </button>
            </div>

            {/* Report history */}
            {reports.length > 1 && (
              <div style={{ marginTop: SP.xl }}>
                <div style={{ fontSize: 11, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: SP.sm }}>Verlauf</div>
                {reports.map(r => (
                  <button key={r.id} onClick={() => setCurrent(r)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '10px 0', background: 'none', border: 'none', borderBottom: `1px solid ${th.border}`, cursor: 'pointer', color: current?.id === r.id ? th.gold : th.muted, fontSize: 13, textAlign: 'left' }}>
                    <span>{new Date(r.createdAt).toLocaleDateString('de', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {current?.id === r.id && <Icon.Check color={th.gold} size={14} />}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
