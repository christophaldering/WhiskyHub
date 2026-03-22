// CaskSense Apple — FlavorTags
import React, { useState, useEffect } from 'react'
import { ThemeTokens } from '../theme/tokens'
import { Translations } from '../theme/i18n'
import * as Icon from '../icons/Icons'
import { resolveFlavorProfile, type FlavorProfileKey } from '../data/flavor-data'

interface Props {
  phaseId:        'nose' | 'palate' | 'finish' | 'overall'
  whiskyRegion?:  string
  whiskyCask?:    string
  flavorProfile?: string
  blind:          boolean
  selected:       string[]
  onToggle:       (tag: string) => void
  th:             ThemeTokens
  t:              Translations
}

type Profile = FlavorProfileKey

const FALLBACK_TAGS: Record<string, Record<string, string[]>> = {
  'peated-maritime': {
    nose: ['Torf', 'Rauch', 'Meeresluft', 'Asche', 'Tang', 'Teer'],
    palate: ['Rauch', 'Salz', 'Pfeffer', 'Leder', 'Teer', 'Erdigkeit'],
    finish: ['Langer Nachhall', 'Torf', 'Salz', 'Wärme', 'Rauch', 'Bittersüß'],
    overall: ['Komplex', 'Kräftig', 'Torfig', 'Meerig', 'Vollmundig', 'Ausgewogen'],
  },
  'sherried-rich': {
    nose: ['Rosinen', 'Schokolade', 'Marzipan', 'Pflaumen', 'Gewürze', 'Trockenfrüchte'],
    palate: ['Sherry', 'Nüsse', 'Orange', 'Weihnachtsgewürze', 'Karamell', 'Dunkle Früchte'],
    finish: ['Langer Nachhall', 'Gewürze', 'Trockenfrüchte', 'Bittersüß', 'Wärme', 'Vanille'],
    overall: ['Reichhaltig', 'Süß', 'Fruchtig', 'Würzig', 'Vollmundig', 'Komplex'],
  },
  'speyside-fruity': {
    nose: ['Äpfel', 'Birnen', 'Vanille', 'Honig', 'Blumen', 'Heidekraut'],
    palate: ['Früchte', 'Malz', 'Vanille', 'Sahne', 'Honig', 'Grüner Tee'],
    finish: ['Mittellang', 'Sauber', 'Früchte', 'Malz', 'Süße', 'Mild'],
    overall: ['Elegant', 'Frisch', 'Fruchtig', 'Süß', 'Ausgewogen', 'Sanft'],
  },
  'highland-elegant': {
    nose: ['Heidekraut', 'Honig', 'Würze', 'Trockenfrüchte', 'Eiche', 'Gras'],
    palate: ['Trockenfrüchte', 'Nüsse', 'Gewürze', 'Eiche', 'Malz', 'Butter'],
    finish: ['Würzig', 'Trocken', 'Mittellang', 'Eiche', 'Wärme', 'Nüsse'],
    overall: ['Ausgewogen', 'Komplex', 'Elegant', 'Vollmundig', 'Würzig', 'Traditionell'],
  },
  'bourbon-classic': {
    nose: ['Vanille', 'Karamell', 'Eiche', 'Kokos', 'Mais', 'Honig'],
    palate: ['Vanille', 'Butterscotch', 'Karamell', 'Gewürze', 'Eiche', 'Weiße Schokolade'],
    finish: ['Süß', 'Kurz bis mittel', 'Vanille', 'Gewürze', 'Sauber', 'Warm'],
    overall: ['Süß', 'Zugänglich', 'Frisch', 'Mild', 'Sanft', 'Ausgewogen'],
  },
  'generic': {
    nose: ['Malz', 'Vanille', 'Früchte', 'Gewürze', 'Honig', 'Eiche'],
    palate: ['Malz', 'Süße', 'Gewürze', 'Früchte', 'Salz', 'Eiche'],
    finish: ['Mittellang', 'Wärme', 'Süße', 'Gewürze', 'Trocken', 'Sauber'],
    overall: ['Ausgewogen', 'Komplex', 'Zugänglich', 'Elegant', 'Vollmundig', 'Pur'],
  },
}

export const FlavorTags: React.FC<Props> = ({ phaseId, whiskyRegion, whiskyCask, flavorProfile: hostProfile, blind, selected, onToggle, th, t }) => {
  const [tags, setTags] = useState<string[]>([])

  const resolvedProfile: Profile = blind ? 'generic' : resolveFlavorProfile(hostProfile, whiskyRegion, whiskyCask)

  useEffect(() => {
    fetch('/api/flavour-categories')
      .then(r => r.json())
      .then((cats: any[]) => {
        if (!cats || cats.length === 0) throw new Error('empty')
        const phaseMap: Record<string, string[]> = { nose: [], palate: [], finish: [], overall: [] }
        cats.forEach((cat: any) => {
          const descriptors: string[] = (cat.descriptors || []).map((d: any) => d.de || d.en || d.name || '').filter(Boolean)
          if (cat.name?.toLowerCase().includes('nase') || cat.name?.toLowerCase().includes('nose')) phaseMap.nose.push(...descriptors)
          else if (cat.name?.toLowerCase().includes('gaumen') || cat.name?.toLowerCase().includes('palate')) phaseMap.palate.push(...descriptors)
          else if (cat.name?.toLowerCase().includes('abgang') || cat.name?.toLowerCase().includes('finish')) phaseMap.finish.push(...descriptors)
          else { phaseMap.nose.push(...descriptors); phaseMap.palate.push(...descriptors) }
        })
        const available = phaseMap[phaseId] || phaseMap.nose
        setTags(available.slice(0, 6))
      })
      .catch(() => {
        setTags((FALLBACK_TAGS[resolvedProfile]?.[phaseId] || FALLBACK_TAGS.generic[phaseId] || []).slice(0, 6))
      })
  }, [phaseId, whiskyRegion, whiskyCask, blind, hostProfile, resolvedProfile])

  const profile = blind ? null : resolvedProfile
  const profileLabel = profile === 'peated-maritime' ? 'Islay / Küste' : profile === 'sherried-rich' ? 'Sherry-Fass' : profile === 'speyside-fruity' ? 'Speyside' : profile === 'highland-elegant' ? 'Highland' : profile === 'bourbon-classic' ? 'Bourbon-Fass' : ''
  const phase = th.phases[phaseId]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Profile badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 12,
        background: blind ? th.bgCard : `${phase.accent}10`,
        border: `1px solid ${blind ? th.border : `${phase.accent}38`}`,
      }}>
        <Icon.Globe color={blind ? th.faint : phase.accent} size={14} />
        <span style={{ fontSize: 12, color: blind ? th.muted : phase.accent }}>
          {blind ? t.ratingBlind : `${t.ratingProfile} ${profileLabel}`}
        </span>
        {whiskyRegion && !blind && <span style={{ fontSize: 11, color: th.faint, marginLeft: 4 }}>{whiskyRegion}</span>}
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.map((tag, i) => {
          const active = selected.includes(tag)
          return (
            <button key={tag} onClick={() => onToggle(tag)} style={{
              minHeight: 44, padding: '10px 18px', borderRadius: 22, cursor: 'pointer',
              background: active ? phase.dim : th.bgCard,
              border: `1px solid ${active ? phase.accent : th.border}`,
              color: active ? phase.accent : th.muted,
              fontWeight: active ? 600 : 400, fontSize: 14,
              fontFamily: 'DM Sans, sans-serif',
              animation: `fadeUp 300ms ease both`,
              animationDelay: `${i * 40}ms`,
              transition: 'all 150ms',
            }}>
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
