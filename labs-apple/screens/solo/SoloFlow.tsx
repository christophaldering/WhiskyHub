// CaskSense Apple — SoloFlow (Phase 3)
import React, { useState, useRef } from 'react'
import { ThemeTokens, SP } from '../theme/tokens'
import { Translations } from '../theme/i18n'
import { WhiskyData, RatingData } from '../types/rating'
import { RatingFlow } from '../screens/rating/RatingFlow'
import * as Icon from '../icons/Icons'

// ── SoloCaptureScreen ──────────────────────────────────────────────────────
const SoloCaptureScreen: React.FC<{ th: ThemeTokens; t: Translations; onCapture: (w: WhiskyData) => void; onSkip: () => void; onBack: () => void }> = ({ th, t, onCapture, onSkip, onBack }) => {
  const [identifying, setIdentifying] = useState(false)
  const [identifyError, setIdentifyError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setIdentifying(true); setIdentifyError(false)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/identify-bottle', { method: 'POST', body: fd, headers: { 'x-participant-id': 'solo' } })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onCapture({ name: data.name, distillery: data.distillery, region: data.region, cask: data.cask, age: data.age, abv: data.abv, blind: false })
    } catch { setIdentifyError(true) }
    finally { setIdentifying(false) }
  }

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 12px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.soloTitle}</h1>
      <p style={{ fontSize: 15, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{t.soloCaptureSub}</p>

      {/* Primary: Camera */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <button onClick={() => fileRef.current?.click()} style={{
        width: '100%', height: 120, borderRadius: 20, border: `1px solid ${th.phases.nose.accent}55`,
        background: th.phases.nose.dim, cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: SP.sm, marginBottom: SP.md,
      }}>
        {identifying ? <Icon.Spinner color={th.phases.nose.accent} size={40} /> : <Icon.Camera color={th.phases.nose.accent} size={40} />}
        <span style={{ fontSize: 17, fontWeight: 700, color: th.text }}>{identifying ? t.soloIdentifying : t.soloPhoto}</span>
        <span style={{ fontSize: 13, color: th.faint }}>{t.soloPhotoDesc}</span>
      </button>

      {identifyError && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 12, background: 'rgba(200,60,60,0.1)', border: '1px solid rgba(200,60,60,0.25)', marginBottom: SP.md }}>
          <Icon.AlertTriangle color="#e06060" size={14} />
          <span style={{ fontSize: 14, color: '#e06060', flex: 1 }}>{t.soloIdentifyFail}</span>
          <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', color: th.gold, fontSize: 13, cursor: 'pointer' }}>{t.soloIdentifyRetry}</button>
        </div>
      )}

      {/* Secondary 2-grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.lg }}>
        {[
          { icon: <Icon.Edit color={th.phases.palate.accent} size={24} />, label: t.soloManual, desc: t.soloManualDesc, action: () => onCapture({ blind: false }) },
          { icon: <Icon.Barcode color={th.phases.finish.accent} size={24} />, label: t.soloBarcode, desc: t.soloBarcodeDesc, action: () => onCapture({ blind: false }) },
        ].map((item, i) => (
          <button key={i} onClick={item.action} style={{
            height: 88, borderRadius: 16, border: `1px solid ${th.border}`, background: th.bgCard,
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
            {item.icon}
            <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{item.label}</span>
            <span style={{ fontSize: 11, color: th.faint, textAlign: 'center' }}>{item.desc}</span>
          </button>
        ))}
      </div>

      {/* Skip */}
      <div style={{ textAlign: 'center', borderTop: `1px solid ${th.border}`, paddingTop: SP.md }}>
        <button onClick={onSkip} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: th.muted, cursor: 'pointer', fontSize: 14, minHeight: 44, padding: '0 16px' }}>
          <Icon.Skip color={th.muted} size={18} />{t.soloSkip}
        </button>
      </div>
    </div>
  )
}

// ── SoloWhiskyForm ──────────────────────────────────────────────────────────
const SoloWhiskyForm: React.FC<{ th: ThemeTokens; t: Translations; initial: WhiskyData; onSubmit: (w: WhiskyData) => void; onBack: () => void }> = ({ th, t, initial, onSubmit, onBack }) => {
  const [form, setForm] = useState({ name: initial.name || '', distillery: initial.distillery || '', region: initial.region || '', cask: initial.cask || '', age: initial.age ? String(initial.age) : '', abv: initial.abv ? String(initial.abv) : '' })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const inputStyle = { width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 16, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: 12, color: th.muted, marginBottom: 4, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', padding: SP.md, paddingBottom: 120 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 12px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>

      {initial.name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12, background: th.phases.overall.dim, border: `1px solid ${th.phases.overall.accent}44`, marginBottom: SP.md }}>
          <Icon.Check color={th.green} size={16} /><span style={{ fontSize: 13 }}>Erkannt — bitte prüfen</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
        <div><label style={labelStyle}>{t.soloName} *</label><input value={form.name} onChange={set('name')} placeholder={t.soloNamePH} style={{ ...inputStyle, fontFamily: 'Cormorant Garamond, serif', fontSize: 18 }} /></div>
        <div><label style={labelStyle}>{t.soloDistillery}</label><input value={form.distillery} onChange={set('distillery')} placeholder={t.soloDistilleryPH} style={inputStyle} /></div>
        <div><label style={labelStyle}>{t.soloRegion}</label><input value={form.region} onChange={set('region')} placeholder={t.soloRegionPH} style={inputStyle} /></div>
        <div><label style={labelStyle}>{t.soloCask}</label><input value={form.cask} onChange={set('cask')} placeholder={t.soloCaskPH} style={inputStyle} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
          <div><label style={labelStyle}>{t.soloAge}</label><input type="number" value={form.age} onChange={set('age')} placeholder={t.soloAgePH} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t.soloAbv}</label><input type="number" value={form.abv} onChange={set('abv')} placeholder={t.soloAbvPH} style={inputStyle} /></div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
        <button disabled={!form.name.trim()} onClick={() => onSubmit({ ...initial, name: form.name, distillery: form.distillery, region: form.region, cask: form.cask, age: form.age ? parseFloat(form.age) : undefined, abv: form.abv ? parseFloat(form.abv) : undefined, blind: false })}
          style={{ width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: form.name.trim() ? 'pointer' : 'not-allowed', background: form.name.trim() ? `linear-gradient(135deg, ${th.gold}, ${th.amber})` : th.bgCard, color: form.name.trim() ? '#1a0f00' : th.faint, fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
          {t.soloToRating}
        </button>
      </div>
    </div>
  )
}

// ── SoloDoneScreen ──────────────────────────────────────────────────────────
const SoloDoneScreen: React.FC<{ th: ThemeTokens; t: Translations; whisky: WhiskyData; score: number; onAnother: () => void; onBack: () => void }> = ({ th, t, whisky, score, onAnother, onBack }) => (
  <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: SP.lg, paddingBottom: 100 }}>
    <div style={{ width: 80, height: 80, borderRadius: 40, background: `${th.green}20`, border: `2px solid ${th.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
      <Icon.Check color={th.green} size={36} />
    </div>
    <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, textAlign: 'center', margin: `0 0 ${SP.xs}px` }}>{whisky.name || 'Dram'}</h1>
    <div style={{ fontSize: 32, fontWeight: 700, color: '#d4a847', marginBottom: 4 }}>{score}</div>
    <div style={{ fontSize: 14, color: th.muted, marginBottom: SP.xl }}>{t.soloSaved}</div>
    <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px`, display: 'flex', flexDirection: 'column', gap: SP.sm }}>
      <button onClick={onAnother} style={{ height: 56, borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{t.soloAnother}</button>
      <button onClick={onBack} style={{ height: 44, borderRadius: 14, background: 'none', border: `1px solid ${th.border}`, color: th.muted, fontSize: 15, cursor: 'pointer' }}>{t.soloToHub}</button>
    </div>
  </div>
)

// ── SoloFlow orchestrator ────────────────────────────────────────────────────
interface Props { th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }

export const SoloFlow: React.FC<Props> = ({ th, t, participantId, onBack }) => {
  const [step, setStep]             = useState<'capture' | 'form' | 'rating' | 'done'>('capture')
  const [whisky, setWhisky]         = useState<WhiskyData>({ blind: false })
  const [ratingData, setRatingData] = useState<RatingData | null>(null)

  const handleRatingDone = async (data: RatingData) => {
    setRatingData(data)
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
        body: JSON.stringify({ whiskeyName: whisky.name, distillery: whisky.distillery, region: whisky.region, cask: whisky.cask, age: whisky.age, abv: whisky.abv, scores: data.scores, notes: data.notes, flavorTags: data.tags, source: 'app' }),
      })
    } catch { /* non-blocking */ }
    setStep('done')
  }

  const avgScore = ratingData ? Math.round(Object.values(ratingData.scores).reduce((a, b) => a + b, 0) / 4) : 0

  if (step === 'capture') return <SoloCaptureScreen th={th} t={t} onCapture={w => { setWhisky(w); setStep(w.name ? 'form' : 'form') }} onSkip={() => { setWhisky({ blind: false }); setStep('rating') }} onBack={onBack} />
  if (step === 'form')    return <SoloWhiskyForm th={th} t={t} initial={whisky} onSubmit={w => { setWhisky(w); setStep('rating') }} onBack={() => setStep('capture')} />
  if (step === 'rating')  return <RatingFlow th={th} t={t} whisky={whisky} tastingId="solo" dramIdx={1} total={1} tastingStatus="open" participantId={participantId} onDone={handleRatingDone} onBack={() => setStep(whisky.name ? 'form' : 'capture')} />
  if (step === 'done')    return <SoloDoneScreen th={th} t={t} whisky={whisky} score={avgScore} onAnother={() => { setWhisky({ blind: false }); setRatingData(null); setStep('capture') }} onBack={onBack} />
  return null
}
