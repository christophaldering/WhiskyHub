// CaskSense Apple — ConnoisseurReport (Phase C)
// KI-generierter persönlicher Whisky-Bericht mit Markdown + PDF-Export
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens; t: Translations
  participantId: string; lang: 'de' | 'en'; onBack: () => void
}

// Minimal Markdown renderer — nur eigene Komponenten, kein Import
const MD: React.FC<{ text: string; th: ThemeTokens }> = ({ text, th }) => (
  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, lineHeight: 1.8, color: th.text }}>
    {text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, margin: '20px 0 8px', color: th.gold }}>{line.slice(3)}</h3>
      if (line.startsWith('# '))  return <h2 key={i} style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: '24px 0 10px' }}>{line.slice(2)}</h2>
      if (line.startsWith('- '))  return <div key={i} style={{ paddingLeft: 16, marginBottom: 6, color: th.muted }}>· {line.slice(2)}</div>
      if (!line.trim())           return <div key={i} style={{ height: 10 }} />
      const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
      return <p key={i} style={{ margin: '0 0 10px', color: th.muted }} dangerouslySetInnerHTML={{ __html: html }} />
    })}
  </div>
)

export const ConnoisseurReport: React.FC<Props> = ({ th, t, participantId, lang, onBack }) => {
  const [reports, setReports]   = useState<any[]>([])
  const [current, setCurrent]   = useState<any>(null)
  const [generating, setGen]    = useState(false)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [customPrompt, setPrompt] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [copyDone, setCopyDone] = useState(false)

  const load = () => {
    fetch(`/api/participants/${participantId}/connoisseur-reports`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(d => { const list = d || []; setReports(list); if (list.length) setCurrent(list[0]) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [participantId])

  const generate = async () => {
    setGen(true); setError(null)
    try {
      const res = await fetch(`/api/participants/${participantId}/connoisseur-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({ language: lang, customPrompt: customPrompt || undefined })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Fehler') }
      const data = await res.json()
      setCurrent(data); setReports(r => [data, ...r.filter(x => x.id !== data.id)])
    } catch (e: any) { setError(e.message) }
    finally { setGen(false) }
  }

  const deletReport = async (id: string) => {
    await fetch(`/api/participants/${participantId}/connoisseur-report/${id}`, { method: 'DELETE', headers: { 'x-participant-id': participantId } })
    const updated = reports.filter(r => r.id !== id)
    setReports(updated); setCurrent(updated[0] || null)
  }

  const copyText = () => {
    if (!current?.content) return
    navigator.clipboard.writeText(current.content).then(() => { setCopyDone(true); setTimeout(() => setCopyDone(false), 2000) })
  }

  const downloadTxt = () => {
    if (!current?.content) return
    const blob = new Blob([current.content], { type: 'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `connoisseur-report-${new Date().toISOString().slice(0, 10)}.txt`; a.click()
  }

  if (loading) return <div style={{ minHeight: '100%', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Spinner color={th.gold} size={28} /></div>

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 100 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px`, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600 }}>Connoisseur-Report</span>
      </div>

      <div style={{ padding: SP.md }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Dein Geschmacksprofil</h1>
        <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>KI-generierter Bericht basierend auf deinen Bewertungen und deinem Diary.</p>

        {/* Generate button */}
        <button onClick={generate} disabled={generating} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: generating ? 'default' : 'pointer', background: generating ? th.bgCard : `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: generating ? th.faint : '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', marginBottom: SP.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {generating ? <><Icon.Spinner color={th.faint} size={20} />Wird generiert…</> : `${current ? 'Neu generieren' : 'Bericht erstellen'} (${lang.toUpperCase()})`}
        </button>

        {/* Custom prompt toggle */}
        <button onClick={() => setShowPrompt(s => !s)} style={{ background: 'none', border: 'none', color: th.phases.nose.accent, cursor: 'pointer', fontSize: 13, marginBottom: SP.lg, minHeight: 36 }}>
          {showPrompt ? 'Anleitung ausblenden' : 'KI-Anleitung anpassen (optional)'}
        </button>
        {showPrompt && (
          <textarea value={customPrompt} onChange={e => setPrompt(e.target.value)} placeholder="Zusätzliche Hinweise für die KI (max. 500 Zeichen)" maxLength={500} rows={3}
            style={{ width: '100%', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, fontFamily: 'DM Sans, sans-serif', padding: '10px 12px', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: SP.lg }} />
        )}

        {error && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(200,60,60,0.12)', border: '1px solid rgba(200,60,60,0.3)', marginBottom: SP.md, fontSize: 14, color: '#e06060' }}>{error}</div>}

        {/* Report history tabs */}
        {reports.length > 1 && (
          <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md, overflowX: 'auto', paddingBottom: 4 }}>
            {reports.map((r, i) => (
              <button key={r.id} onClick={() => setCurrent(r)} style={{ flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer', background: current?.id === r.id ? th.gold : th.bgCard, color: current?.id === r.id ? '#1a0f00' : th.muted, fontSize: 12, fontWeight: current?.id === r.id ? 700 : 400 }}>
                {new Date(r.createdAt).toLocaleDateString('de', { month: 'short', day: 'numeric' })}
              </button>
            ))}
          </div>
        )}

        {/* Current report */}
        {current && (
          <div>
            {/* Report header */}
            <div style={{ background: `${th.gold}08`, border: `1px solid ${th.gold}33`, borderRadius: 20, padding: SP.lg, marginBottom: SP.md }}>
              {current.summary && <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontStyle: 'italic', color: th.gold, lineHeight: 1.5, marginBottom: SP.sm }}>{current.summary}</div>}
              <div style={{ fontSize: 11, color: th.faint }}>{new Date(current.createdAt).toLocaleDateString('de', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: SP.sm, marginBottom: SP.lg }}>
              <button onClick={copyText} style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: copyDone ? th.green : th.muted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon.Copy color={copyDone ? th.green : th.muted} size={14} />{copyDone ? 'Kopiert!' : 'Kopieren'}
              </button>
              <button onClick={downloadTxt} style={{ flex: 1, height: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon.Download color={th.muted} size={14} />Download
              </button>
              <button onClick={() => deletReport(current.id)} style={{ height: 44, width: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon.Trash color={th.faint} size={16} />
              </button>
            </div>

            {/* Markdown content */}
            {current.content && <MD text={current.content} th={th} />}
          </div>
        )}

        {!current && !generating && (
          <div style={{ textAlign: 'center', padding: `${SP.xxxl}px 0` }}>
            <Icon.Report color={th.faint} size={48} />
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontStyle: 'italic', color: th.faint, marginTop: SP.lg }}>
              Noch kein Bericht erstellt. Klicke oben um zu starten.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
