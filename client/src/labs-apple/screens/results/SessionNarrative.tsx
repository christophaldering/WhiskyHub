// CaskSense Apple — SessionNarrative (Phase C)
// KI-generierter Tasting-Bericht (Host-Only)
import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens; t: Translations
  tastingId: string; participantId: string; isHost: boolean; lang: 'de' | 'en'; onBack: () => void
}

const MD: React.FC<{ text: string; th: ThemeTokens }> = ({ text, th }) => (
  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, lineHeight: 1.8, color: th.text }}>
    {text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, margin: '20px 0 8px', color: th.gold }}>{line.slice(3)}</h3>
      if (line.startsWith('# '))  return <h2 key={i} style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: '24px 0 10px' }}>{line.slice(2)}</h2>
      if (!line.trim())           return <div key={i} style={{ height: 10 }} />
      return <p key={i} style={{ margin: '0 0 10px', color: th.muted }}>{line}</p>
    })}
  </div>
)

export const SessionNarrative: React.FC<Props> = ({ th, t, tastingId, participantId, isHost, lang, onBack }) => {
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [customPrompt, setPrompt] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [copyDone, setCopyDone]   = useState(false)

  useEffect(() => {
    fetch(`/api/tastings/${tastingId}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(d => { if (d?.aiNarrative) setNarrative(d.aiNarrative) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [tastingId])

  const generate = async () => {
    setGenerating(true); setError(null)
    try {
      const res = await fetch(`/api/tastings/${tastingId}/ai-narrative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({ language: lang, force: true, customPrompt: customPrompt || undefined })
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Fehler') }
      const data = await res.json()
      setNarrative(data.narrative || data.aiNarrative)
    } catch (e: any) { setError(e.message) }
    finally { setGenerating(false) }
  }

  const copy = () => {
    if (!narrative) return
    navigator.clipboard.writeText(narrative).then(() => { setCopyDone(true); setTimeout(() => setCopyDone(false), 2000) })
  }

  if (!isHost) return (
    <div style={{ minHeight: '100%', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: SP.md }}>
      <div style={{ textAlign: 'center' }}>
        <Icon.Lock color={th.faint} size={36} />
        <div style={{ marginTop: SP.md, fontSize: 15, color: th.muted }}>Nur für den Host verfügbar</div>
        <button onClick={onBack} style={{ marginTop: SP.lg, height: 44, padding: '0 24px', borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 14 }}>{t.back}</button>
      </div>
    </div>
  )

  if (loading) return <div style={{ minHeight: '100%', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Spinner color={th.gold} size={28} /></div>

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 100 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px`, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600 }}>Session-Erzählung</span>
        {narrative && (
          <button onClick={copy} style={{ marginLeft: 'auto', height: 36, padding: '0 12px', borderRadius: 10, border: `1px solid ${th.border}`, background: 'none', color: copyDone ? th.green : th.muted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.Copy color={copyDone ? th.green : th.muted} size={14} />{copyDone ? 'Kopiert!' : 'Kopieren'}
          </button>
        )}
      </div>

      <div style={{ padding: SP.md }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Session-Erzählung</h1>
        <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>KI schreibt eine 400–600 Wörter lange journalistische Zusammenfassung eurer Tasting-Session.</p>

        <button onClick={generate} disabled={generating} style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: generating ? 'default' : 'pointer', background: generating ? th.bgCard : `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: generating ? th.faint : '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', marginBottom: SP.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {generating ? <><Icon.Spinner color={th.faint} size={20} />Wird geschrieben…</> : `${narrative ? 'Neu generieren' : 'Erzählung erstellen'} (${lang.toUpperCase()})`}
        </button>

        <button onClick={() => setShowPrompt(s => !s)} style={{ background: 'none', border: 'none', color: th.phases.nose.accent, cursor: 'pointer', fontSize: 13, marginBottom: SP.lg, minHeight: 36 }}>
          {showPrompt ? 'Anleitung ausblenden' : 'Fokus angeben (optional)'}
        </button>
        {showPrompt && (
          <textarea value={customPrompt} onChange={e => setPrompt(e.target.value)} placeholder="z.B. 'Fokus auf Kontrast zwischen Islay und Speyside'" maxLength={500} rows={2}
            style={{ width: '100%', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, fontFamily: 'DM Sans, sans-serif', padding: '10px 12px', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: SP.lg }} />
        )}

        {error && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(200,60,60,0.12)', border: '1px solid rgba(200,60,60,0.3)', marginBottom: SP.md, fontSize: 14, color: '#e06060' }}>{error}</div>}

        {narrative ? <MD text={narrative} th={th} /> : !generating && (
          <div style={{ textAlign: 'center', padding: `${SP.xxxl}px 0` }}>
            <Icon.Report color={th.faint} size={48} />
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontStyle: 'italic', color: th.faint, marginTop: SP.lg }}>
              Noch keine Erzählung. Klicke oben um zu starten.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
