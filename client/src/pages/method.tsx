import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-lg border border-border/40 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/10 transition-colors" data-testid={`button-section-${title.slice(0, 20)}`}>
        <h2 className="text-lg font-serif font-semibold">{title}</h2>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </div>
  );
}

export default function Method() {
  const { i18n } = useTranslation();
  const isDE = i18n.language === "de";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" data-testid="method-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary">
            {isDE ? "So wird dein Profil erstellt" : "How Your Profile Is Built"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          {isDE
            ? "Transparenz ist uns wichtig. Hier erklären wir genau, wie dein Whisky-Profil berechnet wird."
            : "Transparency matters to us. Here we explain exactly how your whisky profile is calculated."}
        </p>

        <div className="space-y-6">
          <Section title={isDE ? "Für Enthusiasten" : "For Enthusiasts"}>
            <div className="prose prose-sm max-w-none text-muted-foreground space-y-3">
              <p>
                {isDE
                  ? "Dein Whisky-Profil basiert ausschließlich auf deinem Bewertungsverhalten — nicht auf Persönlichkeitstests, Fragebögen oder Annahmen über dich als Person."
                  : "Your whisky profile is based exclusively on your rating behavior — not on personality tests, questionnaires, or assumptions about you as a person."}
              </p>
              <p className="font-medium text-foreground">
                {isDE ? "Was das Profil zeigt:" : "What the profile shows:"}
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{isDE ? "Keine Typologien oder Kategorien — du wirst nicht als \"Explorer\" oder \"Kenner\" eingestuft." : "No typologies or categories — you are not classified as an \"Explorer\" or \"Connoisseur\"."}</li>
                <li>{isDE ? "Dein Geschmack wird als mehrdimensionale, sich verändernde Struktur abgebildet." : "Your taste is mapped as a multidimensional, evolving structure."}</li>
                <li>{isDE ? "Alle Aussagen beschreiben dein Verhalten, nie deine Persönlichkeit." : "All statements describe your behavior, never your personality."}</li>
                <li>{isDE ? "Vergleiche mit der Plattform oder Freunden musst du aktiv einschalten." : "Comparisons with the platform or friends must be actively enabled by you."}</li>
                <li>{isDE ? "Jede Zahl wird mit Stichprobengröße und Streuungsmaß angezeigt." : "Every number is shown with sample size and dispersion measure."}</li>
              </ul>
              <p>
                {isDE
                  ? "Dein Profil verändert sich mit jeder neuen Bewertung. Es ist ein lebendiges Dokument deiner Geschmacksentwicklung."
                  : "Your profile changes with every new rating. It is a living document of your taste evolution."}
              </p>
            </div>
          </Section>

          <Section title={isDE ? "Für Experten" : "For Experts"} defaultOpen={false}>
            <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {isDE ? "Dimensionales Modell" : "Dimensional Model"}
                </h3>
                <p>
                  {isDE
                    ? "Geschmack wird als kontinuierlicher, mehrdimensionaler Präferenzraum modelliert (revealed preferences). Jede Dimension (Nase, Geschmack, Abgang, Balance, Gesamt) wird unabhängig berechnet."
                    : "Taste is modeled as a continuous, multidimensional preference space (revealed preferences). Each dimension (Nose, Taste, Finish, Balance, Overall) is computed independently."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {isDE ? "Plattform-Basis: Median statt Mittelwert" : "Platform Basis: Median Over Mean"}
                </h3>
                <p>
                  {isDE
                    ? "Für alle Plattform-Vergleiche wird der Median verwendet, nicht der arithmetische Mittelwert. Der Median ist robust gegenüber Ausreißern und bildet die zentrale Tendenz der Bewertungen besser ab."
                    : "For all platform comparisons, the median is used, not the arithmetic mean. The median is robust against outliers and better represents the central tendency of ratings."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {isDE ? "Interquartilsabstand (IQR)" : "Interquartile Range (IQR)"}
                </h3>
                <p>
                  {isDE
                    ? "Wo verfügbar (N ≥ 4), wird der IQR (Q3 − Q1) als Streuungsmaß angezeigt. Er zeigt, wie einig sich die Plattform bei einem Whisky ist."
                    : "Where available (N ≥ 4), the IQR (Q3 − Q1) is shown as a dispersion measure. It indicates how much agreement exists on the platform for a whisky."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {isDE ? "Systematische Abweichung" : "Systematic Deviation"}
                </h3>
                <p className="font-mono text-xs bg-muted/30 p-2 rounded">
                  avg_delta = mean(UserScore_i − PlatformMedian_i) {isDE ? "für alle Whiskys i mit Plattform-Daten" : "for all whiskies i with platform data"}
                </p>
                <p>
                  {isDE
                    ? "Misst, ob du systematisch höher oder niedriger bewertest als der Plattform-Median. Ein positiver Wert bedeutet nicht \"großzügiger\" — er beschreibt lediglich eine strukturelle Tendenz im Bewertungsverhalten."
                    : "Measures whether you systematically rate higher or lower than the platform median. A positive value does not mean \"more generous\" — it merely describes a structural tendency in rating behavior."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {isDE ? "Stabilitätslogik" : "Stability Logic"}
                </h3>
                <p>
                  {isDE
                    ? "Die Konfidenz einer Dimension basiert auf der Anzahl der Beobachtungen:"
                    : "The confidence of a dimension is based on the number of observations:"}
                </p>
                <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
                  <li>{isDE ? "Vorläufig" : "Preliminary"}: N &lt; 5</li>
                  <li>{isDE ? "Tendenz" : "Tendency"}: 5 ≤ N &lt; 15</li>
                  <li>{isDE ? "Stabil" : "Stable"}: N ≥ 15</li>
                </ul>
                <p className="font-mono text-xs bg-muted/30 p-2 rounded mt-2">
                  {isDE ? "Stabilität %" : "Stability %"} = min(100, N × 6.67)
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {isDE ? "Normalisierung" : "Normalization"}
                </h3>
                <p>
                  {isDE
                    ? "Alle Bewertungen werden auf eine 0-100-Skala normalisiert (score × 100/scale), um Vergleiche über verschiedene Bewertungsskalen (5/10/20/100 Punkte) hinweg fair zu gestalten."
                    : "All ratings are normalized to a 0-100 scale (score × 100/scale), ensuring fair comparisons across different rating scales (5/10/20/100 points)."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {isDE ? "Plattform-Grundgesamtheit" : "Platform Population"}
                </h3>
                <p>
                  {isDE
                    ? "Die Plattform-Basis umfasst alle aktiven Profile und deren Bewertungen. Die Stichprobengröße (N) wird bei jeder Vergleichsmetrik transparent angezeigt."
                    : "The platform basis includes all active profiles and their ratings. The sample size (N) is transparently displayed alongside every comparison metric."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-serif font-semibold text-foreground mb-1">
                  {isDE ? "Keine normative Bewertung" : "No Normative Evaluation"}
                </h3>
                <p>
                  {isDE
                    ? "Abweichungen werden strukturell beschrieben, nie als besser oder schlechter bewertet. Es gibt keine Perzentil-Ränge und kein Ranking im Profilkontext."
                    : "Deviations are described structurally, never evaluated as better or worse. There are no percentile ranks and no ranking in the profile context."}
                </p>
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-8 text-center">
          <Link href="/flavor-profile" className="text-xs text-primary/70 hover:text-primary transition-colors" data-testid="link-back-profile">
            ← {isDE ? "Zurück zum Geschmacksprofil" : "Back to Flavor Profile"}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
