import React, { useState } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'
import { DeepDiveMethod } from './DeepDiveMethod'
import { DeepDiveBackground } from './DeepDiveBackground'
import { ResearchScreen } from './Research'

interface Props {
  th: ThemeTokens
  t: Translations
  lang: 'de' | 'en'
  onBack: () => void
}

interface HubCard {
  id: 'method' | 'background' | 'research'
  title: { de: string; en: string }
  desc: { de: string; en: string }
  color: string
}

const CARDS: HubCard[] = [
  {
    id: 'method',
    title: { de: 'Bewertungsmodelle', en: 'Rating Models' },
    desc: { de: 'Wie dein Geschmacksprofil entsteht — Scoring, Normalisierung, Stabilität', en: 'How your taste profile is built — scoring, normalisation, stability' },
    color: '#d4a847',
  },
  {
    id: 'background',
    title: { de: 'Hintergrund & Methodik', en: 'Background & Methodology' },
    desc: { de: 'Tasting-Schritte, Dimensionen, Wissenschaft hinter den Scores', en: 'Tasting steps, dimensions, the science behind the scores' },
    color: '#a8c4d4',
  },
  {
    id: 'research',
    title: { de: 'Forschung', en: 'Research' },
    desc: { de: 'Wissenschaftliche Artikel und Rabbit Hole', en: 'Scientific articles and rabbit hole' },
    color: '#86c678',
  },
]

export const DeepDiveHub: React.FC<Props> = ({ th, t, lang, onBack }) => {
  const [sub, setSub] = useState<'method' | 'background' | 'research' | null>(null)

  if (sub === 'method') return <DeepDiveMethod th={th} t={t} lang={lang} onBack={() => setSub(null)} />
  if (sub === 'background') return <DeepDiveBackground th={th} t={t} lang={lang} onBack={() => setSub(null)} />
  if (sub === 'research') return <ResearchScreen th={th} t={t} lang={lang} onBack={() => setSub(null)} />

  const iconMap: Record<string, React.ReactNode> = {
    method: <Icon.Analytics color={CARDS[0].color} size={22} />,
    background: <Icon.BookOpen color={CARDS[1].color} size={22} />,
    research: <Icon.Insight color={CARDS[2].color} size={22} />,
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button
        onClick={onBack}
        data-testid="button-back-deepdive-hub"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}
      >
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>

      <h1
        data-testid="text-deepdive-title"
        style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px`, color: th.text }}
      >
        {lang === 'de' ? 'Deep Dives & Wissenschaft' : 'Deep Dives & Science'}
      </h1>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.muted, margin: `0 0 ${SP.xl}px`, lineHeight: 1.5 }}>
        {lang === 'de' ? 'Tief in die Materie eintauchen.' : 'Dive deep into the subject.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
        {CARDS.map(card => (
          <button
            key={card.id}
            onClick={() => setSub(card.id)}
            data-testid={`card-deepdive-${card.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: SP.md,
              background: th.bgCard,
              border: `1px solid ${th.border}`,
              borderRadius: 16,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = card.color }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = th.border }}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${card.color}15`,
              border: `1px solid ${card.color}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {iconMap[card.id]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: th.text, marginBottom: 2, fontFamily: 'DM Sans, sans-serif' }}>
                {lang === 'de' ? card.title.de : card.title.en}
              </div>
              <div style={{ fontSize: 12, color: th.faint, lineHeight: 1.4, fontFamily: 'DM Sans, sans-serif' }}>
                {lang === 'de' ? card.desc.de : card.desc.en}
              </div>
            </div>
            <Icon.ChevronRight color={th.faint} size={16} />
          </button>
        ))}
      </div>
    </div>
  )
}
