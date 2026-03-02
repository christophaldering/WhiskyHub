import { Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const colors = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
};

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "24px",
};

function StatRow({ label, value }: { label: string; value: number | null | undefined }) {
  const display = value != null ? value.toFixed(1) : "—";
  const hasValue = value != null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
      }}
    >
      <span style={{ fontSize: 14, color: colors.text }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontFamily: "monospace",
          color: hasValue ? colors.accent : colors.muted,
          fontWeight: hasValue ? 600 : 400,
        }}
      >
        {display}
      </span>
    </div>
  );
}

export default function MyTastePage() {
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;

  const { data: participant } = useQuery({
    queryKey: ["participant-detail", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  const { data: insightData } = useQuery({
    queryKey: ["participant-insights", pid],
    queryFn: () =>
      fetch(`/api/participants/${pid}/insights`).then((r) => r.json()),
    enabled: !!pid,
  });

  const stability = participant?.ratingStabilityScore ?? null;
  const exploration = participant?.explorationIndex ?? null;
  const smoke = participant?.smokeAffinityIndex ?? null;
  const hasStats = stability != null || exploration != null || smoke != null;

  const insight = insightData?.insight ?? null;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: colors.bg,
        color: colors.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          padding: "48px 20px 64px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24,
            fontWeight: 700,
            color: colors.accent,
            margin: 0,
            textAlign: "center",
            marginBottom: 8,
          }}
          data-testid="text-my-taste-title"
        >
          My Taste
        </h1>

        <div style={cardStyle} data-testid="card-today">
          <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: colors.muted, margin: "0 0 16px" }}>
            Today
          </h2>
          <Link href="/log">
            <div
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                textAlign: "center",
                fontSize: 15,
                fontWeight: 600,
                background: colors.accent,
                color: colors.bg,
                borderRadius: 8,
                cursor: "pointer",
                border: "none",
                boxSizing: "border-box",
              }}
              data-testid="button-log-whisky"
            >
              Log a Whisky
            </div>
          </Link>
          <p style={{ fontSize: 12, color: colors.muted, textAlign: "center", margin: "10px 0 0" }}>
            A single rating is enough.
          </p>
        </div>

        <div style={cardStyle} data-testid="card-taste-snapshot">
          <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: colors.muted, margin: "0 0 12px" }}>
            Your Taste Snapshot
          </h2>
          {!pid ? (
            <p style={{ fontSize: 13, color: colors.muted, margin: 0 }} data-testid="text-snapshot-login">
              Log in to see your taste profile.
            </p>
          ) : hasStats ? (
            <div>
              <StatRow label="Stability" value={stability} />
              <StatRow label="Exploration" value={exploration} />
              <StatRow label="Smoke Affinity" value={smoke} />
            </div>
          ) : (
            <p style={{ fontSize: 13, color: colors.muted, margin: 0 }} data-testid="text-snapshot-empty">
              Building your profile… (needs more tastings)
            </p>
          )}
        </div>

        <div style={cardStyle} data-testid="card-taste-insight">
          <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: colors.muted, margin: "0 0 12px" }}>
            Taste Insight
          </h2>
          {!pid ? (
            <p style={{ fontSize: 13, color: colors.muted, margin: 0 }}>
              Log in to see your insights.
            </p>
          ) : insight ? (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: colors.text, margin: 0 }} data-testid="text-insight-message">
              {insight.message}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: colors.muted, margin: 0 }} data-testid="text-insight-empty">
              No insight yet — log a few whiskies.
            </p>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link
            href="/support"
            style={{ fontSize: 11, color: "#4a4540", textDecoration: "none" }}
            data-testid="link-support"
          >
            Advanced (Support)
          </Link>
        </div>
      </div>
    </div>
  );
}
