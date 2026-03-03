import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { participantApi, journalApi, statsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import SimpleShell from "@/components/simple/simple-shell";
import { CircleDot, GitCompareArrows, BarChart3, BookOpen, ChevronRight } from "lucide-react";

const c = {
  bg: "#1a1714",
  card: "#242018",
  border: "#2e2a24",
  text: "#f5f0e8",
  muted: "#888",
  mutedLight: "#8a7e6d",
  accent: "#d4a256",
  error: "#c44",
};

const cardStyle: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.border}`,
  borderRadius: 12,
  padding: "20px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: c.bg,
  border: `1px solid ${c.border}`,
  borderRadius: 8,
  color: c.text,
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
      <span style={{ fontSize: 13, color: c.text }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: "monospace", color: hasValue ? c.accent : c.muted, fontWeight: hasValue ? 600 : 400 }}>{display}</span>
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
      <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.muted, margin: "0 0 16px" }}>
        Unlock your taste profile
      </h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} data-testid="input-unlock-name" autoComplete="off" />
        <input type="password" placeholder="Password" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, letterSpacing: 3 }} data-testid="input-unlock-pin" autoComplete="off" />
        <button
          type="submit"
          disabled={loading || !name.trim() || !pin.trim()}
          data-testid="button-unlock"
          style={{
            width: "100%", padding: "10px", fontSize: 15, fontWeight: 600,
            background: loading ? c.border : c.accent, color: c.bg, border: "none", borderRadius: 8,
            cursor: loading ? "wait" : "pointer", opacity: (!name.trim() || !pin.trim()) ? 0.5 : 1, transition: "opacity 0.2s",
          }}
        >
          {loading ? "…" : "Unlock"}
        </button>
        {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }} data-testid="text-unlock-error">{error}</p>}
      </form>
    </div>
  );
}

interface NavCardProps {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  testId: string;
  badge?: string | number | null;
}

function NavCard({ icon: Icon, label, description, href, testId, badge }: NavCardProps) {
  return (
    <Link href={href}>
      <div
        style={{
          ...cardStyle,
          padding: "16px 20px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 14,
          transition: "border-color 0.2s",
        }}
        data-testid={testId}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon style={{ width: 18, height: 18, color: c.accent }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{label}</div>
          <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{description}</div>
        </div>
        {badge != null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: c.accent, background: `${c.accent}15`, padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>{badge}</span>
        )}
        <ChevronRight style={{ width: 14, height: 14, color: c.muted, flexShrink: 0 }} />
      </div>
    </Link>
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
          if (p?.id) setParticipant({ id: p.id, name: p.name, role: p.role });
        }).catch(() => localStorage.removeItem(LS_KEY));
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

  const { data: journalEntries } = useQuery({
    queryKey: ["journal-entries", pid],
    queryFn: () => journalApi.getAll(pid!),
    enabled: !!pid,
  });

  const { data: stats } = useQuery({
    queryKey: ["participant-stats", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
  });

  const stability = participant?.ratingStabilityScore ?? null;
  const exploration = participant?.explorationIndex ?? null;
  const smoke = participant?.smokeAffinityIndex ?? null;
  const hasStats = stability != null || exploration != null || smoke != null;
  const insight = insightData?.insight ?? null;
  const journalCount = Array.isArray(journalEntries) ? journalEntries.length : 0;
  const tastingCount = stats?.totalTastings ?? stats?.tastingCount ?? null;

  const handleUnlock = (p: { id: string; name: string; role?: string }) => {
    setParticipant(p);
  };

  return (
    <SimpleShell>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: c.accent, margin: 0, textAlign: "center" }} data-testid="text-my-taste-title">
            My Taste
          </h1>
          <p style={{ fontSize: 13, color: c.muted, marginTop: 4, textAlign: "center" }}>
            Your personal whisky profile
          </p>
        </div>

        {!pid && <UnlockCard onUnlock={handleUnlock} />}

        <div style={cardStyle} data-testid="card-taste-snapshot">
          <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.muted, margin: "0 0 12px" }}>
            Taste Snapshot
          </h2>
          {!pid ? (
            <p style={{ fontSize: 13, color: c.muted, margin: 0 }} data-testid="text-snapshot-login">Unlock to see your taste profile.</p>
          ) : hasStats ? (
            <div>
              <StatRow label="Stability" value={stability} />
              <StatRow label="Exploration" value={exploration} />
              <StatRow label="Smoke Affinity" value={smoke} />
              {tastingCount != null && <StatRow label="Tastings" value={tastingCount} />}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: c.muted, margin: 0 }} data-testid="text-snapshot-empty">Building your profile… (needs more tastings)</p>
          )}
        </div>

        <div style={cardStyle} data-testid="card-taste-insight">
          <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.muted, margin: "0 0 12px" }}>
            Taste Insight
          </h2>
          {!pid ? (
            <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>Unlock to see your insights.</p>
          ) : insight ? (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: c.text, margin: 0 }} data-testid="text-insight-message">{insight.message}</p>
          ) : (
            <p style={{ fontSize: 13, color: c.muted, margin: 0 }} data-testid="text-insight-empty">No insight yet — log a few whiskies.</p>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.accent, marginBottom: 10 }}>
            Explore Your Taste
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <NavCard
              icon={CircleDot}
              label="Flavor Wheel"
              description="Your personal aroma profile"
              href="/my-taste/flavors"
              testId="link-flavor-wheel"
            />
            <NavCard
              icon={GitCompareArrows}
              label="Comparison"
              description="Compare your whiskies side by side"
              href="/my-taste/compare"
              testId="link-comparison"
            />
            <NavCard
              icon={BarChart3}
              label="My Analytics"
              description="Your rating statistics & trends"
              href="/legacy/my/journal?tab=analytics"
              testId="link-analytics"
            />
            <NavCard
              icon={BookOpen}
              label="Journal"
              description="Your tasting history"
              href="/legacy/my/journal"
              testId="link-journal"
              badge={journalCount > 0 ? journalCount : null}
            />
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 8 }}>
          <Link href="/support" style={{ fontSize: 11, color: "#4a4540", textDecoration: "none" }} data-testid="link-support">
            Advanced (Support)
          </Link>
        </div>
      </div>
    </SimpleShell>
  );
}
