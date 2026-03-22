// CaskSense Apple — Vocabulary + Templates (Phase E)
// Copy-Paste Vokabular-Karten nach Stil und Region
import React, { useState } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props { th: ThemeTokens; t: Translations; lang: 'de' | 'en'; onBack: () => void }

const STYLES = [
  {
    id: 'islay',
    label: 'Islay & Peated',
    color: '#6e7a7a',
    nose: {
      de: 'Intensiver Torfrauch, Jod und Salzgischt. Darunter Zitrusfrüchte und ein Hauch Vanille vom Fass.',
      en: 'Intense peat smoke, iodine and sea spray. Beneath, citrus fruits and a hint of vanilla from the cask.'
    },
    palate: {
      de: 'Ölig und cremig, mit Torf, Salzkaramell und schwarzem Pfeffer. Medizinische Note im Hintergrund.',
      en: 'Oily and creamy, with peat, salted caramel and black pepper. Medicinal note in the background.'
    },
    finish: {
      de: 'Sehr lang, warm und rauchig. Asche, Meeresalgen und ein letzter Hauch Zitrone.',
      en: 'Very long, warm and smoky. Ash, seaweed and a final hint of lemon.'
    },
    tips: {
      de: 'PPM = Phenole pro Million — Maß für den Torfgehalt. Normale Islay: 25–50 PPM. Octomore: über 200 PPM.',
      en: 'PPM = phenols per million — measure of peat content. Normal Islay: 25–50 PPM. Octomore: over 200 PPM.'
    }
  },
  {
    id: 'speyside',
    label: 'Speyside',
    color: '#a8c4d4',
    nose: {
      de: 'Eleganter Blumenduft, reife Äpfel und Birnen. Honig, Vanille und eine leichte Holzwürze.',
      en: 'Elegant floral notes, ripe apples and pears. Honey, vanilla and a light woody spice.'
    },
    palate: {
      de: 'Weich und ausgewogen. Toffee, Aprikosenmarmelade, helles Malz. Dezente Eichenwürze.',
      en: 'Soft and balanced. Toffee, apricot jam, light malt. Subtle oak spice.'
    },
    finish: {
      de: 'Mittellang, süßlich und frisch. Heidekraut, grüner Tee und Nougat.',
      en: 'Medium length, sweetish and fresh. Heather, green tea and nougat.'
    },
    tips: {
      de: 'Speyside hat mehr Destillerien als jede andere schottische Region — über 50. Das Herzstück ist das Glenfiddich-Tal.',
      en: 'Speyside has more distilleries than any other Scottish region — over 50. The heartland is the Glenfiddich valley.'
    }
  },
  {
    id: 'highland',
    label: 'Highland',
    color: '#c4a040',
    nose: {
      de: 'Vielschichtig und komplex. Heide, Honig, getrocknete Früchte und ein Hauch maritimer Salzluft.',
      en: 'Multi-layered and complex. Heather, honey, dried fruits and a hint of maritime salt air.'
    },
    palate: {
      de: 'Vollmundig mit würzigem Malt, Nüssen und Waldhonig. Je nach Destillerie mehr oder weniger fruchtig.',
      en: 'Full-bodied with spiced malt, nuts and forest honey. More or less fruity depending on the distillery.'
    },
    finish: {
      de: 'Lang und warm. Ingwer, Zimt, manchmal ein leichter Torfanklang.',
      en: 'Long and warm. Ginger, cinnamon, sometimes a light hint of peat.'
    },
    tips: {
      de: 'Highland ist die flächenmäßig größte Region. Nördliche Highlands (z.B. Clynelish) schmecken anders als östliche (z.B. Glendronach).',
      en: 'Highland is the largest region by area. Northern Highlands (e.g. Clynelish) taste different from eastern ones (e.g. Glendronach).'
    }
  },
  {
    id: 'sherry',
    label: 'Sherried & Rich',
    color: '#c47a3a',
    nose: {
      de: 'Getrocknete Früchte — Rosinen, Pflaumen, Feigen. Dunkle Schokolade, Marzipan, Walnüsse und Backgewürze.',
      en: 'Dried fruits — raisins, plums, figs. Dark chocolate, marzipan, walnuts and baking spices.'
    },
    palate: {
      de: 'Reich und ölig. Vollmundige Sherrywürze, Orangenschale, schwarze Kirschen und Toffee.',
      en: 'Rich and oily. Full-bodied sherry spice, orange peel, black cherries and toffee.'
    },
    finish: {
      de: 'Sehr lang, wärmend. Bittersüße Schokolade, Zimt und ein letzter Hauch Trockenfrüchte.',
      en: 'Very long, warming. Bittersweet chocolate, cinnamon and a final hint of dried fruits.'
    },
    tips: {
      de: 'Oloroso-Fässer geben die kräftigste Sherry-Note. PX (Pedro Ximénez) ist süßer und dunkler.',
      en: 'Oloroso casks give the most powerful sherry note. PX (Pedro Ximénez) is sweeter and darker.'
    }
  },
  {
    id: 'bourbon',
    label: 'Bourbon & Classic',
    color: '#d4a847',
    nose: {
      de: 'Vanille, Karamell und Kokosnuss vom Eichenfass. Frische Früchte — Pfirsich, Apfel — und helles Malz.',
      en: 'Vanilla, caramel and coconut from the oak cask. Fresh fruits — peach, apple — and light malt.'
    },
    palate: {
      de: 'Cremig und süß. Butterscotch, heller Honig, Zitrus. Leichte Holzwürze zum Abschluss.',
      en: 'Creamy and sweet. Butterscotch, light honey, citrus. Light wood spice at the finish.'
    },
    finish: {
      de: 'Mittel bis lang. Vanille, weißer Pfeffer, ein Hauch Eichenholz.',
      en: 'Medium to long. Vanilla, white pepper, a hint of oak.'
    },
    tips: {
      de: 'Ex-Bourbon Fässer aus amerikanischer Weiß-Eiche sind das meistgenutzte Reifungsholz in Schottland.',
      en: 'Ex-bourbon casks from American white oak are the most widely used maturation wood in Scotland.'
    }
  },
  {
    id: 'japanese',
    label: 'Japanisch',
    color: '#86c678',
    nose: {
      de: 'Zart und komplex. Reisblüten, Grüntee, weißer Pfeffer und ein Hauch Sandelholz.',
      en: 'Delicate and complex. Rice blossom, green tea, white pepper and a hint of sandalwood.'
    },
    palate: {
      de: 'Seidig, präzise. Honig, Yuzu, Mochi, heller Rauch. Keine Ecken, aber Tiefe.',
      en: 'Silky, precise. Honey, yuzu, mochi, light smoke. No rough edges, but depth.'
    },
    finish: {
      de: 'Lang und trockener als erwartet. Grüner Tee, Holzkohle, weißer Pfirsich.',
      en: 'Long and drier than expected. Green tea, charcoal, white peach.'
    },
    tips: {
      de: 'Japanische Destillerien verwenden oft Mizunara-Eiche (japanische Eiche) — selten, teuer, aber einzigartig.',
      en: 'Japanese distilleries often use Mizunara oak (Japanese oak) — rare, expensive, but unique.'
    }
  },
]

export const VocabularyScreen: React.FC<Props> = ({ th, t, lang, onBack }) => {
  const [selected, setSelected] = useState<string>(STYLES[0].id)
  const [copiedSection, setCopied] = useState<string | null>(null)

  const style = STYLES.find(s => s.id === selected) || STYLES[0]

  const copySection = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const sections = [
    { key: 'nose',   label: lang === 'de' ? 'Nase' : 'Nose',     text: lang === 'de' ? style.nose.de : style.nose.en },
    { key: 'palate', label: lang === 'de' ? 'Gaumen' : 'Palate',  text: lang === 'de' ? style.palate.de : style.palate.en },
    { key: 'finish', label: lang === 'de' ? 'Abgang' : 'Finish',  text: lang === 'de' ? style.finish.de : style.finish.en },
  ]

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}>
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, margin: `0 0 ${SP.xs}px` }}>
        {lang === 'de' ? 'Vokabular & Templates' : 'Vocabulary & Templates'}
      </h1>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px` }}>
        {lang === 'de' ? 'Fertige Beschreibungsvorlagen zum Kopieren.' : 'Ready-made tasting note templates to copy.'}
      </p>

      {/* Style selector */}
      <div style={{ display: 'flex', gap: SP.xs, marginBottom: SP.lg, overflowX: 'auto', paddingBottom: 4 }}>
        {STYLES.map(s => (
          <button key={s.id} onClick={() => setSelected(s.id)} style={{ flexShrink: 0, height: 40, padding: '0 16px', borderRadius: 20, border: 'none', cursor: 'pointer', background: selected === s.id ? s.color : th.bgCard, color: selected === s.id ? '#fff' : th.muted, fontSize: 13, fontWeight: selected === s.id ? 700 : 400, transition: 'all 150ms', fontFamily: 'DM Sans, sans-serif' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Copy all button */}
      <button onClick={() => {
        const all = sections.map(s => `${s.label}:\n${s.text}`).join('\n\n')
        copySection(all, 'all')
      }} style={{ width: '100%', height: 48, borderRadius: 14, border: `1px solid ${style.color}44`, background: `${style.color}10`, color: style.color, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', marginBottom: SP.lg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon.Copy color={style.color} size={16} />
        {copiedSection === 'all' ? (lang === 'de' ? 'Kopiert!' : 'Copied!') : (lang === 'de' ? 'Alle Abschnitte kopieren' : 'Copy all sections')}
      </button>

      {/* Sections */}
      {sections.map(sec => (
        <div key={sec.key} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, padding: SP.md, marginBottom: SP.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: style.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{sec.label}</span>
            <button onClick={() => copySection(sec.text, sec.key)} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: copiedSection === sec.key ? th.green : th.muted, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon.Copy color={copiedSection === sec.key ? th.green : th.muted} size={12} />
              {copiedSection === sec.key ? (lang === 'de' ? 'Kopiert!' : 'Copied!') : (lang === 'de' ? 'Kopieren' : 'Copy')}
            </button>
          </div>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, fontStyle: 'italic', color: th.muted, lineHeight: 1.7, margin: 0 }}>{sec.text}</p>
        </div>
      ))}

      {/* Expert tip */}
      <div style={{ background: `${style.color}10`, border: `1px solid ${style.color}33`, borderRadius: 14, padding: SP.md }}>
        <div style={{ fontSize: 11, color: style.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: SP.xs }}>
          {lang === 'de' ? 'Experten-Tipp' : 'Expert tip'}
        </div>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, color: th.muted, lineHeight: 1.6, margin: 0 }}>
          {lang === 'de' ? style.tips.de : style.tips.en}
        </p>
      </div>
    </div>
  )
}
