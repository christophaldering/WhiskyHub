import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MeineWeltActionBar from "@/labs/components/MeineWeltActionBar";
import EmbeddedAskBar from "@/labs/components/EmbeddedAskBar";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";
import { AI_INSIGHTS_HUB_TILES, HubTileGrid } from "./hubTiles";

type AskableTasting = { id: string; title: string | null; status?: string | null; date?: string | null; location?: string | null };

export default function LabsAIInsights() {
  const { t, i18n } = useTranslation();
  const isDe = i18n.language?.toLowerCase().startsWith("de");
  const { currentParticipant } = useAppStore();
  const [selectedTastingId, setSelectedTastingId] = useState<string>("");

  const { data: rawTastings } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const tastings = useMemo<AskableTasting[]>(() => {
    if (!Array.isArray(rawTastings)) return [];
    return (rawTastings as Array<Record<string, unknown>>)
      .filter((row) => !row.isTestData && !row.invitePending && typeof row.id === "string")
      .map((row) => ({
        id: row.id as string,
        title: typeof row.title === "string" ? row.title : null,
        status: typeof row.status === "string" ? row.status : null,
        date: typeof row.date === "string" ? row.date : null,
        location: typeof row.location === "string" ? row.location : null,
      }));
  }, [rawTastings]);

  const selectedTasting = useMemo(
    () => tastings.find((tt) => tt.id === selectedTastingId) ?? null,
    [tastings, selectedTastingId],
  );

  const askSectionTitle = isDe
    ? "Frag CaskSense zu einem Tasting"
    : "Ask CaskSense about a tasting";
  const pickerLabel = isDe ? "Tasting waehlen" : "Choose tasting";
  const placeholderOption = isDe ? "Tasting auswaehlen \u2026" : "Choose a tasting \u2026";
  const emptyHint = isDe
    ? "Du bist noch nicht Host oder Teilnehmer eines Tastings. Tritt einem Tasting bei oder erstelle eines, um Fragen dazu stellen zu koennen."
    : "You are not host or participant of any tasting yet. Join or create a tasting to ask questions about it.";
  const pendingHint = isDe
    ? "Waehle oben ein Tasting, dann kannst du frei Fragen dazu stellen \u2014 Lieblingsdram, polarisierende Drams, Konsistenz, Reveal-Effekt und mehr."
    : "Pick a tasting above, then ask anything about it \u2014 favourite dram, polarising drams, consistency, reveal effect and more.";

  return (
    <div className="labs-page" data-testid="labs-ai-insights-page">
      <MeineWeltActionBar active="ai" />

      <div style={{ marginBottom: 24 }}>
        <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: "0 0 2px" }} data-testid="text-ai-insights-title">
          {t("myTastePage.aiInsightsHub.title", "AI Insights")}
        </h1>
        <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}>
          {t("myTastePage.aiInsightsHub.subtitle", "AI-powered reports & recommendations")}
        </p>
      </div>

      <HubTileGrid tiles={AI_INSIGHTS_HUB_TILES} t={t} variant="single-row" />

      <div
        style={{
          marginTop: 28,
          padding: "16px 14px",
          borderRadius: 14,
          background: "var(--labs-surface)",
          border: "1px solid var(--labs-border)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
        data-testid="section-ai-insights-ask"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "var(--labs-accent)",
            }}
            data-testid="text-ai-insights-ask-title"
          >
            {askSectionTitle}
          </div>
        </div>

        {tastings.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--labs-text-muted)" }} data-testid="text-ai-insights-ask-empty">
            {emptyHint}
          </div>
        ) : (
          <>
            <label
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
              data-testid="label-ai-insights-tasting-picker"
            >
              <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{pickerLabel}</span>
              <select
                value={selectedTastingId}
                onChange={(e) => setSelectedTastingId(e.target.value)}
                data-testid="select-ai-insights-tasting"
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid var(--labs-border)",
                  background: "var(--labs-bg)",
                  color: "var(--labs-text)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <option value="" data-testid="option-ai-insights-tasting-placeholder">
                  {placeholderOption}
                </option>
                {tastings.map((tt) => {
                  const meta = [tt.location, tt.date].filter(Boolean).join(" \u2022 ");
                  const label = meta ? `${tt.title ?? "Tasting"} \u2014 ${meta}` : (tt.title ?? "Tasting");
                  return (
                    <option key={tt.id} value={tt.id} data-testid={`option-ai-insights-tasting-${tt.id}`}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>

            {selectedTasting ? (
              <EmbeddedAskBar
                key={selectedTasting.id}
                tastingId={selectedTasting.id}
                tastingTitle={selectedTasting.title}
                isParticipant={true}
                testIdPrefix="ai-insights-ask"
              />
            ) : (
              <div style={{ fontSize: 13, color: "var(--labs-text-muted)" }} data-testid="text-ai-insights-ask-pending">
                {pendingHint}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
