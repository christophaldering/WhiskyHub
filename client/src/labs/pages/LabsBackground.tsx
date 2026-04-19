import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import {
  Wine, Search, Star, BookOpen,
  SlidersHorizontal, Eye, PartyPopper, Radar, NotebookPen,
  Award, Heart, ChevronLeft, ChevronRight
} from "lucide-react";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import type { ElementType } from "react";

interface StepCard { key: string; icon: ElementType; num: string; }
interface ItemCard { key: string; icon: ElementType; }

function SectionHeader({ icon: Icon, title, tagline, color }: { icon: ElementType; title: string; tagline: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon style={{ width: 20, height: 20, color }} />
      </div>
      <div>
        <h2 className="labs-serif" style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>{title}</h2>
        <p style={{ fontSize: 11, color, fontWeight: 600, margin: 0 }}>{tagline}</p>
      </div>
    </div>
  );
}

export default function LabsBackground() {
  const goBackToBibliothek = useBackNavigation("/labs/bibliothek");
  const { t } = useTranslation();

  useEffect(() => {
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, []);

  const steps: StepCard[] = [
    { key: "step1", icon: Wine, num: "1" },
    { key: "step2", icon: SlidersHorizontal, num: "2" },
    { key: "step3", icon: Eye, num: "3" },
    { key: "step4", icon: PartyPopper, num: "4" },
  ];

  const profileItems: ItemCard[] = [
    { key: "flavor", icon: Radar },
    { key: "journal", icon: NotebookPen },
    { key: "badges", icon: Award },
    { key: "wishlist", icon: Heart },
  ];

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-background-page">
      <button onClick={goBackToBibliothek} className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4" style={{ color: "var(--labs-text-muted)" }} data-testid="button-back-background">
        <ChevronLeft className="w-4 h-4" /> {t("bibliothek.title", "Library")}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <BookOpen style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}>
          {t("background.title", "Background & Methodology")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 28px", lineHeight: 1.5 }}>
        {t("background.subtitle")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <section id="tasting" style={{ scrollMarginTop: 80 }}>
          <SectionHeader icon={Wine} title={t("background.tasting.title")} tagline={t("background.tasting.tagline")} color="#6ec177" />
          <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>{t("background.tasting.intro")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {steps.map((step) => (
              <div key={step.key} className="labs-card" style={{ padding: 14, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 4, right: 8, fontSize: 28, fontWeight: 900, color: "rgba(110,193,119,0.1)" }}>{step.num}</div>
                <div style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <step.icon style={{ width: 14, height: 14, color: "#6ec177" }} />
                    <h3 className="labs-serif" style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>
                      {t(`background.tasting.${step.key}title`)}
                    </h3>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.5, margin: 0 }}>
                    {t(`background.tasting.${step.key}`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="profile" style={{ scrollMarginTop: 80 }}>
          <SectionHeader icon={Search} title={t("background.profile.title")} tagline={t("background.profile.tagline")} color="#5b9bd5" />
          <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>{t("background.profile.intro")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {profileItems.map((item) => (
              <div key={item.key} className="labs-card" style={{ display: "flex", gap: 10, padding: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(91,155,213,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <item.icon style={{ width: 14, height: 14, color: "#5b9bd5" }} />
                </div>
                <p style={{ fontSize: 12, color: "var(--labs-text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  {t(`background.profile.${item.key}`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="dimensions" style={{ scrollMarginTop: 80 }}>
          <SectionHeader icon={Star} title={t("background.dimensions.title")} tagline={t("background.dimensions.tagline")} color="var(--labs-accent)" />
          <Link href="/labs/discover/method" style={{ textDecoration: "none" }}>
            <div
              className="labs-card"
              data-testid="link-dimensions-method"
              style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", cursor: "pointer", borderColor: "var(--labs-accent)", borderWidth: 1 }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(218,165,32,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <SlidersHorizontal style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: "var(--labs-text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  {t("background.dimensions.teaser")}
                </p>
                <p style={{ fontSize: 12, color: "var(--labs-accent)", fontWeight: 600, marginTop: 6, marginBottom: 0 }}>
                  {t("bibliothek.howProfileCalculated", "How a Profile Is Calculated")}
                </p>
              </div>
              <ChevronRight style={{ width: 16, height: 16, color: "var(--labs-text-muted)", flexShrink: 0 }} />
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}
