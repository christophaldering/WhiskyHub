import { useState } from "react";
import { Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { participantApi, journalApi, statsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import SimpleShell from "@/components/simple/simple-shell";
import { GitCompareArrows, BarChart3, BookOpen, ChevronRight, Lock, Radar, Archive, Heart, FlaskConical, ClipboardList, Sparkles, Wine, CircleDot, Download } from "lucide-react";
import { c, cardStyle, inputStyle, sectionHeadingStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";

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
          padding: "14px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 14,
          transition: "all 0.2s ease",
        }}
        data-testid={testId}
      >
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${c.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon style={{ width: 18, height: 18, color: c.accent }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: c.text, letterSpacing: "-0.01em" }}>{label}</div>
          <div style={{ fontSize: 12, color: c.muted, marginTop: 3, lineHeight: 1.4 }}>{description}</div>
        </div>
        {badge != null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: c.accent, background: `${c.accent}12`, padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>{badge}</span>
        )}
        <ChevronRight style={{ width: 16, height: 16, color: `${c.muted}80`, flexShrink: 0 }} strokeWidth={1.8} />
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
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ ...pageTitleStyle, textAlign: "center" }} data-testid="text-my-taste-title">
            My Taste
          </h1>
          <p style={{ ...pageSubtitleStyle, textAlign: "center" }}>
            Your personal whisky profile
          </p>
        </div>

        {pid && (
          <div style={cardStyle} data-testid="card-taste-snapshot">
            <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.muted, margin: "0 0 12px" }}>
              Taste Snapshot
            </h2>
            {hasStats ? (
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
        )}

        {pid && (
          <div style={cardStyle} data-testid="card-taste-insight">
            <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.muted, margin: "0 0 12px" }}>
              Taste Insight
            </h2>
            {insight ? (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: c.text, margin: 0 }} data-testid="text-insight-message">{insight.message}</p>
            ) : (
              <p style={{ fontSize: 13, color: c.muted, margin: 0 }} data-testid="text-insight-empty">No insight yet — log a few whiskies.</p>
            )}
          </div>
        )}

        {pid && (
          <>
            <div>
              <h3 style={{ ...sectionHeadingStyle, color: c.accent }}>
                Mein Profil
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NavCard
                  icon={Radar}
                  label="Flavor Profile"
                  description="Aroma wheel, taste structure, region & cask preferences"
                  href="/my-taste/profile"
                  testId="link-flavor-profile"
                />
                <NavCard
                  icon={CircleDot}
                  label="Aroma Wheel"
                  description="Interactive visualization of your sensory history"
                  href="/my-taste/wheel"
                  testId="link-aroma-wheel"
                />
              </div>
            </div>

            <div>
              <h3 style={{ ...sectionHeadingStyle, color: c.accent }}>
                Auswertungen
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <AnalyticsPreviewCard pid={pid} stats={stats} />
                <NavCard
                  icon={GitCompareArrows}
                  label="Comparison"
                  description="Compare your personal ratings side by side"
                  href="/my-taste/compare"
                  testId="link-comparison"
                />
                <NavCard
                  icon={Sparkles}
                  label="Empfehlungen"
                  description="Personalized whisky recommendations based on your taste"
                  href="/my-taste/recommendations"
                  testId="link-recommendations"
                />
                <NavCard
                  icon={Wine}
                  label="Food Pairings"
                  description="AI-driven food pairing suggestions"
                  href="/my-taste/pairings"
                  testId="link-pairings"
                />
                <NavCard
                  icon={FlaskConical}
                  label="Benchmark Analyzer"
                  description="Import external notes & compare with your profile"
                  href="/my-taste/benchmark"
                  testId="link-benchmark"
                />
              </div>
            </div>

            <div>
              <h3 style={{ ...sectionHeadingStyle, color: c.accent }}>
                Meine Daten
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NavCard
                  icon={BookOpen}
                  label="Journal"
                  description="Your tasting notes & rated whiskies"
                  href="/my-taste/journal"
                  testId="link-journal"
                  badge={journalCount > 0 ? journalCount : null}
                />
                <NavCard
                  icon={ClipboardList}
                  label="Tasting Recap"
                  description="Review past tasting results & highlights"
                  href="/sessions"
                  testId="link-tasting-recap"
                  badge={tastingCount != null && tastingCount > 0 ? tastingCount : null}
                />
                <NavCard
                  icon={Download}
                  label="Data Export"
                  description="Export your data as CSV or Excel"
                  href="/data-export"
                  testId="link-data-export"
                />
              </div>
            </div>

            <div>
              <h3 style={{ ...sectionHeadingStyle, color: c.accent }}>
                Meine Sammlung
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <NavCard
                  icon={Archive}
                  label="Collection"
                  description="Your Whiskybase collection with sync & tracking"
                  href="/my-taste/collection"
                  testId="link-collection"
                />
                <NavCard
                  icon={Heart}
                  label="Wishlist"
                  description="Whiskies you want to try next"
                  href="/my-taste/wishlist"
                  testId="link-wishlist"
                />
              </div>
            </div>
          </>
        )}

        {!pid && <UnlockCard onUnlock={handleUnlock} />}

        <div style={{ textAlign: "center", marginTop: 8 }}>
          <Link href="/support" style={{ fontSize: 11, color: "#4a4540", textDecoration: "none" }} data-testid="link-support">
            Advanced (Support)
          </Link>
        </div>
      </div>
    </SimpleShell>
  );
}
