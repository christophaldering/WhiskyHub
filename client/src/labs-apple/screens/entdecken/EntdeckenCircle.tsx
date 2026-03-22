// CaskSense Apple — EntdeckenCircle VOLLSTÄNDIG
// Fix: Distilleries aus eigener Datei importiert (API-Daten statt hardcodiert)
// Ablage: client/src/labs-apple/screens/entdecken/EntdeckenCircle.tsx

import React, { useState, useEffect } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'
import { BottlersScreen } from './Bottlers'
import { Distilleries } from './Destilleries'
import { Vocabulary, Research, MakingOf } from '../misc/MiscScreens'

// ── Tasting Guide ─────────────────────────────────────────────────────────
const GUIDE_SECTIONS = [
  { title: 'Vorbereitung', icon: '1', de: 'Sorge für ein ruhiges Umfeld. Kein Parfüm, kein starkes Essen. Verwende ein tulpenförmiges Glas.', en: 'Ensure a quiet environment. No perfume, no strong food. Use a tulip glass.' },
  { title: 'Das Glas', icon: '2', de: 'Gieß etwa 3cl ein. Lass den Whisky atmen — 1–2 Minuten ohne Schwenken. Dann sanft schwenken.', en: 'Pour about 3cl. Let the whisky breathe for 1–2 minutes without swirling. Then gently swirl.' },
  { title: 'Die Nase', icon: '3', de: 'Halte das Glas unter die Nase, Mund leicht geöffnet. Erste Eindruck: Früchte? Holz? Rauch? Lass Zeit.', en: 'Hold the glass below your nose, mouth slightly open. First impression: fruit? wood? smoke? Take your time.' },
  { title: 'Der erste Schluck', icon: '4', de: 'Kleiner Schluck, auf der Zunge halten. Lass die Aromen sich entfalten. Was verändert sich?', en: 'Small sip, hold on the tongue. Let the flavors unfold. What changes?' },
  { title: 'Der Gaumen', icon: '5', de: 'Jetzt etwas mehr. Wie ist die Textur? Ölig, dünn, cremig? Welche Aromen tauchen jetzt auf?', en: 'Now a little more. What is the texture? Oily, thin, creamy? What aromas appear now?' },
  { title: 'Der Abgang', icon: '6', de: 'Schreib auf was bleibt. Wie lange hält der Geschmack an? Warm? Trocken? Süß? Kurz oder lang?', en: 'Note what remains. How long does the taste last? Warm? Dry? Sweet? Short or long?' },
  { title: 'Bewertung', icon: '7', de: 'Bewerte jetzt: Nase, Gaumen, Abgang und Gesamteindruck auf einer Skala von 60–100. 75 ist "sehr gut".', en: 'Rate now: nose, palate, finish and overall on a scale of 60–100. 75 is "very good".' },
  { title: 'Notizen', icon: '8', de: 'Halte deine Eindrücke fest. Je genauer, desto wertvoller für dich später. Eigene Worte sind besser als Fachvokabular.', en: 'Record your impressions. The more precise, the more valuable for you later. Your own words are better than technical vocabulary.' },
]

const TastingGuide: React.FC<{ th: ThemeTokens; t: Translations; lang: 'de' | 'en'; onBack: () => void }> = ({ th, t, lang, onBack }) => (
  <div style={{ padding: SP.md, paddingBottom: 80 }}>
    <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
    <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.entGuide}</h1>
    <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>{t.entGuideSub}</p>
    {GUIDE_SECTIONS.map((s, i) => (
      <div key={i} style={{ display: 'flex', gap: SP.md, marginBottom: SP.lg }}>
        <div style={{ width: 40, height: 40, borderRadius: 20, background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#1a0f00', flexShrink: 0 }}>{s.icon}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
          <div style={{ fontSize: 16, color: th.muted, lineHeight: 1.6, fontFamily: 'Cormorant Garamond, serif' }}>{lang === 'de' ? s.de : s.en}</div>
        </div>
      </div>
    ))}
  </div>
)

// ── HistoricalArchive ──────────────────────────────────────────────────────
const HistoricalArchive: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onBack: () => void }> = ({ th, t, participantId, onBack }) => {
  const [tastings, setTastings] = useState<any[]>([])
  const [insights, setInsights] = useState<any>(null)
  const [search, setSearch]     = useState('')
  const [isMember, setMember]   = useState<boolean | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/historical-tastings', { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
      fetch('/api/historical-tastings/insights', { headers: { 'x-participant-id': participantId } }).then(r => r.json()),
    ]).then(([t, i]) => { setTastings(t || []); setInsights(i); setMember(true) })
      .catch(() => setMember(false))
  }, [participantId])

  if (isMember === false) return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <div style={{ textAlign: 'center', padding: SP.xl }}>
        <Icon.Lock color={th.faint} size={36} />
        <div style={{ fontSize: 16, color: th.muted, margin: `${SP.md}px 0 ${SP.lg}px` }}>{t.historyGated}</div>
        <button style={{ height: 52, padding: '0 28px', borderRadius: 16, border: 'none', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>{t.historyJoin}</button>
      </div>
    </div>
  )

  const filtered = tastings.filter(t2 => !search || (t2.name || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.md}px` }}>{t.entHistory}</h1>
      {insights && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm, marginBottom: SP.md }}>
          {[
            { label: 'Tastings', value: insights.totalTastings || tastings.length },
            { label: 'Whiskies', value: insights.totalWhiskies || '—' },
          ].map((s, i) => (
            <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 12, padding: SP.md, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: th.gold }}>{s.value}</div>
              <div style={{ fontSize: 11, color: th.faint }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.entHistSearch} style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.md }} />
      {filtered.map((tasting, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${th.border}`, gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{tasting.name}</div>
            <div style={{ fontSize: 12, color: th.faint }}>{tasting.date ? new Date(tasting.date).toLocaleDateString('de') : ''}{tasting.location ? ` · ${tasting.location}` : ''}</div>
          </div>
          {tasting.avgScore && <span style={{ fontSize: 16, fontWeight: 700, color: th.gold }}>{Math.round(tasting.avgScore)}</span>}
        </div>
      ))}
      {isMember === null && <div style={{ display: 'flex', justifyContent: 'center', padding: SP.xl }}><Icon.Spinner color={th.gold} size={28} /></div>}
    </div>
  )
}

// ── BottleDetail ──────────────────────────────────────────────────────────
const BottleDetail: React.FC<{ th: ThemeTokens; t: Translations; bottleId: string; participantId: string; onBack: () => void }> = ({ th, t, bottleId, participantId, onBack }) => {
  const [bottle, setBottle] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/labs/explore/whiskies/${bottleId}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(setBottle).catch(() => {})
  }, [bottleId])

  if (!bottle) return <div style={{ display: 'flex', justifyContent: 'center', padding: SP.xl }}><Icon.Spinner color={th.gold} size={28} /></div>

  const dims = ['nose', 'palate', 'finish', 'overall'] as const
  const dimLabels = { nose: t.ratingNose, palate: t.ratingPalate, finish: t.ratingFinish, overall: t.ratingOverall }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{bottle.name}</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.xs, marginBottom: SP.lg }}>
        {[bottle.distillery, bottle.region, bottle.cask, bottle.age ? `${bottle.age}y` : null, bottle.abv ? `${bottle.abv}%` : null].filter(Boolean).map((v: any, i) => (
          <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 12, background: th.bgCard, color: th.muted, border: `1px solid ${th.border}` }}>{v}</span>
        ))}
      </div>
      <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md, marginBottom: SP.md }}>
        <div style={{ fontSize: 12, color: th.faint, marginBottom: SP.md, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.entBottleRatings}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.lg, marginBottom: SP.md }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: th.gold, lineHeight: 1 }}>{bottle.avgScore ? Math.round(bottle.avgScore) : '—'}</div>
            <div style={{ fontSize: 11, color: th.faint }}>Ø Score</div>
          </div>
          <div style={{ flex: 1 }}>
            {dims.map(d => {
              const score = bottle.dimensionAvg?.[d] || bottle.avgScore || 0
              const pct = ((score - 60) / 40) * 100
              return (
                <div key={d} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: th.faint }}>{dimLabels[d]}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: th.phases[d].accent }}>{score ? Math.round(score) : '—'}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: th.border, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: th.phases[d].accent }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {bottle.scoreDistribution && (
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 40 }}>
            {bottle.scoreDistribution.map((count: number, i: number) => (
              <div key={i} style={{ flex: 1, background: th.gold, borderRadius: '2px 2px 0 0', height: `${(count / Math.max(...bottle.scoreDistribution, 1)) * 100}%`, opacity: 0.6 + i * 0.04 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Lexikon ────────────────────────────────────────────────────────────────
const LEXIKON = [
  { term: 'Terroir', category: 'Allgemein', de: 'Einfluss von Umgebung, Klima und Geographie auf den Geschmack des Whiskys.' },
  { term: 'Dram', category: 'Allgemein', de: 'Ein Schluck oder eine Portion Whisky, typischerweise 25–40ml.' },
  { term: 'Cask Strength', category: 'Abfüllung', de: 'Whisky direkt aus dem Fass, ohne Verdünnung. Oft über 55% ABV.' },
  { term: 'Single Malt', category: 'Kategorien', de: 'Malzwhisky (nur Gerste) aus einer einzigen Destillerie.' },
  { term: 'Blended Malt', category: 'Kategorien', de: 'Mischung von Single Malts verschiedener Destillerien.' },
  { term: 'Single Grain', category: 'Kategorien', de: 'Getreide-Whisky (Weizen, Mais) aus einer Destillerie.' },
  { term: 'Blended Scotch', category: 'Kategorien', de: 'Mischung von Malt und Grain Whisky.' },
  { term: 'ABV', category: 'Allgemein', de: 'Alcohol by Volume — Alkoholgehalt in Prozent.' },
  { term: 'NAS', category: 'Abfüllung', de: 'No Age Statement — Whisky ohne Altersangabe.' },
  { term: 'Peated', category: 'Herstellung', de: 'Torfiger Whisky. Gerste wird mit Torfrauch getrocknet.' },
  { term: 'Phenol PPM', category: 'Herstellung', de: 'Maß für den Torfgehalt. Normaler Whisky <5 PPM, Octomore >200 PPM.' },
  { term: 'Finish', category: 'Bewertung', de: 'Der Nachgeschmack nach dem Schlucken. Dauer und Qualität des Abgangs.' },
  { term: 'Nose', category: 'Bewertung', de: 'Die Nase — das Aromenspektrum, das man beim Riechen wahrnimmt.' },
  { term: 'Ex-Bourbon Cask', category: 'Reifung', de: 'Gebrauchtes Bourbon-Fass. Gibt Vanille, Karamell, Kokos ab.' },
  { term: 'Sherry Cask', category: 'Reifung', de: 'Ehemaliges Sherry-Fass. Gibt Trockenfrüchte, Nüsse, Würze ab.' },
  { term: "Angel's Share", category: 'Reifung', de: 'Alkohol der jährlich durch die Fasswände verdunstet. Schottland: ~2% pro Jahr.' },
  { term: 'Warehousing', category: 'Reifung', de: 'Art der Fass-Lagerung beeinflusst Reifung: Dunnage (niedrig) oder Racked (gestapelt).' },
  { term: 'Washback', category: 'Herstellung', de: 'Gärbehälter in dem Maische zu Wash (Bier ~8%) fermentiert.' },
  { term: 'Pot Still', category: 'Herstellung', de: 'Geigenförmiger Kupferkessel für traditionelle Destillation in zwei Durchläufen.' },
  { term: 'Spirit Still', category: 'Herstellung', de: 'Zweiter Destillierdurchlauf. Nur das "Herzstück" wird genutzt.' },
]

const Lexikon: React.FC<{ th: ThemeTokens; t: Translations; lang: 'de' | 'en'; onBack: () => void }> = ({ th, t, lang, onBack }) => {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('Alle')
  const categories = ['Alle', ...Array.from(new Set(LEXIKON.map(e => e.category)))]
  const filtered = LEXIKON.filter(e =>
    (!search || e.term.toLowerCase().includes(search.toLowerCase()) || e.de.toLowerCase().includes(search.toLowerCase())) &&
    (category === 'Alle' || e.category === category)
  )
  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.md}px` }}>{t.entLexikon}</h1>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.entLexSearch} style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }} />
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md, overflowX: 'auto', paddingBottom: 4 }}>
        {categories.map(c => <button key={c} onClick={() => setCategory(c)} style={{ flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer', background: category === c ? th.gold : th.bgCard, color: category === c ? '#1a0f00' : th.muted, fontSize: 12, fontWeight: category === c ? 700 : 400 }}>{c}</button>)}
      </div>
      {filtered.map((e, i) => (
        <div key={i} style={{ padding: '12px 0', borderBottom: `1px solid ${th.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: th.gold, marginBottom: 4 }}>{e.term}</div>
          <div style={{ fontSize: 11, color: th.phases.nose.accent, marginBottom: 4 }}>{e.category}</div>
          <div style={{ fontSize: 14, color: th.muted, lineHeight: 1.5 }}>{e.de}</div>
        </div>
      ))}
    </div>
  )
}

// ── ExploreWhiskies ────────────────────────────────────────────────────────
const ExploreWhiskies: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; onBottle: (id: string) => void; onBack: () => void }> = ({ th, t, participantId, onBottle, onBack }) => {
  const [whiskies, setWhiskies] = useState<any[]>([])
  const [search, setSearch]     = useState('')
  const [sort, setSort]         = useState('avg')

  useEffect(() => {
    fetch(`/api/labs/explore/whiskies?search=${search}&sort=${sort}`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => setWhiskies(data || [])).catch(() => {})
  }, [search, sort, participantId])

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}><Icon.Back color={th.muted} size={18} />{t.back}</button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.md}px` }}>{t.entExplore}</h1>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.entSearch} style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.sm }} />
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.md }}>
        {[['avg', t.entSortAvg], ['most', t.entSortMost], ['alpha', t.entSortAlpha]].map(([id, label]) => (
          <button key={id} onClick={() => setSort(id as string)} style={{ height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: 'pointer', background: sort === id ? th.gold : th.bgCard, color: sort === id ? '#1a0f00' : th.muted, fontSize: 12, fontWeight: sort === id ? 700 : 400 }}>{label}</button>
        ))}
      </div>
      {whiskies.map((w, i) => (
        <button key={i} onClick={() => w.id && onBottle(w.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${th.border}`, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: th.text }}>{w.name || w.whiskeyName}</div>
            <div style={{ fontSize: 12, color: th.faint }}>{w.distillery}{w.region ? ` · ${w.region}` : ''}</div>
          </div>
          {w.avgScore && <span style={{ fontSize: 18, fontWeight: 700, color: '#d4a847' }}>{Math.round(w.avgScore)}</span>}
          <Icon.ChevronRight color={th.faint} size={14} />
        </button>
      ))}
    </div>
  )
}

// ── EntdeckenHub ──────────────────────────────────────────────────────────
const EntdeckenHub: React.FC<{ th: ThemeTokens; t: Translations; lang: 'de' | 'en'; onNav: (s: string) => void }> = ({ th, t, lang, onNav }) => {
  const items = [
    { id: 'explore',  icon: <Icon.Whisky color={th.phases.palate.accent} size={28} />,      label: t.entExplore,  sub: t.entExploreSub,  phase: 'palate'  as const },
    { id: 'lexikon',  icon: <Icon.BookOpen color={th.phases.nose.accent} size={28} />,      label: t.entLexikon,  sub: t.entLexikonSub,  phase: 'nose'    as const },
    { id: 'guide',    icon: <Icon.Report color={th.phases.finish.accent} size={28} />,      label: t.entGuide,    sub: t.entGuideSub,    phase: 'finish'  as const },
    { id: 'dest',     icon: <Icon.Distillery color={th.phases.overall.accent} size={28} />, label: t.entDest,     sub: t.entDestSub,     phase: 'overall' as const },
    { id: 'bottlers', icon: <Icon.Globe color={th.phases.nose.accent} size={28} />,         label: t.entBottlers, sub: t.entBottlersSub, phase: 'nose'    as const },
    { id: 'history',  icon: <Icon.History color={th.phases.palate.accent} size={28} />,     label: t.entHistory,  sub: t.entHistorySub,  phase: 'palate'  as const },
    { id: 'vocab',    icon: <Icon.Edit color={th.phases.finish.accent} size={28} />,        label: t.entVocab,    sub: lang === 'de' ? 'Copy-Paste Tasting-Notizen' : 'Copy-paste tasting notes', phase: 'finish' as const },
    { id: 'research', icon: <Icon.Analytics color={th.phases.overall.accent} size={28} />, label: t.entResearch, sub: lang === 'de' ? 'Deep Dives & Wissenschaft' : 'Deep dives & science', phase: 'overall' as const },
    { id: 'makingof', icon: <Icon.History color={th.phases.nose.accent} size={28} />,       label: t.entMakingOf, sub: lang === 'de' ? 'Die Geschichte von CaskSense' : 'The story of CaskSense', phase: 'nose' as const },
  ]
  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>{t.entTitle}</h1>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.muted, margin: `0 0 ${SP.lg}px` }}>{t.entSub}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
        {items.map(item => (
          <button key={item.id} onClick={() => onNav(item.id)}
            style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, textAlign: 'left', transition: 'all 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = th.phases[item.phase].accent }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = th.border }}>
            {item.icon}
            <span style={{ fontSize: 14, fontWeight: 700, color: th.text }}>{item.label}</span>
            <span style={{ fontSize: 11, color: th.faint, lineHeight: 1.4 }}>{item.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── EntdeckenScreen ────────────────────────────────────────────────────────
export const EntdeckenScreen: React.FC<{ th: ThemeTokens; t: Translations; participantId: string; lang: 'de' | 'en' }> = ({ th, t, participantId, lang }) => {
  const [sub, setSub]           = useState<string | null>(null)
  const [bottleId, setBottleId] = useState<string | null>(null)
  const goBack = () => { setSub(null); setBottleId(null) }

  if (sub === 'explore' && bottleId) return <BottleDetail th={th} t={t} bottleId={bottleId} participantId={participantId} onBack={() => setBottleId(null)} />
  if (sub === 'explore') return <ExploreWhiskies th={th} t={t} participantId={participantId} onBottle={id => setBottleId(id)} onBack={goBack} />
  if (sub === 'lexikon') return <Lexikon th={th} t={t} lang={lang} onBack={goBack} />
  if (sub === 'guide')   return <TastingGuide th={th} t={t} lang={lang} onBack={goBack} />
  if (sub === 'dest')    return <Distilleries th={th} t={t} participantId={participantId} />
  if (sub === 'history') return <HistoricalArchive th={th} t={t} participantId={participantId} onBack={goBack} />
  if (sub === 'bottlers')  return <BottlersScreen th={th} t={t} lang={lang} onBack={goBack} />
  if (sub === 'vocab')     return <Vocabulary th={th} t={t} lang={lang} onBack={goBack} />
  if (sub === 'research')  return <Research th={th} t={t} lang={lang} onBack={goBack} />
  if (sub === 'makingof')  return <MakingOf th={th} t={t} participantId={participantId} onBack={goBack} />

  return <div style={{ minHeight: '100%', background: th.bg }}><EntdeckenHub th={th} t={t} lang={lang} onNav={setSub} /></div>
}

// ── Circle: Leaderboard ────────────────────────────────────────────────────
function hashAlias(id: string): string {
  const adj  = ['Peated', 'Sherried', 'Smoky', 'Aged', 'Cask', 'Malty', 'Spiced', 'Golden', 'Briny', 'Mossy']
  const noun = ['Fox', 'Flask', 'Dram', 'Cask', 'Glen', 'Still', 'Barrel', 'Mash', 'Tun', 'Stave']
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return `${adj[Math.abs(h) % adj.length]} ${noun[Math.abs(h >> 4) % noun.length]}`
}

const Leaderboard: React.FC<{ th: ThemeTokens; t: Translations; participantId: string }> = ({ th, t, participantId }) => {
  const [board, setBoard] = useState<any[]>([])
  const [mine, setMine]   = useState<any>(null)

  useEffect(() => {
    fetch('/api/community/leaderboard', { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => { setBoard(data || []); setMine((data || []).find((e: any) => e.participantId === participantId)) })
      .catch(() => {})
  }, [participantId])

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      {mine && (
        <div style={{ background: `${th.gold}10`, border: `1px solid ${th.gold}44`, borderRadius: 20, padding: SP.lg, marginBottom: SP.lg, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: th.gold, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t.circleYourRank}</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: th.gold, margin: '8px 0 4px' }}>#{mine.rank || '—'}</div>
          <div style={{ fontSize: 14, color: th.muted }}>{t.circlePercentile}: {mine.percentile || '—'}%</div>
        </div>
      )}
      {board.map((entry, i) => {
        const isMe     = entry.participantId === participantId
        const isFriend = entry.isFriend
        const name     = isMe ? `${entry.name} (Du)` : isFriend ? entry.name : hashAlias(entry.participantId || String(i))
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
            <span style={{ fontSize: 14, width: 24, textAlign: 'center', fontWeight: i < 3 ? 700 : 400, color: i === 0 ? th.gold : i === 1 ? th.muted : i === 2 ? th.amber : th.faint }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 400, color: isMe ? th.gold : th.text }}>{name}</div>
              {isFriend && <span style={{ fontSize: 10, color: th.green, background: `${th.green}15`, padding: '1px 6px', borderRadius: 8 }}>{t.circleFriend}</span>}
            </div>
            {entry.tastingCount && <span style={{ fontSize: 11, color: th.faint }}>{entry.tastingCount} Tastings</span>}
            <span style={{ fontSize: 16, fontWeight: 700, color: entry.avgScore >= 85 ? th.gold : th.muted }}>{entry.avgScore ? Math.round(entry.avgScore) : '—'}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Circle: FriendsTab ────────────────────────────────────────────────────
const FriendsTab: React.FC<{ th: ThemeTokens; t: Translations; participantId: string }> = ({ th, t, participantId }) => {
  const [friends, setFriends]   = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [search, setSearch]     = useState('')

  useEffect(() => {
    fetch(`/api/participants/${participantId}/friends`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => setFriends(data || [])).catch(() => {})
    fetch(`/api/participants/${participantId}/friend-requests`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(data => setRequests(data || [])).catch(() => {})
  }, [participantId])

  const handleRequest = async (id: string, action: 'accept' | 'decline') => {
    await fetch(`/api/participants/${participantId}/friend-request/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-participant-id': participantId }, body: JSON.stringify({ action }) })
    setRequests(r => r.filter(x => x.id !== id))
    if (action === 'accept') setFriends(f => [...f, requests.find(x => x.id === id)])
  }

  const incomingRequests = requests.filter(r => r.type === 'incoming' || !r.type)
  const outgoingRequests = requests.filter(r => r.type === 'outgoing')

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.circleSearchFriend}
        style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 15, padding: '10px 14px', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box', marginBottom: SP.md }} />
      {incomingRequests.length > 0 && (
        <div style={{ marginBottom: SP.lg }}>
          <div style={{ fontSize: 11, color: th.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.sm }}>Anfragen ({incomingRequests.length})</div>
          {incomingRequests.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
              <span style={{ flex: 1, fontSize: 14 }}>{r.name}</span>
              <button onClick={() => handleRequest(r.id, 'accept')} style={{ height: 44, padding: '0 16px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${th.gold}, ${th.amber})`, color: '#1a0f00', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{t.circleAccept}</button>
              <button onClick={() => handleRequest(r.id, 'decline')} style={{ height: 44, padding: '0 16px', borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.muted, cursor: 'pointer', fontSize: 13 }}>{t.circleDecline}</button>
            </div>
          ))}
        </div>
      )}
      {friends.length === 0 && incomingRequests.length === 0 && (
        <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>{t.circleFeedEmpty}</div>
      )}
      {friends.filter(f => !search || (f.name || '').toLowerCase().includes(search.toLowerCase())).map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: th.phases.nose.accent, flexShrink: 0 }}>
            {(f.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
            {f.avgScore && <div style={{ fontSize: 11, color: th.faint }}>Ø {Math.round(f.avgScore)}</div>}
          </div>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: f.online ? th.green : th.faint }} />
        </div>
      ))}
      {outgoingRequests.length > 0 && (
        <div style={{ marginTop: SP.md }}>
          <div style={{ fontSize: 11, color: th.faint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.sm }}>Ausstehend</div>
          {outgoingRequests.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
              <span style={{ flex: 1, fontSize: 14, color: th.muted }}>{r.name}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: `${th.faint}20`, color: th.faint }}>{t.circlePending}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Circle: SessionsBoard ──────────────────────────────────────────────────
const SessionsBoard: React.FC<{ th: ThemeTokens; t: Translations; participantId: string }> = ({ th, t, participantId }) => {
  const [sessions, setSessions] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/community/sessions', { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(setSessions).catch(() => {})
  }, [participantId])

  const grouped = {
    live:     sessions.filter(s => s.status === 'open'),
    upcoming: sessions.filter(s => s.status === 'draft'),
  }

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      {sessions.length === 0 && <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint, fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>Keine Sessions.</div>}
      {grouped.live.length > 0 && (
        <div style={{ marginBottom: SP.lg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: SP.sm }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: th.green, animation: 'ping 1.5s infinite' }} />
            <span style={{ fontSize: 12, color: th.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Jetzt live</span>
          </div>
          {grouped.live.map((s, i) => (
            <div key={i} style={{ background: `${th.green}10`, border: `1px solid ${th.green}33`, borderRadius: 14, padding: SP.md, marginBottom: SP.sm }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: th.faint, marginTop: 4 }}>{s.hostName}{s.participantCount ? ` · ${s.participantCount} Teilnehmer` : ''}</div>
            </div>
          ))}
        </div>
      )}
      {grouped.upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: th.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: SP.sm }}>Geplant</div>
          {grouped.upcoming.map((s, i) => (
            <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 14, padding: SP.md, marginBottom: SP.sm }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 12, color: th.faint, marginTop: 4 }}>{s.date ? new Date(s.date).toLocaleDateString('de') : ''}{s.hostName ? ` · ${s.hostName}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Circle: ActivityFeed ──────────────────────────────────────────────────
const ActivityFeed: React.FC<{ th: ThemeTokens; t: Translations; participantId: string }> = ({ th, t, participantId }) => {
  const [feed, setFeed] = useState<any[]>([])
  useEffect(() => {
    fetch(`/api/participants/${participantId}/feed`, { headers: { 'x-participant-id': participantId } })
      .then(r => r.json()).then(setFeed).catch(() => {})
  }, [participantId])

  if (feed.length === 0) return (
    <div style={{ textAlign: 'center', padding: SP.xl, color: th.faint, fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic' }}>{t.circleFeedEmpty}</div>
  )

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      {feed.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: `1px solid ${th.border}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: th.phases.nose.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: th.phases.nose.accent, flexShrink: 0 }}>
            {(item.friendName || '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, lineHeight: 1.4 }}>
              <strong style={{ color: th.text }}>{item.friendName}</strong>
              <span style={{ color: th.muted }}>{item.type === 'rating' ? ` hat ${item.whiskyName} bewertet` : item.type === 'tasting' ? ` hat ${item.tastingName} abgeschlossen` : ` hat einen Dram erfasst`}</span>
            </div>
            {item.score && <div style={{ fontSize: 13, color: th.gold, fontWeight: 700, marginTop: 2 }}>{item.score} Pkt.</div>}
            <div style={{ fontSize: 11, color: th.faint, marginTop: 2 }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('de') : ''}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── CircleScreen ──────────────────────────────────────────────────────────
export const CircleScreen: React.FC<{ th: ThemeTokens; t: Translations; participantId: string }> = ({ th, t, participantId }) => {
  const [tab, setTab] = useState<'friends' | 'board' | 'sessions' | 'feed'>('friends')
  const tabs: [typeof tab, string][] = [['friends', t.circleFriends], ['board', t.circleBoard], ['sessions', t.circleSessions], ['feed', t.circleFeed]]

  return (
    <div style={{ minHeight: '100%', background: th.bg, color: th.text, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ padding: `${SP.lg}px ${SP.md}px ${SP.md}px` }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, margin: 0 }}>{t.circleTitle}</h1>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontStyle: 'italic', color: th.muted, margin: `${SP.xs}px 0 0` }}>{t.circleSub}</p>
      </div>
      <div style={{ display: 'flex', gap: SP.xs, padding: `0 ${SP.md}px ${SP.md}px`, overflowX: 'auto' }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flexShrink: 0, height: 44, padding: '0 16px', borderRadius: 22, border: 'none', cursor: 'pointer', background: tab === id ? th.gold : th.bgCard, color: tab === id ? '#1a0f00' : th.muted, fontSize: 14, fontWeight: tab === id ? 700 : 400, transition: 'all 150ms' }}>{label}</button>
        ))}
      </div>
      {tab === 'friends'  && <FriendsTab th={th} t={t} participantId={participantId} />}
      {tab === 'board'    && <Leaderboard th={th} t={t} participantId={participantId} />}
      {tab === 'sessions' && <SessionsBoard th={th} t={t} participantId={participantId} />}
      {tab === 'feed'     && <ActivityFeed th={th} t={t} participantId={participantId} />}
    </div>
  )
}
