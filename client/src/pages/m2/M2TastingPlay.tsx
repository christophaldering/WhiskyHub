import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import M2RatingPanel from "@/components/m2/M2RatingPanel";
import type { DimKey } from "@/components/m2/M2RatingPanel";
import { M2Loading, M2Error } from "@/components/m2/M2Feedback";
import VoiceMemoRecorder from "@/components/m2/VoiceMemoRecorder";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { getSession, useSession, setSessionPid, syncStoreParticipant } from "@/lib/session";
import { playSoundscape, stopSoundscape, setVolume as setAmbientVolume, getState as getAmbientState } from "@/lib/ambient";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Users,
  Check,
  Volume2,
  VolumeX,
  Crown,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";

const VOICE_MEMOS_ENABLED = false;

interface WhiskyItem {
  id: string;
  name?: string;
  distillery?: string;
  age?: string;
  abv?: number;
  region?: string;
  type?: string;
  sortOrder?: number;
  imageUrl?: string | null;
  photoRevealed?: boolean;
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

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const color =
    status === "open"
      ? v.success
      : status === "draft"
        ? v.muted
        : v.accent;
  const label =
    status === "open"
      ? t("m2.play.statusLive", "Live")
      : status === "draft"
        ? t("m2.play.statusNotStarted", "Not Started")
        : status === "closed" || status === "archived" || status === "reveal"
          ? t("m2.play.statusEnded", "Ended")
          : status;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color,
        background: alpha(color, "20"),
        padding: "3px 8px",
        borderRadius: 6,
      }}
      data-testid="badge-tasting-status"
    >
      {label}
    </span>
  );
}


function AmbientSoundButton() {
  const { t } = useTranslation();
  const LS_KEY = "cs_ambient_enabled";
  const [playing, setPlaying] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    if (playing) {
      playSoundscape("fireplace");
      setAmbientVolume(0.1);
    }
    return () => { if (playing) stopSoundscape(); };
  }, []);

  const toggle = () => {
    if (playing) {
      stopSoundscape();
      setPlaying(false);
      try { localStorage.setItem(LS_KEY, "0"); } catch {}
    } else {
      playSoundscape("fireplace");
      setAmbientVolume(0.1);
      setPlaying(true);
      try { localStorage.setItem(LS_KEY, "1"); } catch {}
    }
  };

  return (
    <button
      onClick={toggle}
      style={{
        background: playing ? alpha(v.accent, "20") : "transparent",
        border: `1px solid ${playing ? v.accent : v.border}`,
        borderRadius: 8,
        padding: "6px 8px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: playing ? v.accent : v.muted,
        transition: "all 0.2s",
      }}
      title={playing ? t("m2.play.muteAmbient", "Mute ambient") : t("m2.play.playAmbient", "Play ambient sounds")}
      data-testid="button-ambient-toggle"
    >
      {playing ? <Volume2 style={{ width: 16, height: 16 }} /> : <VolumeX style={{ width: 16, height: 16 }} />}
    </button>
  );
}

function WaitingForHost({ tasting }: { tasting: TastingState }) {
  const { t } = useTranslation();
  return (
    <div
      style={{ textAlign: "center", padding: "32px 0" }}
      data-testid="waiting-for-host"
    >
      <Clock
        style={{
          width: 40,
          height: 40,
          color: v.accent,
          opacity: 0.5,
          marginBottom: 12,
        }}
      />
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: v.text,
          margin: "0 0 8px",
          fontFamily: "'Playfair Display', serif",
        }}
      >
        {t("m2.play.waitingForHost", "Waiting for Host")}
      </h3>
      <p style={{ fontSize: 13, color: v.muted, margin: 0 }}>
        {tasting.status === "draft"
          ? t(
              "m2.play.waitingDraft",
              "The host hasn't started the tasting yet.",
            )
          : t(
              "m2.play.waitingNext",
              "The host will advance to the next whisky shortly.",
            )}
      </p>
      <div
        style={{
          marginTop: 20,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          background: alpha(v.accent, "10"),
          border: `1px solid ${alpha(v.accent, "25")}`,
          borderRadius: 20,
          fontSize: 12,
          color: v.accent,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: v.accent,
            animation: "m2pulse 2s infinite",
          }}
        />
        {t("m2.play.listening", "Listening for updates...")}
      </div>
    </div>
  );
}

function AccountUpgradePrompt({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const DISMISS_KEY = `upgrade_dismissed_${pid}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
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
      const emailRes = await fetch(`/api/participants/${pid}/email`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-participant-id": pid,
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!emailRes.ok) {
        const err = await emailRes.json().catch(() => ({}));
        throw new Error(
          err.message ||
            t("m2.play.couldNotSaveEmail", "Could not save email"),
        );
      }
      const pinRes = await fetch(`/api/participants/${pid}/pin`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-participant-id": pid,
        },
        body: JSON.stringify({ newPin: password }),
      });
      if (!pinRes.ok) {
        const err = await pinRes.json().catch(() => ({}));
        throw new Error(
          err.message ||
            t("m2.play.couldNotSavePassword", "Could not save password"),
        );
      }
      setDone(true);
    } catch (err: any) {
      setError(err.message || t("m2.play.somethingWrong", "Something went wrong"));
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  const inputS: React.CSSProperties = {
    width: "100%",
    background: v.inputBg,
    border: `1px solid ${v.inputBorder}`,
    borderRadius: 8,
    color: v.inputText,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "system-ui, sans-serif",
  };

  return (
    <div
      style={{
        marginTop: 24,
        padding: 20,
        background: alpha(v.accent, "10"),
        border: `1px solid ${alpha(v.accent, "30")}`,
        borderRadius: 12,
      }}
      data-testid="upgrade-prompt"
    >
      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: v.text,
          margin: "0 0 4px",
        }}
      >
        {t("m2.play.keepSafe", "Keep your ratings safe")}
      </p>
      <p
        style={{
          fontSize: 12,
          color: v.muted,
          margin: "0 0 16px",
        }}
      >
        {t(
          "m2.play.upgradeDesc",
          "Add an email and password to access your data anytime.",
        )}
      </p>
      <form
        onSubmit={handleSave}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <input
          type="email"
          placeholder={t("m2.play.emailPlaceholder", "Email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputS}
          autoComplete="email"
          data-testid="input-upgrade-email"
        />
        <div style={{ position: "relative" }}>
          <input
            type={showPw ? "text" : "password"}
            placeholder={t("m2.play.passwordPlaceholder", "Password / PIN")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              ...inputS,
              paddingRight: 36,
              letterSpacing: showPw ? 0 : 3,
            }}
            autoComplete="new-password"
            data-testid="input-upgrade-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: v.muted,
              cursor: "pointer",
              padding: 2,
            }}
            tabIndex={-1}
          >
            {showPw ? (
              <EyeOff style={{ width: 16, height: 16 }} />
            ) : (
              <Eye style={{ width: 16, height: 16 }} />
            )}
          </button>
        </div>
        <button
          type="submit"
          disabled={saving || !email.trim() || password.length < 4}
          style={{
            padding: 10,
            fontSize: 14,
            fontWeight: 600,
            background: v.accent,
            color: v.bg,
            border: "none",
            borderRadius: 8,
            cursor: saving ? "wait" : "pointer",
            opacity: !email.trim() || password.length < 4 ? 0.5 : 1,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="button-upgrade-save"
        >
          {saving
            ? t("m2.play.saving", "Saving...")
            : t("m2.play.save", "Save")}
        </button>
        {error && (
          <p
            style={{
              fontSize: 12,
              color: v.error,
              margin: 0,
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}
      </form>
      <button
        onClick={handleDismiss}
        style={{
          marginTop: 8,
          width: "100%",
          padding: 8,
          fontSize: 12,
          color: v.muted,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "system-ui, sans-serif",
        }}
        data-testid="button-upgrade-dismiss"
      >
        {t("m2.play.maybeLater", "Maybe later")}
      </button>
    </div>
  );
}

function SessionEndedView({
  tasting,
  pid,
}: {
  tasting: TastingState;
  pid?: string;
}) {
  const { t } = useTranslation();
  const [hasEmail, setHasEmail] = useState(true);

  useEffect(() => {
    if (!pid) return;
    fetch(`/api/participants/${pid}`, {
      headers: { "x-participant-id": pid },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (p) setHasEmail(!!p.email);
      })
      .catch(() => {});
  }, [pid]);

  return (
    <div
      style={{ textAlign: "center", padding: "32px 0" }}
      data-testid="session-ended"
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>🥃</div>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: v.text,
          margin: "0 0 8px",
          fontFamily: "'Playfair Display', serif",
        }}
      >
        {t("m2.play.sessionEnded", "Session Ended")}
      </h3>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 24px" }}>
        {t("m2.play.sessionEndedDesc", {
          defaultValue: "Thanks for participating in {{title}}!",
          title: tasting.title,
        })}
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Link
          href="/m2/taste"
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              background: v.accent,
              color: v.bg,
              borderRadius: 8,
              cursor: "pointer",
            }}
            data-testid="button-goto-taste"
          >
            {t("m2.play.myTaste", "Taste")}
          </div>
        </Link>
        <Link
          href="/m2/tastings"
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 500,
              background: "transparent",
              color: v.text,
              border: `1px solid ${v.border}`,
              borderRadius: 8,
              cursor: "pointer",
            }}
            data-testid="button-done-home"
          >
            {t("m2.play.tastings", "Tasting")}
          </div>
        </Link>
      </div>
      {pid && !hasEmail && <AccountUpgradePrompt pid={pid} />}
    </div>
  );
}

function GroupAverageDisplay({
  whiskyId,
  allRatings,
  scale,
}: {
  whiskyId: string;
  allRatings: any[];
  scale: number;
}) {
  const { t } = useTranslation();
  const stats = useMemo(() => {
    const whiskyRatings = allRatings.filter(
      (r: any) => r.whiskyId === whiskyId && r.overall != null,
    );
    if (whiskyRatings.length === 0) return null;
    const sum = whiskyRatings.reduce(
      (s: number, r: any) => s + (r.overall ?? 0),
      0,
    );
    return {
      avg: Math.round((sum / whiskyRatings.length) * 10) / 10,
      count: whiskyRatings.length,
    };
  }, [whiskyId, allRatings]);

  if (!stats) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        background: alpha(v.accent, "08"),
        border: `1px solid ${alpha(v.accent, "15")}`,
        borderRadius: 10,
        marginBottom: 12,
      }}
      data-testid="group-average"
    >
      <Users style={{ width: 16, height: 16, color: v.accent, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: v.textSecondary }}>
        {t("m2.play.groupAvg", "Group Average")}:
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: v.accent,
          fontFamily: "monospace",
        }}
      >
        {stats.avg}/{scale}
      </span>
      <span style={{ fontSize: 11, color: v.muted }}>
        ({stats.count} {t("m2.play.ratings", "ratings")})
      </span>
    </div>
  );
}

const blindLabel = (index: number) => String.fromCharCode(65 + index);

function DemoGuestEntry({ tastingId }: { tastingId: string }) {
  const { t } = useTranslation();
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoConsent, setDemoConsent] = useState(false);

  const handleJoin = async () => {
    if (!alias.trim() || !demoConsent) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/participants/demo-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: alias.trim(), privacyConsent: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to join");
      }
      const guest = await res.json();
      sessionStorage.setItem("session_signed_in", "1");
      sessionStorage.setItem("session_mode", "log");
      sessionStorage.setItem("session_name", guest.name);
      sessionStorage.setItem("session_pid", guest.id);
      sessionStorage.setItem("session_role", guest.role || "user");
      try { localStorage.setItem("casksense_participant_id", guest.id); } catch {}
      syncStoreParticipant(guest.id, guest.name, guest.role);
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "Error joining demo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "16px" }} data-testid="m2-play-page">
      <M2BackButton />
      <div
        style={{
          background: `linear-gradient(135deg, ${alpha("#d4a256", "10")} 0%, ${v.card} 60%)`,
          border: `1px solid ${alpha("#d4a256", "25")}`,
          borderRadius: 16,
          padding: "32px 20px",
          textAlign: "center",
          marginTop: 24,
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: alpha("#d4a256", "15"),
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <Sparkles style={{ width: 28, height: 28, color: "#d4a256" }} strokeWidth={1.5} />
        </div>
        <h2 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22, fontWeight: 600, color: v.text,
          margin: "0 0 8px",
        }}>
          {t("m2.demo.welcomeTitle", "Welcome to the Demo Tasting")}
        </h2>
        <p style={{
          fontSize: 14, color: v.textSecondary,
          fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
          margin: "0 0 16px", lineHeight: 1.5,
        }}>
          {t("m2.demo.welcomeDesc", "Choose an alias and start tasting. No account needed.")}
        </p>
        <input
          type="text"
          value={alias}
          onChange={(e) => setAlias(e.target.value.slice(0, 20))}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder={t("m2.demo.aliasPlaceholder", "Alias or initials")}
          autoFocus
          maxLength={20}
          style={{
            width: "100%", padding: "14px 16px",
            borderRadius: 12, border: `1px solid ${v.border}`,
            background: v.bg, color: v.text,
            fontSize: 16, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
            outline: "none", boxSizing: "border-box",
          }}
          data-testid="input-demo-name"
        />
        <label style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          marginTop: 12, textAlign: "left", cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={demoConsent}
            onChange={(e) => setDemoConsent(e.target.checked)}
            style={{ marginTop: 3, accentColor: "#d4a256" }}
            data-testid="checkbox-demo-privacy"
          />
          <span style={{ fontSize: 11, color: v.muted, lineHeight: 1.4, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
            {t("login.privacyConsentLabel")}{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#d4a256", textDecoration: "underline" }}>{t("login.privacyConsentLink")}</a>
          </span>
        </label>
        {error && (
          <p style={{ color: "#e74c3c", fontSize: 13, margin: "8px 0 0" }}>{error}</p>
        )}
        <button
          type="button"
          onClick={handleJoin}
          disabled={!alias.trim() || !demoConsent || loading}
          style={{
            width: "100%", padding: "14px",
            marginTop: 12, borderRadius: 12, border: "none",
            background: (alias.trim() && demoConsent) ? "#d4a256" : alpha("#d4a256", "30"),
            color: (alias.trim() && demoConsent) ? v.bg : v.muted,
            fontSize: 16, fontWeight: 600,
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
            cursor: alias.trim() ? "pointer" : "default",
            transition: "all 0.2s",
          }}
          data-testid="button-demo-join"
        >
          {loading
            ? t("common.loading", "Loading...")
            : t("m2.demo.joinButton", "Start Tasting")}
        </button>
        <p style={{
          fontSize: 11, color: v.muted, margin: "16px 0 0",
          fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
          lineHeight: 1.4,
        }}>
          {t("m2.demo.upgradeHint", "Want more features? You can create a full account anytime later.")}
        </p>
      </div>
    </div>
  );
}

export default function M2TastingPlay() {
  const { t } = useTranslation();
  const [, params] = useRoute("/m2/tastings/session/:id/play");
  const id = params?.id || "";
  const session = useSession();
  const pid = session.pid;

  const [freeIndex, setFreeIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, RatingData>>({});
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overallManual = useRef<Set<string>>(new Set());
  const emptyChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [], balance: [] };
  const emptyTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "", balance: "" };
  const [playChips, setPlayChips] = useState<Record<string, Record<DimKey, string[]>>>({});
  const [playTexts, setPlayTexts] = useState<Record<string, Record<DimKey, string>>>({});

  const buildScoresBlock = useCallback((wId: string) => {
    const ch = playChips[wId] || emptyChips;
    const tx = playTexts[wId] || emptyTexts;
    const hasDimData = (["nose", "taste", "finish", "balance"] as DimKey[]).some(
      (d) => ch[d].length > 0 || tx[d].trim()
    );
    if (!hasDimData) return "";
    const parts: string[] = [];
    for (const d of ["nose", "taste", "finish", "balance"] as DimKey[]) {
      const chipStr = ch[d].length > 0 ? ch[d].join(", ") : "";
      const textStr = tx[d].trim();
      if (chipStr || textStr) {
        parts.push(`[${d.toUpperCase()}] ${[chipStr, textStr].filter(Boolean).join(" — ")} [/${d.toUpperCase()}]`);
      }
    }
    return parts.length > 0 ? "\n" + parts.join("\n") : "";
  }, [playChips, playTexts]);

  const parseScoresBlock = useCallback((rawNotes: string) => {
    const chips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [], balance: [] };
    const texts: Record<DimKey, string> = { nose: "", taste: "", finish: "", balance: "" };
    let cleanNotes = rawNotes;
    for (const d of ["nose", "taste", "finish", "balance"] as DimKey[]) {
      const re = new RegExp(`\\[${d.toUpperCase()}\\]\\s*(.*?)\\s*\\[\\/${d.toUpperCase()}\\]`, "s");
      const m = rawNotes.match(re);
      if (m) {
        cleanNotes = cleanNotes.replace(m[0], "");
        const content = m[1].trim();
        const parts = content.split(" — ");
        if (parts.length >= 2) {
          chips[d] = parts[0].split(",").map(s => s.trim()).filter(Boolean);
          texts[d] = parts.slice(1).join(" — ");
        } else if (parts.length === 1) {
          const maybeChips = parts[0].split(",").map(s => s.trim()).filter(Boolean);
          if (maybeChips.every(c => c.length < 20)) {
            chips[d] = maybeChips;
          } else {
            texts[d] = parts[0];
          }
        }
      }
    }
    const scoresRe = /\[SCORES\].*?\[\/SCORES\]/s;
    cleanNotes = cleanNotes.replace(scoresRe, "");
    return { chips, texts, cleanNotes: cleanNotes.trim() };
  }, []);

  const {
    data: tasting,
    isLoading: tastingLoading,
    isError: tastingError,
    refetch: refetchTasting,
  } = useQuery<TastingState>({
    queryKey: ["tasting", id],
    queryFn: () => tastingApi.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const t = query.state.data as TastingState | undefined;
      return t?.guidedMode ? 800 : 3000;
    },
  });

  const { data: whiskies = [], isLoading: whiskiesLoading, isError: whiskiesError, refetch: refetchWhiskies } = useQuery<
    WhiskyItem[]
  >({
    queryKey: ["whiskies", id],
    queryFn: () => whiskyApi.getForTasting(id),
    enabled: !!id,
    refetchInterval: tasting?.guidedMode ? 3000 : 10000,
  });

  const sortedWhiskies = useMemo(
    () => [...whiskies].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [whiskies],
  );

  const { data: allRatings = [] } = useQuery<any[]>({
    queryKey: ["tasting-ratings", id],
    queryFn: () =>
      fetch(`/api/tastings/${id}/ratings`).then((r) =>
        r.ok ? r.json() : [],
      ),
    enabled: !!id && tasting?.status === "open",
    refetchInterval: 8000,
  });

  const isGuided = !!tasting?.guidedMode;
  const isOpen = tasting?.status === "open";
  const isDraft = tasting?.status === "draft";
  const isClosed =
    tasting?.status === "closed" ||
    tasting?.status === "archived" ||
    tasting?.status === "reveal";
  const isBlind = !!tasting?.blindMode;
  const guidedIndex = tasting?.guidedWhiskyIndex ?? -1;
  const revealStep = tasting?.guidedRevealStep ?? 0;
  const canRate = isOpen;
  const showAvg = !!tasting?.showGroupAvg;
  const scale = tasting?.ratingScale || 100;
  const mid = Math.round(scale / 2);

  const currentIndex = isGuided ? guidedIndex : freeIndex;
  const currentWhisky =
    currentIndex >= 0 && currentIndex < sortedWhiskies.length
      ? sortedWhiskies[currentIndex]
      : null;
  const whiskyId = currentWhisky?.id;

  useEffect(() => {
    if (!pid || !whiskyId) return;
    if (ratings[whiskyId]) return;
    fetch(`/api/ratings/${pid}/${whiskyId}`, {
      headers: { "x-participant-id": pid },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((existing) => {
        if (existing && !ratings[whiskyId]) {
          const rawNotes = existing.notes ?? "";
          const parsed = parseScoresBlock(rawNotes);
          setRatings((prev) => ({
            ...prev,
            [whiskyId]: {
              nose: existing.nose ?? mid,
              taste: existing.taste ?? mid,
              finish: existing.finish ?? mid,
              balance: existing.balance ?? mid,
              overall: existing.overall ?? mid,
              notes: parsed.cleanNotes,
            },
          }));
          if (parsed.chips) {
            setPlayChips((prev) => ({ ...prev, [whiskyId]: parsed.chips }));
          }
          if (parsed.texts) {
            setPlayTexts((prev) => ({ ...prev, [whiskyId]: parsed.texts }));
          }
        }
      })
      .catch(() => {});
  }, [pid, whiskyId, mid, parseScoresBlock]);

  const currentRating: RatingData = ratings[whiskyId || ""] || {
    nose: mid,
    taste: mid,
    finish: mid,
    balance: mid,
    overall: mid,
    notes: "",
  };

  const updateField = useCallback(
    (field: keyof RatingData, value: number | string) => {
      if (!whiskyId || !canRate) return;

      if (field === "overall") {
        overallManual.current.add(whiskyId);
      }

      setRatings((prev) => {
        const base = {
          ...(prev[whiskyId] || currentRating),
          [field]: value,
        };
        if (
          field !== "overall" &&
          field !== "notes" &&
          !overallManual.current.has(whiskyId)
        ) {
          const avg = Math.round(
            ((base.nose as number) +
              (base.taste as number) +
              (base.finish as number) +
              (base.balance as number)) /
              4,
          );
          base.overall = avg;
        }
        return { ...prev, [whiskyId]: base };
      });

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (!pid || !id || !whiskyId) return;
        setRatings((latest) => {
          const r = latest[whiskyId] || currentRating;
          const scoresBlock = buildScoresBlock(whiskyId);
          const combinedNotes = (r.notes + scoresBlock).trim();
          setSaving(true);
          fetch("/api/ratings", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-participant-id": pid },
            body: JSON.stringify({
              tastingId: id,
              whiskyId,
              participantId: pid,
              nose: r.nose,
              taste: r.taste,
              finish: r.finish,
              balance: r.balance,
              overall: r.overall,
              notes: combinedNotes,
            }),
          })
            .then(() => {
              queryClient.invalidateQueries({
                queryKey: ["tasting-ratings", id],
              });
              queryClient.invalidateQueries({
                queryKey: ["my-ratings", id],
              });
            })
            .catch(() => {})
            .finally(() => setSaving(false));
          return latest;
        });
      }, 800);
    },
    [whiskyId, pid, id, currentRating, canRate, buildScoresBlock],
  );

  const handlePlayChipToggle = useCallback((dim: DimKey, chip: string) => {
    if (!whiskyId || !canRate) return;
    setPlayChips((prev) => {
      const current = prev[whiskyId] || { nose: [], taste: [], finish: [], balance: [] };
      const dimChips = current[dim];
      const next = dimChips.includes(chip) ? dimChips.filter(c => c !== chip) : [...dimChips, chip];
      return { ...prev, [whiskyId]: { ...current, [dim]: next } };
    });
  }, [whiskyId, canRate]);

  const handlePlayTextChange = useCallback((dim: DimKey, text: string) => {
    if (!whiskyId || !canRate) return;
    setPlayTexts((prev) => {
      const current = prev[whiskyId] || { nose: "", taste: "", finish: "", balance: "" };
      return { ...prev, [whiskyId]: { ...current, [dim]: text } };
    });
  }, [whiskyId, canRate]);

  const chipTextSaveRef = useRef(0);
  useEffect(() => {
    if (!whiskyId || !pid || !id || !canRate) return;
    chipTextSaveRef.current++;
    const gen = chipTextSaveRef.current;
    const timer = setTimeout(() => {
      if (gen !== chipTextSaveRef.current) return;
      updateField("notes", currentRating.notes);
    }, 800);
    return () => clearTimeout(timer);
  }, [playChips, playTexts]);

  const currentPlayChips = playChips[whiskyId || ""] || emptyChips;
  const currentPlayTexts = playTexts[whiskyId || ""] || emptyTexts;

  const playCalcOverall = Math.round(
    (currentRating.nose + currentRating.taste + currentRating.finish + currentRating.balance) / 4
  );

  const revealOrderParsed: string[][] | null = (() => { try { return tasting?.revealOrder ? JSON.parse(tasting.revealOrder) : null; } catch { return null; } })();

  const getWhiskyDisplay = (whisky: WhiskyItem, index: number) => {
    if (!isBlind) {
      return { name: whisky.name || `Dram ${index + 1}`, showDetails: true, showImage: true };
    }
    if (revealOrderParsed) {
      const revealed = new Set<string>();
      for (let i = 0; i < Math.min(revealStep, revealOrderParsed.length); i++) {
        for (const f of revealOrderParsed[i]) revealed.add(f);
      }
      return {
        name: revealed.has("name") ? (whisky.name || `Dram ${index + 1}`) : `Dram ${blindLabel(index)}`,
        showDetails: revealed.has("distillery") || revealed.has("age") || revealed.has("abv") || revealed.has("region"),
        showImage: revealed.has("image") || !!whisky.photoRevealed,
      };
    }
    if (revealStep >= 1) {
      return {
        name: whisky.name || `Dram ${index + 1}`,
        showDetails: revealStep >= 2,
        showImage: revealStep >= 3 || !!whisky.photoRevealed,
      };
    }
    return { name: `Dram ${blindLabel(index)}`, showDetails: false, showImage: false };
  };

  if (!session.signedIn) {
    const isDemo = tasting?.code === "DEMO";
    if (isDemo) {
      return <DemoGuestEntry tastingId={id} />;
    }
    return (
      <div style={{ padding: "16px" }} data-testid="m2-play-page">
        <M2BackButton />
        <div
          style={{
            background: v.elevated,
            borderRadius: 12,
            padding: "24px 16px",
            textAlign: "center",
            color: v.textSecondary,
            fontSize: 14,
            marginTop: 24,
          }}
        >
          {t(
            "m2.play.signInPrompt",
            "Sign in to participate in this tasting",
          )}
        </div>
      </div>
    );
  }

  if (tastingLoading || whiskiesLoading) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-play-page">
        <M2BackButton />
        <M2Loading />
      </div>
    );
  }

  if (tastingError || whiskiesError) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-play-page">
        <M2BackButton />
        <M2Error onRetry={() => { refetchTasting(); refetchWhiskies(); }} />
      </div>
    );
  }

  if (!tasting) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-play-page">
        <M2BackButton />
        <div
          style={{
            background: v.elevated,
            borderRadius: 12,
            padding: "24px 16px",
            textAlign: "center",
            color: v.error,
            fontSize: 14,
            marginTop: 24,
          }}
        >
          {t("m2.play.notFound", "Tasting not found")}
        </div>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-play-page">
        <M2BackButton />
        <div
          style={{
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 14,
            padding: "20px 16px",
            marginTop: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: v.text,
                margin: 0,
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {tasting.title}
            </h2>
            <StatusBadge status={tasting.status} />
          </div>
          <SessionEndedView tasting={tasting} pid={pid} />
        </div>
      </div>
    );
  }

  if (!sortedWhiskies.length || isDraft) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-play-page">
        <M2BackButton />
        <div
          style={{
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 14,
            padding: "20px 16px",
            marginTop: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: v.text,
                margin: 0,
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {tasting.title}
            </h2>
            <StatusBadge status={tasting.status} />
          </div>
          <WaitingForHost tasting={tasting} />
        </div>
        <style>{`@keyframes m2pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </div>
    );
  }

  const showWaiting = isGuided && (guidedIndex < 0 || !currentWhisky);

  if (showWaiting) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-play-page">
        <M2BackButton />
        <div
          style={{
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 14,
            padding: "20px 16px",
            marginTop: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: v.text,
                margin: 0,
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {tasting.title}
            </h2>
            <StatusBadge status={tasting.status} />
          </div>
          <WaitingForHost tasting={tasting} />
        </div>
        <style>{`@keyframes m2pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </div>
    );
  }

  if (!currentWhisky) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-play-page">
        <M2BackButton />
        <div
          style={{
            background: v.card,
            borderRadius: 12,
            padding: "24px 16px",
            textAlign: "center",
            color: v.muted,
            fontSize: 14,
            marginTop: 24,
          }}
        >
          {t("m2.play.noWhiskies", "No whiskies in this tasting yet")}
        </div>
      </div>
    );
  }

  const display = getWhiskyDisplay(currentWhisky, currentIndex);

  return (
    <div style={{ padding: "16px" }} data-testid="m2-play-page">
      <M2BackButton />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "12px 0",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 22,
            fontWeight: 700,
            color: v.text,
            margin: 0,
          }}
          data-testid="text-m2-play-title"
        >
          {t("m2.play.title", "Tasting Room")}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AmbientSoundButton />
          <StatusBadge status={tasting.status} />
          <span
            style={{
              fontSize: 13,
              color: v.muted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {currentIndex + 1} / {sortedWhiskies.length}
          </span>
        </div>
      </div>

      {isGuided && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 8,
            fontSize: 11,
            color: v.accent,
            fontWeight: 600,
          }}
        >
          <Clock style={{ width: 12, height: 12 }} />
          {t("m2.play.guidedMode", "Guided Mode")}
          {saving && (
            <span style={{ marginLeft: 8, color: v.muted, fontWeight: 400 }}>
              {t("m2.play.autoSaving", "Auto-saving...")}
            </span>
          )}
        </div>
      )}

      {!isGuided && saving && (
        <div
          style={{
            fontSize: 11,
            color: v.muted,
            marginBottom: 8,
          }}
        >
          {t("m2.play.autoSaving", "Auto-saving...")}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 12,
        }}
        data-testid="whisky-progress-pills"
      >
        {sortedWhiskies.map((w, i) => {
          const hasRating = !!ratings[w.id];
          const isCurrent = i === currentIndex;
          return (
            <button
              key={w.id}
              onClick={() => {
                if (!isGuided) setFreeIndex(i);
              }}
              disabled={isGuided}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: isCurrent
                  ? `2px solid ${v.accent}`
                  : `1px solid ${v.border}`,
                background: hasRating
                  ? v.accent
                  : isCurrent
                    ? alpha(v.accent, "40")
                    : v.elevated,
                cursor: isGuided ? "default" : "pointer",
                padding: 0,
                transition: "all 0.15s",
              }}
              title={`Dram ${i + 1}${hasRating ? " ✓" : ""}`}
              data-testid={`pill-whisky-${i}`}
            />
          );
        })}
      </div>

      <div
        style={{
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: 14,
          padding: "20px 16px",
          marginBottom: 16,
        }}
      >
        {display.showImage && currentWhisky.imageUrl && (
          <div
            style={{
              marginBottom: 12,
              borderRadius: 10,
              overflow: "hidden",
              maxHeight: 200,
              display: "flex",
              justifyContent: "center",
              background: v.elevated,
            }}
          >
            <img
              src={currentWhisky.imageUrl}
              alt={display.name}
              style={{
                maxHeight: 200,
                maxWidth: "100%",
                objectFit: "contain",
              }}
              data-testid="img-whisky"
            />
          </div>
        )}

        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: v.text,
            marginBottom: 4,
          }}
          data-testid="text-whisky-name"
        >
          {display.name}
        </div>

        {display.showDetails && (
          <div style={{ marginBottom: 4 }}>
            {currentWhisky.distillery && (
              <div
                style={{ fontSize: 13, color: v.textSecondary }}
                data-testid="text-whisky-distillery"
              >
                {currentWhisky.distillery}
              </div>
            )}
            <div
              style={{
                fontSize: 12,
                color: v.muted,
                marginTop: 2,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {currentWhisky.age && (
                <span data-testid="text-whisky-age">
                  {currentWhisky.age} years
                </span>
              )}
              {currentWhisky.abv && (
                <span data-testid="text-whisky-abv">
                  {currentWhisky.abv}%
                </span>
              )}
              {currentWhisky.region && (
                <span data-testid="text-whisky-region">
                  {currentWhisky.region}
                </span>
              )}
            </div>
          </div>
        )}

        {isBlind && !display.showDetails && (
          <div
            style={{
              fontSize: 12,
              color: v.muted,
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
            }}
          >
            <EyeOff style={{ width: 12, height: 12 }} />
            {t("m2.play.blindTasting", "Blind Tasting")}
          </div>
        )}
      </div>

      {!isGuided && sortedWhiskies.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setFreeIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: "10px", borderRadius: 10, border: `1px solid ${v.border}`,
              background: "transparent", color: currentIndex === 0 ? v.muted : v.text,
              fontWeight: 600, fontSize: 14, cursor: currentIndex === 0 ? "default" : "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="m2-play-prev"
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            {t("m2.play.prev", "Previous")}
          </button>
          <button
            onClick={() => setFreeIndex((i) => Math.min(sortedWhiskies.length - 1, i + 1))}
            disabled={currentIndex >= sortedWhiskies.length - 1}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: "10px", borderRadius: 10, border: `1px solid ${v.border}`,
              background: "transparent",
              color: currentIndex >= sortedWhiskies.length - 1 ? v.muted : v.text,
              fontWeight: 600, fontSize: 14,
              cursor: currentIndex >= sortedWhiskies.length - 1 ? "default" : "pointer",
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid="m2-play-next"
          >
            {t("m2.play.next", "Next")}
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}

      {tasting.ratingPrompt && (
        <div
          style={{
            padding: "12px 14px",
            background: alpha(v.accent, "08"),
            border: `1px solid ${alpha(v.accent, "15")}`,
            borderRadius: 10,
            marginBottom: 12,
            fontSize: 13,
            color: v.textSecondary,
            fontStyle: "italic",
          }}
          data-testid="rating-prompt"
        >
          <span
            style={{
              fontWeight: 600,
              fontStyle: "normal",
              color: v.accent,
              marginRight: 6,
            }}
          >
            {t("m2.play.hostPrompt", "Host")}:
          </span>
          {tasting.ratingPrompt}
        </div>
      )}

      {showAvg && whiskyId && (
        <GroupAverageDisplay
          whiskyId={whiskyId}
          allRatings={allRatings}
          scale={scale}
        />
      )}

      <div
        style={{
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: 14,
          padding: "20px 16px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: v.textSecondary,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>
            <Star
              style={{
                width: 14,
                height: 14,
                marginRight: 6,
                verticalAlign: -2,
              }}
            />
            {t("m2.play.yourRating", "Your Rating")}
          </span>
          <span style={{ fontSize: 11, color: v.muted, fontWeight: 400 }}>
            {t("m2.play.scaleLabel", "Scale")}: 0–{scale}
          </span>
        </div>

        <M2RatingPanel
          scores={{ nose: currentRating.nose, taste: currentRating.taste, finish: currentRating.finish, balance: currentRating.balance }}
          onScoreChange={(dim, val) => updateField(dim, val)}
          chips={currentPlayChips}
          onChipToggle={handlePlayChipToggle}
          texts={currentPlayTexts}
          onTextChange={handlePlayTextChange}
          overall={currentRating.overall}
          onOverallChange={(val) => updateField("overall", val)}
          overallAuto={playCalcOverall}
          overrideActive={overallManual.current.has(whiskyId || "")}
          onResetOverride={() => {
            if (whiskyId) {
              overallManual.current.delete(whiskyId);
              setRatings((prev) => ({
                ...prev,
                [whiskyId]: { ...(prev[whiskyId] || currentRating), overall: playCalcOverall },
              }));
              if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
              saveTimerRef.current = setTimeout(() => { updateField("notes", currentRating.notes); }, 800);
            }
          }}
          scale={scale}
          disabled={!canRate}
          showToggle={false}
          defaultOpen={true}
        />
      </div>

      <div
        style={{
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: 14,
          padding: "16px",
          marginBottom: 16,
        }}
      >
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: v.textSecondary,
            display: "block",
            marginBottom: 8,
          }}
        >
          {t("m2.play.notes", "Tasting Notes")}
        </label>
        <textarea
          value={currentRating.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          disabled={!canRate}
          placeholder={t(
            "m2.play.notesPlaceholder",
            "Aromas, flavors, impressions...",
          )}
          rows={3}
          style={{
            width: "100%",
            background: v.inputBg,
            border: `1px solid ${v.inputBorder}`,
            borderRadius: 8,
            color: v.inputText,
            padding: "10px 12px",
            fontSize: 14,
            resize: "vertical",
            outline: "none",
            fontFamily: "system-ui, sans-serif",
            boxSizing: "border-box",
          }}
          data-testid="textarea-tasting-notes"
        />
      </div>


      {false && VOICE_MEMOS_ENABLED && whiskyId && pid && id && (
        <VoiceMemoRecorder
          tastingId={id}
          whiskyId={whiskyId}
          participantId={pid}
          readOnly={!isOpen}
        />
      )}

      {saving && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px",
            color: v.success,
            fontSize: 12,
            fontWeight: 500,
            marginTop: 8,
          }}
          data-testid="m2-play-autosave-indicator"
        >
          <Check style={{ width: 14, height: 14 }} />
          {t("m2.play.autoSaving", "Auto-saving...")}
        </div>
      )}

      {tasting.hostId && pid && tasting.hostId === pid && (
        <Link
          href={`/m2/tastings/session/${id}/host`}
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              position: "fixed",
              bottom: 140,
              right: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              background: v.accent,
              color: v.bg,
              borderRadius: 24,
              fontWeight: 700,
              fontSize: 14,
              fontFamily: "system-ui, sans-serif",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              cursor: "pointer",
              zIndex: 50,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            data-testid="button-host-control-toggle"
          >
            <Crown style={{ width: 18, height: 18 }} />
            {t("m2.play.hostControl", "Host Control")}
          </div>
        </Link>
      )}

      <style>{`@keyframes m2pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
}
