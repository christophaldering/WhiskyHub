import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import InsightCard from "./InsightCard";
import type { Insight, InsightSize } from "@/labs/insights/types";

export interface InsightStripProps {
  insights: Insight[];
  size?: InsightSize;
  title?: string;
  emptyHint?: string;
  testId?: string;
  layout?: "scroll" | "grid";
  maxItems?: number;
}

export default function InsightStrip({
  insights,
  size = "standard",
  title,
  emptyHint,
  testId = "insight-strip",
  layout = "scroll",
  maxItems = 4,
}: InsightStripProps) {
  const { t } = useTranslation();
  const items = insights.slice(0, maxItems);

  if (items.length === 0) {
    if (!emptyHint) return null;
    return (
      <div data-testid={`${testId}-empty`} style={{
        padding: "12px 14px",
        borderRadius: 14,
        background: "var(--labs-surface)",
        border: "1px dashed var(--labs-border)",
        color: "var(--labs-text-muted)",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <Sparkles style={{ width: 14, height: 14, color: "var(--labs-accent)", opacity: 0.6 }} />
        {emptyHint}
      </div>
    );
  }

  const heading = title ?? t("insights.stripTitle", "Insights");

  return (
    <div data-testid={testId} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {title !== "" && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          color: "var(--labs-text-muted)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          <Sparkles style={{ width: 12, height: 12, color: "var(--labs-accent)" }} />
          <span>{heading}</span>
        </div>
      )}

      {layout === "scroll" && size !== "compact" ? (
        <div
          className="labs-insights-strip"
          style={{
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: "minmax(220px, 1fr)",
            gap: 10,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            paddingBottom: 4,
            margin: "0 -2px",
          }}
        >
          {items.map(ins => (
            <div key={ins.id} style={{ scrollSnapAlign: "start", minWidth: 0 }}>
              <InsightCard insight={ins} size={size} />
            </div>
          ))}
        </div>
      ) : layout === "grid" ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: items.length === 1 ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}>
          {items.map(ins => (
            <InsightCard key={ins.id} insight={ins} size={size} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {items.map(ins => (
            <InsightCard key={ins.id} insight={ins} size={size} />
          ))}
        </div>
      )}
    </div>
  );
}
