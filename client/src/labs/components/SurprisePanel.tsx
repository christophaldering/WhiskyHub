import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { useSurprises, type Surprise } from "@/labs/hooks/useSurprises";

const MAX_VISIBLE = 3;

interface SurpriseDescription {
  title: string;
  body: string;
  cta: string;
  href: string;
}

function describeSurprise(s: Surprise, t: TFunction): SurpriseDescription {
  switch (s.type) {
    case "individual_ai_analysis":
      return {
        title: t("surprises.individualTitle", "Deine persönliche KI-Analyse ist da"),
        body: s.tastingTitle
          ? t("surprises.individualBody", "Vom Tasting „{{title}}“. Wirf einen Blick rein.", { title: s.tastingTitle })
          : t("surprises.individualBodyNoTitle", "Eine neue persönliche KI-Analyse wartet auf dich."),
        cta: t("surprises.individualCta", "Jetzt ansehen"),
        href: `/labs/results/${s.tastingId}/ai-report`,
      };
  }
}

export default function SurprisePanel() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { surprises, dismiss, dismissAll } = useSurprises();
  const [expanded, setExpanded] = useState(false);

  const visible = useMemo(() => surprises.slice(0, expanded ? surprises.length : MAX_VISIBLE), [surprises, expanded]);
  const overflowCount = surprises.length - visible.length;

  if (surprises.length === 0) return null;

  return (
    <section
      data-testid="surprise-panel"
      style={{
        marginTop: 16,
        padding: 14,
        border: "1px solid rgba(212,162,86,0.25)",
        background: "linear-gradient(180deg, rgba(212,162,86,0.06) 0%, rgba(212,162,86,0.02) 100%)",
        borderRadius: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: "var(--labs-accent)", textTransform: "uppercase" }}>
            {t("surprises.headline", "Eine kleine Überraschung")}
          </span>
        </div>
        {surprises.length > 1 && (
          <button
            type="button"
            onClick={() => dismissAll()}
            data-testid="button-surprise-dismiss-all"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--labs-text-muted)", fontSize: 11, fontWeight: 600,
              padding: "2px 6px", borderRadius: 6,
            }}
          >
            {t("surprises.dismissAll", "Alle ausblenden")}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((s) => {
          const d = describeSurprise(s, t);
          return (
            <article
              key={s.id}
              data-testid={`surprise-card-${s.tastingId}`}
              style={{
                position: "relative",
                padding: "12px 14px",
                background: "var(--labs-surface)",
                border: "1px solid var(--labs-border)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--labs-text)", marginBottom: 2 }}>
                  {d.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.45 }}>
                  {d.body}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  dismiss(s);
                  navigate(d.href);
                }}
                data-testid={`button-surprise-open-${s.tastingId}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "7px 12px", borderRadius: 999,
                  border: "1px solid var(--labs-accent)",
                  background: "var(--labs-accent)",
                  color: "var(--labs-bg)",
                  fontSize: 12, fontWeight: 700,
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                {d.cta}
                <ChevronRight style={{ width: 12, height: 12 }} />
              </button>
              <button
                type="button"
                onClick={() => dismiss(s)}
                aria-label={t("surprises.dismiss", "Ausblenden")}
                data-testid={`button-surprise-dismiss-${s.tastingId}`}
                style={{
                  position: "absolute", top: 6, right: 6,
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--labs-text-muted)", padding: 4, borderRadius: 6,
                  display: "inline-flex",
                }}
              >
                <X style={{ width: 11, height: 11 }} />
              </button>
            </article>
          );
        })}
      </div>

      {!expanded && overflowCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          data-testid="button-surprise-show-more"
          style={{
            marginTop: 10, background: "transparent", border: "none", cursor: "pointer",
            color: "var(--labs-text-muted)", fontSize: 12, fontWeight: 600,
            padding: 4,
          }}
        >
          {t("surprises.showMore", "+{{n}} weitere", { n: overflowCount })}
        </button>
      )}
    </section>
  );
}
