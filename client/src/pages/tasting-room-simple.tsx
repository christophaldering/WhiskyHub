import { useParams } from "wouter";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import SimpleShell from "@/components/simple/simple-shell";
import { Lock, Eye, EyeOff, Clock, Users, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { c, cardStyle, inputStyle, sliderCSS } from "@/lib/theme";

interface WhiskyItem {
  id: string;
  name?: string;
  distillery?: string;
  age?: string;
  abv?: number;
  region?: string;
  type?: string;
  sortOrder?: number;
}

interface RatingData {
  nose: number;
  taste: number;
  finish: number;
  balance: number;
  overall: number;
  notes: string;
}

interface TastingState {
  id: string;
  title: string;
  status: string;
  hostId?: string;
  blindMode?: boolean;
  guidedMode?: boolean;
  guidedWhiskyIndex?: number;
  guidedRevealStep?: number;
  activeWhiskyId?: string | null;
  showGroupAvg?: boolean;
  showRanking?: boolean;
  ratingPrompt?: string | null;
  ratingScale?: number;
}

interface GroupStats {
  avgOverall: number | null;
  ratingCount: number;
}

const blindLabel = (index: number) => String.fromCharCode(65 + index);

function RatingSlider({ label, value, onChange, disabled, scale = 100 }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean; scale?: number }) {
  const step = scale >= 100 ? 1 : scale >= 20 ? 0.5 : 0.1;
  const display = Number.isInteger(value) ? value : value.toFixed(1);
  return (
    <div style={{ marginBottom: 12, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: c.muted }}>{label}</span>
        <span style={{ fontSize: 13, color: c.accent, fontWeight: 600, fontFamily: "monospace" }}>{display}</span>
      </div>
      <input
        type="range"
        min={0}
        max={scale}
        step={step}
        value={Math.min(value, scale)}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="warm-slider"
        style={{ width: "100%", accentColor: c.accent, cursor: disabled ? "not-allowed" : "pointer" }}
        data-testid={`slider-${label.toLowerCase()}`}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "open" ? c.success : status === "draft" ? c.muted : c.accent;
  const label = status === "open" ? "Live" : status === "draft" ? "Not Started" : status === "closed" ? "Ended" : status;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color,
        background: `${color}20`,
        padding: "3px 8px",
        borderRadius: 6,
      }}
      data-testid="badge-tasting-status"
    >
      {label}
    </span>
  );
}

function WaitingForHost({ tasting }: { tasting: TastingState }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 0" }} data-testid="waiting-for-host">
      <Clock style={{ width: 40, height: 40, color: c.accent, opacity: 0.5, marginBottom: 12 }} />
      <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 8px", fontFamily: "'Playfair Display', serif" }}>
        Waiting for Host
      </h3>
      <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>
        {tasting.status === "draft"
          ? "The session hasn't started yet. Hang tight!"
          : "The host will select the next whisky shortly."}
      </p>
      <div style={{
        marginTop: 20,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        background: `${c.accent}10`,
        border: `1px solid ${c.accent}25`,
        borderRadius: 20,
        fontSize: 12,
        color: c.accent,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.accent, animation: "pulse 2s infinite" }} />
        Listening for updates…
      </div>
    </div>
  );
}

function AccountUpgradePrompt({ participantId }: { participantId: string }) {
  const DISMISS_KEY = `upgrade_dismissed_${participantId}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (dismissed || done) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || password.length < 4) return;
    setSaving(true);
    setError("");
    try {
      const emailRes = await fetch(`/api/participants/${participantId}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-participant-id": participantId },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!emailRes.ok) {
        const err = await emailRes.json().catch(() => ({}));
        throw new Error(err.message || "Could not save email");
      }
      const pinRes = await fetch(`/api/participants/${participantId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-participant-id": participantId },
        body: JSON.stringify({ newPin: password }),
      });
      if (!pinRes.ok) {
        const err = await pinRes.json().catch(() => ({}));
        throw new Error(err.message || "Could not save password");
      }
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };

  const inputS: React.CSSProperties = {
    width: "100%",
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    color: c.text,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "system-ui, sans-serif",
  };

  return (
    <div style={{ marginTop: 24, padding: 20, background: `${c.accent}10`, border: `1px solid ${c.accent}30`, borderRadius: 12 }} data-testid="upgrade-prompt">
      <p style={{ fontSize: 14, fontWeight: 600, color: c.text, margin: "0 0 4px" }}>
        Keep your tasting notes safe?
      </p>
      <p style={{ fontSize: 12, color: c.muted, margin: "0 0 16px" }}>
        Add your email and a password so you can access your data anytime — even from another device.
      </p>
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputS} autoComplete="email" data-testid="input-upgrade-email" />
        <div style={{ position: "relative" }}>
          <input type={showPw ? "text" : "password"} placeholder="Password (min. 4 characters)" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputS, paddingRight: 36, letterSpacing: showPw ? 0 : 3 }} autoComplete="new-password" data-testid="input-upgrade-password" />
          <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: c.muted, cursor: "pointer", padding: 2 }} tabIndex={-1}>
            {showPw ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
          </button>
        </div>
        <button type="submit" disabled={saving || !email.trim() || password.length < 4} style={{ padding: 10, fontSize: 14, fontWeight: 600, background: c.accent, color: c.bg, border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer", opacity: (!email.trim() || password.length < 4) ? 0.5 : 1 }} data-testid="button-upgrade-save">
          {saving ? "Saving…" : "Save"}
        </button>
        {error && <p style={{ fontSize: 12, color: c.error, margin: 0, textAlign: "center" }}>{error}</p>}
      </form>
      <button onClick={handleDismiss} style={{ marginTop: 8, width: "100%", padding: 8, fontSize: 12, color: c.muted, background: "none", border: "none", cursor: "pointer" }} data-testid="button-upgrade-dismiss">
        Maybe later
      </button>
    </div>
  );
}

function SessionEndedView({ tasting }: { tasting: TastingState }) {
  const { currentParticipant } = useAppStore();
  const [hasEmail, setHasEmail] = useState(true);

  useEffect(() => {
    if (!currentParticipant?.id) return;
    fetch(`/api/participants/${currentParticipant.id}`, { headers: { "x-participant-id": currentParticipant.id } })
      .then((r) => r.ok ? r.json() : null)
      .then((p) => { if (p) setHasEmail(!!p.email); })
      .catch(() => {});
  }, [currentParticipant?.id]);

  return (
    <div style={{ textAlign: "center", padding: "32px 0" }} data-testid="session-ended">
      <div style={{ fontSize: 32, marginBottom: 12 }}>🥃</div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: "0 0 8px", fontFamily: "'Playfair Display', serif" }}>
        Session Ended
      </h3>
      <p style={{ fontSize: 13, color: c.muted, margin: "0 0 24px" }}>
        "{tasting.title}" has been closed by the host. Your ratings are saved.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Link href="/my-taste" style={{ textDecoration: "none" }}>
          <div style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, background: c.accent, color: c.bg, borderRadius: 8, cursor: "pointer" }} data-testid="button-goto-taste">
            My Taste
          </div>
        </Link>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ padding: "10px 20px", fontSize: 14, fontWeight: 500, background: "transparent", color: c.text, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }} data-testid="button-done-home">
            Home
          </div>
        </Link>
      </div>
      {currentParticipant?.id && !hasEmail && (
        <AccountUpgradePrompt participantId={currentParticipant.id} />
      )}
    </div>
  );
}

export default function TastingRoomSimple() {
  const params = useParams<{ id: string }>();
  const tastingId = params.id;
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;
  const [, navigate] = useLocation();

  const [freeIndex, setFreeIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, RatingData>>({});
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);
  const saveTimerRef = { current: null as ReturnType<typeof setTimeout> | null };
  const overallManual = useRef<Set<string>>(new Set());

  const { data: tasting, isLoading: tastingLoading, error: tastingError } = useQuery<TastingState>({
    queryKey: ["tasting-simple", tastingId],
    queryFn: () => tastingApi.get(tastingId!),
    enabled: !!tastingId,
    refetchInterval: 3000,
  });

  const { data: whiskies = [], isLoading: whiskiesLoading } = useQuery<WhiskyItem[]>({
    queryKey: ["tasting-whiskies-simple", tastingId],
    queryFn: () => fetch(`/api/tastings/${tastingId}/whiskies`).then((r) => r.json()),
    enabled: !!tastingId,
    refetchInterval: 10000,
  });

  const sortedWhiskies = useMemo(() =>
    [...whiskies].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [whiskies]
  );

  const { data: allRatings = [] } = useQuery<Array<{ whiskyId: string; overall: number | null }>>({
    queryKey: ["tasting-ratings-simple", tastingId],
    queryFn: () => fetch(`/api/tastings/${tastingId}/ratings`).then((r) => r.ok ? r.json() : []),
    enabled: !!tastingId && tasting?.status === "open",
    refetchInterval: 8000,
  });

  const isGuided = !!tasting?.guidedMode;
  const isOpen = tasting?.status === "open";
  const isDraft = tasting?.status === "draft";
  const isClosed = tasting?.status === "closed" || tasting?.status === "archived" || tasting?.status === "reveal";
  const isBlind = !!tasting?.blindMode;
  const guidedIndex = tasting?.guidedWhiskyIndex ?? -1;
  const revealStep = tasting?.guidedRevealStep ?? 0;
  const canRate = isOpen;
  const showAvg = !!tasting?.showGroupAvg;
  const isHost = !!(pid && tasting?.hostId && pid === tasting.hostId);

  const currentIndex = isGuided ? guidedIndex : freeIndex;
  const currentWhisky = currentIndex >= 0 && currentIndex < sortedWhiskies.length ? sortedWhiskies[currentIndex] : null;
  const whiskyId = currentWhisky?.id;

  const groupStats: GroupStats = useMemo(() => {
    if (!whiskyId || !showAvg) return { avgOverall: null, ratingCount: 0 };
    const whiskyRatings = allRatings.filter((r) => r.whiskyId === whiskyId && r.overall != null);
    if (whiskyRatings.length === 0) return { avgOverall: null, ratingCount: 0 };
    const sum = whiskyRatings.reduce((s, r) => s + (r.overall ?? 0), 0);
    return { avgOverall: Math.round((sum / whiskyRatings.length) * 10) / 10, ratingCount: whiskyRatings.length };
  }, [whiskyId, allRatings, showAvg]);

  useEffect(() => {
    if (!pid || !whiskyId) return;
    fetch(`/api/ratings/${pid}/${whiskyId}`, { headers: { "x-participant-id": pid } })
      .then((r) => (r.ok ? r.json() : null))
      .then((existing) => {
        if (existing && !ratings[whiskyId]) {
          const fallback = Math.round((tasting?.ratingScale || 100) / 2);
          setRatings((prev) => ({
            ...prev,
            [whiskyId]: {
              nose: existing.nose ?? fallback,
              taste: existing.taste ?? fallback,
              finish: existing.finish ?? fallback,
              balance: existing.balance ?? fallback,
              overall: existing.overall ?? fallback,
              notes: existing.notes ?? "",
            },
          }));
        }
      })
      .catch((err) => console.error("[TASTING_ROOM] load rating error", err));
  }, [pid, whiskyId]);

  const scale = tasting?.ratingScale || 100;
  const mid = Math.round(scale / 2);

  const currentRating: RatingData = ratings[whiskyId || ""] || {
    nose: mid, taste: mid, finish: mid, balance: mid, overall: mid, notes: "",
  };

  const updateField = useCallback((field: keyof RatingData, value: number | string) => {
    if (!whiskyId || !canRate) return;

    if (field === "overall") {
      overallManual.current.add(whiskyId);
    }

    setRatings((prev) => {
      const base = { ...(prev[whiskyId] || currentRating), [field]: value };
      if (field !== "overall" && field !== "notes" && !overallManual.current.has(whiskyId)) {
        const avg = Math.round(((base.nose as number) + (base.taste as number) + (base.finish as number) + (base.balance as number)) / 4);
        base.overall = avg;
      }
      return { ...prev, [whiskyId]: base };
    });

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!pid || !tastingId || !whiskyId) return;
      setRatings((latest) => {
        const r = latest[whiskyId] || currentRating;
        setSaving(true);
        fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tastingId, whiskyId, participantId: pid,
            nose: r.nose, taste: r.taste, finish: r.finish, balance: r.balance, overall: r.overall, notes: r.notes,
          }),
        })
          .then(() => console.log("[TASTING_ROOM] rating saved"))
          .catch((err) => console.error("[TASTING_ROOM] rating save error", err))
          .finally(() => setSaving(false));
        return latest;
      });
    }, 800);
  }, [whiskyId, pid, tastingId, currentRating, canRate]);

  const getWhiskyDisplay = (whisky: WhiskyItem, index: number) => {
    if (!isBlind) {
      return { name: whisky.name || `Whisky ${index + 1}`, showDetails: true };
    }
    if (revealStep >= 1) {
      return { name: whisky.name || `Whisky ${index + 1}`, showDetails: revealStep >= 2 };
    }
    return { name: `Whisky ${blindLabel(index)}`, showDetails: false };
  };

  if (tastingLoading || whiskiesLoading) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ color: c.muted }}>Loading…</p>
        </div>
      </SimpleShell>
    );
  }

  if (tastingError || !tasting) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ color: c.error }}>Tasting not found.</p>
          <Link href="/enter" style={{ color: c.accent, fontSize: 13, marginTop: 12, display: "inline-block" }}>Try another code</Link>
        </div>
      </SimpleShell>
    );
  }

  if (finished && isClosed) {
    return (
      <SimpleShell>
        <div style={cardStyle}>
          <SessionEndedView tasting={tasting} />
        </div>
      </SimpleShell>
    );
  }

  if (finished) {
    return (
      <SimpleShell>
        <div style={{ ...cardStyle, textAlign: "center" }} data-testid="card-finished">
          <div style={{ fontSize: 32, marginBottom: 12 }}>🥃</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: c.text, margin: "0 0 8px" }}>Done!</h2>
          <p style={{ fontSize: 13, color: c.muted, margin: "0 0 24px" }}>Your ratings have been saved.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/my-taste" style={{ textDecoration: "none" }}>
              <div style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, background: c.accent, color: c.bg, borderRadius: 8, cursor: "pointer" }} data-testid="button-goto-taste">My Taste</div>
            </Link>
            <Link href="/" style={{ textDecoration: "none" }}>
              <div style={{ padding: "10px 20px", fontSize: 14, fontWeight: 500, background: "transparent", color: c.text, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }} data-testid="button-done-home">Home</div>
            </Link>
          </div>
        </div>
      </SimpleShell>
    );
  }

  if (!sortedWhiskies.length) {
    return (
      <SimpleShell>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, color: c.text, margin: 0 }}>{tasting.title}</h2>
            <StatusBadge status={tasting.status} />
          </div>
          <WaitingForHost tasting={tasting} />
        </div>
      </SimpleShell>
    );
  }

  const showWaiting = isGuided && (guidedIndex < 0 || !currentWhisky);
  const showSessionEnded = isClosed;

  if (showSessionEnded) {
    return (
      <SimpleShell>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, color: c.text, margin: 0 }}>{tasting.title}</h2>
            <StatusBadge status={tasting.status} />
          </div>
          <SessionEndedView tasting={tasting} />
        </div>
      </SimpleShell>
    );
  }

  if (showWaiting || isDraft) {
    return (
      <SimpleShell>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, color: c.text, margin: 0 }}>{tasting.title}</h2>
            <StatusBadge status={tasting.status} />
          </div>
          <WaitingForHost tasting={tasting} />
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </SimpleShell>
    );
  }

  if (!currentWhisky) return null;

  const display = getWhiskyDisplay(currentWhisky, currentIndex);
  const showProgress = isGuided
    ? `Whisky ${currentIndex + 1} of ${sortedWhiskies.length}`
    : `${currentIndex + 1} of ${sortedWhiskies.length}`;

  return (
    <SimpleShell maxWidth={480}>
      <div style={{ ...cardStyle, marginBottom: 16, padding: "16px 24px" }} data-testid="card-tasting-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: c.text, margin: 0 }}>{tasting.title}</h2>
          <StatusBadge status={tasting.status} />
        </div>
        <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>
          {showProgress}
          {saving && " · saving…"}
          {isGuided && <span style={{ marginLeft: 8, fontSize: 10, color: c.accent, fontWeight: 600 }}>GUIDED</span>}
        </p>
      </div>

      {isGuided && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }} data-testid="whisky-progress-pills">
          {sortedWhiskies.map((w, i) => {
            const hasRating = !!ratings[w.id];
            const isCurrent = i === currentIndex;
            return (
              <div
                key={w.id}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: isCurrent ? 700 : 500,
                  background: isCurrent ? c.accent : hasRating ? `${c.success}30` : c.bg,
                  color: isCurrent ? c.bg : hasRating ? c.success : c.muted,
                  border: `1px solid ${isCurrent ? c.accent : hasRating ? c.success + "50" : c.border}`,
                }}
                data-testid={`pill-whisky-${i}`}
              >
                {isBlind && revealStep < 1 ? blindLabel(i) : i + 1}
              </div>
            );
          })}
        </div>
      )}

      <div style={cardStyle} data-testid="card-rating">
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 700,
                color: c.accent,
                margin: "0 0 4px",
                fontFamily: "'Playfair Display', serif",
              }} data-testid="text-whisky-name">
                {display.name}
              </h3>
              {isBlind && revealStep < 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <EyeOff style={{ width: 12, height: 12, color: c.muted }} />
                  <span style={{ fontSize: 11, color: c.muted }}>Blind tasting</span>
                </div>
              )}
              {isBlind && revealStep >= 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <Eye style={{ width: 12, height: 12, color: c.success }} />
                  <span style={{ fontSize: 11, color: c.success }}>Revealed</span>
                </div>
              )}
            </div>
            {!canRate && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: c.muted, fontSize: 11 }} data-testid="badge-locked">
                <Lock style={{ width: 12, height: 12 }} />
                Read-only
              </div>
            )}
          </div>

          {display.showDetails && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {currentWhisky.distillery && (
                <span style={{ fontSize: 12, color: c.muted, background: c.bg, padding: "2px 8px", borderRadius: 6 }} data-testid="text-whisky-distillery">
                  {currentWhisky.distillery}
                </span>
              )}
              {currentWhisky.age && (
                <span style={{ fontSize: 12, color: c.muted, background: c.bg, padding: "2px 8px", borderRadius: 6 }} data-testid="text-whisky-age">
                  {currentWhisky.age}y
                </span>
              )}
              {currentWhisky.abv && (
                <span style={{ fontSize: 12, color: c.muted, background: c.bg, padding: "2px 8px", borderRadius: 6 }} data-testid="text-whisky-abv">
                  {currentWhisky.abv}%
                </span>
              )}
              {currentWhisky.region && (
                <span style={{ fontSize: 12, color: c.muted, background: c.bg, padding: "2px 8px", borderRadius: 6 }} data-testid="text-whisky-region">
                  {currentWhisky.region}
                </span>
              )}
            </div>
          )}
        </div>

        {tasting.ratingPrompt && (
          <div style={{
            background: `${c.accent}10`,
            border: `1px solid ${c.accent}25`,
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 16,
            fontSize: 13,
            color: c.accent,
            fontStyle: "italic",
          }} data-testid="text-rating-prompt">
            {tasting.ratingPrompt}
          </div>
        )}

        <RatingSlider label="Nose" value={currentRating.nose} onChange={(v) => updateField("nose", v)} disabled={!canRate} scale={scale} />
        <RatingSlider label="Taste" value={currentRating.taste} onChange={(v) => updateField("taste", v)} disabled={!canRate} scale={scale} />
        <RatingSlider label="Finish" value={currentRating.finish} onChange={(v) => updateField("finish", v)} disabled={!canRate} scale={scale} />
        <RatingSlider label="Balance" value={currentRating.balance} onChange={(v) => updateField("balance", v)} disabled={!canRate} scale={scale} />

        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 12, marginTop: 8 }}>
          <RatingSlider
            label={`Overall${whiskyId && !overallManual.current.has(whiskyId) ? " (auto)" : ""}`}
            value={currentRating.overall}
            onChange={(v) => updateField("overall", v)}
            disabled={!canRate}
            scale={scale}
          />
        </div>

        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, color: c.muted, display: "block", marginBottom: 4 }}>Notes</label>
          <textarea
            value={currentRating.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={2}
            disabled={!canRate}
            style={{ ...inputStyle, resize: "vertical", opacity: canRate ? 1 : 0.5 }}
            data-testid="input-rating-notes"
            placeholder="Optional notes…"
          />
        </div>

        {showAvg && groupStats.avgOverall != null && (
          <div style={{
            marginTop: 16,
            padding: "10px 14px",
            background: c.bg,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }} data-testid="group-stats">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users style={{ width: 14, height: 14, color: c.accent }} />
              <span style={{ fontSize: 12, color: c.muted }}>Group Average</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif" }}>
                {groupStats.avgOverall}
              </span>
              <span style={{ fontSize: 11, color: c.muted, marginLeft: 4 }}>
                ({groupStats.ratingCount} {groupStats.ratingCount === 1 ? "rating" : "ratings"})
              </span>
            </div>
          </div>
        )}

        {!showAvg && isOpen && (
          <div style={{
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: c.muted,
          }} data-testid="text-results-hidden">
            <EyeOff style={{ width: 12, height: 12 }} />
            Group results hidden by host
          </div>
        )}
      </div>

      {!isGuided && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={() => setFreeIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            data-testid="button-prev"
            style={{ flex: 1, padding: 10, fontSize: 14, fontWeight: 500, background: "transparent", color: currentIndex === 0 ? c.muted : c.text, border: `1px solid ${c.border}`, borderRadius: 8, cursor: currentIndex === 0 ? "default" : "pointer", opacity: currentIndex === 0 ? 0.4 : 1 }}
          >
            ← Prev
          </button>
          {currentIndex < sortedWhiskies.length - 1 ? (
            <button
              onClick={() => setFreeIndex((i) => i + 1)}
              data-testid="button-next"
              style={{ flex: 1, padding: 10, fontSize: 14, fontWeight: 600, background: c.accent, color: c.bg, border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => setFinished(true)}
              data-testid="button-finish"
              style={{ flex: 1, padding: 10, fontSize: 14, fontWeight: 600, background: c.accent, color: c.bg, border: "none", borderRadius: 8, cursor: "pointer" }}
            >
              Finish
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        ${sliderCSS}`}</style>
    </SimpleShell>
  );
}
