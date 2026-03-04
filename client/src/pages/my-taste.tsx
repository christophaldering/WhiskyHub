import { useState } from "react";
import { Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { participantApi, journalApi, statsApi, flavorProfileApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import SimpleShell from "@/components/simple/simple-shell";
import { CircleDot, GitCompareArrows, BarChart3, BookOpen, ChevronRight, Lock } from "lucide-react";
import { c, cardStyle, inputStyle } from "@/lib/theme";

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
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pin.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await participantApi.loginByEmail(email.trim(), pin.trim());
      if (result?.id) {
        localStorage.setItem(LS_KEY, result.id);
        onUnlock({ id: result.id, name: result.name, role: result.role });
      } else {
        setError("Unexpected response. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid p") || msg.includes("Invalid P") || msg.includes("Wrong")) {
        setError("Wrong password. Please try again.");
      } else if (msg.includes("not found") || msg.includes("No account")) {
        setError("No account found with this email.");
      } else {
        setError(msg || "Could not sign in. Check email and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle} data-testid="card-unlock">
      <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.muted, margin: "0 0 6px" }}>
        Sign in
      </h2>
      <p style={{ fontSize: 12, color: c.mutedLight, margin: "0 0 14px" }}>
        Sign in with your registered email to access your personal taste profile.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }} autoComplete="off">
        <input type="text" name="cs_trap_user" autoComplete="username" tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
        <input type="password" name="cs_trap_pw" autoComplete="current-password" tabIndex={-1} style={{ position: "absolute", opacity: 0, height: 0, width: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true" />
        <input type="email" placeholder="Email" name="cs_email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} data-testid="input-unlock-email" autoComplete="off" autoCapitalize="none" spellCheck={false} data-form-type="other" />
        <input type="password" placeholder="Password" name="cs_password" value={pin} onChange={(e) => setPin(e.target.value)} style={{ ...inputStyle, letterSpacing: 3 }} data-testid="input-unlock-pin" autoComplete="new-password" autoCapitalize="none" spellCheck={false} data-form-type="other" />
        <button
          type="submit"
          disabled={loading || !email.trim() || !pin.trim()}
          data-testid="button-unlock"
          style={{
            width: "100%", padding: "10px", fontSize: 15, fontWeight: 600,
            background: loading ? c.border : c.accent, color: c.bg, border: "none", borderRadius: 8,
            cursor: loading ? "wait" : "pointer", opacity: (!email.trim() || !pin.trim()) ? 0.5 : 1, transition: "opacity 0.2s",
          }}
        >
          {loading ? "…" : "Sign In"}
        </button>
        {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }} data-testid="text-unlock-error">{error}</p>}
      </form>
    </div>
  );
}

const FLAVOR_COLORS = ["#c8a864", "#7ea87e", "#d97c5a", "#6b9bd2", "#b07ab0", "#cc9966", "#8ab4a0", "#d4a256"];

function FlavorPreviewCard({ pid }: { pid: string | undefined }) {
  const { data: profile } = useQuery({
    queryKey: ["flavor-profile-preview", pid],
    queryFn: () => flavorProfileApi.get(pid!),
    enabled: !!pid,
    staleTime: 120000,
  });

  const topFlavors = profile?.topCategories?.slice(0, 4) ?? [];

  return (
    <Link href="/my-taste/flavors">
      <div style={{ ...cardStyle, padding: "16px 20px", cursor: "pointer" }} data-testid="card-flavor-wheel">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CircleDot style={{ width: 18, height: 18, color: c.accent }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>Flavor Wheel</div>
            <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>Your personal aroma profile</div>
          </div>
          <ChevronRight style={{ width: 14, height: 14, color: c.muted, flexShrink: 0 }} />
        </div>
        {pid && topFlavors.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {topFlavors.map((f: any, i: number) => (
              <span
                key={f.category || i}
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: `${FLAVOR_COLORS[i % FLAVOR_COLORS.length]}20`,
                  color: FLAVOR_COLORS[i % FLAVOR_COLORS.length],
                  fontWeight: 500,
                }}
              >
                {f.category}
              </span>
            ))}
          </div>
        )}
        {pid && topFlavors.length === 0 && (
          <div style={{ fontSize: 11, color: c.muted, marginTop: 10 }}>Rate more whiskies to build your flavor profile</div>
        )}
      </div>
    </Link>
  );
}

const ANALYTICS_THRESHOLD = 10;

function AnalyticsPreviewCard({ pid, stats }: { pid: string | undefined; stats: any }) {
  const totalRatings = stats?.totalRatings ?? stats?.ratingCount ?? 0;
  const totalJournal = stats?.totalJournalEntries ?? 0;
  const whiskyCount = totalRatings + totalJournal;
  const isLocked = whiskyCount < ANALYTICS_THRESHOLD;
  const avgOverall = stats?.avgOverall ?? stats?.averageOverall ?? null;

  return (
    <Link href="/my-taste/analytics">
      <div style={{ ...cardStyle, padding: "16px 20px", cursor: "pointer", opacity: isLocked ? 0.85 : 1 }} data-testid="card-analytics">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isLocked ? <Lock style={{ width: 16, height: 16, color: c.mutedLight }} /> : <BarChart3 style={{ width: 18, height: 18, color: c.accent }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: isLocked ? c.mutedLight : c.text }}>My Analytics</div>
            <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
              {isLocked ? `${whiskyCount} / ${ANALYTICS_THRESHOLD} whiskies to unlock` : "Your rating statistics & trends"}
            </div>
          </div>
          {isLocked && (
            <div style={{ height: 4, width: 40, background: c.bg, borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ height: "100%", width: `${(whiskyCount / ANALYTICS_THRESHOLD) * 100}%`, background: c.accent, borderRadius: 2 }} />
            </div>
          )}
          {!isLocked && <ChevronRight style={{ width: 14, height: 14, color: c.muted, flexShrink: 0 }} />}
        </div>
        {pid && !isLocked && (totalRatings > 0 || avgOverall != null) && (
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            {totalRatings > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif" }}>{totalRatings}</div>
                <div style={{ fontSize: 10, color: c.muted }}>Ratings</div>
              </div>
            )}
            {avgOverall != null && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif" }}>{Number(avgOverall).toFixed(1)}</div>
                <div style={{ fontSize: 10, color: c.muted }}>Avg Score</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
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

  const { data: participant } = useQuery({
    queryKey: ["participant-detail", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  const { data: insightData } = useQuery({
    queryKey: ["participant-insights", pid],
    queryFn: () => fetch(`/api/participants/${pid}/insights`, { headers: { "x-participant-id": pid! } }).then((r) => r.json()),
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
            <FlavorPreviewCard pid={pid} />
            <NavCard
              icon={GitCompareArrows}
              label="Comparison"
              description="Compare your whiskies side by side"
              href="/my-taste/compare"
              testId="link-comparison"
            />
            <AnalyticsPreviewCard pid={pid} stats={stats} />
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
