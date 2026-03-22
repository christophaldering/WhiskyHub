// CaskSense Apple — Research + Rabbit Hole (Phase E)
// Wissenschaft des Verkostens + Deep-Dive Navigation
import React, { useState } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; lang: 'de' | 'en'; onBack: () => void }

const RESEARCH_SECTIONS = [
  {
    title: { de: 'Warum schmecken wir unterschiedlich?', en: 'Why do we taste differently?' },
    content: {
      de: 'Genetische Variationen im TAS2R38-Gen beeinflussen, wie stark wir Bitterstoffe wahrnehmen. Etwa 25% der Menschen sind sogenannte "Super-Taster" mit einer höheren Dichte an Geschmacksknospen. Das erklärt, warum manche Islay-Whiskys als extrem intensiv empfunden werden, während andere dieselbe Flasche als ausgewogen beschreiben.',
      en: 'Genetic variations in the TAS2R38 gene influence how strongly we perceive bitter compounds. About 25% of people are "super-tasters" with a higher density of taste buds. This explains why some find Islay whiskies extremely intense while others describe the same bottle as balanced.'
    }
  },
  {
    title: { de: 'Das Flavour Wheel: Woher kommt es?', en: 'The Flavour Wheel: Where does it come from?' },
    content: {
      de: 'Das Scotch Whisky Research Institute (SWRI) entwickelte in den 1970ern das erste standardisierte Aromavokabular. Ann Noble von der UC Davis adaptierte dieses Konzept für Wein — heute nutzen beide Industrien ähnliche hierarchische Strukturen: von Hauptkategorien über Unterkategorien bis zu spezifischen Deskriptoren.',
      en: 'The Scotch Whisky Research Institute (SWRI) developed the first standardised aroma vocabulary in the 1970s. Ann Noble at UC Davis adapted this concept for wine — today both industries use similar hierarchical structures: from main categories through subcategories to specific descriptors.'
    }
  },
  {
    title: { de: 'Retronasale Wahrnehmung', en: 'Retronasal perception' },
    content: {
      de: 'Etwa 80% dessen, was wir als "Geschmack" erleben, kommt tatsächlich über die Nase — beim Schlucken strömen Aromen von hinten in die Nasenhöhle (retronasal). Deshalb verändert sich der Whisky nach dem Schlucken: Das ist der Abgang. Menschen mit starkem Schnupfen schmecken deutlich weniger.',
      en: 'About 80% of what we experience as "taste" actually comes through the nose — when swallowing, aromas flow from the back into the nasal cavity (retronasal). This is why whisky changes after swallowing: that is the finish. People with a strong cold taste significantly less.'
    }
  },
  {
    title: { de: 'Warum öffnet Wasser Aromen?', en: 'Why does water open aromas?' },
    content: {
      de: 'Guajakol und andere phenolische Verbindungen sind bei hohem Alkoholgehalt an Ethanol-Cluster gebunden und weniger flüchtig. Wenige Tropfen Wasser (auf ca. 46% ABV verdünnen) lösen diese Bindungen — die Aromastoffe steigen leichter in die Gasphase über und sind besser riechbar. Bei unter 46% ABV ist der Effekt umgekehrt.',
      en: 'Guaiacol and other phenolic compounds are bound to ethanol clusters at high alcohol content and less volatile. A few drops of water (diluting to about 46% ABV) break these bonds — aromatic compounds pass more easily into the gas phase and are more detectable. Below 46% ABV the effect reverses.'
    }
  },
  {
    title: { de: 'Die Fässer: 70% des Geschmacks', en: 'The casks: 70% of the flavour' },
    content: {
      de: 'Branchenexperten schätzen, dass 60–70% des endgültigen Whisky-Aromas vom Fass stammen. Die Holzstruktur fungiert als Molekularsieb: Beim Einlagern nimmt der Whisky Lignin-Abbauprodukte (Vanillin, Eugenol) und Tannine auf, gibt gleichzeitig Schwefelverbindungen ab. Das erklärt, warum ein junger Whisky in guten Fässern einen älteren übertreffen kann.',
      en: 'Industry experts estimate that 60–70% of the final whisky aroma comes from the cask. The wood structure acts as a molecular sieve: during maturation the whisky absorbs lignin degradation products (vanillin, eugenol) and tannins, while simultaneously releasing sulphur compounds. This explains why a young whisky in good casks can outperform an older one.'
    }
  },
]

const RABBIT_HOLES = [
  { title: { de: 'Bewertungsmodelle', en: 'Rating models' }, desc: { de: 'Parker vs. WS vs. IWC — wie vergleichen sich die großen Bewertungssysteme?', en: 'Parker vs. WS vs. IWC — how do the major rating systems compare?' }, color: '#a8c4d4' },
  { title: { de: 'Statistik & Whisky', en: 'Statistics & whisky' }, desc: { de: 'Was sagt die Standardabweichung über einen Whisky aus?', en: 'What does standard deviation tell us about a whisky?' }, color: '#c4a040' },
  { title: { de: 'Blind vs. Offen', en: 'Blind vs. open' }, desc: { de: 'Studien zeigen: Wir bewerten teuren Wein blind schlechter als günstigen.', en: 'Studies show: we rate expensive wine worse than cheap when tasting blind.' }, color: '#c47a3a' },
  { title: { de: 'Angel\'s Share', en: 'Angel\'s share' }, desc: { de: '~2% Verdunstung pro Jahr in Schottland — mehr in wärmerem Klima. Was bleibt übrig?', en: '~2% evaporation per year in Scotland — more in warmer climates. What remains?' }, color: '#86c678' },
  { title: { de: 'Kupfer & Destillation', en: 'Copper & distillation' }, desc: { de: 'Warum Kupfer-Pot-Stills weniger schwefelige Noten produzieren als Edelstahl.', en: 'Why copper pot stills produce fewer sulphurous notes than stainless steel.' }, color: '#d4a847' },
  { title: { de: 'Klimaeffekte auf Reifung', en: 'Climate effects on maturation' }, desc: { de: 'Warum ein 10-jähriger Taiwan-Whisky anders reift als ein 10-jähriger Speyside.', en: 'Why a 10-year-old Taiwanese whisky matures differently from a 10-year-old Speyside.' }, color: '#a8b870' },
]

export const ResearchScreen: React.FC<Props> = ({ th, t, lang, onBack }) => {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [view, setView] = useState<'research' | 'rabbit'>('research')

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>

      {/* Toggle between Research and Rabbit Hole */}
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.lg }}>
        {([['research', lang === 'de' ? 'Wissenschaft' : 'Science'], ['rabbit', lang === 'de' ? 'Rabbit Hole' : 'Rabbit Hole']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{ flex: 1, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer', background: view === id ? th.gold : th.bgCard, color: view === id ? '#1a0f00' : th.muted, fontSize: 14, fontWeight: view === id ? 700 : 400, fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms' }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'research' && (
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>
            {lang === 'de' ? 'Wissenschaft des Verkostens' : 'The Science of Tasting'}
          </h1>
          <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>
            {lang === 'de' ? 'Was passiert wirklich, wenn wir Whisky trinken?' : 'What really happens when we drink whisky?'}
          </p>
          {RESEARCH_SECTIONS.map((sec, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${th.border}` }}>
              <button onClick={() => setExpanded(expanded === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: th.phases.palate.dim, border: `1px solid ${th.phases.palate.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: th.phases.palate.accent, flexShrink: 0 }}>{i + 1}</div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: th.text }}>{lang === 'de' ? sec.title.de : sec.title.en}</span>
                <Icon.ChevronDown color={th.faint} size={16} />
              </button>
              {expanded === i && (
                <div style={{ paddingBottom: SP.md, paddingLeft: 42, fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.muted, lineHeight: 1.7 }}>
                  {lang === 'de' ? sec.content.de : sec.content.en}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {view === 'rabbit' && (
        <div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>Rabbit Hole</h1>
          <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>
            {lang === 'de' ? 'Tief in die Materie eintauchen.' : 'Dive deep into the subject.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
            {RABBIT_HOLES.map((h, i) => (
              <div key={i} style={{ background: th.bgCard, border: `1px solid ${h.color}33`, borderRadius: 16, padding: SP.md, cursor: 'default' }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: h.color, marginBottom: SP.sm }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: th.text, marginBottom: SP.xs }}>{lang === 'de' ? h.title.de : h.title.en}</div>
                <div style={{ fontSize: 12, color: th.faint, lineHeight: 1.5 }}>{lang === 'de' ? h.desc.de : h.desc.en}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
