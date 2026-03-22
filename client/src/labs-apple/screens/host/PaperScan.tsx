// CaskSense Apple — PaperScan (Phase B)
// Paper Sheet Scanner: Foto → AI → Confirm Scores
import React, { useState, useEffect, useRef } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens; t: Translations
  tastingId: string; participantId: string; onBack: () => void
}

export const PaperScan: React.FC<Props> = ({ th, t, tastingId, participantId, onBack }) => {
  const [parts, setParts]         = useState<any[]>([])
  const [whiskies, setWhiskies]   = useState<any[]>([])
  const [selectedPart, setSelPart]= useState<string>('')
  const [step, setStep]           = useState<'select' | 'capture' | 'scanning' | 'review' | 'done'>('select')
  const [scannedScores, setScores]= useState<any[]>([])
  const [error, setError]         = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/tastings/${tastingId}/participants`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
      fetch(`/api/tastings/${tastingId}/whiskies`, { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
    ]).then(([pa, wh]) => { setParts(pa || []); setWhiskies(wh || []) }).catch(() => {})
  }, [tastingId])

  const handleFile = async (file: File) => {
    setStep('scanning'); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('participantId', selectedPart)
      const res = await fetch(`/api/tastings/${tastingId}/scan-sheet`, { method: 'POST', headers: { 'x-participant-id': participantId }, body: fd })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Scan fehlgeschlagen') }
      const data = await res.json()
      // Build review scores from API response
      const scores = whiskies.map(w => ({
        whiskeyId: w.id,
        whiskeyName: w.name,
        nose:    data.scores?.find((s: any) => s.whiskeyId === w.id)?.nose || null,
        palate:  data.scores?.find((s: any) => s.whiskeyId === w.id)?.palate || null,
        finish:  data.scores?.find((s: any) => s.whiskeyId === w.id)?.finish || null,
        overall: data.scores?.find((s: any) => s.whiskeyId === w.id)?.overall || null,
        notes:   data.scores?.find((s: any) => s.whiskeyId === w.id)?.notes || '',
      }))
      setScores(scores)
      setStep('review')
    } catch (e: any) { setError(e.message || 'Fehler beim Scannen'); setStep('capture') }
  }

  const confirmScores = async () => {
    setSaving(true)
    try {
      await fetch(`/api/tastings/${tastingId}/confirm-scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({ participantId: selectedPart, scores: scannedScores })
      })
      setStep('done')
    } catch { setError('Fehler beim Speichern') }
    finally { setSaving(false) }
  }

  const updateScore = (wid: string, dim: string, val: string) => {
    setScores(prev => prev.map(s => s.whiskeyId === wid ? { ...s, [dim]: val ? parseInt(val) : null } : s))
  }

  const inputStyle = { width: '100%', height: 36, borderRadius: 8, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, textAlign: 'center' as const, fontFamily: 'DM Sans, sans-serif', outline: 'none' }

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 100 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px`, borderBottom: `1px solid ${th.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={step === 'select' ? onBack : () => setStep('select')} style={{ background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: 15 }}>
          <Icon.Back color={th.muted} size={18} />{t.back}
        </button>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600 }}>Zettel scannen</span>
      </div>

      <div style={{ padding: SP.md }}>
        {/* Step 1: Select Participant */}
        {step === 'select' && (
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Wessen Zettel?</h2>
            <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>Wähle den Teilnehmer, dessen Bewertungsbogen du einscannst.</p>
            {parts.map(p => (
              <button key={p.id} onClick={() => { setSelPart(p.id); setStep('capture') }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: `0 ${SP.md}px`, borderRadius: 14, border: `1px solid ${th.border}`, background: th.bgCard, cursor: 'pointer', marginBottom: SP.sm, textAlign: 'left', color: th.text }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: th.phases.nose.accent, flexShrink: 0 }}>{(p.name || '?')[0].toUpperCase()}</div>
                <span style={{ fontSize: 16, fontWeight: 500 }}>{p.name}</span>
                <Icon.ChevronRight color={th.faint} size={16} style={{ marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Capture */}
        {step === 'capture' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Foto aufnehmen</h2>
            <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }}>
              Fotografiere den ausgefüllten Bewertungsbogen von <strong style={{ color: th.gold }}>{parts.find(p => p.id === selectedPart)?.name}</strong>.
            </p>
            {error && <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(200,60,60,0.12)', border: '1px solid rgba(200,60,60,0.3)', marginBottom: SP.md, fontSize: 14, color: '#e06060' }}>{error}</div>}
            <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 140, borderRadius: 20, border: `2px dashed ${th.gold}44`, background: `${th.gold}08`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: th.gold, marginBottom: SP.md }}>
              <Icon.Camera color={th.gold} size={44} />
              <span style={{ fontSize: 16, fontWeight: 600 }}>Kamera öffnen</span>
            </button>
            <button onClick={() => { const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*,application/pdf'; fi.onchange = (e: any) => e.target.files?.[0] && handleFile(e.target.files[0]); fi.click() }}
              style={{ width: '100%', height: 48, borderRadius: 14, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 15 }}>
              Aus Galerie auswählen
            </button>
          </div>
        )}

        {/* Scanning */}
        {step === 'scanning' && (
          <div style={{ textAlign: 'center', padding: `${SP.xxxl}px 0` }}>
            <Icon.Spinner color={th.gold} size={48} />
            <div style={{ marginTop: SP.lg, fontFamily: 'Playfair Display, serif', fontSize: 20, color: th.text }}>KI erkennt Scores…</div>
            <div style={{ fontSize: 14, color: th.muted, marginTop: SP.xs }}>Das dauert ca. 5–10 Sekunden</div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Erkannte Scores</h2>
            <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>Bitte prüfe und korrigiere die Werte bevor du speicherst.</p>
            <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px 60px', gap: 4, padding: '8px 12px', borderBottom: `1px solid ${th.border}` }}>
                <span style={{ fontSize: 11, color: th.faint, fontWeight: 600 }}>Whisky</span>
                {['Nase', 'Gaumen', 'Abgang', 'Ges.'].map(d => <span key={d} style={{ fontSize: 11, color: th.faint, textAlign: 'center', fontWeight: 600 }}>{d}</span>)}
              </div>
              {scannedScores.map(s => (
                <div key={s.whiskeyId} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px 60px', gap: 4, padding: '8px 12px', borderBottom: `1px solid ${th.border}`, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: th.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.whiskeyName || '—'}</span>
                  {['nose', 'palate', 'finish', 'overall'].map(dim => (
                    <input key={dim} type="number" min="0" max="100" value={s[dim] ?? ''} onChange={e => updateScore(s.whiskeyId, dim, e.target.value)} style={inputStyle} />
                  ))}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: SP.sm, marginTop: SP.lg }}>
              <button onClick={() => setStep('capture')} style={{ flex: 1, height: 48, borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 14 }}>Neues Foto</button>
              <button onClick={confirmScores} disabled={saving} style={{ flex: 2, height: 48, borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: '#1a0f00', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? <Icon.Spinner color={th.faint} size={18} /> : 'Scores speichern'}
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: `${SP.xxxl}px 0` }}>
            <Icon.Check color={th.green} size={56} />
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `${SP.lg}px 0 ${SP.xs}px` }}>Gespeichert!</h2>
            <p style={{ fontSize: 15, color: th.muted, marginBottom: SP.xl }}>Die Scores von <strong>{parts.find(p => p.id === selectedPart)?.name}</strong> wurden übernommen.</p>
            <button onClick={() => { setStep('select'); setScores([]); setError(null) }} style={{ height: 52, padding: '0 32px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${th.gold}, #c47a3a)`, color: '#1a0f00', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
              Weiteren Zettel scannen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
