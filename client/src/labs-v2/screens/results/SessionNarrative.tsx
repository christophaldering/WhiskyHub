import { useState, useCallback } from "react";
import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS } from "../../tokens";
import type { Translations } from "../../i18n";
import type { V2Lang } from "../../i18n";

interface Props {
  th: ThemeTokens;
  t: Translations;
  tastingId: string;
  participantId: string;
  isHost: boolean;
  lang: V2Lang;
}

export default function SessionNarrative({ th, t, tastingId, participantId, isHost, lang }: Props) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [narrativeLang, setNarrativeLang] = useState<V2Lang>(lang);

  if (!isHost) return null;

  const generate = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tastings/${tastingId}/ai-narrative`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-participant-id": participantId,
        },
        body: JSON.stringify({ language: narrativeLang, force }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to generate narrative");
      }
      const data = await res.json();
      setNarrative(data.narrative);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [tastingId, participantId, narrativeLang]);

  const renderNarrativeContent = (text: string): React.ReactNode[] => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return <h3 key={i} style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: th.text, margin: `${SP.lg}px 0 ${SP.sm}px` }}>{line.slice(3)}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={i} style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: th.text, margin: `${SP.lg}px 0 ${SP.md}px` }}>{line.slice(2)}</h2>;
      }
      if (line.match(/^[-*]\s+/)) {
        return <div key={i} style={{ display: "flex", gap: SP.sm, marginBottom: SP.xs, paddingLeft: SP.md }}><span style={{ color: th.gold }}>--</span><span style={{ fontSize: 14, color: th.text }}>{line.replace(/^[-*]\s+/, "")}</span></div>;
      }
      if (line.trim() === "") return <div key={i} style={{ height: SP.sm }} />;
      return <p key={i} style={{ fontSize: 14, color: th.text, lineHeight: 1.7, margin: `0 0 ${SP.sm}px`, fontFamily: FONT.serif }}>{line}</p>;
    });
  };

  return (
    <div data-testid="session-narrative" style={{ fontFamily: FONT.body, padding: SP.md }}>
      <button
        data-testid="button-narrative-toggle"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${SP.md}px 0`,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: FONT.display,
          fontSize: 20,
          fontWeight: 700,
          color: th.text,
        }}
      >
        {t.resNarrativeTitle}
        <span style={{ fontSize: 14, color: th.muted, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          v
        </span>
      </button>

      {expanded && (
        <div style={{ animation: "v2FadeIn 0.3s ease" }}>
          {!narrative && !loading && (
            <div style={{ textAlign: "center", padding: SP.lg }}>
              <p style={{ fontSize: 14, color: th.muted, marginBottom: SP.md }}>{t.resNarrativeEmpty}</p>
              <div style={{ display: "flex", gap: SP.sm, justifyContent: "center", marginBottom: SP.md }}>
                <button
                  data-testid="button-narrative-lang-de"
                  onClick={() => setNarrativeLang("de")}
                  style={{
                    padding: `${SP.xs}px ${SP.md}px`,
                    borderRadius: RADIUS.full,
                    border: `1px solid ${narrativeLang === "de" ? th.gold : th.border}`,
                    background: narrativeLang === "de" ? th.gold : "transparent",
                    color: narrativeLang === "de" ? th.bg : th.muted,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
                  }}
                >
                  DE
                </button>
                <button
                  data-testid="button-narrative-lang-en"
                  onClick={() => setNarrativeLang("en")}
                  style={{
                    padding: `${SP.xs}px ${SP.md}px`,
                    borderRadius: RADIUS.full,
                    border: `1px solid ${narrativeLang === "en" ? th.gold : th.border}`,
                    background: narrativeLang === "en" ? th.gold : "transparent",
                    color: narrativeLang === "en" ? th.bg : th.muted,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
                  }}
                >
                  EN
                </button>
              </div>
              <button
                data-testid="button-generate-narrative"
                onClick={() => generate(false)}
                style={{
                  padding: `${SP.md}px ${SP.xl}px`,
                  borderRadius: RADIUS.lg,
                  border: "none",
                  background: th.gold,
                  color: th.bg,
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: FONT.body,
                  cursor: "pointer",
                }}
              >
                {t.resGenerateNarrative}
              </button>
            </div>
          )}

          {loading && (
            <div data-testid="narrative-loading" style={{ textAlign: "center", padding: SP.lg }}>
              <div style={{ color: th.muted, fontSize: 14 }}>{t.resGenerating}</div>
            </div>
          )}

          {narrative && !loading && (
            <div data-testid="narrative-content">
              <div
                style={{
                  background: th.bgCard,
                  borderRadius: RADIUS.lg,
                  padding: SP.lg,
                  border: `1px solid ${th.border}`,
                  marginBottom: SP.md,
                }}
              >
                {renderNarrativeContent(narrative)}
              </div>
              <div style={{ display: "flex", gap: SP.sm }}>
                <button
                  data-testid="button-regenerate-narrative"
                  onClick={() => generate(true)}
                  style={{
                    padding: `${SP.sm}px ${SP.md}px`,
                    borderRadius: RADIUS.md,
                    border: `1px solid ${th.border}`,
                    background: th.bgCard,
                    color: th.text,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: FONT.body,
                    cursor: "pointer",
                  }}
                >
                  {t.resRegenerate}
                </button>
                <div style={{ display: "flex", gap: SP.xs }}>
                  <button
                    data-testid="button-narrative-content-lang-de"
                    onClick={() => setNarrativeLang("de")}
                    style={{
                      width: 32, height: 28, borderRadius: RADIUS.sm,
                      border: `1px solid ${narrativeLang === "de" ? th.gold : th.border}`,
                      background: narrativeLang === "de" ? th.gold : "transparent",
                      color: narrativeLang === "de" ? th.bg : th.muted,
                      fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
                    }}
                  >
                    DE
                  </button>
                  <button
                    data-testid="button-narrative-content-lang-en"
                    onClick={() => setNarrativeLang("en")}
                    style={{
                      width: 32, height: 28, borderRadius: RADIUS.sm,
                      border: `1px solid ${narrativeLang === "en" ? th.gold : th.border}`,
                      background: narrativeLang === "en" ? th.gold : "transparent",
                      color: narrativeLang === "en" ? th.bg : th.muted,
                      fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT.body,
                    }}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && <p style={{ color: th.amber, fontSize: 13, marginTop: SP.sm }}>{error}</p>}
        </div>
      )}

      <style>{`
        @keyframes v2FadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
