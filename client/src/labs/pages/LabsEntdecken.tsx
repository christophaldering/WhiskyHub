import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Search, BookOpen, Map, GraduationCap, FileText, Languages, FlaskConical, BarChart3, ChevronRight } from "lucide-react";

function EntdeckenRow({ href, icon: Icon, label, sub, testId }: {
  href: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  sub: string;
  testId: string;
}) {
  return (
    <Link href={href} className="labs-list-row" style={{ justifyContent: "space-between", textDecoration: "none", color: "inherit" }} data-testid={testId}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--labs-text)" }}>{label}</div>
          <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <ChevronRight style={{ width: 16, height: 16, opacity: 0.3 }} />
    </Link>
  );
}

export default function LabsEntdecken() {
  const { t } = useTranslation();

  return (
    <div style={{ padding: "1.5rem 1.25rem 6rem" }} data-testid="labs-entdecken-page">
      <div className="labs-section-label" style={{ marginBottom: "0.75rem" }}>
        {t("labs.entdecken.label", "Entdecken")}
      </div>
      <h1 className="labs-serif" style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 6px" }}>
        {t("labs.entdecken.title", "Whiskies & Wissen")}
      </h1>
      <p style={{ fontSize: 14, color: "var(--labs-text-secondary)", marginBottom: "2rem", lineHeight: 1.5 }}>
        {t("labs.entdecken.subtitle", "Stöbere durch Flaschen oder tauche in die Welt des Whiskys ein.")}
      </p>

      <div className="labs-section-label" style={{ marginBottom: "0.75rem" }}>
        {t("labs.entdecken.whiskies", "Whiskies")}
      </div>
      <div className="labs-grouped-list" style={{ marginBottom: "2rem" }}>
        <EntdeckenRow
          href="/labs/explore"
          icon={Search}
          label={t("labs.entdecken.allWhiskies", "Alle Whiskies")}
          sub={t("labs.entdecken.allWhiskiesSub", "Community-Bewertungen durchsuchen")}
          testId="link-entdecken-explore"
        />
        <EntdeckenRow
          href="/labs/taste/compare"
          icon={BarChart3}
          label={t("labs.entdecken.compare", "Vergleichen")}
          sub={t("labs.entdecken.compareSub", "Deine Scores vs. Plattform-Median")}
          testId="link-entdecken-compare"
        />
      </div>

      <div className="labs-section-label" style={{ marginBottom: "0.75rem" }}>
        {t("labs.entdecken.wissen", "Wissen")}
      </div>
      <div className="labs-grouped-list">
        {[
          { path: "/labs/discover/lexicon", label: t("labs.entdecken.lexikon", "Lexikon"), sub: t("labs.entdecken.lexikonSub", "Begriffe & Definitionen"), icon: BookOpen, testId: "link-entdecken-lexicon" },
          { path: "/labs/discover/distilleries", label: t("labs.entdecken.destillerien", "Destillerien"), sub: t("labs.entdecken.destillerienSub", "Karte & Details"), icon: Map, testId: "link-entdecken-distilleries" },
          { path: "/labs/discover/guide", label: t("labs.entdecken.guide", "Tasting-Guide"), sub: t("labs.entdecken.guideSub", "Schritt für Schritt"), icon: GraduationCap, testId: "link-entdecken-guide" },
          { path: "/labs/discover/templates", label: t("labs.entdecken.vorlagen", "Vorlagen"), sub: t("labs.entdecken.vorlagenSub", "Notizen & Vokabular"), icon: FileText, testId: "link-entdecken-templates" },
          { path: "/labs/discover/flavour-map", label: t("labs.entdecken.wortschatz", "Wortschatz"), sub: t("labs.entdecken.wortschatzSub", "Nach Region & Stil"), icon: Languages, testId: "link-entdecken-vocabulary" },
          { path: "/labs/discover/research", label: t("labs.entdecken.forschung", "Forschung"), sub: t("labs.entdecken.forschungSub", "Wissenschaft des Geschmacks"), icon: FlaskConical, testId: "link-entdecken-research" },
        ].map((item) => (
          <EntdeckenRow
            key={item.path}
            href={item.path}
            icon={item.icon}
            label={item.label}
            sub={item.sub}
            testId={item.testId}
          />
        ))}
      </div>
    </div>
  );
}
