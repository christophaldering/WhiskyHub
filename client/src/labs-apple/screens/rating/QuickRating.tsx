import React, { useState, useRef, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import { WhiskyData, RatingData } from '../../types/rating'
import { ScoreInput } from '../../components/ScoreInput'
import { PhaseSignature } from '../../components/PhaseSignature'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens; t: Translations
  whisky: WhiskyData; tastingId: string
  dramIdx: number; total: number
  tastingStatus: string; participantId: string
  onDone: (data: RatingData) => void; onBack: () => void
}

export const QuickRating: React.FC<Props> = ({ th, t, whisky, tastingId, dramIdx, total, tastingStatus, participantId, onDone, onBack }) => {
  const [score, setScore] = useState(75)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ratingIdRef = useRef<string | null>(null)

  const phaseTokens = th.phases.overall

  useEffect(() => {
    if (tastingStatus !== 'open' && tastingStatus !== 'draft') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!whisky.id) return
      try {
        const existingId = ratingIdRef.current
        const method = existingId ? 'PATCH' : 'POST'
        const url = existingId ? `/api/tastings/${tastingId}/ratings/${existingId}` : `/api/tastings/${tastingId}/ratings`
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
          body: JSON.stringify({ whiskeyId: whisky.id, dimension: 'overall', score, notes: note, flavorTags: [] }),
        })
        if (!res.ok) { if (res.status === 403) setSaveError(t.ratingError); return }
        const data = await res.json()
        if (!existingId && data?.id) ratingIdRef.current = data.id
        setSaveError(null)
      } catch { }
    }, 2000)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [score, note])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleSave = () => {
    setSaving(true)
    const defaultScore = 75
    onDone({
      scores: { nose: defaultScore, palate: defaultScore, finish: defaultScore, overall: score },
      tags: { nose: [], palate: [], finish: [], overall: [] },
      notes: { nose: '', palate: '', finish: '', overall: note },
    })
  }

  return (
    <div data-testid="quick-rating-screen" style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 130 }}>
      <div style={{ position: 'fixed', bottom: 56, left: 0, right: 0, height: 300, background: `radial-gradient(ellipse at 50% 100%, ${phaseTokens.glow}, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }} />

      <button data-testid="button-back" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, fontSize: 15, padding: `${SP.md}px`, minHeight: 44, cursor: 'pointer' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>

      <div style={{ padding: `0 ${SP.md}px ${SP.md}px` }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: SP.sm }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < dramIdx ? th.gold : i === dramIdx - 1 ? `${th.gold}70` : th.border }} />
          ))}
        </div>
      </div>

      <div style={{ padding: `0 ${SP.md}px`, animation: 'fadeUp 400ms ease' }}>
        {!whisky.blind && whisky.name && (
          <div style={{ marginBottom: SP.md }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontStyle: 'italic' }}>{t.ratingDram} {dramIdx} · {whisky.name}</div>
            {whisky.region && <div style={{ fontSize: 12, color: th.faint }}>{whisky.region}{whisky.cask ? ` · ${whisky.cask}` : ''}</div>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: SP.sm, marginBottom: SP.md }}>
          <PhaseSignature phaseId="overall" th={th} size="large" />
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: phaseTokens.accent, fontWeight: 600 }}>{t.ratingQuick}</div>
            <div style={{ fontSize: 13, color: th.muted }}>{t.ratingQuickD}</div>
          </div>
        </div>

        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg, marginBottom: SP.lg }}>
          <ScoreInput value={score} onChange={setScore} phaseId="overall" th={th} t={t} />
        </div>

        <div style={{ marginBottom: SP.lg }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t.ratingNote}</div>
          <input
            data-testid="input-quick-note"
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t.ratingNotePH}
            style={{
              width: '100%', height: 48, borderRadius: 14, border: `1px solid ${th.border}`,
              background: th.inputBg, color: th.text, fontSize: 15,
              fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic',
              padding: '0 14px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {saveError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, background: 'rgba(200,60,60,0.12)', border: '1px solid rgba(200,60,60,0.3)', marginBottom: SP.md }}>
            <Icon.AlertTriangle color="#e06060" size={16} /><span style={{ fontSize: 14, color: '#e06060' }}>{saveError}</span>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px`, zIndex: 10 }}>
        <button data-testid="button-quick-save" onClick={handleSave} disabled={saving} style={{
          width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer',
          background: saving ? th.bgCard : `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
          color: saving ? th.green : '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {saving ? <><Icon.Check color={th.green} size={20} />{t.ratingDone}</> : `${t.ratingDram} ${dramIdx} ${t.ratingSave} →`}
        </button>
      </div>
    </div>
  )
}
