import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import SimpleShell from "@/components/simple/simple-shell";

const colors = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  accent: "#d4a256",
  error: "#c44",
};

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "24px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  color: colors.text,
  padding: "10px 14px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const LS_KEY = "casksense_participant_id";

function StatRow({ label, value }: { label: string; value: number | null | undefined }) {
  const display = value != null ? value.toFixed(1) : "—";
  const hasValue = value != null;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
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

function UnlockCard({ onUnlock }: { onUnlock: (p: { id: string; name: string; role?: string }) => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await participantApi.loginOrCreate(name.trim(), pin.trim());
      if (result?.id) {
        localStorage.setItem(LS_KEY, result.id);
        onUnlock({ id: result.id, name: result.name, role: result.role });
      } else {
        setError("Unexpected response. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid p") || msg.includes("Invalid P")) {
        setError("Wrong password. Please try again.");
      } else if (msg.includes("email")) {
        setError("No account found. Use the same name and PIN from your tasting.");
      } else {
        setError(msg || "Could not unlock. Check name and PIN.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle} data-testid="card-unlock">
      <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: colors.muted, margin: "0 0 16px" }}>
        Unlock your taste profile
      </h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          data-testid="input-unlock-name"
          autoComplete="off"
        />
        <input
          type="password"
          placeholder="Password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ ...inputStyle, letterSpacing: 3 }}
          data-testid="input-unlock-pin"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading || !name.trim() || !pin.trim()}
          data-testid="button-unlock"
          style={{
            width: "100%",
            padding: "10px",
            fontSize: 15,
            fontWeight: 600,
            background: loading ? colors.border : colors.accent,
            color: colors.bg,
            border: "none",
            borderRadius: 8,
            cursor: loading ? "wait" : "pointer",
            opacity: (!name.trim() || !pin.trim()) ? 0.5 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {loading ? "…" : "Unlock"}
        </button>
        {error && (
          <p style={{ fontSize: 12, color: colors.error, margin: 0, textAlign: "center" }} data-testid="text-unlock-error">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

export default function MyTastePage() {
  const { currentParticipant, setParticipant } = useAppStore();
  const pid = currentParticipant?.id;

  useEffect(() => {
    if (!pid) {
      const storedId = localStorage.getItem(LS_KEY);
      if (storedId) {
        participantApi.get(storedId).then((p: any) => {
          if (p?.id) {
            setParticipant({ id: p.id, name: p.name, role: p.role });
          }
        }).catch(() => {
          localStorage.removeItem(LS_KEY);
        });
      }
    }
  }, [pid, setParticipant]);

  const { data: participant } = useQuery({
    queryKey: ["participant-detail", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  const { data: insightData } = useQuery({
    queryKey: ["participant-insights", pid],
    queryFn: () => fetch(`/api/participants/${pid}/insights`).then((r) => r.json()),
    enabled: !!pid,
  });

  const stability = participant?.ratingStabilityScore ?? null;
  const exploration = participant?.explorationIndex ?? null;
  const smoke = participant?.smokeAffinityIndex ?? null;
  const hasStats = stability != null || exploration != null || smoke != null;
  const insight = insightData?.insight ?? null;

  const handleUnlock = (p: { id: string; name: string; role?: string }) => {
    setParticipant(p);
  };

  return (
    <SimpleShell>
      <div
        style={{
          width: "100%",
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

        {!pid && <UnlockCard onUnlock={handleUnlock} />}

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
              Unlock to see your taste profile.
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
              Unlock to see your insights.
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
    </SimpleShell>
  );
}
