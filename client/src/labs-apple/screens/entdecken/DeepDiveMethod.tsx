import React, { useState } from 'react'
import { ThemeTokens, SP } from '../../theme/tokens'
import { Translations } from '../../theme/i18n'
import * as Icon from '../../icons/Icons'

interface Props {
  th: ThemeTokens
  t: Translations
  lang: 'de' | 'en'
  onBack: () => void
}

function Section({ th, title, children, defaultOpen = true }: { th: ThemeTokens; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        data-testid={`button-section-${title.slice(0, 20)}`}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${SP.md}px ${SP.lg}px`, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 16, fontWeight: 600, color: th.text, margin: 0 }}>{title}</h2>
        {open
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={th.faint} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6"/></svg>
          : <Icon.ChevronDown color={th.faint} size={16} />}
      </button>
      {open && (
        <div style={{ padding: `0 ${SP.lg}px ${SP.lg}px`, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  )
}

const CONTENT = {
  introText: {
    de: 'CaskSense baut dein Geschmacksprofil aus deinem tatsächlichen Verkostungsverhalten auf — deinen Scores, deinen Notizen und den Whiskys, die du wählst. Keine Quizzes, keine Selbsteinschätzungen, keine Annahmen. Alles wird aus echten Daten abgeleitet, die du während der Verkostungen generierst.',
    en: 'CaskSense builds your taste profile from your actual tasting behaviour — your scores, your notes, and the whiskies you choose. There are no quizzes, no self-assessments, and no assumptions. Everything is derived from real data you generate during tastings.',
  },
  whatProfileShows: {
    de: 'Was dein Profil zeigt:',
    en: 'What your profile shows:',
  },
  profilePoints: [
    { de: 'Keine Typologien — wir labeln dich nicht als „Torf-Liebhaber" oder „Sherry-Kopf".', en: 'No typologies — we don\'t label you as a "peat lover" or "sherry head".' },
    { de: 'Multidimensionaler Radar — deine Präferenzen über Nase, Gaumen und Abgang.', en: 'Multidimensional radar — your preferences across nose, taste, and finish dimensions.' },
    { de: 'Nur Verhalten — abgeleitet aus deinen Scores und Notizen, nie aus Fragebögen.', en: 'Behaviour only — derived purely from your scores and tasting notes, never from questionnaires.' },
    { de: 'Vergleiche sind optional — sieh wie du zur Community stehst, aber nur wenn du willst.', en: 'Comparisons are opt-in — see how you relate to the community average, but only if you choose to.' },
    { de: 'Stichprobengröße zählt — dein Profil wird stabiler und zuverlässiger, je mehr du verkostest.', en: 'Sample size matters — your profile becomes more stable and reliable as you taste more whiskies.' },
  ],
  livingDocument: {
    de: 'Diese Methodik ist ein lebendiges Dokument. Wenn CaskSense sich weiterentwickelt, ändert sich auch die Art und Weise, wie wir deine Daten analysieren und präsentieren — immer transparent.',
    en: 'This methodology is a living document. As CaskSense evolves, so does the way we analyse and present your data — always transparently.',
  },
  expertSections: [
    {
      title: { de: 'Dimensionales Scoring-Modell', en: 'Dimensional Scoring Model' },
      text: { de: 'Jeder Whisky wird in drei Dimensionen bewertet: Nase, Gaumen und Abgang. Diese sind nicht willkürlich — sie entsprechen dem Standard-Bewertungsrahmen professioneller Blender und Wettbewerbsrichter.', en: 'Each whisky is scored across three dimensions: Nose, Taste, and Finish. These are not arbitrary — they reflect the standard evaluation framework used by professional blenders and competition judges.' },
    },
    {
      title: { de: 'Plattform-weite Basis', en: 'Platform-Wide Basis' },
      text: { de: 'Deine Scores werden mit dem Plattform-Median für jeden Whisky verglichen. Das gibt dir eine relative Positionierung, ohne eine „richtige" Art zu verkosten aufzuzwingen.', en: 'Your scores are compared against the platform median for each whisky. This gives you a relative positioning without imposing any \'correct\' way to taste.' },
    },
    {
      title: { de: 'Interquartilsabstand (IQR)', en: 'Interquartile Range (IQR)' },
      text: { de: 'Wir verwenden IQR-basierte Ausreißererkennung, um Scores zu markieren, die signifikant von der Community-Verteilung abweichen — um einzigartige Präferenzen statt Fehler zu identifizieren.', en: 'We use IQR-based outlier detection to flag scores that deviate significantly from the community distribution, helping identify unique preferences rather than errors.' },
    },
  ],
  systematicDeviation: {
    title: { de: 'Systematische Abweichung', en: 'Systematic Deviation' },
    formula: { de: 'für alle Whiskies i = 1..N', en: 'for all whiskies i = 1..N' },
    text: { de: 'Wenn du konsistent höher oder niedriger als der Plattform-Median bewertest, wird dieser Offset zur Normalisierung deiner Scores für fairen Vergleich angewendet — ohne deine tatsächlichen Bewertungen zu ändern.', en: 'If you consistently score higher or lower than the platform median, this offset is applied to normalise your scores for fair comparison — without changing your actual ratings.' },
  },
  stabilityLogic: {
    title: { de: 'Profil-Stabilitätslogik', en: 'Profile Stability Logic' },
    text: { de: 'Die Stabilität deines Profils hängt davon ab, wie viele Whiskys du bewertet hast. Mehr Datenpunkte führen zu einer zuverlässigeren Darstellung deiner Präferenzen.', en: 'Your profile stability depends on how many whiskies you have rated. More data points lead to a more reliable representation of your preferences.' },
    levels: [
      { label: { de: 'Vorläufig', en: 'Preliminary' }, range: 'N < 5' },
      { label: { de: 'Tendenz', en: 'Tendency' }, range: '5 ≤ N < 15' },
      { label: { de: 'Stabil', en: 'Stable' }, range: 'N ≥ 15' },
    ],
    formulaLabel: { de: 'Stabilität %', en: 'Stability %' },
  },
  additionalSections: [
    {
      title: { de: 'Score-Normalisierung', en: 'Score Normalisation' },
      text: { de: 'Normalisierung gleicht systematische Bewertungsverzerrungen aus. Wenn du dazu neigst, 5 Punkte über dem Durchschnitt zu bewerten, wird dieser Offset berücksichtigt, damit dein Profil Präferenzen widerspiegelt, nicht Großzügigkeit.', en: 'Normalisation adjusts for systematic scoring bias. If you tend to score 5 points above average, that offset is factored in so your profile accurately reflects preferences, not just generosity.' },
    },
    {
      title: { de: 'Plattform-Population', en: 'Platform Population' },
      text: { de: 'Vergleiche werden mit allen aktiven CaskSense-Nutzern gemacht. Mit wachsender Community steigt die statistische Konfidenz für Median und Verteilung jedes Whiskys.', en: 'Comparisons are made against all active CaskSense users. As the community grows, statistical confidence increases for each whisky\'s median and distribution.' },
    },
    {
      title: { de: 'Keine normative Bewertung', en: 'No Normative Evaluation' },
      text: { de: 'CaskSense sagt dir nicht, was „gut" oder „schlecht" ist. Dein Profil beschreibt dein Verhalten — kein Urteil. Es gibt keinen korrekten Gaumen.', en: 'CaskSense does not tell you what is \'good\' or \'bad\'. Your profile describes your behaviour — not a judgement. There is no correct palate.' },
    },
  ],
}

export const DeepDiveMethod: React.FC<Props> = ({ th, t, lang, onBack }) => {
  const l = (obj: { de: string; en: string }) => lang === 'de' ? obj.de : obj.en

  return (
    <div style={{ padding: SP.md, paddingBottom: 80 }} data-testid="deepdive-method-page">
      <button
        onClick={onBack}
        data-testid="button-back-method"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: th.muted, minHeight: 44, cursor: 'pointer', fontSize: 15, padding: '0 0 8px' }}
      >
        <Icon.Back color={th.muted} size={18} />{t.back}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: SP.xs }}>
        <Icon.BookOpen color={th.gold} size={22} />
        <h1
          data-testid="text-method-title"
          style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 600, color: th.text, margin: 0 }}
        >
          {lang === 'de' ? 'Wie dein Profil entsteht' : 'How Your Profile Is Built'}
        </h1>
      </div>
      <p style={{ fontSize: 14, color: th.muted, margin: `0 0 ${SP.lg}px`, lineHeight: 1.5 }}>
        {lang === 'de' ? 'Transparenz ist uns wichtig.' : 'Transparency matters to us.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Section th={th} title={lang === 'de' ? 'Für Enthusiasten' : 'For Enthusiasts'}>
          <p style={{ fontSize: 14, color: th.muted, lineHeight: 1.7, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
            {l(CONTENT.introText)}
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: th.text, margin: 0 }}>
            {l(CONTENT.whatProfileShows)}
          </p>
          <ul style={{ fontSize: 14, color: th.muted, lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
            {CONTENT.profilePoints.map((pt, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{l(pt)}</li>
            ))}
          </ul>
          <p style={{ fontSize: 14, color: th.muted, lineHeight: 1.7, margin: 0, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
            {l(CONTENT.livingDocument)}
          </p>
        </Section>

        <Section th={th} title={lang === 'de' ? 'Für Experten' : 'For Experts'} defaultOpen={false}>
          {CONTENT.expertSections.map((sec, i) => (
            <div key={i}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, fontWeight: 600, color: th.text, marginBottom: 4 }}>
                {l(sec.title)}
              </h3>
              <p style={{ fontSize: 13, color: th.muted, lineHeight: 1.6, margin: 0 }}>
                {l(sec.text)}
              </p>
            </div>
          ))}

          <div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, fontWeight: 600, color: th.text, marginBottom: 4 }}>
              {l(CONTENT.systematicDeviation.title)}
            </h3>
            <p style={{
              fontSize: 12,
              fontFamily: 'monospace',
              padding: SP.sm,
              borderRadius: 8,
              background: th.bgHover,
              color: th.gold,
              margin: '0 0 6px',
            }}>
              avg_delta = mean(UserScore_i − PlatformMedian_i) {l(CONTENT.systematicDeviation.formula)}
            </p>
            <p style={{ fontSize: 13, color: th.muted, lineHeight: 1.6, margin: 0 }}>
              {l(CONTENT.systematicDeviation.text)}
            </p>
          </div>

          <div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, fontWeight: 600, color: th.text, marginBottom: 4 }}>
              {l(CONTENT.stabilityLogic.title)}
            </h3>
            <p style={{ fontSize: 13, color: th.muted, lineHeight: 1.6, margin: '0 0 6px' }}>
              {l(CONTENT.stabilityLogic.text)}
            </p>
            <ul style={{ fontSize: 12, fontFamily: 'monospace', color: th.gold, margin: '0 0 6px', paddingLeft: 20 }}>
              {CONTENT.stabilityLogic.levels.map((lvl, i) => (
                <li key={i}>{l(lvl.label)}: {lvl.range}</li>
              ))}
            </ul>
            <p style={{
              fontSize: 12,
              fontFamily: 'monospace',
              padding: SP.sm,
              borderRadius: 8,
              background: th.bgHover,
              color: th.gold,
              margin: 0,
            }}>
              {l(CONTENT.stabilityLogic.formulaLabel)} = min(100, N × 6.67)
            </p>
          </div>

          {CONTENT.additionalSections.map((sec, i) => (
            <div key={i}>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 14, fontWeight: 600, color: th.text, marginBottom: 4 }}>
                {l(sec.title)}
              </h3>
              <p style={{ fontSize: 13, color: th.muted, lineHeight: 1.6, margin: 0 }}>
                {l(sec.text)}
              </p>
            </div>
          ))}
        </Section>
      </div>
    </div>
  )
}
