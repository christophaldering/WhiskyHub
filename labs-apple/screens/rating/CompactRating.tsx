// CaskSense Apple — CompactRating
import React, { useState, useRef, useEffect } from 'react'
import { ThemeTokens, SP } from '../theme/tokens'
import { Translations } from '../theme/i18n'
import { WhiskyData, RatingData, PhaseId } from '../types/rating'
import { ScoreInput } from '../components/ScoreInput'
import { FlavorTags } from '../components/FlavorTags'
import { PhaseSignature } from '../components/PhaseSignature'
import * as Icon from '../icons/Icons'

interface Props {
  th: ThemeTokens; t: Translations
  whisky: WhiskyData; tastingId: string
  dramIdx: number; total: number
  tastingStatus: string; participantId: string
  onDone: (data: RatingData) => void; onBack: () => void
}

const PHASES: { id: PhaseId; labelKey: keyof Translations }[] = [
  { id: 'nose',    labelKey: 'ratingNose'    },
  { id: 'palate',  labelKey: 'ratingPalate'  },
  { id: 'finish',  labelKey: 'ratingFinish'  },
  { id: 'overall', labelKey: 'ratingOverall' },
]

function getBandColor(s: number) {
  if (s >= 90) return '#d4a847'; if (s >= 85) return '#c4a040'; if (s >= 80) return '#86c678'; if (s >= 70) return '#7ab8c4'
  return 'rgba(200,180,160,0.5)'
}

export const CompactRating: React.FC<Props> = ({ th, t, whisky, tastingId, dramIdx, total, tastingStatus, participantId, onDone, onBack }) => {
  const [scores, setScores]     = useState({ nose: 75, palate: 75, finish: 75, overall: 75 })
  const [tags, setTags]         = useState({ nose: [] as string[], palate: [] as string[], finish: [] as string[], overall: [] as string[] })
  const [openPhase, setOpenPhase] = useState<PhaseId | null>('nose')
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avgScore = Math.round((scores.nose + scores.palate + scores.finish + scores.overall) / 4)

  const toggleTag = (phaseId: PhaseId, tag: string) => {
    setTags(prev => {
      const cur = prev[phaseId]
      return { ...prev, [phaseId]: cur.includes(tag) ? cur.filter(x => x !== tag) : [...cur, tag] }
    })
  }

  useEffect(() => {
    if (tastingStatus !== 'open' && tastingStatus !== 'draft') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!whisky.id) return
      try {
        for (const p of PHASES) {
          await fetch(`/api/tastings/${tastingId}/ratings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId },
            body: JSON.stringify({ whiskeyId: whisky.id, dimension: p.id, score: scores[p.id], flavorTags: tags[p.id] }),
          })
        }
      } catch { setSaveError(t.ratingError) }
    }, 2000)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [scores, tags])

  const handleSave = async () => {
    setSaving(true)
    onDone({ scores, tags, notes: { nose: '', palate: '', finish: '', overall: '' } })
  }

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 130 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, fontSize: 15, padding: `${SP.md}px`, minHeight: 44, cursor: 'pointer' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>

      {/* Sub-header */}
      <div style={{ padding: `0 ${SP.md}px ${SP.md}px` }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: SP.sm }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < dramIdx - 1 ? th.gold : i === dramIdx - 1 ? `${th.gold}80` : th.border }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {!whisky.blind && whisky.name && <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, fontStyle: 'italic' }}>{whisky.name}</div>}
            {whisky.region && <div style={{ fontSize: 12, color: th.faint }}>{whisky.region}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: getBandColor(avgScore), lineHeight: 1 }}>{avgScore}</div>
            <div style={{ fontSize: 11, color: th.faint }}>{t.ratingOf} 100</div>
          </div>
        </div>
      </div>

      {/* Phase cards */}
      <div style={{ padding: `0 ${SP.md}px` }}>
        {PHASES.map((p) => {
          const open = openPhase === p.id
          const pt = th.phases[p.id]
          const score = scores[p.id]
          const pct = ((score - 60) / 40) * 100
          return (
            <div key={p.id} style={{ background: th.bgCard, border: `1px solid ${open ? pt.accent : th.border}`, borderRadius: 18, marginBottom: 10, overflow: 'hidden', transition: 'border-color 200ms' }}>
              {/* Header (always visible) */}
              <button onClick={() => setOpenPhase(open ? null : p.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: `${SP.sm}px ${SP.md}px`,
                minHeight: 44, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
                <PhaseSignature phaseId={p.id} th={th} size="normal" />
                <span style={{ fontWeight: 700, fontSize: 14, color: th.text, flex: 1 }}>{t[p.labelKey] as string}</span>
                {/* Mini progress bar */}
                <div style={{ width: 60, height: 4, borderRadius: 2, background: th.border, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pt.accent }} />
                </div>
                <span style={{ fontSize: 22, fontWeight: 700, color: getBandColor(score), width: 38, textAlign: 'right' }}>{score}</span>
                {tags[p.id].length > 0 && <span style={{ fontSize: 10, color: th.faint }}>({tags[p.id].length})</span>}
                <Icon.ChevronDown color={th.faint} size={16} />
              </button>

              {/* Expanded */}
              {open && (
                <div style={{ borderTop: `1px solid ${th.border}`, padding: `${SP.md}px` }}>
                  <ScoreInput value={scores[p.id]} onChange={v => setScores(s => ({ ...s, [p.id]: v }))} phaseId={p.id} th={th} t={t} />
                  {p.id !== 'overall' && (
                    <div style={{ marginTop: SP.md }}>
                      <FlavorTags phaseId={p.id} whiskyRegion={whisky.region} whiskyCask={whisky.cask} blind={whisky.blind} selected={tags[p.id]} onToggle={tag => toggleTag(p.id, tag)} th={th} t={t} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {saveError && (
        <div style={{ margin: `${SP.sm}px ${SP.md}px`, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(200,60,60,0.12)', border: '1px solid rgba(200,60,60,0.3)' }}>
          <Icon.AlertTriangle color="#e06060" size={14} /><span style={{ fontSize: 14, color: '#e06060' }}>{saveError}</span>
        </div>
      )}

      {/* CTA */}
      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px` }}>
        <button onClick={handleSave} disabled={saving} style={{
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
