import { useRef } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { Back, MapIcon, Nose, Palate, Finish, Overall, Whisky, BookOpen, type IconProps } from "../../icons";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import type { Translations } from "../../i18n";

interface GuideSection {
  id: string;
  icon: (p: IconProps) => React.JSX.Element;
  titleDe: string;
  titleEn: string;
  contentDe: string[];
  contentEn: string[];
}

const guideSections: GuideSection[] = [
  {
    id: "preparation",
    icon: Whisky,
    titleDe: "Vorbereitung",
    titleEn: "Preparation",
    contentDe: [
      "W\u00e4hle ein ruhiges Umfeld ohne starke Ger\u00fcche. Idealerweise am sp\u00e4ten Nachmittag oder Abend, wenn dein Gaumen am empfindlichsten ist.",
      "Verwende ein Nosing-Glas (tulpenf\u00f6rmig), das die Aromen konzentriert. Halte stilles Wasser und Wasser mit Zimmertemperatur bereit.",
    ],
    contentEn: [
      "Choose a calm environment without strong odors. Ideally late afternoon or evening, when your palate is most sensitive.",
      "Use a nosing glass (tulip-shaped) that concentrates aromas. Keep still water and room-temperature water handy.",
    ],
  },
  {
    id: "glass",
    icon: Whisky,
    titleDe: "Das Glas",
    titleEn: "The Glass",
    contentDe: [
      "Gie\u00dfe etwa 2cl Whisky ein. Halte das Glas gegen das Licht und beobachte die Farbe \u2014 sie gibt Hinweise auf Fasstyp und Reifedauer.",
      "Schwenke das Glas leicht und beobachte die \u201eChurch Windows\u201c (Tr\u00e4nen): langsam flie\u00dfende deuten auf h\u00f6heren Alkohol- oder \u00d6lgehalt hin.",
    ],
    contentEn: [
      "Pour about 2cl of whisky. Hold the glass against light and observe the color \u2014 it hints at cask type and maturation duration.",
      "Gently swirl the glass and observe the 'church windows' (legs): slow-flowing ones indicate higher alcohol or oil content.",
    ],
  },
  {
    id: "nose",
    icon: Nose,
    titleDe: "Nase",
    titleEn: "Nose",
    contentDe: [
      "N\u00e4here dich dem Glas langsam. Halte es zun\u00e4chst auf Brusthohe und f\u00fchre es langsam zur Nase.",
      "Atme mit leicht ge\u00f6ffnetem Mund ein \u2014 das reduziert den Alkoholstich. Notiere deine ersten Eindr\u00fccke: Frucht, Rauch, S\u00fc\u00dfe, Gew\u00fcrze?",
      "Warte einen Moment, nimm einen zweiten Atemzug. Oft \u00f6ffnen sich tiefere Schichten: Leder, Tabak, maritim?",
    ],
    contentEn: [
      "Approach the glass slowly. Hold it at chest height first and slowly bring it to your nose.",
      "Breathe in with a slightly open mouth \u2014 this reduces the alcohol sting. Note your first impressions: fruit, smoke, sweetness, spices?",
      "Wait a moment, take a second breath. Often deeper layers reveal themselves: leather, tobacco, maritime?",
    ],
  },
  {
    id: "palate",
    icon: Palate,
    titleDe: "Gaumen",
    titleEn: "Palate",
    contentDe: [
      "Nimm einen kleinen Schluck und lass den Whisky \u00fcber die gesamte Zunge flie\u00dfen. Verschiedene Bereiche der Zunge reagieren auf unterschiedliche Geschm\u00e4cker.",
      "Achte auf Textur (cremig, \u00f6lig, w\u00e4ssrig), Geschmack (s\u00fc\u00df, w\u00fcrzig, bitter) und Intensit\u00e4t. Wie ver\u00e4ndert sich der Geschmack von vorne nach hinten?",
    ],
    contentEn: [
      "Take a small sip and let the whisky flow across your entire tongue. Different areas of the tongue respond to different flavors.",
      "Pay attention to texture (creamy, oily, watery), taste (sweet, spicy, bitter), and intensity. How does the flavor change from front to back?",
    ],
  },
  {
    id: "finish",
    icon: Finish,
    titleDe: "Abgang",
    titleEn: "Finish",
    contentDe: [
      "Nach dem Schlucken: Wie lange bleiben die Aromen? Ein langer Abgang (15+ Sekunden) deutet auf Qualit\u00e4t und Komplexit\u00e4t hin.",
      "\u00c4ndert sich der Charakter? Manche Whiskies entwickeln im Abgang v\u00f6llig neue Noten \u2014 Rauch, Gew\u00fcrze oder Trockenheit.",
    ],
    contentEn: [
      "After swallowing: how long do the aromas linger? A long finish (15+ seconds) indicates quality and complexity.",
      "Does the character change? Some whiskies develop entirely new notes in the finish \u2014 smoke, spices, or dryness.",
    ],
  },
  {
    id: "scoring",
    icon: Overall,
    titleDe: "Bewertung",
    titleEn: "Scoring",
    contentDe: [
      "CaskSense verwendet ein 100-Punkte-System: Nase (max 25) + Gaumen (max 25) + Abgang (max 25) + Gesamt (max 25).",
      "90\u2013100: Au\u00dfergew\u00f6hnlich | 85\u201389: Exzellent | 80\u201384: Hervorragend | 75\u201379: Sehr gut | 70\u201374: Gut",
      "Vertrau deiner Intuition \u2014 es gibt kein richtig oder falsch. Dein Geschmack ist dein Kompass.",
    ],
    contentEn: [
      "CaskSense uses a 100-point system: Nose (max 25) + Palate (max 25) + Finish (max 25) + Overall (max 25).",
      "90\u2013100: Extraordinary | 85\u201389: Excellent | 80\u201384: Outstanding | 75\u201379: Very good | 70\u201374: Good",
      "Trust your instinct \u2014 there is no right or wrong. Your palate is your compass.",
    ],
  },
  {
    id: "pairing",
    icon: Whisky,
    titleDe: "Food Pairing",
    titleEn: "Food Pairing",
    contentDe: [
      "Leichte, blumige Whiskies: Meeresfrüchte, heller Käse, Zitrusdesserts.",
      "Sherried, reichhaltige Whiskies: Dunkle Schokolade, Blauschimmelkäse, Trockenfrüchte.",
      "Rauchige, torfige Whiskies: Geräucherter Lachs, BBQ, kräftiger Käse.",
    ],
    contentEn: [
      "Light, floral whiskies: Seafood, mild cheese, citrus desserts.",
      "Sherried, rich whiskies: Dark chocolate, blue cheese, dried fruits.",
      "Smoky, peaty whiskies: Smoked salmon, BBQ, strong cheese.",
    ],
  },
  {
    id: "notes",
    icon: BookOpen,
    titleDe: "Notizen führen",
    titleEn: "Keeping Notes",
    contentDe: [
      "Halte deine Eindrücke sofort fest \u2014 Aromen verblassen schnell aus dem Gedächtnis.",
      "Nutze die CaskSense Notiz-Funktion oder führe ein physisches Tasting-Journal. Vergleiche über Zeit, wie sich dein Gaumen entwickelt.",
    ],
    contentEn: [
      "Record your impressions immediately \u2014 aromas fade quickly from memory.",
      "Use the CaskSense notes feature or keep a physical tasting journal. Compare over time how your palate develops.",
    ],
  },
];

interface TastingGuideProps {
  onBack: () => void;
}

export default function TastingGuide({ onBack }: TastingGuideProps) {
  const { th } = useV2Theme();
  const { t, lang } = useV2Lang();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.xs,
          background: "none",
          border: "none",
          color: th.muted,
          fontSize: 14,
          fontFamily: FONT.body,
          cursor: "pointer",
          marginBottom: SP.md,
          minHeight: TOUCH_MIN,
          padding: 0,
        }}
        data-testid="button-back-guide"
      >
        <Back color={th.muted} size={18} />
        {t.entTitle}
      </button>

      <div style={{ textAlign: "center", marginBottom: SP.lg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: SP.sm, marginBottom: SP.xs }}>
          <MapIcon color={th.gold} size={22} />
          <h1
            style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: th.text, margin: 0 }}
            data-testid="text-guide-title"
          >
            {t.entGuide}
          </h1>
        </div>
        <p style={{ fontSize: 13, color: th.muted }}>{t.entGuideSub}</p>
        <div style={{ width: 48, height: 1, background: th.gold, opacity: 0.75, margin: `${SP.md}px auto 0` }} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: SP.lg, justifyContent: "center" }}>
        {guideSections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => scrollTo(sec.id)}
            style={{
              padding: "5px 12px",
              borderRadius: RADIUS.full,
              border: `1px solid ${th.border}`,
              background: "transparent",
              color: th.muted,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: FONT.body,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            data-testid={`guide-anchor-${sec.id}`}
          >
            {lang === "de" ? sec.titleDe : sec.titleEn}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: SP.xl }}>
        {guideSections.map((sec) => {
          const title = lang === "de" ? sec.titleDe : sec.titleEn;
          const paragraphs = lang === "de" ? sec.contentDe : sec.contentEn;
          return (
            <div
              key={sec.id}
              ref={(el) => { sectionRefs.current[sec.id] = el; }}
              data-testid={`guide-section-${sec.id}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.sm }}>
                <sec.icon color={th.gold} size={18} />
                <h2 style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 600, color: th.gold, margin: 0 }}>
                  {title}
                </h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
                {paragraphs.map((p, i) => (
                  <p key={i} style={{ fontSize: 14, lineHeight: 1.7, color: th.muted, margin: 0 }}>{p}</p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
