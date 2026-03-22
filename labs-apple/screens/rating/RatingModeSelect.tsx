// CaskSense Apple — RatingModeSelect
import React from 'react'
import { ThemeTokens, SP } from '../theme/tokens'
import { Translations } from '../theme/i18n'
import { WhiskyData } from '../types/rating'
import { PhaseSignature } from '../components/PhaseSignature'
import * as Icon from '../icons/Icons'

interface Props {
  th:        ThemeTokens
  t:         Translations
  whisky:    WhiskyData
  dramIdx:   number
  total:     number
  onSelect:  (mode: 'guided' | 'compact') => void
  onBack:    () => void
}

export const RatingModeSelect: React.FC<Props> = ({ th, t, whisky, dramIdx, total, onSelect, onBack }) => {
  const options = [
    { id: 'guided' as const,  label: t.ratingGuided,  desc: t.ratingGuidedD,  hint: t.ratingGuidedH,  phaseId: 'nose'   as const },
    { id: 'compact' as const, label: t.ratingCompact, desc: t.ratingCompactD, hint: t.ratingCompactH, phaseId: 'palate' as const },
  ]

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif', paddingBottom: 100 }}>
      {/* Back */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, fontSize: 15, padding: `${SP.md}px ${SP.md}px`, minHeight: 44, cursor: 'pointer' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>

      {/* Dram progress */}
      <div style={{ display: 'flex', gap: 4, padding: `0 ${SP.md}px ${SP.md}px` }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < dramIdx ? th.gold : i === dramIdx - 1 ? `${th.gold}70` : th.border }} />
        ))}
      </div>

      <div style={{ padding: `${SP.md}px ${SP.md}px` }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, margin: `0 0 ${SP.sm}px`, fontWeight: 600 }}>{t.ratingModeQ}</h1>
        <p style={{ fontSize: 15, color: th.muted, margin: `0 0 ${SP.xl}px` }}>{t.ratingModeSub}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.md }}>
          {options.map((opt, i) => (
            <button key={opt.id} onClick={() => onSelect(opt.id)} style={{
              background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg,
              cursor: 'pointer', textAlign: 'left', display: 'flex', gap: SP.md, alignItems: 'flex-start',
              animation: `fadeUp 300ms ease both`, animationDelay: `${i * 80}ms`,
              transition: 'all 200ms',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = th.bgHover; (e.currentTarget as HTMLElement).style.borderColor = th.phases[opt.phaseId].accent }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = th.bgCard; (e.currentTarget as HTMLElement).style.borderColor = th.border }}
            >
              <PhaseSignature phaseId={opt.phaseId} th={th} size="large" />
              <div>
                <div style={{ fontSize: 19, fontFamily: 'Playfair Display, serif', fontWeight: 600, marginBottom: SP.xs }}>{opt.label}</div>
                <div style={{ fontSize: 14, color: th.muted, lineHeight: 1.5, marginBottom: SP.xs }}>{opt.desc}</div>
                <div style={{ fontSize: 13, color: th.faint, fontStyle: 'italic' }}>{opt.hint}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
