// CaskSense Apple — FlavourStudio
// 3 Modi: Guide (hierarchisch), Journey (3 Phasen), Describe (Freitext)
import React, { useState, useMemo } from 'react'
import { ThemeTokens, SP } from '../theme/tokens'
import { Translations } from '../theme/i18n'
import * as Icon from '../icons/Icons'
import { resolveFlavorProfile, sortCategoriesByProfile, type FlavorProfileKey } from '../data/flavor-data'

// ── Flavor Data ────────────────────────────────────────────────────────────
interface Descriptor { de: string; en: string; key: string }
interface SubGroup   { label: string; descriptors: Descriptor[] }
interface Category   { key: string; de: string; en: string; subgroups?: SubGroup[]; descriptors?: Descriptor[] }

const CATEGORIES: Category[] = [
  { key: 'fruity', de: 'Fruchtig', en: 'Fruity', subgroups: [
    { label: 'Frisches Obst', descriptors: [
      { key: 'apple',      de: 'Apfel',      en: 'Apple'      },
      { key: 'pear',       de: 'Birne',       en: 'Pear'       },
      { key: 'citrus',     de: 'Zitrus',      en: 'Citrus'     },
      { key: 'peach',      de: 'Pfirsich',    en: 'Peach'      },
      { key: 'melon',      de: 'Melone',      en: 'Melon'      },
    ]},
    { label: 'Dunkle & Getrocknete Früchte', descriptors: [
      { key: 'raisin',     de: 'Rosinen',     en: 'Raisins'    },
      { key: 'plum',       de: 'Pflaume',     en: 'Plum'       },
      { key: 'fig',        de: 'Feige',       en: 'Fig'        },
      { key: 'cherry',     de: 'Kirsche',     en: 'Cherry'     },
      { key: 'date',       de: 'Dattel',      en: 'Date'       },
    ]},
  ]},
  { key: 'floral', de: 'Blumig', en: 'Floral', descriptors: [
    { key: 'heather',    de: 'Heidekraut',  en: 'Heather'    },
    { key: 'lavender',   de: 'Lavendel',    en: 'Lavender'   },
    { key: 'rose',       de: 'Rose',        en: 'Rose'       },
    { key: 'violet',     de: 'Veilchen',    en: 'Violet'     },
    { key: 'elderflower',de: 'Holunderblüte',en: 'Elderflower'},
  ]},
  { key: 'sweet', de: 'Süß', en: 'Sweet', subgroups: [
    { label: 'Zucker & Sirup', descriptors: [
      { key: 'honey',      de: 'Honig',       en: 'Honey'      },
      { key: 'caramel',    de: 'Karamell',    en: 'Caramel'    },
      { key: 'toffee',     de: 'Toffee',      en: 'Toffee'     },
      { key: 'maple',      de: 'Ahornsirup',  en: 'Maple Syrup'},
    ]},
    { label: 'Konfekt', descriptors: [
      { key: 'vanilla',    de: 'Vanille',     en: 'Vanilla'    },
      { key: 'chocolate',  de: 'Schokolade',  en: 'Chocolate'  },
      { key: 'marzipan',   de: 'Marzipan',    en: 'Marzipan'   },
      { key: 'butterscotch',de: 'Butterscotch',en: 'Butterscotch'},
    ]},
  ]},
  { key: 'spicy', de: 'Würzig', en: 'Spicy', descriptors: [
    { key: 'pepper',     de: 'Pfeffer',     en: 'Pepper'     },
    { key: 'cinnamon',   de: 'Zimt',        en: 'Cinnamon'   },
    { key: 'clove',      de: 'Nelke',       en: 'Clove'      },
    { key: 'ginger',     de: 'Ingwer',      en: 'Ginger'     },
    { key: 'nutmeg',     de: 'Muskatnuss',  en: 'Nutmeg'     },
    { key: 'anise',      de: 'Anis',        en: 'Anise'      },
  ]},
  { key: 'woody', de: 'Holzig', en: 'Woody', descriptors: [
    { key: 'oak',        de: 'Eiche',       en: 'Oak'        },
    { key: 'cedar',      de: 'Zeder',       en: 'Cedar'      },
    { key: 'sawdust',    de: 'Sägemehl',    en: 'Sawdust'    },
    { key: 'resin',      de: 'Harz',        en: 'Resin'      },
    { key: 'tobacco',    de: 'Tabak',       en: 'Tobacco'    },
  ]},
  { key: 'smoky', de: 'Rauchig', en: 'Smoky', subgroups: [
    { label: 'Torfrauch', descriptors: [
      { key: 'peat',       de: 'Torf',        en: 'Peat'       },
      { key: 'bonfire',    de: 'Lagerfeuer',  en: 'Bonfire'    },
      { key: 'medicinal',  de: 'Medizinisch', en: 'Medicinal'  },
    ]},
    { label: 'Holzrauch', descriptors: [
      { key: 'smoked-wood',de: 'Räucherholz', en: 'Smoked Wood'},
      { key: 'ash',        de: 'Asche',       en: 'Ash'        },
      { key: 'charcoal',   de: 'Holzkohle',   en: 'Charcoal'   },
    ]},
  ]},
  { key: 'malty', de: 'Malzig', en: 'Malty', descriptors: [
    { key: 'biscuit',    de: 'Keks',        en: 'Biscuit'    },
    { key: 'bread',      de: 'Brot',        en: 'Bread'      },
    { key: 'cereal',     de: 'Getreide',    en: 'Cereal'     },
    { key: 'porridge',   de: 'Porridge',    en: 'Porridge'   },
    { key: 'barley',     de: 'Gerste',      en: 'Barley'     },
  ]},
  { key: 'maritime', de: 'Meerig', en: 'Maritime', subgroups: [
    { label: 'Salz & Sole', descriptors: [
      { key: 'salt',       de: 'Salz',        en: 'Salt'       },
      { key: 'brine',      de: 'Sole',        en: 'Brine'      },
      { key: 'seaweed',    de: 'Seetang',     en: 'Seaweed'    },
    ]},
    { label: 'Küste', descriptors: [
      { key: 'iodine',     de: 'Jod',         en: 'Iodine'     },
      { key: 'oyster',     de: 'Auster',      en: 'Oyster'     },
      { key: 'sea-spray',  de: 'Meeresgischt',en: 'Sea Spray'  },
    ]},
  ]},
  { key: 'nutty', de: 'Nussig', en: 'Nutty', descriptors: [
    { key: 'walnut',     de: 'Walnuss',     en: 'Walnut'     },
    { key: 'almond',     de: 'Mandel',      en: 'Almond'     },
    { key: 'hazelnut',   de: 'Haselnuss',   en: 'Hazelnut'   },
    { key: 'coconut',    de: 'Kokos',       en: 'Coconut'    },
  ]},
  { key: 'herbal', de: 'Pflanzlich', en: 'Herbal', descriptors: [
    { key: 'grass',      de: 'Gras',        en: 'Grass'      },
    { key: 'mint',       de: 'Minze',       en: 'Mint'       },
    { key: 'eucalyptus', de: 'Eukalyptus',  en: 'Eucalyptus' },
    { key: 'hay',        de: 'Heu',         en: 'Hay'        },
    { key: 'tea',        de: 'Tee',         en: 'Tea'        },
  ]},
  { key: 'earthy', de: 'Erdig', en: 'Earthy', descriptors: [
    { key: 'leather',    de: 'Leder',       en: 'Leather'    },
    { key: 'mushroom',   de: 'Pilze',       en: 'Mushroom'   },
    { key: 'soil',       de: 'Erde',        en: 'Soil'       },
    { key: 'moss',       de: 'Moos',        en: 'Moss'       },
  ]},
  { key: 'creamy', de: 'Cremig', en: 'Creamy', descriptors: [
    { key: 'butter',     de: 'Butter',      en: 'Butter'     },
    { key: 'cream',      de: 'Sahne',       en: 'Cream'      },
    { key: 'milk',       de: 'Milch',       en: 'Milk'       },
    { key: 'yogurt',     de: 'Joghurt',     en: 'Yogurt'     },
  ]},
  { key: 'mineral', de: 'Mineralisch', en: 'Mineral', descriptors: [
    { key: 'flint',      de: 'Feuerstein',  en: 'Flint'      },
    { key: 'chalk',      de: 'Kreide',      en: 'Chalk'      },
    { key: 'slate',      de: 'Schiefer',    en: 'Slate'      },
    { key: 'metallic',   de: 'Metallisch',  en: 'Metallic'   },
  ]},
]

// ── GuideView (hierarchisches Drill-Down) ────────────────────────────────
const GuideView: React.FC<{ th: ThemeTokens; lang: 'de' | 'en'; selected: string[]; onToggle: (key: string) => void; categories: Category[] }> = ({ th, lang, selected, onToggle, categories }) => {
  const [level, setLevel]   = useState<'categories' | 'subgroups' | 'descriptors'>('categories')
  const [activeCat, setActiveCat] = useState<Category | null>(null)
  const [activeSub, setActiveSub] = useState<SubGroup | null>(null)

  const allDescriptors = (cat: Category): Descriptor[] => {
    if (cat.descriptors) return cat.descriptors
    return (cat.subgroups || []).flatMap(sg => sg.descriptors)
  }

  const catSelectedCount = (cat: Category) => allDescriptors(cat).filter(d => selected.includes(d.key)).length

  const tagStyle = (active: boolean, accent: string) => ({
    minHeight: 44, padding: '10px 16px', borderRadius: 22, cursor: 'pointer',
    background: active ? `${accent}20` : th.bgCard,
    border: `1px solid ${active ? accent : th.border}`,
    color: active ? accent : th.muted,
    fontWeight: active ? 700 : 400, fontSize: 14,
    fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
  })

  const accent = activeCat ? th.phases[(['fruity','floral','sweet','spicy'] as any).includes(activeCat.key) ? 'palate' : (['smoky','maritime','earthy'] as any).includes(activeCat.key) ? 'finish' : (['malty','woody','nutty'] as any).includes(activeCat.key) ? 'nose' : 'overall'].accent : th.gold

  // Level 1: Categories
  if (level === 'categories') return (
    <div>
      <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.md }}>Wähle eine Kategorie zum Vertiefen</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
        {categories.map(cat => {
          const count = catSelectedCount(cat)
          const active = count > 0
          return (
            <button key={cat.key} onClick={() => { setActiveCat(cat); setLevel(cat.subgroups ? 'subgroups' : 'descriptors') }}
              style={{ minHeight: 64, borderRadius: 16, border: `1px solid ${active ? th.gold : th.border}`, background: active ? `${th.gold}12` : th.bgCard, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 14px', gap: 4, transition: 'all 150ms' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: active ? th.gold : th.text }}>{lang === 'de' ? cat.de : cat.en}</span>
              {count > 0 && <span style={{ fontSize: 11, color: th.green }}>{count} gewählt</span>}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: SP.lg, padding: SP.md, background: th.bgCard, borderRadius: 16, border: `1px solid ${th.border}` }}>
          <div style={{ fontSize: 11, color: th.faint, marginBottom: SP.sm, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ausgewählt ({selected.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.xs }}>
            {selected.map(key => {
              const desc = categories.flatMap(c => allDescriptors(c)).find(d => d.key === key)
              return desc ? <span key={key} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: `${th.gold}20`, color: th.gold }}>{lang === 'de' ? desc.de : desc.en}</span> : null
            })}
          </div>
        </div>
      )}
    </div>
  )

  // Level 2: Subgroups
  if (level === 'subgroups' && activeCat?.subgroups) return (
    <div>
      <button onClick={() => setLevel('categories')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 14, padding: '0 0 12px' }}>
        <Icon.Back color={th.muted} size={16} />{lang === 'de' ? activeCat.de : activeCat.en}
      </button>
      {activeCat.subgroups.map(sg => (
        <div key={sg.label} style={{ marginBottom: SP.md }}>
          <button onClick={() => { setActiveSub(sg); setLevel('descriptors') }} style={{ width: '100%', minHeight: 52, borderRadius: 14, border: `1px solid ${th.border}`, background: th.bgCard, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${SP.md}px`, fontSize: 15, fontWeight: 600, color: th.text }}>
            <span>{sg.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {sg.descriptors.filter(d => selected.includes(d.key)).length > 0 && <span style={{ fontSize: 11, color: th.green }}>{sg.descriptors.filter(d => selected.includes(d.key)).length}</span>}
              <Icon.ChevronRight color={th.faint} size={16} />
            </div>
          </button>
        </div>
      ))}
    </div>
  )

  // Level 3: Descriptors
  const descriptors = activeSub ? activeSub.descriptors : activeCat ? allDescriptors(activeCat) : []
  return (
    <div>
      <button onClick={() => { if (activeSub) { setActiveSub(null); setLevel(activeCat?.subgroups ? 'subgroups' : 'categories') } else setLevel('categories') }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 14, padding: '0 0 12px' }}>
        <Icon.Back color={th.muted} size={16} />{activeSub ? activeSub.label : (activeCat ? (lang === 'de' ? activeCat.de : activeCat.en) : '')}
      </button>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.sm }}>
        {descriptors.map(d => (
          <button key={d.key} onClick={() => onToggle(d.key)} style={tagStyle(selected.includes(d.key), accent)}>
            {lang === 'de' ? d.de : d.en}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── JourneyView (3-Phasen) ──────────────────────────────────────────────
const JourneyView: React.FC<{ th: ThemeTokens; lang: 'de' | 'en'; selected: string[]; onToggle: (key: string) => void; categories: Category[] }> = ({ th, lang, selected, onToggle, categories }) => {
  const [phase, setPhase] = useState(0) // 0=sweep, 1=drill, 2=summary
  const [votes, setVotes] = useState<Record<string, 'yes' | 'maybe' | 'no'>>({})
  const [sweepIdx, setSweepIdx] = useState(0)
  const [drillIdx, setDrillIdx] = useState(0)

  const sweepCats = categories
  const current = sweepCats[sweepIdx]
  const yesKeys  = Object.entries(votes).filter(([,v]) => v === 'yes').map(([k]) => k)
  const maybeKeys = Object.entries(votes).filter(([,v]) => v === 'maybe').map(([k]) => k)
  const drillList = [...yesKeys, ...maybeKeys]

  const vote = (v: 'yes' | 'maybe' | 'no') => {
    setVotes(prev => ({ ...prev, [current.key]: v }))
    if (sweepIdx < sweepCats.length - 1) setSweepIdx(i => i + 1)
    else setPhase(1)
  }

  const allDescriptors = (cat: Category) => cat.descriptors || (cat.subgroups || []).flatMap(sg => sg.descriptors)

  if (phase === 0) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: th.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: SP.sm }}>Phase 1 · Übersicht</div>
      <div style={{ display: 'flex', gap: 3, marginBottom: SP.lg }}>
        {sweepCats.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < sweepIdx ? th.gold : i === sweepIdx ? `${th.gold}80` : th.border }} />)}
      </div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{lang === 'de' ? current.de : current.en}</h2>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.xl}px` }}>
        {allDescriptors(current).slice(0, 3).map(d => lang === 'de' ? d.de : d.en).join(' · ')}
      </p>
      <div style={{ display: 'flex', gap: SP.sm }}>
        <button onClick={() => vote('no')} style={{ flex: 1, height: 56, borderRadius: 16, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 15 }}>Nein</button>
        <button onClick={() => vote('maybe')} style={{ flex: 1, height: 56, borderRadius: 16, border: `1px solid ${th.phases.nose.accent}44`, background: th.phases.nose.dim, color: th.phases.nose.accent, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>Vielleicht</button>
        <button onClick={() => vote('yes')} style={{ flex: 1, height: 56, borderRadius: 16, border: 'none', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>Ja</button>
      </div>
    </div>
  )

  if (phase === 1) {
    const drillCat = categories.find(c => c.key === drillList[drillIdx])
    if (!drillCat || drillIdx >= drillList.length) { setPhase(2); return null }
    const descriptors = allDescriptors(drillCat)
    return (
      <div>
        <div style={{ fontSize: 11, color: th.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: SP.sm }}>Phase 2 · Details · {drillIdx + 1}/{drillList.length}</div>
        <div style={{ display: 'flex', gap: 3, marginBottom: SP.lg }}>
          {drillList.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < drillIdx ? th.gold : i === drillIdx ? `${th.gold}80` : th.border }} />)}
        </div>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.lg}px` }}>{lang === 'de' ? drillCat.de : drillCat.en}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.xl }}>
          {descriptors.map(d => (
            <button key={d.key} onClick={() => onToggle(d.key)} style={{ minHeight: 44, padding: '10px 18px', borderRadius: 22, cursor: 'pointer', background: selected.includes(d.key) ? `${th.gold}20` : th.bgCard, border: `1px solid ${selected.includes(d.key) ? th.gold : th.border}`, color: selected.includes(d.key) ? th.gold : th.muted, fontWeight: selected.includes(d.key) ? 700 : 400, fontSize: 14, fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms' }}>
              {lang === 'de' ? d.de : d.en}
            </button>
          ))}
        </div>
        <button onClick={() => drillIdx < drillList.length - 1 ? setDrillIdx(i => i + 1) : setPhase(2)} style={{ width: '100%', height: 52, borderRadius: 16, border: 'none', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
          {drillIdx < drillList.length - 1 ? 'Weiter →' : 'Zusammenfassung →'}
        </button>
      </div>
    )
  }

  // Phase 3: Summary
  return (
    <div>
      <div style={{ fontSize: 11, color: th.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: SP.lg }}>Phase 3 · Profil</div>
      {categories.filter(c => allDescriptors(c).some(d => selected.includes(d.key))).map(cat => {
        const found = allDescriptors(cat).filter(d => selected.includes(d.key))
        return (
          <div key={cat.key} style={{ marginBottom: SP.md, background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: th.gold, marginBottom: SP.xs }}>{lang === 'de' ? cat.de : cat.en}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.xs }}>
              {found.map(d => <span key={d.key} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: `${th.gold}20`, color: th.gold }}>{lang === 'de' ? d.de : d.en}</span>)}
            </div>
          </div>
        )
      })}
      <button onClick={() => { setPhase(0); setSweepIdx(0); setDrillIdx(0); setVotes({}) }} style={{ width: '100%', height: 44, borderRadius: 14, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 14 }}>Neu starten</button>
    </div>
  )
}

// ── DescribeView ──────────────────────────────────────────────────────────
const DescribeView: React.FC<{ th: ThemeTokens; note: string; onChange: (v: string) => void }> = ({ th, note, onChange }) => (
  <div>
    <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.sm }}>Beschreibe in eigenen Worten — keine Vorgaben.</div>
    <textarea value={note} onChange={e => onChange(e.target.value)} placeholder="Dunkle Früchte, ein Hauch Rauch, langer warmer Abgang…" rows={6}
      style={{ width: '100%', borderRadius: 16, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 17, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', padding: '14px 16px', resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
  </div>
)

// ── FlavourStudio ──────────────────────────────────────────────────────────
interface Props {
  th:             ThemeTokens
  lang:           'de' | 'en'
  selected:       string[]
  note:           string
  onToggle:       (key: string) => void
  onNote:         (v: string) => void
  whiskyRegion?:  string
  whiskyCask?:    string
  flavorProfile?: string
  blind?:         boolean
}

type StudioMode = 'guide' | 'journey' | 'describe'

const LS_KEY_APPLE = 'flavourstudio-mode-apple'

function getStoredMode(): StudioMode {
  try {
    const v = localStorage.getItem(LS_KEY_APPLE)
    if (v === 'guide' || v === 'journey' || v === 'describe') return v
  } catch {}
  return 'guide'
}

export const FlavourStudio: React.FC<Props> = ({ th, lang, selected, note, onToggle, onNote, whiskyRegion, whiskyCask, flavorProfile, blind }) => {
  const [mode, setMode] = useState<StudioMode>(getStoredMode)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [apiCategories, setApiCategories] = React.useState<Category[] | null>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const handleSetMode = React.useCallback((m: StudioMode) => {
    setMode(m)
    setDropdownOpen(false)
    try { localStorage.setItem(LS_KEY_APPLE, m) } catch {}
  }, [])

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const profile: FlavorProfileKey = useMemo(() => {
    if (blind) return 'generic'
    return resolveFlavorProfile(flavorProfile, whiskyRegion, whiskyCask)
  }, [blind, flavorProfile, whiskyRegion, whiskyCask])

  React.useEffect(() => {
    fetch('/api/flavour-categories')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.length) return
        const mapped: Category[] = data.map((cat: any) => ({
          key: cat.id || cat.key || cat.en?.toLowerCase().replace(/\s+/g, '-'),
          de: cat.de || cat.name || cat.en,
          en: cat.en || cat.name,
          descriptors: (cat.descriptors || []).map((d: any) => ({
            key: d.id || d.en?.toLowerCase().replace(/\s+/g, '-'),
            de: d.de || d.en,
            en: d.en
          }))
        }))
        if (mapped.length > 0) setApiCategories(mapped)
      })
      .catch(() => { /* use hardcoded */ })
  }, [])

  const baseCategories = apiCategories || CATEGORIES
  const activeCategories = useMemo(() => sortCategoriesByProfile(baseCategories, profile), [baseCategories, profile])

  const modes: { id: StudioMode; label: string }[] = [
    { id: 'guide',   label: lang === 'de' ? 'Geführt' : 'Guide'    },
    { id: 'journey', label: lang === 'de' ? 'Journey'  : 'Journey'  },
    { id: 'describe',label: lang === 'de' ? 'Freitext' : 'Describe' },
  ]

  const currentLabel = modes.find(m => m.id === mode)?.label || modes[0].label

  return (
    <div>
      <div ref={dropdownRef} style={{ position: 'relative', marginBottom: SP.lg }}>
        <button
          onClick={() => setDropdownOpen(o => !o)}
          data-testid="studio-mode-switcher"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 0',
            fontSize: 12, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
            color: th.muted,
          }}
        >
          <span>{lang === 'de' ? 'Ansicht' : 'View'}:</span>
          <span style={{ color: th.gold, fontWeight: 600 }}>{currentLabel}</span>
          <span style={{ fontSize: 10, transition: 'transform 200ms', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>
        {dropdownOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 20,
            marginTop: 4, padding: 4, borderRadius: 12,
            background: th.bgCard, border: `1px solid ${th.border}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            minWidth: 160,
            animation: 'labsFadeIn 150ms ease both',
          }}>
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => handleSetMode(m.id)}
                data-testid={`studio-mode-${m.id}`}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px', borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  background: mode === m.id ? `${th.gold}22` : 'transparent',
                  color: mode === m.id ? th.gold : th.muted,
                  fontSize: 13, fontWeight: mode === m.id ? 600 : 400,
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'background 100ms',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'guide'   && <GuideView th={th} lang={lang} selected={selected} onToggle={onToggle} categories={activeCategories} />}
      {mode === 'journey' && <JourneyView th={th} lang={lang} selected={selected} onToggle={onToggle} categories={activeCategories} />}
      {mode === 'describe'&& <DescribeView th={th} note={note} onChange={onNote} />}
    </div>
  )
}
