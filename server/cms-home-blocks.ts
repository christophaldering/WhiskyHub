export function buildHomeSeedBlocks(): unknown[] {
  const id = (suffix: string) => `blk_seed_${suffix}`;
  return [
    {
      id: id("hero"),
      type: "hero-cover",
      payload: {
        eyebrow: "",
        title: "CaskSense",
        subtitle: "Wo Verkosten zur Reflexion wird.",
        meta: "Was die Community über jeden Whisky weiß. Was deine Bewertungen über dich verraten.",
        imageUrl: "/images/landing-hero-whisky.png",
        alignment: "center",
        ctaLabel: "Tasting starten",
        ctaHref: "/labs/onboarding",
        ctaVariant: "primary",
        ctaSecondaryLabel: "Die CaskSense-Story",
        ctaSecondaryHref: "/story",
      },
    },
    {
      id: id("features"),
      type: "feature-cards",
      payload: {
        eyebrow: "Was CaskSense kann",
        heading: "Vier Wege, Whisky ernst zu nehmen.",
        lead: "Persönlich statt unpersönlich. Flexibel statt starr. Für Genuss gebaut, nicht für Kommerz.",
        columns: "4",
        items: [
          {
            icon: "wine",
            title: "Solo Tasting",
            description: "Halte deinen Dram fest und baue dein persönliches Geschmacksprofil — Glas für Glas.",
            ctaLabel: "Loslegen",
            ctaHref: "/labs/onboarding",
          },
          {
            icon: "users",
            title: "Gemeinsam verkosten",
            description: "Nimm an einer Blind-Runde mit Freunden teil. Vergleiche Scores und entdecke, wie unterschiedlich ihr schmeckt.",
            ctaLabel: "Loslegen",
            ctaHref: "/labs/onboarding",
          },
          {
            icon: "mic",
            title: "Tasting hosten",
            description: "Richte ein Tasting in Minuten ein. Whiskies hinzufügen, Code teilen und das Reveal leiten.",
            ctaLabel: "Loslegen",
            ctaHref: "/labs/onboarding",
          },
          {
            icon: "split",
            title: "Flaschenteilung",
            description: "Teile Flaschen mit Freunden. Behalte den Überblick, wer was bekommt — fair und transparent.",
            ctaLabel: "Loslegen",
            ctaHref: "/labs/onboarding",
          },
        ],
      },
    },
    {
      id: id("livestats"),
      type: "live-stats",
      payload: {
        eyebrow: "Live aus dem Labor",
        heading: "Echte Zahlen. Aufgebaut von jedem Tasting.",
        lead: "",
        columns: "4",
        items: [
          { statKey: "totalTastings", label: "Tastings durchgeführt", hint: "" },
          { statKey: "totalRatings", label: "Drams verkostet", hint: "" },
          { statKey: "registeredUsers", label: "Teilnehmende", hint: "" },
          { statKey: "whiskiesTasted", label: "Whiskys im Benchmark", hint: "" },
        ],
      },
    },
    {
      id: id("benchmark"),
      type: "benchmark-block",
      payload: {
        eyebrow: "Gaumen-Intelligenz",
        heading: "Was deine Bewertungen über dich verraten.",
        lead: "Nach zehn Drams schreibt dir CaskSense ein persönliches Verkostungsprofil — nicht was du zu mögen glaubst, sondern was dein Verhalten zeigt.",
        referenceLabel: "Community",
        yourLabel: "Du",
        items: [
          { label: "Rauch", value: 78, reference: 62, unit: "/100", hint: "" },
          { label: "Süße", value: 45, reference: 58, unit: "/100", hint: "" },
          { label: "Frucht", value: 72, reference: 70, unit: "/100", hint: "" },
          { label: "Würze", value: 68, reference: 55, unit: "/100", hint: "" },
          { label: "Körper", value: 82, reference: 71, unit: "/100", hint: "" },
        ],
      },
    },
    {
      id: id("ctaheading"),
      type: "text-section",
      payload: {
        eyebrow: "",
        heading: "Dein nächstes Tasting beginnt hier.",
        body: "",
        alignment: "center",
        variant: "default",
      },
    },
    {
      id: id("cta"),
      type: "cta-button",
      payload: {
        text: "Tasting starten",
        href: "/labs/onboarding",
        variant: "primary",
        alignment: "center",
        newTab: false,
        helper: "Kein Konto nötig — Code vom Host eingeben und direkt mitbewerten.",
      },
    },
    {
      id: id("divider"),
      type: "divider",
      payload: { variant: "line" },
    },
    {
      id: id("footer"),
      type: "text-section",
      payload: {
        eyebrow: "CaskSense",
        heading: "Wo Verkosten zur Reflexion wird.",
        body: "<p>Eine unabhängige Plattform für ernsthafte Whisky-Verkostung — aus Edinburgh und Berlin.</p><p><a href=\"/impressum\">Impressum</a> · <a href=\"/privacy\">Datenschutz</a> · <a href=\"/terms\">AGB</a></p>",
        alignment: "center",
        variant: "default",
      },
    },
  ];
}
