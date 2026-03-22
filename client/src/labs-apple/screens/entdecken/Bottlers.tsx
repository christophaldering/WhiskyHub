// CaskSense Apple — Bottlers (Unabhängige Abfüller)
import React, { useState } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; lang: 'de' | 'en'; onBack: () => void }

const BOTTLERS = [
  { name: 'Gordon & MacPhail', country: 'Schottland', city: 'Elgin', founded: 1895, specialty: 'Langzeitreifung & historische Abfüllungen', notable: ['Generations', 'Connoisseurs Choice', 'Private Collection'], whiskybase: 'https://www.whiskybase.com/brands/gordon-macphail' },
  { name: 'Berry Bros. & Rudd', country: 'England', city: 'London', founded: 1698, specialty: 'Eines der ältesten Weinhäuser — Whisky seit dem 19. Jh.', notable: ['Blue Hanger', 'Berry\'s Own Selection'], whiskybase: 'https://www.whiskybase.com/brands/berry-brothers-rudd' },
  { name: 'Signatory Vintage', country: 'Schottland', city: 'Pitlochry', founded: 1988, specialty: 'Fassweise Abfüllungen, Natural Cask Strength', notable: ['Cask Strength Collection', 'Un-Chillfiltered Collection'], whiskybase: 'https://www.whiskybase.com/brands/signatory-vintage' },
  { name: 'Douglas Laing', country: 'Schottland', city: 'Glasgow', founded: 1948, specialty: 'Old & Rare, Single Cask Releases', notable: ['Old Particular', 'Remarkable Regional Malts', 'Platinium'], whiskybase: 'https://www.whiskybase.com/brands/douglas-laing' },
  { name: 'Hunter Laing', country: 'Schottland', city: 'Glasgow', founded: 2013, specialty: 'Kleine Single Cask Serien, Old & Rare', notable: ['Old Malt Cask', 'Hepburn\'s Choice', 'Sovereign'], whiskybase: 'https://www.whiskybase.com/brands/hunter-laing' },
  { name: 'Cadenhead\'s', country: 'Schottland', city: 'Campbeltown', founded: 1842, specialty: 'Ältester unabhängiger Abfüller Schottlands', notable: ['Authentic Collection', 'Chairman\'s Stock', 'Green Label'], whiskybase: 'https://www.whiskybase.com/brands/wm-cadenhead' },
  { name: 'Murray McDavid', country: 'Schottland', city: 'Broxburn', founded: 1996, specialty: 'Innovative Finishing, Terroir-Konzept', notable: ['Mission', 'Benchmark', 'Crafted Blend'], whiskybase: 'https://www.whiskybase.com/brands/murray-mcdavid' },
  { name: 'Adelphi Distillery', country: 'Schottland', city: 'Edinburgh', founded: 1826, specialty: 'Single Cask, Cask Strength ohne Kühlfiltration', notable: ['Adelphi Select', 'Private Stock'], whiskybase: 'https://www.whiskybase.com/brands/adelphi-distillery' },
  { name: 'The Whisky Agency', country: 'Deutschland', city: 'Düsseldorf', founded: 2009, specialty: 'Curated Single Casks, eigenes Artwork', notable: ['The Whisky Agency Label', 'Parallel Universe'], whiskybase: 'https://www.whiskybase.com/brands/the-whisky-agency' },
  { name: 'Càrn Mòr', country: 'Schottland', city: 'Perth', founded: 1997, specialty: 'Ungefärbt, unkühlfiltiert, Cask Strength', notable: ['Strictly Limited', 'Celebration of the Cask'], whiskybase: 'https://www.whiskybase.com/brands/carn-mor' },
  { name: 'That Boutique-y Whisky', country: 'England', city: 'London', founded: 2012, specialty: 'Kleinste Fassmengen, Comic-Label', notable: ['Batch Series', 'Blended Series'], whiskybase: 'https://www.whiskybase.com/brands/that-boutique-y-whisky-company' },
  { name: 'Wemyss Malts', country: 'Schottland', city: 'Edinburgh', founded: 2005, specialty: 'Poetic Names, Terroir-getrieben', notable: ['Velvet Fig', 'Spice King', 'Peat Chimney'], whiskybase: 'https://www.whiskybase.com/brands/wemyss-malts' },
  { name: 'A.D. Rattray', country: 'Schottland', city: 'Kirkoswald', founded: 1868, specialty: 'Cask Strength Single Malts', notable: ['Cask Collection', 'Individual Cask Selection'], whiskybase: 'https://www.whiskybase.com/brands/ad-rattray' },
  { name: 'Blackadder International', country: 'Schottland', city: 'Troon', founded: 1995, specialty: 'Raw Cask Bottlings, ungefärbt', notable: ['Raw Cask', 'Smoking Islay'], whiskybase: 'https://www.whiskybase.com/brands/blackadder-international' },
  { name: 'Master of Malt', country: 'England', city: 'Royal Tunbridge Wells', founded: 1985, specialty: 'Online, Batch und Single Cask Releases', notable: ['Batch series', 'That Boutique-y (Partner)'], whiskybase: 'https://www.whiskybase.com/brands/master-of-malt' },
  { name: 'Kirsch Import', country: 'Deutschland', city: 'Hamburg', founded: 1985, specialty: 'Exklusiver Importeur & Abfüller für D/A/CH', notable: ['Kirsch Import Label', 'Exclusive Casks'], whiskybase: 'https://www.whiskybase.com/brands/kirsch-import' },
  { name: 'Whisky-Fässle', country: 'Deutschland', city: 'Stuttgart', founded: 2004, specialty: 'Kleiner Spezialist, D/A/CH-Märkte', notable: ['Whisky-Fässle Single Cask'], whiskybase: 'https://www.whiskybase.com' },
  { name: 'Van Wees / The Nectar', country: 'Niederlande', city: 'Amersfoort', founded: 1979, specialty: 'Benelux-Abfüller, lange Tradition', notable: ['The Nectar', 'Ultimate', 'Oud Vlaanderen'], whiskybase: 'https://www.whiskybase.com/brands/van-wees' },
]

export const BottlersScreen: React.FC<Props> = ({ th, t, lang, onBack }) => {
  const [search, setSearch]     = useState('')
  const [country, setCountry]   = useState('Alle')
  const [expanded, setExpanded] = useState<string | null>(null)

  const countries = ['Alle', ...Array.from(new Set(BOTTLERS.map(b => b.country)))]
  const filtered = BOTTLERS.filter(b =>
    (!search || b.name.toLowerCase().includes(search.toLowerCase()) || b.specialty.toLowerCase().includes(search.toLowerCase())) &&
    (country === 'Alle' || b.country === country)
  )

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.entBottlers}</h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.md}px` }}>{t.entBottlersSub}</p>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Abfüller suchen..."
        style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }} />

      {/* Country chips */}
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md, overflowX: 'auto', paddingBottom: 4 }}>
        {countries.map(c => (
          <button key={c} onClick={() => setCountry(c)} style={{ flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer', background: country === c ? th.gold : th.bgCard, color: country === c ? '#1a0f00' : th.muted, fontSize: 12, fontWeight: country === c ? 700 : 400, fontFamily: 'DM Sans, sans-serif' }}>{c}</button>
        ))}
      </div>

      {/* Count */}
      <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm }}>{filtered.length} Abfüller</div>

      {/* List */}
      {filtered.map(b => (
        <div key={b.name} style={{ borderBottom: `1px solid ${th.border}` }}>
          <button onClick={() => setExpanded(expanded === b.name ? null : b.name)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', gap: 12, textAlign: 'left' }}>
            {/* Monogram */}
            <div style={{ width: 44, height: 44, borderRadius: 12, background: th.phases.palate.dim, border: `1px solid ${th.phases.palate.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: th.phases.palate.accent, flexShrink: 0 }}>
              {b.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: th.text }}>{b.name}</div>
              <div style={{ fontSize: 11, color: th.faint, marginTop: 2 }}>{b.country} · {b.city} · seit {b.founded}</div>
            </div>
            <Icon.ChevronDown color={th.faint} size={16} />
          </button>

          {expanded === b.name && (
            <div style={{ paddingBottom: SP.md, paddingLeft: 56 }}>
              {/* Specialty */}
              <div style={{ fontSize: 16, color: th.muted, lineHeight: 1.6, marginBottom: SP.sm, fontFamily: 'Cormorant Garamond, serif' }}>{b.specialty}</div>

              {/* Notable releases */}
              {b.notable.length > 0 && (
                <div style={{ marginBottom: SP.sm }}>
                  <div style={{ fontSize: 11, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Bekannte Serien</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.xs }}>
                    {b.notable.map((n, i) => (
                      <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: `${th.gold}15`, color: th.gold, border: `1px solid ${th.gold}30` }}>{n}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Whiskybase link */}
              <a href={b.whiskybase} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: th.phases.nose.accent, textDecoration: 'none', minHeight: 36 }}>
                <Icon.Globe color={th.phases.nose.accent} size={14} />
                Whiskybase
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
