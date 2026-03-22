// CaskSense Apple — GuidedRating
import React, { useState, useEffect, useRef } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import { WhiskyData, RatingData, PhaseId } from '../../types/rating'
import { ScoreInput } from '../../components/ScoreInput'
import { FlavorTags } from '../../components/FlavorTags'
import { PhaseSignature } from '../../components/PhaseSignature'
import { SaveConfirm } from '../../components/SaveConfirm'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens; t: Translations
  whisky: WhiskyData; tastingId: string
  dramIdx: number; total: number
  tastingStatus: string; participantId: string
  onDone: (data: RatingData) => void; onBack: () => void
}

const PHASES: { id: PhaseId; labelKey: keyof Translations; qKey: keyof Translations; hintKey: keyof Translations }[] = [
  { id: 'nose',    labelKey: 'ratingNose',    qKey: 'ratingQ_nose',    hintKey: 'ratingHint_nose'    },
  { id: 'palate',  labelKey: 'ratingPalate',  qKey: 'ratingQ_palate',  hintKey: 'ratingHint_palate'  },
  { id: 'finish',  labelKey: 'ratingFinish',  qKey: 'ratingQ_finish',  hintKey: 'ratingHint_finish'  },
  { id: 'overall', labelKey: 'ratingOverall', qKey: 'ratingQ_overall', hintKey: 'ratingHint_overall' },
]

export const GuidedRating: React.FC<Props> = ({ th, t, whisky, tastingId, dramIdx, total, tastingStatus, participantId, onDone, onBack }) => {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [scores, setScores]     = useState({ nose: 75, palate: 75, finish: 75, overall: 75 })
  const [tags, setTags]         = useState({ nose: [] as string[], palate: [] as string[], finish: [] as string[], overall: [] as string[] })
  const [notes, setNotes]       = useState({ nose: '', palate: '', finish: '', overall: '' })
  const [showFlash, setFlash]   = useState(false)
  const [visible, setVisible]   = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ratingIdRef = useRef<Record<string, string>>({})

  const phase = PHASES[phaseIndex]
  const phaseTokens = th.phases[phase.id]

  // Autosave
  useEffect(() => {
    if (tastingStatus !== 'open' && tastingStatus !== 'draft') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!whisky.id) return
      try {
        const existingId = ratingIdRef.current[phase.id]
        const method = existingId ? 'PATCH' : 'POST'
        const url = existingId
          ? `/api/tastings/${tastingId}/ratings/${existingId}`
          : `/api/tastings/${tastingId}/ratings`
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
          body: JSON.stringify({ whiskeyId: whisky.id, dimension: phase.id, score: scores[phase.id], notes: notes[phase.id], flavorTags: tags[phase.id] }),
        })
        if (!res.ok) { if (res.status === 403) setSaveError(t.ratingError); return }
        const data = await res.json()
        if (!existingId) ratingIdRef.current[phase.id] = data.id
      } catch { setSaveError(t.ratingError) }
    }, 2000)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [scores, notes, tags, phase.id])

  const toggleTag = (tag: string) => {
    setTags(prev => {
      const cur = prev[phase.id]
      return { ...prev, [phase.id]: cur.includes(tag) ? cur.filter(x => x !== tag) : [...cur, tag] }
    })
  }

  const advance = async () => {
    setFlash(true)
    setTimeout(() => {
      setFlash(false)
      setVisible(false)
      setTimeout(() => {
        setSaveError(null)
        if (phaseIndex < 3) { setPhaseIndex(i => i + 1); setVisible(true) }
        else { onDone({ scores, tags, notes }) }
      }, 150)
    }, 300)
  }

  const goTo = (i: number) => {
    setVisible(false)
    setTimeout(() => { setPhaseIndex(i); setVisible(true) }, 120)
  }

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      {/* Phase glow */}
      <div style={{ position: 'fixed', bottom: 56, left: 0, right: 0, height: 300, background: `radial-gradient(ellipse at 50% 100%, ${phaseTokens.glow}, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />
      <SaveConfirm show={showFlash} color={phaseTokens.accent} />

      {/* Sticky sub-header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: th.headerBg, backdropFilter: 'blur(12px)', padding: `${SP.sm}px ${SP.md}px` }}>
        {/* Dram progress */}
        <div style={{ display: 'flex', gap: 3, marginBottom: SP.sm }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < dramIdx - 1 ? th.gold : i === dramIdx - 1 ? `${th.gold}80` : th.border }} />
          ))}
        </div>
        {/* Phase tabs */}
        <div style={{ display: 'flex', gap: SP.sm }}>
          {PHASES.map((p, i) => {
            const done = i < phaseIndex
            const active = i === phaseIndex
            const pt = th.phases[p.id]
            return (
              <button key={p.id} onClick={() => goTo(i)} style={{
                flex: 1, minHeight: 44, borderRadius: 10, cursor: 'pointer', border: `1px solid ${active ? pt.accent : th.border}`,
                background: active ? pt.dim : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, transition: 'all 150ms',
              }}>
                {done ? <Icon.Check color={th.green} size={14} /> : <PhaseSignature phaseId={p.id} th={th} size="normal" />}
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? pt.accent : th.muted }}>{t[p.labelKey] as string}</span>
                {done && <span style={{ fontSize: 9, color: th.phases[p.id].accent, fontWeight: 700 }}>{scores[p.id]}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ padding: SP.md, paddingBottom: 130, opacity: visible ? 1 : 0, transition: 'opacity 150ms', position: 'relative', zIndex: 1 }}>
        {/* Whisky info */}
        {!whisky.blind && whisky.name && (
          <div style={{ marginBottom: SP.md }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontStyle: 'italic' }}>{t.ratingDram} {dramIdx} · {whisky.name}</div>
            {whisky.region && <div style={{ fontSize: 12, color: th.faint }}>{whisky.region}{whisky.cask ? ` · ${whisky.cask}` : ''}</div>}
          </div>
        )}

        {/* Phase header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, marginBottom: SP.md }}>
          <PhaseSignature phaseId={phase.id} th={th} size="large" />
          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: phaseTokens.accent, fontWeight: 600 }}>{t[phase.labelKey] as string}</span>
        </div>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.sm}px` }}>{t[phase.qKey] as string}</h2>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontStyle: 'italic', color: th.muted, margin: `0 0 ${SP.xl}px` }}>{t[phase.hintKey] as string}</p>

        {/* Score card */}
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg, marginBottom: SP.lg }}>
          <ScoreInput value={scores[phase.id]} onChange={v => setScores(s => ({ ...s, [phase.id]: v }))} phaseId={phase.id} th={th} t={t} />
        </div>

        {/* Flavor tags (not for overall) */}
        {phase.id !== 'overall' && (
          <div style={{ marginBottom: SP.lg }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: th.muted, marginBottom: SP.sm, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.ratingAromen}</div>
            <FlavorTags phaseId={phase.id} whiskyRegion={whisky.region} whiskyCask={whisky.cask} blind={whisky.blind} selected={tags[phase.id]} onToggle={toggleTag} th={th} t={t} />
          </div>
        )}

        {/* Note textarea */}
        <div style={{ marginBottom: SP.lg }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t.ratingNote}</div>
          <div style={{ fontSize: 14, color: th.muted, marginBottom: SP.sm }}>{t.ratingNoteSub}</div>
          <textarea
            value={notes[phase.id]}
            onChange={e => setNotes(n => ({ ...n, [phase.id]: e.target.value }))}
            placeholder={`${t[phase.labelKey] as string}: ${t.ratingNotePH}`}
            rows={3}
            style={{
              width: '100%', borderRadius: 14, border: `1px solid ${th.border}`, background: th.inputBg,
              color: th.text, fontSize: 15, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic',
              padding: '12px 14px', resize: 'none', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Error */}
        {saveError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: 'rgba(200,60,60,0.12)', border: '1px solid rgba(200,60,60,0.3)', marginBottom: SP.md }}>
            <Icon.AlertTriangle color="#e06060" size={16} />
            <span style={{ fontSize: 14, color: '#e06060' }}>{saveError}</span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
        <button onClick={advance} style={{
          width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
          color: '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
        }}>
          {phaseIndex < 3 ? `${t[phase.labelKey] as string} ${t.ratingSave} → ${t[PHASES[phaseIndex + 1].labelKey] as string}` : t.ratingFinish2}
        </button>
      </div>
    </div>
  )
}
