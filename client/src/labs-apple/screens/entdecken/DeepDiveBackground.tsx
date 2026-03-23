import React from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens
  t: Translations
  lang: 'de' | 'en'
  onBack: () => void
}

const TASTING_STEPS = [
  {
    num: '1',
    title: { de: 'Einschenken & Beobachten', en: 'Pour & Observe' },
    text: { de: 'Gieß den Whisky ein und beobachte Farbe, Viskosität und erste visuelle Eindrücke.', en: 'Pour the whisky and observe colour, viscosity, and initial visual impressions.' },
  },
  {
    num: '2',
    title: { de: 'Bewerten (4 Dimensionen)', en: 'Rate (4 Dimensions)' },
    text: { de: 'Bewerte Nase, Gaumen, Abgang und Gesamteindruck auf einer Skala deiner Wahl.', en: 'Rate nose, palate, finish, and overall impression on a scale of your choice.' },
  },
  {
    num: '3',
    title: { de: 'Enthüllung', en: 'Reveal' },
    text: { de: 'Bei Blind-Tastings wird der Whisky schrittweise enthüllt — Name, Details, Foto.', en: 'In blind tastings the whisky is revealed step by step — name, details, photo.' },
  },
  {
    num: '4',
    title: { de: 'Ergebnisse & Analyse', en: 'Results & Analysis' },
    text: { de: 'Vergleiche deine Bewertung mit der Gruppe, entdecke Muster und Überraschungen.', en: 'Compare your rating with the group, discover patterns and surprises.' },
  },
]

const PROFILE_ITEMS = [
  {
    title: { de: 'Flavour-Radar', en: 'Flavour Radar' },
    text: { de: 'Dein multidimensionales Geschmacksprofil über Nase, Gaumen, Abgang und Gesamt.', en: 'Your multidimensional taste profile across nose, palate, finish, and overall.' },
  },
  {
    title: { de: 'Diary / Journal', en: 'Diary / Journal' },
    text: { de: 'Alle deine verkosteten Whiskys mit Scores, Notizen und Aromen auf einen Blick.', en: 'All your tasted whiskies with scores, notes, and aromas at a glance.' },
  },
  {
    title: { de: 'Auszeichnungen', en: 'Badges' },
    text: { de: 'Meilensteine und Erfolge, die du durch Verkostungen freischaltest.', en: 'Milestones and achievements you unlock through tastings.' },
  },
  {
    title: { de: 'Wunschliste', en: 'Wishlist' },
    text: { de: 'Merke dir Whiskys, die du noch probieren möchtest.', en: 'Save whiskies you still want to try.' },
  },
]

const DIMENSIONS = [
  {
    key: 'nose',
    title: { de: 'Nase', en: 'Nose' },
    text: { de: 'Der erste Eindruck über den Geruch — Frucht, Rauch, Holz, Gewürze. Die Nase verrät oft mehr als der Gaumen.', en: 'The first impression through smell — fruit, smoke, wood, spices. The nose often reveals more than the palate.' },
    color: '#a8c4d4',
  },
  {
    key: 'palate',
    title: { de: 'Gaumen', en: 'Palate' },
    text: { de: 'Der Geschmack beim Trinken — Textur, Süße, Bitterkeit, Würze. Wie fühlt sich der Whisky im Mund an?', en: 'The taste when drinking — texture, sweetness, bitterness, spice. How does the whisky feel in the mouth?' },
    color: '#d4a847',
  },
  {
    key: 'finish',
    title: { de: 'Abgang', en: 'Finish' },
    text: { de: 'Was bleibt nach dem Schlucken? Wie lange hält der Geschmack? Warm, trocken, süß?', en: 'What remains after swallowing? How long does the taste last? Warm, dry, sweet?' },
    color: '#c47a3a',
  },
  {
    key: 'overall',
    title: { de: 'Gesamt', en: 'Overall' },
    text: { de: 'Der Gesamteindruck — Balance, Komplexität, Harmonie. Vertrau deiner Intuition.', en: 'The overall impression — balance, complexity, harmony. Trust your intuition.' },
    color: '#86c678',
  },
]

const SCIENCE_CARDS = [
  {
    title: { de: 'Normalisierung', en: 'Normalisation' },
    text: { de: 'Normalisierung gleicht systematische Bewertungstendenzen aus. Wenn du generell höher oder niedriger bewertest, wird das bei Vergleichen berücksichtigt.', en: 'Normalisation adjusts for systematic scoring tendencies. If you generally rate higher or lower, this is factored into comparisons.' },
    color: '#a8c4d4',
  },
  {
    title: { de: 'Median statt Mittelwert', en: 'Median over Mean' },
    text: { de: 'Wir verwenden den Median statt des Mittelwerts, weil er robuster gegenüber Ausreißern ist und die „typische" Bewertung besser widerspiegelt.', en: 'We use the median instead of the mean because it is more robust against outliers and better reflects the "typical" rating.' },
    color: '#d4a847',
  },
  {
    title: { de: 'Kendall-Rangkorrelation', en: 'Kendall Rank Correlation' },
    text: { de: 'Kendalls Tau misst die Übereinstimmung der Rangordnung zwischen deinen Bewertungen und denen der Community — unabhängig von der absoluten Höhe.', en: 'Kendall\'s Tau measures the agreement in ranking order between your ratings and the community\'s — regardless of absolute levels.' },
    color: '#c47a3a',
  },
  {
    title: { de: 'Korrelationsanalyse', en: 'Correlation Analysis' },
    text: { de: 'Wie stark hängen deine Dimensionsscores zusammen? Hohe Korrelation zwischen Nase und Gaumen bedeutet konsistente Wahrnehmung.', en: 'How strongly are your dimension scores related? High correlation between nose and palate means consistent perception.' },
    color: '#86c678',
  },
  {
    title: { de: 'Interquartilsabstand (IQR)', en: 'Interquartile Range (IQR)' },
    text: { de: 'Der IQR identifiziert Ausreißer in der Community-Verteilung. Scores außerhalb von Q1 − 1.5×IQR oder Q3 + 1.5×IQR gelten als ungewöhnlich.', en: 'The IQR identifies outliers in the community distribution. Scores outside Q1 − 1.5×IQR or Q3 + 1.5×IQR are considered unusual.' },
    color: '#a78bfa',
  },
  {
    title: { de: 'Kein Ranking', en: 'No Ranking' },
    text: { de: 'CaskSense erstellt kein Ranking der „besten" Whiskys. Dein Profil beschreibt deine Präferenzen — es gibt kein objektives „besser" oder „schlechter".', en: 'CaskSense does not create a ranking of the "best" whiskies. Your profile describes your preferences — there is no objective "better" or "worse".' },
    color: '#e05252',
  },
]

function SectionHeader({ th, title, tagline, color }: { th: ThemeTokens; title: string; tagline: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: `${color}22`,
        border: `1px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
      </div>
      <div>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 700, color: th.text, margin: 0 }}>{title}</h2>
        <p style={{ fontSize: 12, color, fontWeight: 600, margin: 0 }}>{tagline}</p>
      </div>
    </div>
  )
}

export const DeepDiveBackground: React.FC<Props> = ({ th, t, lang, onBack }) => {
  const l = (obj: { de: string; en: string }) => lang === 'de' ? obj.de : obj.en

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }} data-testid="deepdive-background-page">
      <button
        onClick={onBack}
        data-testid="button-back-background"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}
      >
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: SP.xs }}>
        <Icon.BookOpen color={th.phases.nose.accent} size={22} />
        <h1
          data-testid="text-background-title"
          style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, color: th.text, margin: 0 }}
        >
          {lang === 'de' ? 'Hintergrund & Methodik' : 'Background & Methodology'}
        </h1>
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontStyle: 'italic', color: th.muted, margin: `0 0 ${SP.xl}px`, lineHeight: 1.5 }}>
        {lang === 'de' ? 'Was hinter den Kulissen passiert.' : 'What happens behind the scenes.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <section>
          <SectionHeader
            th={th}
            title={lang === 'de' ? 'Der Tasting-Ablauf' : 'The Tasting Flow'}
            tagline={lang === 'de' ? 'Vier Schritte, ein Erlebnis' : 'Four steps, one experience'}
            color={th.green}
          />
          <p style={{ fontSize: 14, color: th.muted, lineHeight: 1.6, marginBottom: 14 }}>
            {lang === 'de'
              ? 'Jede Verkostung folgt einem strukturierten Ablauf, der faire und vergleichbare Ergebnisse sicherstellt.'
              : 'Every tasting follows a structured flow that ensures fair and comparable results.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SP.sm }}>
            {TASTING_STEPS.map(step => (
              <div key={step.num} style={{
                background: th.bgCard,
                border: `1px solid ${th.border}`,
                borderRadius: 14,
                padding: SP.md,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 4, right: 8, fontSize: 28, fontWeight: 900, color: `${th.green}28` }}>{step.num}</div>
                <div style={{ position: 'relative' }}>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 13, fontWeight: 600, color: th.text, margin: `0 0 ${SP.xs}px` }}>
                    {l(step.title)}
                  </h3>
                  <p style={{ fontSize: 12, color: th.faint, lineHeight: 1.5, margin: 0 }}>
                    {l(step.text)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            th={th}
            title={lang === 'de' ? 'Dein Profil' : 'Your Profile'}
            tagline={lang === 'de' ? 'Was wir aus deinen Daten machen' : 'What we make from your data'}
            color={th.phases.nose.accent}
          />
          <p style={{ fontSize: 14, color: th.muted, lineHeight: 1.6, marginBottom: 14 }}>
            {lang === 'de'
              ? 'Dein Profil besteht aus mehreren Komponenten, die zusammen ein vollständiges Bild deiner Whisky-Präferenzen ergeben.'
              : 'Your profile consists of several components that together form a complete picture of your whisky preferences.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
            {PROFILE_ITEMS.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 10,
                background: th.bgCard,
                border: `1px solid ${th.border}`,
                borderRadius: 14,
                padding: SP.md,
              }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: `${th.phases.nose.accent}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: th.phases.nose.accent }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: th.text, marginBottom: 2 }}>{l(item.title)}</div>
                  <p style={{ fontSize: 12, color: th.muted, lineHeight: 1.5, margin: 0 }}>{l(item.text)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            th={th}
            title={lang === 'de' ? 'Die vier Dimensionen' : 'The Four Dimensions'}
            tagline={lang === 'de' ? 'Nase · Gaumen · Abgang · Gesamt' : 'Nose · Palate · Finish · Overall'}
            color={th.gold}
          />
          <p style={{ fontSize: 14, color: th.muted, lineHeight: 1.6, marginBottom: 14 }}>
            {lang === 'de'
              ? 'Jede Bewertung erfasst vier unabhängige Dimensionen. Das ermöglicht differenziertere Profile als ein einzelner Score.'
              : 'Each rating captures four independent dimensions. This enables more nuanced profiles than a single score.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
            {DIMENSIONS.map(dim => (
              <div key={dim.key} style={{
                background: th.bgCard,
                border: `1px solid ${dim.color}44`,
                borderRadius: 14,
                padding: SP.md,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: dim.color }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: th.text }}>{l(dim.title)}</span>
                </div>
                <p style={{ fontSize: 13, color: th.muted, lineHeight: 1.5, margin: 0 }}>{l(dim.text)}</p>
              </div>
            ))}
          </div>
          <div style={{
            background: th.bgCard,
            border: `1px solid ${th.gold}55`,
            borderRadius: 14,
            padding: SP.md,
            marginTop: 10,
          }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, fontWeight: 600, color: th.text, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon.Analytics color={th.gold} size={14} />
              {lang === 'de' ? 'Bewertungsskalen' : 'Rating Scales'}
            </h3>
            <p style={{ fontSize: 13, color: th.muted, lineHeight: 1.5, margin: 0 }}>
              {lang === 'de'
                ? 'CaskSense unterstützt mehrere Skalen (100, 20, 10 Punkte). Alle Scores werden intern auf eine gemeinsame Basis normalisiert, sodass Vergleiche zwischen verschiedenen Skalen möglich sind.'
                : 'CaskSense supports multiple scales (100, 20, 10 points). All scores are internally normalised to a common base so comparisons across different scales are possible.'}
            </p>
          </div>
        </section>

        <section>
          <SectionHeader
            th={th}
            title={lang === 'de' ? 'Wissenschaft & Statistik' : 'Science & Statistics'}
            tagline={lang === 'de' ? 'Die Methoden hinter den Zahlen' : 'The methods behind the numbers'}
            color="#a78bfa"
          />
          <p style={{ fontSize: 14, color: th.muted, lineHeight: 1.6, marginBottom: 14 }}>
            {lang === 'de'
              ? 'CaskSense nutzt bewährte statistische Methoden, um faire Vergleiche und zuverlässige Profile zu gewährleisten.'
              : 'CaskSense uses proven statistical methods to ensure fair comparisons and reliable profiles.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.sm }}>
            {SCIENCE_CARDS.map((card, i) => (
              <div key={i} style={{
                background: th.bgCard,
                border: `1px solid ${card.color}44`,
                borderRadius: 14,
                padding: SP.md,
              }}>
                <h3 style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: th.text,
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: card.color, flexShrink: 0 }} />
                  {l(card.title)}
                </h3>
                <p style={{ fontSize: 13, color: th.muted, lineHeight: 1.6, margin: 0, fontFamily: 'Cormorant Garamond, serif' }}>
                  {l(card.text)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
