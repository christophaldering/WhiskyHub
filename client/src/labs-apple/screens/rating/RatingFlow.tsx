// CaskSense Apple — RatingSummary + RatingFlow
import React, { useState } from 'react'
import { ThemeTokens, SP } from '../theme/tokens'
import { Translations } from '../theme/i18n'
import { WhiskyData, RatingData } from '../types/rating'
import { PhaseSignature } from '../components/PhaseSignature'
import { RatingModeSelect } from './RatingModeSelect'
import { GuidedRating } from './GuidedRating'
import { CompactRating } from './CompactRating'
import * as Icon from '../icons/Icons'

// ── RatingSummary ─────────────────────────────────────────────────────────────
interface SummaryProps {
  th: ThemeTokens; t: Translations
  data: RatingData; whisky: WhiskyData
  dramIdx: number; onNext: () => void; onEdit: () => void
}

function getBandColor(s: number) {
  if (s >= 90) return '#d4a847'; if (s >= 85) return '#c4a040'; if (s >= 80) return '#86c678'; if (s >= 70) return '#7ab8c4'
  return 'rgba(200,180,160,0.5)'
}

const PHASE_IDS = ['nose', 'palate', 'finish', 'overall'] as const

const RatingSummary: React.FC<SummaryProps> = ({ th, t, data, whisky, dramIdx, onNext, onEdit }) => {
  const avg = Math.round(PHASE_IDS.reduce((s, p) => s + data.scores[p], 0) / 4)

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: `${SP.xl}px ${SP.md}px ${SP.lg}px`, animation: 'fadeUp 400ms ease' }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, border: `2px solid ${th.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: `${th.gold}12` }}>
          <Icon.Whisky color={th.gold} size={32} />
        </div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>
          {whisky.blind ? `Blind Sample #${dramIdx}` : (whisky.name || `Dram ${dramIdx}`)}
        </h1>
        <div style={{ fontSize: 14, color: th.muted }}>{t.ratingDone}</div>
      </div>

      {/* Score card */}
      <div style={{ margin: `0 ${SP.md}px`, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg, animation: 'fadeUp 400ms ease 0.1s both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{t.ratingMyRating}</span>
          <span style={{ fontSize: 48, fontWeight: 700, color: getBandColor(avg), lineHeight: 1 }}>{avg}</span>
        </div>
        {PHASE_IDS.map(p => {
          const score = data.scores[p]
          const pct = ((score - 60) / 40) * 100
          const pt = th.phases[p]
          const labelKey = p === 'nose' ? 'ratingNose' : p === 'palate' ? 'ratingPalate' : p === 'finish' ? 'ratingFinish' : 'ratingOverall'
          return (
            <div key={p} style={{ marginBottom: SP.md }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <PhaseSignature phaseId={p} th={th} size="normal" />
                <span style={{ fontSize: 13, flex: 1, color: th.muted }}>{t[labelKey] as string}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: getBandColor(score) }}>{score}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: th.border, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pt.accent }} />
              </div>
              {data.tags[p].length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {data.tags[p].map(tag => (
                    <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: pt.dim, color: pt.accent }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CTAs */}
      <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, padding: `0 ${SP.md}px`, display: 'flex', flexDirection: 'column', gap: SP.sm }}>
        <button onClick={onNext} style={{
          width: '100%', height: 56, borderRadius: 16, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`,
          color: '#1a0f00', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
        }}>
          {t.ratingNext} #{dramIdx + 1} →
        </button>
        <button onClick={onEdit} style={{ width: '100%', height: 44, borderRadius: 14, background: 'none', border: `1px solid ${th.border}`, color: th.muted, fontSize: 15, cursor: 'pointer' }}>
          {t.ratingEdit}
        </button>
      </div>
    </div>
  )
}

// ── RatingFlow ────────────────────────────────────────────────────────────────
interface FlowProps {
  th: ThemeTokens; t: Translations
  whisky: WhiskyData; tastingId: string
  dramIdx: number; total: number
  tastingStatus: string; participantId: string
  onDone: (data: RatingData) => void; onBack: () => void
}

export const RatingFlow: React.FC<FlowProps> = (props) => {
  const [mode, setMode]     = useState<null | 'guided' | 'compact'>(null)
  const [step, setStep]     = useState<'mode' | 'rating' | 'summary'>('mode')
  const [result, setResult] = useState<RatingData | null>(null)

  const sharedProps = {
    th: props.th, t: props.t, whisky: props.whisky,
    tastingId: props.tastingId, dramIdx: props.dramIdx, total: props.total,
    tastingStatus: props.tastingStatus, participantId: props.participantId,
    onDone: (d: RatingData) => { setResult(d); setStep('summary') },
    onBack: props.onBack,
  }

  if (step === 'mode' || !mode) return (
    <RatingModeSelect th={props.th} t={props.t} whisky={props.whisky} dramIdx={props.dramIdx} total={props.total}
      onSelect={m => { setMode(m); setStep('rating') }} onBack={props.onBack} />
  )
  if (step === 'rating') return mode === 'guided'
    ? <GuidedRating {...sharedProps} />
    : <CompactRating {...sharedProps} />
  if (step === 'summary' && result) return (
    <RatingSummary th={props.th} t={props.t} data={result} whisky={props.whisky} dramIdx={props.dramIdx}
      onNext={() => props.onDone(result)}
      onEdit={() => setStep('rating')} />
  )
  return null
}
