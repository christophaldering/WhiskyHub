import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { v } from "@/lib/themeVars";
import { useIsMobile } from "@/hooks/use-mobile";
import M2BackButton from "@/components/m2/M2BackButton";
import { tastingApi, whiskyApi, ratingApi, blindModeApi, guidedApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { getSession, useSession } from "@/lib/session";
import M2RatingPanel, { type DimKey } from "@/components/m2/M2RatingPanel";
import VoiceMemoRecorder from "@/components/m2/VoiceMemoRecorder";
import {
  Play, Lock, Eye, EyeOff, Archive, ChevronRight, CheckCircle, Clock,
  SkipForward, Users, Wine, Star, BarChart3, Radio, Monitor,
  Smartphone, ChevronDown, ChevronUp, Loader2, AlertTriangle,
  Square, CircleDot, Hash, Minus, ArrowRight, Layers, XCircle, FileText
} from "lucide-react";

const POLL_FAST = 3000;
const POLL_NORMAL = 5000;

type RevealStep = 0 | 1 | 2 | 3;

function blindLabel(idx: number): string {
  return String.fromCharCode(65 + idx);
}

function formatElapsed(startMs: number): string {
  const diff = Math.max(0, Date.now() - startMs);
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

export default function M2HostingDashboard() {
  const { t } = useTranslation();
  const [, params] = useRoute("/m2/tastings/session/:id/dashboard");
  const [, navigate] = useLocation();
  const id = params?.id || "";
  const session = useSession();
  const pid = session.pid;
  const isMobile = useIsMobile();

  const [confirmEnd, setConfirmEnd] = useState(false);
  const [desktopBannerDismissed, setDesktopBannerDismissed] = useState(false);
  const [hostRatingWhiskyIdx, setHostRatingWhiskyIdx] = useState(0);
  const [hostRatings, setHostRatings] = useState<Record<string, { nose: number; taste: number; finish: number; balance: number; overall: number; overrideOverall: boolean; notes: string }>>({});
  const [hostChips, setHostChips] = useState<Record<string, Record<DimKey, string[]>>>({});
  const [hostTexts, setHostTexts] = useState<Record<string, Record<DimKey, string>>>({});
  const [savingRating, setSavingRating] = useState(false);
  const saveTimeoutRef = useRef<any>(null);

  const emptyChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [], balance: [] };
  const emptyTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "", balance: "" };

  const parseDashScoresBlock = useCallback((rawNotes: string) => {
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
          if (maybeChips.every(c => c.length < 20)) chips[d] = maybeChips;
          else texts[d] = parts[0];
        }
      }
    }
    cleanNotes = cleanNotes.replace(/\[SCORES\].*?\[\/SCORES\]/s, "");
    return { chips, texts, cleanNotes: cleanNotes.trim() };
  }, []);

  const buildDashScoresBlock = useCallback((wId: string) => {
    const ch = hostChips[wId] || emptyChips;
    const tx = hostTexts[wId] || emptyTexts;
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
  }, [hostChips, hostTexts]);

  const { data: tasting, isLoading } = useQuery({
    queryKey: ["tasting", id],
    queryFn: () => tastingApi.get(id),
    enabled: !!id,
    refetchInterval: POLL_FAST,
  });

  const { data: whiskies = [] } = useQuery({
    queryKey: ["whiskies", id],
    queryFn: () => whiskyApi.getForTasting(id),
    enabled: !!id,
    refetchInterval: POLL_NORMAL,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ["ratings", id],
    queryFn: () => ratingApi.getForTasting(id),
    enabled: !!id,
    refetchInterval: POLL_NORMAL,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["tasting-participants", id],
    queryFn: () => tastingApi.getParticipants(id),
    enabled: !!id,
    refetchInterval: POLL_NORMAL,
  });

  const updateStatusMut = useMutation({
    mutationFn: (s: string) =>
      tastingApi.updateStatus(id, s, undefined, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", id] });
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
    },
  });

  const revealNextMut = useMutation({
    mutationFn: () => blindModeApi.revealNext(id, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", id] }),
  });

  const guidedAdvanceMut = useMutation({
    mutationFn: () => guidedApi.advance(id, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", id] }),
  });

  const guidedGoToMut = useMutation({
    mutationFn: (p: { whiskyIndex: number; revealStep?: number }) =>
      guidedApi.goTo(id, pid, p.whiskyIndex, p.revealStep),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", id] }),
  });

  const updateGuidedMut = useMutation({
    mutationFn: (body: Record<string, any>) =>
      guidedApi.updateMode(id, pid, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", id] }),
  });

  const ratingUpsertMut = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ratings", id] }),
  });

  useEffect(() => {
    if (whiskies.length > 0 && !hostRatings[whiskies[0]?.id]) {
      const loadHostRatings = async () => {
        for (const w of whiskies) {
          try {
            const existing = await ratingApi.getMyRating(pid, w.id);
            if (existing) {
              const rawNotes = existing.notes || "";
              const parsed = parseDashScoresBlock(rawNotes);
              setHostRatings(prev => ({
                ...prev,
                [w.id]: {
                  nose: existing.nose ?? 50,
                  taste: existing.taste ?? 50,
                  finish: existing.finish ?? 50,
                  balance: existing.balance ?? 50,
                  overall: existing.overall ?? 50,
                  overrideOverall: false,
                  notes: parsed.cleanNotes,
                },
              }));
              setHostChips(prev => ({ ...prev, [w.id]: parsed.chips }));
              setHostTexts(prev => ({ ...prev, [w.id]: parsed.texts }));
            }
          } catch {}
        }
      };
      loadHostRatings();
    }
  }, [whiskies.length, pid, parseDashScoresBlock]);

  const debouncedSaveRating = useCallback((whiskyId: string, vals: any) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const scoresBlock = buildDashScoresBlock(whiskyId);
      const combinedNotes = ((vals.notes || "") + scoresBlock).trim();
      setSavingRating(true);
      ratingUpsertMut.mutate({
        participantId: pid,
        whiskyId,
        tastingId: id,
        ...vals,
        notes: combinedNotes,
      }, {
        onSettled: () => setSavingRating(false),
      });
    }, 800);
  }, [pid, id, buildDashScoresBlock]);

  const chipTextDashSaveRef = useRef(0);
  useEffect(() => {
    if (!whiskies.length) return;
    const wId = whiskies[hostRatingWhiskyIdx]?.id;
    if (!wId || !hostRatings[wId]) return;
    chipTextDashSaveRef.current++;
    const gen = chipTextDashSaveRef.current;
    const timer = setTimeout(() => {
      if (gen !== chipTextDashSaveRef.current) return;
      const r = hostRatings[wId];
      debouncedSaveRating(wId, {
        nose: r.nose, taste: r.taste, finish: r.finish, balance: r.balance,
        overall: r.overall, notes: r.notes,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [hostChips, hostTexts]);

  if (isLoading || !tasting) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: v.muted }}>
        <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", marginRight: 8 }} />
        {t("common.loading", "Loading...")}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isHost = tasting.hostId === pid;
  if (!isHost) {
    return (
      <div style={{ padding: 24, textAlign: "center" }} data-testid="hosting-dashboard-unauthorized">
        <M2BackButton />
        <AlertTriangle style={{ width: 48, height: 48, color: v.danger, margin: "40px auto 16px" }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>
          {t("m2.dashboard.unauthorized", "Host Access Only")}
        </h2>
        <p style={{ fontSize: 14, color: v.muted, maxWidth: 360, margin: "0 auto 24px" }}>
          {t("m2.dashboard.unauthorizedDesc", "This dashboard is only available to the tasting host.")}
        </p>
        <Link href={`/m2/tastings/session/${id}/play`}>
          <span style={{ color: v.accent, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            {t("m2.dashboard.joinAsParticipant", "Join as Participant")} →
          </span>
        </Link>
      </div>
    );
  }

  const status = tasting.status;
  const isBlind = tasting.blindMode;
  const isGuided = tasting.guidedMode;
  const guidedIdx = tasting.guidedWhiskyIndex ?? -1;
  const revealIdx = tasting.revealIndex ?? 0;
  const revealStep: RevealStep = (tasting.revealStep ?? 0) as RevealStep;
  const guidedRevealStep = tasting.guidedRevealStep ?? 0;
  const ratingScale = tasting.ratingScale ?? 100;
  const activeWhiskyIdx = isGuided ? guidedIdx : hostRatingWhiskyIdx;
  const activeWhisky = whiskies[Math.max(0, activeWhiskyIdx)] || null;
  const totalParticipants = participants.length;
  const uniqueRaters = new Set(ratings.map((r: any) => r.participantId));
  const totalRatings = ratings.length;
  const isLive = status === "open";
  const isEnded = status === "closed" || status === "reveal" || status === "archived";
  const isDraft = status === "draft";
  const ratingPrompt = tasting.ratingPrompt || "";

  const getActiveWhiskyRatings = () => {
    if (!activeWhisky) return [];
    return ratings.filter((r: any) => r.whiskyId === activeWhisky.id);
  };
  const activeRatings = getActiveWhiskyRatings();
  const activeRatedPids = new Set(activeRatings.map((r: any) => r.participantId));

  const handleStartSession = async () => {
    await tastingApi.updateStatus(id, "open", undefined, pid);
    if (whiskies.length > 0) {
      await guidedApi.updateMode(id, pid, { guidedMode: true, guidedWhiskyIndex: 0, guidedRevealStep: 0 });
    }
    await tastingApi.join(id, pid);
    queryClient.invalidateQueries({ queryKey: ["tasting", id] });
    queryClient.invalidateQueries({ queryKey: ["tastings"] });
  };

  const handleEndSession = () => {
    if (!confirmEnd) { setConfirmEnd(true); return; }
    updateStatusMut.mutate("closed");
    setConfirmEnd(false);
  };

  const getRevealStepLabel = (s: number) => {
    const labels = [
      t("m2.dashboard.revealHidden", "Hidden"),
      t("m2.dashboard.revealName", "Name"),
      t("m2.dashboard.revealDetails", "Details"),
      t("m2.dashboard.revealImage", "Image"),
    ];
    return labels[s] || labels[0];
  };

  const getRevealActionLabel = () => {
    if (revealStep === 0) return t("m2.dashboard.revealNameBtn", "Reveal Name");
    if (revealStep === 1) return t("m2.dashboard.revealDetailsBtn", "Reveal Details");
    if (revealStep === 2) return t("m2.dashboard.revealImageBtn", "Reveal Image");
    return t("m2.dashboard.nextWhisky", "Next Whisky");
  };

  const scaleMax = ratingScale;
  const scaleStep = scaleMax <= 5 ? 0.5 : scaleMax <= 20 ? 1 : 1;
  const scaleDefault = Math.round(scaleMax / 2);

  const getHostRating = (whiskyId: string) => {
    return hostRatings[whiskyId] || {
      nose: scaleDefault, taste: scaleDefault, finish: scaleDefault,
      balance: scaleDefault, overall: scaleDefault, overrideOverall: false, notes: "",
    };
  };

  const updateHostRating = (whiskyId: string, field: string, value: any) => {
    const current = getHostRating(whiskyId);
    const updated = { ...current, [field]: value };
    if (!updated.overrideOverall && field !== "overall" && field !== "overrideOverall" && field !== "notes") {
      updated.overall = Math.round(((updated.nose + updated.taste + updated.finish + updated.balance) / 4) * 10) / 10;
    }
    setHostRatings(prev => ({ ...prev, [whiskyId]: updated }));
    debouncedSaveRating(whiskyId, {
      nose: updated.nose,
      taste: updated.taste,
      finish: updated.finish,
      balance: updated.balance,
      overall: updated.overall,
      notes: updated.notes,
    });
  };

  const card: React.CSSProperties = {
    background: v.card,
    border: `1px solid ${v.border}`,
    borderRadius: 16,
    padding: 20,
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: v.muted,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 12,
  };

  const pillStyle = (active?: boolean): React.CSSProperties => ({
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: active ? `color-mix(in srgb, ${v.accent} 20%, transparent)` : v.pillBg,
    color: active ? v.accent : v.pillText,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  });

  const btnPrimary: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "none",
    background: v.accent,
    color: v.bg,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "opacity 0.2s",
  };

  const btnSecondary: React.CSSProperties = {
    ...btnPrimary,
    background: v.elevated,
    color: v.text,
    fontWeight: 600,
    fontSize: 13,
    padding: "10px 14px",
  };

  const btnDanger: React.CSSProperties = {
    ...btnPrimary,
    background: v.danger,
    color: "#fff",
  };

  if (isMobile) {
    return <MobileCompanion
      tasting={tasting} whiskies={whiskies} participants={participants}
      ratings={ratings} pid={pid} id={id} status={status}
      isBlind={isBlind} isGuided={isGuided} guidedIdx={guidedIdx}
      revealStep={revealStep} revealIdx={revealIdx}
      guidedRevealStep={guidedRevealStep}
      isDraft={isDraft} isLive={isLive} isEnded={isEnded}
      totalParticipants={totalParticipants} totalRatings={totalRatings}
      activeWhisky={activeWhisky} activeRatedPids={activeRatedPids}
      confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd}
      desktopBannerDismissed={desktopBannerDismissed}
      setDesktopBannerDismissed={setDesktopBannerDismissed}
      handleStartSession={handleStartSession}
      handleEndSession={handleEndSession}
      getRevealActionLabel={getRevealActionLabel}
      getRevealStepLabel={getRevealStepLabel}
      revealNextMut={revealNextMut}
      guidedAdvanceMut={guidedAdvanceMut}
      guidedGoToMut={guidedGoToMut}
      updateStatusMut={updateStatusMut}
      navigate={navigate}
      t={t}
      card={card} sectionLabel={sectionLabel} pillStyle={pillStyle}
      btnPrimary={btnPrimary} btnSecondary={btnSecondary} btnDanger={btnDanger}
    />;
  }

  return (
    <div style={{ minHeight: "100vh", background: v.bg, padding: "0 24px 60px" }} data-testid="hosting-dashboard">
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ padding: "16px 0 8px" }}>
          <M2BackButton />
        </div>

        <SessionHeader
          tasting={tasting} whiskies={whiskies} participants={participants}
          ratings={ratings} status={status} isBlind={isBlind} isGuided={isGuided}
          guidedIdx={guidedIdx} totalParticipants={totalParticipants}
          totalRatings={totalRatings} isDraft={isDraft} isLive={isLive} isEnded={isEnded}
          handleStartSession={handleStartSession} handleEndSession={handleEndSession}
          confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd}
          updateStatusMut={updateStatusMut} navigate={navigate}
          t={t} card={card} sectionLabel={sectionLabel} pillStyle={pillStyle}
          btnPrimary={btnPrimary} btnDanger={btnDanger}
        />

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 340px", gap: 20, marginTop: 20 }}>
          <LeftColumn
            tasting={tasting} whiskies={whiskies} ratings={ratings}
            participants={participants} status={status}
            isBlind={isBlind} isGuided={isGuided} guidedIdx={guidedIdx}
            revealIdx={revealIdx} revealStep={revealStep}
            guidedRevealStep={guidedRevealStep}
            activeWhisky={activeWhisky}
            isDraft={isDraft} isLive={isLive} isEnded={isEnded}
            handleStartSession={handleStartSession}
            handleEndSession={handleEndSession}
            confirmEnd={confirmEnd} setConfirmEnd={setConfirmEnd}
            getRevealStepLabel={getRevealStepLabel}
            getRevealActionLabel={getRevealActionLabel}
            revealNextMut={revealNextMut}
            guidedAdvanceMut={guidedAdvanceMut}
            guidedGoToMut={guidedGoToMut}
            updateStatusMut={updateStatusMut}
            navigate={navigate} id={id}
            t={t} card={card} sectionLabel={sectionLabel}
            pillStyle={pillStyle} btnPrimary={btnPrimary}
            btnSecondary={btnSecondary} btnDanger={btnDanger}
          />

          <CenterColumn
            tasting={tasting} whiskies={whiskies} participants={participants}
            ratings={ratings} status={status}
            isBlind={isBlind} isGuided={isGuided} guidedIdx={guidedIdx}
            revealIdx={revealIdx} revealStep={revealStep}
            guidedRevealStep={guidedRevealStep}
            activeWhisky={activeWhisky} activeRatedPids={activeRatedPids}
            activeRatings={activeRatings}
            guidedGoToMut={guidedGoToMut}
            t={t} card={card} sectionLabel={sectionLabel} pillStyle={pillStyle}
          />

          <RightColumn
            tasting={tasting} whiskies={whiskies} status={status}
            isBlind={isBlind} isGuided={isGuided} guidedIdx={guidedIdx}
            revealStep={revealStep} guidedRevealStep={guidedRevealStep}
            revealIdx={revealIdx} activeWhisky={activeWhisky}
            ratingScale={ratingScale} scaleMax={scaleMax}
            scaleStep={scaleStep} scaleDefault={scaleDefault}
            ratingPrompt={ratingPrompt}
            hostRatingWhiskyIdx={hostRatingWhiskyIdx}
            setHostRatingWhiskyIdx={setHostRatingWhiskyIdx}
            getHostRating={getHostRating}
            updateHostRating={updateHostRating}
            hostChips={hostChips} setHostChips={setHostChips}
            hostTexts={hostTexts} setHostTexts={setHostTexts}
            emptyChips={emptyChips} emptyTexts={emptyTexts}
            savingRating={savingRating}
            id={id} pid={pid}
            t={t} card={card} sectionLabel={sectionLabel} pillStyle={pillStyle}
          />
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

function SessionHeader({ tasting, whiskies, participants, ratings, status, isBlind, isGuided, guidedIdx, totalParticipants, totalRatings, isDraft, isLive, isEnded, handleStartSession, handleEndSession, confirmEnd, setConfirmEnd, updateStatusMut, navigate, t, card, sectionLabel, pillStyle, btnPrimary, btnDanger }: any) {
  const progress = whiskies.length > 0 ? Math.round((new Set(ratings.map((r: any) => r.whiskyId)).size / whiskies.length) * 100) : 0;

  return (
    <div style={{ ...card, padding: "20px 24px" }} data-testid="session-header">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h1 style={{
              fontSize: 26, fontWeight: 700, margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
              color: v.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }} data-testid="text-dashboard-title">
              {tasting.title || t("m2.tastings.untitled", "Untitled Tasting")}
            </h1>
            {isLive && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 20,
                background: `color-mix(in srgb, ${v.success} 15%, transparent)`,
                color: v.success, fontSize: 12, fontWeight: 700,
              }} data-testid="badge-live">
                <span style={{ width: 8, height: 8, borderRadius: 4, background: v.success, animation: "pulse 2s infinite" }} />
                {t("m2.dashboard.live", "LIVE")}
              </span>
            )}
            {isDraft && <span style={pillStyle()}>{t("m2.dashboard.draft", "DRAFT")}</span>}
            {isEnded && (
              <span style={{
                ...pillStyle(),
                background: `color-mix(in srgb, ${v.muted} 15%, transparent)`,
                color: v.muted,
              }}>
                {status.toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {isBlind && <span style={pillStyle(true)}><EyeOff style={{ width: 12, height: 12 }} />{t("m2.dashboard.blind", "Blind")}</span>}
            {isGuided && <span style={pillStyle(true)}><SkipForward style={{ width: 12, height: 12 }} />{t("m2.dashboard.guided", "Guided")}</span>}
            {tasting.code && (
              <span style={{ fontSize: 13, color: v.muted }}>
                {t("m2.dashboard.code", "Code:")}{" "}<strong style={{ color: v.accent, letterSpacing: "0.06em" }}>{tasting.code}</strong>
              </span>
            )}
            {isGuided && guidedIdx >= 0 && (
              <span style={{ fontSize: 13, color: v.textSecondary }}>
                {t("m2.dashboard.dramProgress", "Dram {{current}} / {{total}}", { current: guidedIdx + 1, total: whiskies.length })}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
          <StatPill icon={<Users style={{ width: 14, height: 14 }} />} value={totalParticipants} label={t("m2.dashboard.guests", "Guests")} />
          <StatPill icon={<Wine style={{ width: 14, height: 14 }} />} value={whiskies.length} label={t("m2.dashboard.drams", "Drams")} />
          <StatPill icon={<Star style={{ width: 14, height: 14 }} />} value={totalRatings} label={t("m2.dashboard.ratings", "Ratings")} />
        </div>
      </div>

      {isLive && whiskies.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: v.muted, fontWeight: 600 }}>{t("m2.dashboard.progress", "Progress")}</span>
            <span style={{ fontSize: 11, color: v.accent, fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: v.elevated, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: v.accent, borderRadius: 2, transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "8px 16px", borderRadius: 12,
      background: v.elevated, minWidth: 72,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        <span style={{ color: v.accent }}>{icon}</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: v.text, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <span style={{ fontSize: 10, color: v.muted, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function LeftColumn({ tasting, whiskies, ratings, participants, status, isBlind, isGuided, guidedIdx, revealIdx, revealStep, guidedRevealStep, activeWhisky, isDraft, isLive, isEnded, handleStartSession, handleEndSession, confirmEnd, setConfirmEnd, getRevealStepLabel, getRevealActionLabel, revealNextMut, guidedAdvanceMut, guidedGoToMut, updateStatusMut, navigate, id, t, card, sectionLabel, pillStyle, btnPrimary, btnSecondary, btnDanger }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="left-column">
      <div style={card}>
        <div style={sectionLabel}>
          <Radio style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
          {t("m2.dashboard.sessionStatus", "Session Status")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 10, height: 10, borderRadius: 5,
            background: isLive ? v.success : isDraft ? v.accent : v.muted,
          }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: v.text }}>
            {isDraft ? t("m2.dashboard.draft", "Draft") :
             isLive ? t("m2.dashboard.live", "Live — Rating Open") :
             status === "closed" ? t("m2.dashboard.closed", "Closed") :
             status === "reveal" ? t("m2.dashboard.reveal", "Reveal Phase") :
             t("m2.dashboard.archived", "Archived")}
          </span>
        </div>
        {isLive && tasting.createdAt && (
          <div style={{ fontSize: 12, color: v.muted }}>
            {t("m2.dashboard.elapsed", "Session active")}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={sectionLabel}>
          <Layers style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
          {t("m2.dashboard.controls", "Live Controls")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {isDraft && (
            <button
              onClick={handleStartSession}
              disabled={whiskies.length === 0}
              style={{
                ...btnPrimary,
                background: whiskies.length > 0 ? v.success : v.border,
                color: whiskies.length > 0 ? "#fff" : v.muted,
                opacity: whiskies.length === 0 ? 0.5 : 1,
                cursor: whiskies.length === 0 ? "not-allowed" : "pointer",
              }}
              data-testid="button-start-tasting"
            >
              <Play style={{ width: 16, height: 16 }} />
              {t("m2.dashboard.startTasting", "Start Tasting")}
            </button>
          )}

          {isLive && isGuided && (
            <>
              <button
                onClick={() => guidedAdvanceMut.mutate()}
                disabled={guidedAdvanceMut.isPending || guidedIdx >= whiskies.length - 1}
                style={{
                  ...btnPrimary,
                  opacity: (guidedAdvanceMut.isPending || guidedIdx >= whiskies.length - 1) ? 0.5 : 1,
                  cursor: guidedIdx >= whiskies.length - 1 ? "not-allowed" : "pointer",
                }}
                data-testid="button-next-dram"
              >
                {guidedAdvanceMut.isPending ? (
                  <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                ) : (
                  <SkipForward style={{ width: 16, height: 16 }} />
                )}
                {guidedIdx < 0
                  ? t("m2.dashboard.startFirst", "Start First Dram")
                  : guidedIdx >= whiskies.length - 1
                  ? t("m2.dashboard.allDramsDone", "All Drams Done")
                  : t("m2.dashboard.nextDram", "Next Dram")}
              </button>
            </>
          )}

          {isLive && (
            <>
              {!confirmEnd ? (
                <button onClick={handleEndSession} style={btnSecondary} data-testid="button-end-tasting">
                  <Lock style={{ width: 14, height: 14 }} />
                  {t("m2.dashboard.endTasting", "Close Ratings")}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmEnd(false)} style={{ ...btnSecondary, flex: 1 }}>
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button onClick={handleEndSession} style={{ ...btnDanger, flex: 1 }} data-testid="button-confirm-end">
                    <Lock style={{ width: 14, height: 14 }} />
                    {t("m2.dashboard.confirmEnd", "Confirm Close")}
                  </button>
                </div>
              )}
            </>
          )}

          {status === "closed" && (
            <button
              onClick={() => updateStatusMut.mutate("reveal")}
              style={btnPrimary}
              data-testid="button-start-reveal"
            >
              <Eye style={{ width: 16, height: 16 }} />
              {t("m2.dashboard.startReveal", "Begin Unveiling")}
            </button>
          )}

          {isEnded && (
            <button
              onClick={() => navigate(`/m2/tastings/session/${id}/results`)}
              style={btnSecondary}
              data-testid="button-view-results"
            >
              <BarChart3 style={{ width: 14, height: 14 }} />
              {t("m2.dashboard.viewResults", "View Results")}
            </button>
          )}
        </div>
      </div>

      {isBlind && isLive && (
        <div style={card} data-testid="blind-reveal-panel">
          <div style={sectionLabel}>
            <EyeOff style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
            {t("m2.dashboard.blindReveal", "Unveil Whiskies")}
          </div>

          <div style={{ fontSize: 11, color: v.muted, marginBottom: 6, lineHeight: 1.4 }}>
            {t("m2.dashboard.blindRevealDesc", "Reveal whisky identities step by step — guests only see what you show.")}
          </div>
          <div style={{ fontSize: 12, color: v.textSecondary, marginBottom: 10 }}>
            {t("m2.dashboard.unveiled", "Unveiled")}: {revealIdx} / {whiskies.length}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
            {whiskies.map((w: any, idx: number) => {
              const done = idx < revealIdx;
              const current = idx === revealIdx;
              return (
                <div key={w.id} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 8px", borderRadius: 8,
                  background: current ? v.elevated : "transparent",
                  border: current ? `1px solid ${v.accent}` : "1px solid transparent",
                }} data-testid={`blind-whisky-${idx}`}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 10, fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? v.success : current ? v.accent : v.border,
                    color: "#fff",
                  }}>
                    {done ? "✓" : blindLabel(idx)}
                  </div>
                  <span style={{ flex: 1, fontSize: 12, color: done ? v.textSecondary : current ? v.text : v.muted }}>
                    {w.name || t("m2.hostControl.whiskyN", "Whisky {{n}}", { n: idx + 1 })}
                  </span>
                  {current && (
                    <span style={{ fontSize: 9, color: v.accent, fontWeight: 700 }}>
                      {getRevealStepLabel(revealStep)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {revealIdx < whiskies.length ? (
            <button
              onClick={() => revealNextMut.mutate()}
              disabled={revealNextMut.isPending}
              style={{
                ...btnPrimary,
                background: v.accent, color: v.bg,
                opacity: revealNextMut.isPending ? 0.5 : 1,
              }}
              data-testid="button-reveal-next"
            >
              {revealNextMut.isPending ? (
                <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
              ) : (
                <Eye style={{ width: 14, height: 14 }} />
              )}
              {getRevealActionLabel()}
            </button>
          ) : (
            <div style={{ textAlign: "center", fontSize: 12, color: v.success, fontWeight: 600, padding: 8 }}>
              <CheckCircle style={{ width: 14, height: 14, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
              {t("m2.dashboard.allRevealed", "All whiskies revealed")}
            </div>
          )}

          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: v.elevated, fontSize: 11, color: v.muted }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("m2.dashboard.hostSees", "You see (host)")}</div>
            <div>{activeWhisky?.name || "—"}</div>
            <div style={{ borderTop: `1px solid ${v.border}`, margin: "6px 0", paddingTop: 6, fontWeight: 600 }}>
              {t("m2.dashboard.participantsSee", "Participants see")}
            </div>
            <div>
              {isGuided && guidedRevealStep === 0 ? t("m2.dashboard.dramLabel", "Dram {{label}}", { label: blindLabel(Math.max(0, guidedIdx)) }) :
               isGuided && guidedRevealStep === 1 ? (activeWhisky?.name || "—") :
               isGuided && guidedRevealStep >= 2 ? `${activeWhisky?.name || "—"} (+ ${t("m2.dashboard.details", "details")})` :
               activeWhisky?.name || "—"}
            </div>
          </div>
        </div>
      )}

      {isGuided && isLive && (
        <div style={card} data-testid="guided-controls">
          <div style={sectionLabel}>
            <SkipForward style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
            {t("m2.dashboard.guidedNav", "Dram Navigation")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(whiskies.length, 8)}, 1fr)`, gap: 4 }}>
            {whiskies.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => guidedGoToMut.mutate({ whiskyIndex: idx, revealStep: 0 })}
                style={{
                  height: 36, borderRadius: 8,
                  border: idx === guidedIdx ? `2px solid ${v.accent}` : `1px solid ${v.border}`,
                  background: idx < guidedIdx ? `color-mix(in srgb, ${v.success} 20%, transparent)` :
                             idx === guidedIdx ? v.elevated : "transparent",
                  color: idx <= guidedIdx ? v.text : v.muted,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  transition: "all 0.15s",
                }}
                data-testid={`guided-nav-${idx}`}
              >
                {isBlind ? blindLabel(idx) : idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {isEnded && (
        <div style={card}>
          <div style={sectionLabel}>
            {t("m2.dashboard.sessionSummary", "Session Summary")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <SummaryRow label={t("m2.dashboard.totalRatings", "Total Ratings")} value={String(ratings.length)} />
            <SummaryRow label={t("m2.dashboard.uniqueRaters", "Unique Raters")} value={String(new Set(ratings.map((r: any) => r.participantId)).size)} />
            <SummaryRow label={t("m2.dashboard.whiskiesRated", "Whiskies Rated")} value={`${new Set(ratings.map((r: any) => r.whiskyId)).size} / ${whiskies.length}`} />
          </div>
          <button
            onClick={() => navigate(`/m2/tastings/session/${id}/recap`)}
            style={{ ...btnSecondary, marginTop: 12 }}
            data-testid="button-view-recap"
          >
            {t("m2.dashboard.viewRecap", "View Recap")}
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: v.muted }}>{label}</span>
      <span style={{ color: v.text, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function CenterColumn({ tasting, whiskies, participants, ratings, status, isBlind, isGuided, guidedIdx, revealIdx, revealStep, guidedRevealStep, activeWhisky, activeRatedPids, activeRatings, guidedGoToMut, t, card, sectionLabel, pillStyle }: any) {
  const avgOverall = activeRatings.length > 0
    ? Math.round(activeRatings.reduce((s: number, r: any) => s + (r.overall ?? 0), 0) / activeRatings.length * 10) / 10
    : null;
  const pName = (p: any) => p.participant?.name || p.participant?.email || p.name || p.email || t("m2.hostControl.anonymous", "Anonymous");
  const pId = (p: any) => p.participantId || p.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="center-column">
      <div style={card}>
        <div style={sectionLabel}>
          <Wine style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
          {t("m2.dashboard.lineup", "Lineup")}
        </div>

        {whiskies.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: v.muted, fontSize: 13 }}>
            {t("m2.dashboard.noWhiskies", "No whiskies in this tasting yet.")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {whiskies.map((w: any, idx: number) => {
              const isCurrent = isGuided ? idx === guidedIdx : false;
              const isPast = isGuided ? idx < guidedIdx : false;
              const whiskyRatings = ratings.filter((r: any) => r.whiskyId === w.id);
              const ratedCount = new Set(whiskyRatings.map((r: any) => r.participantId)).size;
              const avgScore = whiskyRatings.length > 0
                ? Math.round(whiskyRatings.reduce((s: number, r: any) => s + (r.overall ?? 0), 0) / whiskyRatings.length)
                : null;

              return (
                <div
                  key={w.id}
                  onClick={() => isGuided && guidedGoToMut.mutate({ whiskyIndex: idx, revealStep: 0 })}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", borderRadius: 12,
                    background: isCurrent ? v.elevated : "transparent",
                    border: isCurrent ? `1.5px solid ${v.accent}` : `1px solid ${v.border}`,
                    cursor: isGuided ? "pointer" : "default",
                    transition: "all 0.2s",
                  }}
                  data-testid={`lineup-item-${idx}`}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: isCurrent ? v.accent : isPast ? `color-mix(in srgb, ${v.success} 20%, transparent)` : v.elevated,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700,
                    color: isCurrent ? v.bg : isPast ? v.success : v.muted,
                    flexShrink: 0,
                  }}>
                    {isPast ? <CheckCircle style={{ width: 16, height: 16 }} /> :
                     isBlind ? blindLabel(idx) : idx + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: isCurrent ? v.text : v.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {w.name || t("m2.hostControl.whiskyN", "Whisky {{n}}", { n: idx + 1 })}
                    </div>
                    <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>
                      {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {isBlind && (
                      <div style={{ fontSize: 10, color: v.accent, marginTop: 2 }}>
                        {t("m2.dashboard.participantsLabel", "Guests see")}: {isGuided && guidedRevealStep < 1 ? t("m2.dashboard.dramLabel", "Dram {{label}}", { label: blindLabel(idx) }) : w.name}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    {avgScore !== null && (
                      <span style={{ fontSize: 14, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>
                        {avgScore}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: v.muted }}>
                      {ratedCount}/{participants.length} {t("m2.dashboard.rated", "rated")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeWhisky && activeRatings.length > 0 && (
          <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: v.elevated }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: v.muted }}>
                {t("m2.dashboard.currentAvg", "Current Dram Average")}
              </span>
              <span style={{ fontSize: 22, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>
                {avgOverall}
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={card} data-testid="participant-panel">
        {(() => {
          const uniqueRatersAll = new Set(ratings.map((r: any) => r.participantId));
          const ratedCount = participants.filter((p: any) => uniqueRatersAll.has(pId(p))).length;
          const totalP = participants.length;
          const progressPct = totalP > 0 ? Math.round((ratedCount / totalP) * 100) : 0;
          const getSource = (pid: string): "digital" | "paper" | "pending" => {
            const pRatings = ratings.filter((r: any) => r.participantId === pid);
            if (pRatings.length === 0) return "pending";
            const hasPaper = pRatings.some((r: any) => r.source === "paper");
            const hasApp = pRatings.some((r: any) => !r.source || r.source === "app");
            if (hasPaper && !hasApp) return "paper";
            return "digital";
          };
          const missingCount = totalP - ratedCount;

          return (
            <>
              <div style={{ ...sectionLabel, display: "flex", justifyContent: "space-between" }}>
                <span>
                  <Users style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                  {t("m2.dashboard.participants", "Participants")}
                </span>
                <span style={{ color: v.accent, textTransform: "none", fontWeight: 700 }} data-testid="text-dashboard-rating-progress">
                  {ratedCount}/{totalP} {t("m2.dashboard.rated", "rated")}
                </span>
              </div>

              {totalP > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ height: 5, borderRadius: 3, background: v.elevated, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${progressPct}%`,
                      background: progressPct === 100 ? v.success : v.accent,
                      borderRadius: 3,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                  {missingCount > 0 && (
                    <div style={{ fontSize: 11, color: v.muted, marginTop: 6 }} data-testid="text-dashboard-missing-count">
                      {missingCount} {t("m2.dashboard.missingRatings", "missing — collect their sheets")}
                    </div>
                  )}
                </div>
              )}

              {totalP === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: v.muted, fontSize: 13 }}>
                  {t("m2.dashboard.noParticipants", "No participants have joined yet.")}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {participants.map((p: any) => {
                    const participantId = pId(p);
                    const hasRatedCurrent = activeRatedPids.has(participantId);
                    const source = getSource(participantId);
                    const totalWhiskiesRated = new Set(
                      ratings.filter((r: any) => r.participantId === participantId).map((r: any) => r.whiskyId)
                    ).size;

                    return (
                      <div key={participantId} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", borderRadius: 8,
                      }} data-testid={`participant-row-${participantId}`}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 14,
                          background: source === "digital"
                            ? `color-mix(in srgb, ${v.success} 15%, transparent)`
                            : source === "paper"
                            ? `color-mix(in srgb, ${v.accent} 15%, transparent)`
                            : v.elevated,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {source === "digital"
                            ? <CheckCircle style={{ width: 14, height: 14, color: v.success }} />
                            : source === "paper"
                            ? <FileText style={{ width: 14, height: 14, color: v.accent }} />
                            : <Clock style={{ width: 14, height: 14, color: v.muted }} />}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, color: v.text, fontWeight: 500 }}>
                          {pName(p)}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: v.muted, fontVariantNumeric: "tabular-nums" }}>
                            {totalWhiskiesRated}/{whiskies.length}
                          </span>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 600,
                            padding: "1px 6px",
                            borderRadius: 8,
                            background: source === "digital"
                              ? `color-mix(in srgb, ${v.success} 12%, transparent)`
                              : source === "paper"
                              ? `color-mix(in srgb, ${v.accent} 12%, transparent)`
                              : `color-mix(in srgb, ${v.muted} 12%, transparent)`,
                            color: source === "digital" ? v.success : source === "paper" ? v.accent : v.muted,
                          }} data-testid={`badge-source-dashboard-${participantId}`}>
                            {source === "digital"
                              ? t("m2.hostControl.sourceDigital", "Digital")
                              : source === "paper"
                              ? t("m2.hostControl.sourcePaper", "Paper")
                              : t("m2.hostControl.pending", "Pending")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

function RightColumn({ tasting, whiskies, status, isBlind, isGuided, guidedIdx, revealStep, guidedRevealStep, revealIdx, activeWhisky, ratingScale, scaleMax, scaleStep, scaleDefault, ratingPrompt, hostRatingWhiskyIdx, setHostRatingWhiskyIdx, getHostRating, updateHostRating, hostChips, setHostChips, hostTexts, setHostTexts, emptyChips, emptyTexts, savingRating, id, pid, t, card, sectionLabel, pillStyle }: any) {
  const isLive = status === "open";
  const currentWhisky = whiskies[hostRatingWhiskyIdx] || activeWhisky;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="right-column">
      <div style={card} data-testid="host-rating-panel">
        <div style={{ ...sectionLabel, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>
            <Star style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
            {t("m2.dashboard.yourRating", "Your Rating")}
          </span>
          {savingRating && (
            <span style={{ fontSize: 10, color: v.accent, display: "flex", alignItems: "center", gap: 4 }}>
              <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
              {t("m2.dashboard.saving", "Saving...")}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
          {whiskies.map((_: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setHostRatingWhiskyIdx(idx)}
              style={{
                padding: "4px 10px", borderRadius: 8,
                border: idx === hostRatingWhiskyIdx ? `2px solid ${v.accent}` : `1px solid ${v.border}`,
                background: idx === hostRatingWhiskyIdx ? v.elevated : "transparent",
                color: idx === hostRatingWhiskyIdx ? v.accent : v.muted,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
              data-testid={`host-rating-tab-${idx}`}
            >
              {isBlind ? blindLabel(idx) : idx + 1}
            </button>
          ))}
        </div>

        {currentWhisky ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: v.text, marginBottom: 4 }}>
              {currentWhisky.name || t("m2.hostControl.whiskyN", "Whisky {{n}}", { n: hostRatingWhiskyIdx + 1 })}
            </div>
            <div style={{ fontSize: 11, color: v.muted, marginBottom: 16 }}>
              {[currentWhisky.distillery, currentWhisky.age ? `${currentWhisky.age}y` : null, currentWhisky.abv ? `${currentWhisky.abv}%` : null].filter(Boolean).join(" · ") || "—"}
            </div>

            <M2RatingPanel
              scores={{
                nose: getHostRating(currentWhisky.id).nose,
                taste: getHostRating(currentWhisky.id).taste,
                finish: getHostRating(currentWhisky.id).finish,
                balance: getHostRating(currentWhisky.id).balance,
              }}
              onScoreChange={(dim, val) => updateHostRating(currentWhisky.id, dim, val)}
              chips={hostChips[currentWhisky.id] || emptyChips}
              onChipToggle={(dim: DimKey, chip: string) => {
                const wId = currentWhisky.id;
                setHostChips((prev: any) => {
                  const current = prev[wId] || emptyChips;
                  const dimChips = current[dim];
                  const next = dimChips.includes(chip) ? dimChips.filter((c: string) => c !== chip) : [...dimChips, chip];
                  return { ...prev, [wId]: { ...current, [dim]: next } };
                });
              }}
              texts={hostTexts[currentWhisky.id] || emptyTexts}
              onTextChange={(dim: DimKey, text: string) => {
                const wId = currentWhisky.id;
                setHostTexts((prev: any) => {
                  const current = prev[wId] || emptyTexts;
                  return { ...prev, [wId]: { ...current, [dim]: text } };
                });
              }}
              overall={getHostRating(currentWhisky.id).overall}
              onOverallChange={(val) => updateHostRating(currentWhisky.id, "overall", val)}
              overallAuto={Math.round(
                (getHostRating(currentWhisky.id).nose +
                 getHostRating(currentWhisky.id).taste +
                 getHostRating(currentWhisky.id).finish +
                 getHostRating(currentWhisky.id).balance) / 4
              )}
              overrideActive={getHostRating(currentWhisky.id).overrideOverall}
              onResetOverride={() => updateHostRating(currentWhisky.id, "overrideOverall", false)}
              scale={scaleMax}
              showToggle={false}
              defaultOpen={true}
              compact={true}
            />

            <textarea
              value={getHostRating(currentWhisky.id).notes}
              onChange={(e) => updateHostRating(currentWhisky.id, "notes", e.target.value)}
              placeholder={t("m2.dashboard.notesPlaceholder", "Your tasting notes...")}
              style={{
                width: "100%", minHeight: 60, padding: "10px 12px",
                borderRadius: 10, border: `1px solid ${v.inputBorder}`,
                background: v.inputBg, color: v.inputText, fontSize: 13,
                fontFamily: "system-ui, sans-serif", resize: "vertical",
                outline: "none", marginTop: 12,
              }}
              data-testid="host-rating-notes"
            />

            {pid && (
              <div style={{ marginTop: 12 }}>
                <VoiceMemoRecorder
                  tastingId={id}
                  whiskyId={currentWhisky.id}
                  participantId={pid}
                  readOnly={false}
                />
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 20, textAlign: "center", color: v.muted, fontSize: 13 }}>
            {t("m2.dashboard.noWhiskiesToRate", "No whiskies to rate yet.")}
          </div>
        )}
      </div>

      <div style={card} data-testid="participant-preview">
        <div style={sectionLabel}>
          <Monitor style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
          {t("m2.dashboard.participantPreview", "Guest View — Current Dram")}
        </div>
        <div style={{ fontSize: 11, color: v.muted, marginBottom: 10, lineHeight: 1.4 }}>
          {t("m2.dashboard.participantPreviewDesc", "Shows what guests see for the dram you're currently discussing.")}
        </div>

        <div style={{
          borderRadius: 16, border: `2px solid ${v.border}`,
          background: v.bg, overflow: "hidden",
        }}>
          <div style={{
            padding: "8px 12px", background: v.elevated,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: `1px solid ${v.border}`,
          }}>
            <span style={{ fontSize: 10, color: v.muted, fontWeight: 600 }}>
              {t("m2.dashboard.participantView", "PARTICIPANT VIEW")}
            </span>
            <Smartphone style={{ width: 12, height: 12, color: v.muted }} />
          </div>

          <div style={{ padding: 16 }}>
            {!isLive && status === "draft" ? (
              <div style={{ textAlign: "center", padding: 20, color: v.muted }}>
                <Clock style={{ width: 24, height: 24, margin: "0 auto 8px", display: "block" }} />
                <div style={{ fontSize: 13 }}>{t("m2.dashboard.waitingForHost", "Waiting for host to start...")}</div>
              </div>
            ) : isLive && isGuided && guidedIdx < 0 ? (
              <div style={{ textAlign: "center", padding: 20, color: v.muted }}>
                <Radio style={{ width: 24, height: 24, margin: "0 auto 8px", display: "block", animation: "pulse 2s infinite" }} />
                <div style={{ fontSize: 13 }}>{t("m2.dashboard.waitingForDram", "Waiting for host...")}</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>{t("m2.dashboard.listening", "Listening for updates")}</div>
              </div>
            ) : (
              <>
                {whiskies.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginBottom: 12, justifyContent: "center" }}>
                    {whiskies.map((_: any, idx: number) => (
                      <div key={idx} style={{
                        width: 24, height: 24, borderRadius: 12,
                        background: (isGuided ? idx === guidedIdx : false) ? v.accent : v.elevated,
                        color: (isGuided ? idx === guidedIdx : false) ? v.bg : v.muted,
                        fontSize: 10, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isBlind ? blindLabel(idx) : idx + 1}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: v.text }}>
                    {isBlind && guidedRevealStep < 1
                      ? t("m2.dashboard.dramLabel", "Dram {{label}}", { label: blindLabel(Math.max(0, guidedIdx)) })
                      : activeWhisky?.name || "—"}
                  </div>
                  {activeWhisky && (!isBlind || guidedRevealStep >= 2) && (
                    <div style={{ fontSize: 11, color: v.muted, marginTop: 4 }}>
                      {[activeWhisky.distillery, activeWhisky.age ? `${activeWhisky.age}y` : null, activeWhisky.abv ? `${activeWhisky.abv}%` : null].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>

                {ratingPrompt && (
                  <div style={{
                    padding: "8px 12px", borderRadius: 8,
                    background: `color-mix(in srgb, ${v.accent} 10%, transparent)`,
                    fontSize: 12, color: v.accent, fontStyle: "italic",
                    marginBottom: 12,
                  }}>
                    {t("m2.dashboard.hostLabel", "Host")}: {ratingPrompt}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { key: "nose", label: t("m2.rating.nose", "Nose") },
                    { key: "taste", label: t("m2.rating.taste", "Taste") },
                    { key: "finish", label: t("m2.rating.finish", "Finish") },
                    { key: "balance", label: t("m2.rating.balance", "Balance") },
                    { key: "overall", label: t("m2.rating.overall", "Overall") },
                  ].map((dim) => (
                    <div key={dim.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: v.muted, width: 40, textAlign: "right" }}>{dim.label}</span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: v.elevated }}>
                        <div style={{ width: "50%", height: "100%", borderRadius: 2, background: v.accent, opacity: 0.4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function MobileCompanion({ tasting, whiskies, participants, ratings, pid, id, status, isBlind, isGuided, guidedIdx, revealStep, revealIdx, guidedRevealStep, isDraft, isLive, isEnded, totalParticipants, totalRatings, activeWhisky, activeRatedPids, confirmEnd, setConfirmEnd, desktopBannerDismissed, setDesktopBannerDismissed, handleStartSession, handleEndSession, getRevealActionLabel, getRevealStepLabel, revealNextMut, guidedAdvanceMut, guidedGoToMut, updateStatusMut, navigate, t, card, sectionLabel, pillStyle, btnPrimary, btnSecondary, btnDanger }: any) {
  return (
    <div style={{ padding: 16, paddingBottom: 100 }} data-testid="mobile-companion">
      <M2BackButton />

      {!desktopBannerDismissed && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 12,
          background: `color-mix(in srgb, ${v.accent} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${v.accent} 25%, transparent)`,
          marginBottom: 16, marginTop: 8,
        }} data-testid="desktop-banner">
          <Monitor style={{ width: 16, height: 16, color: v.accent, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: v.textSecondary, flex: 1 }}>
            {t("m2.dashboard.desktopRecommended", "Full hosting dashboard is optimized for desktop.")}
          </span>
          <button
            onClick={() => setDesktopBannerDismissed(true)}
            style={{ background: "none", border: "none", color: v.muted, cursor: "pointer", padding: 2 }}
          >
            <XCircle style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}

      <div style={{ ...card, marginBottom: 16, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <h1 style={{
            fontSize: 20, fontWeight: 700, margin: 0,
            fontFamily: "'Playfair Display', Georgia, serif",
            color: v.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {tasting.title || t("m2.tastings.untitled", "Untitled Tasting")}
          </h1>
          {isLive && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 16,
              background: `color-mix(in srgb, ${v.success} 15%, transparent)`,
              color: v.success, fontSize: 11, fontWeight: 700,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: v.success, animation: "pulse 2s infinite" }} />
              {t("m2.dashboard.live", "LIVE")}
            </span>
          )}
          {isDraft && <span style={pillStyle()}>{t("m2.dashboard.draft", "DRAFT")}</span>}
          {isEnded && <span style={pillStyle()}>{status.toUpperCase()}</span>}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: v.elevated, borderRadius: 10, padding: 10, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: v.accent }}>{totalParticipants}</div>
            <div style={{ fontSize: 10, color: v.muted }}>{t("m2.dashboard.guests", "Guests")}</div>
          </div>
          <div style={{ flex: 1, background: v.elevated, borderRadius: 10, padding: 10, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: v.accent }}>{whiskies.length}</div>
            <div style={{ fontSize: 10, color: v.muted }}>{t("m2.dashboard.drams", "Drams")}</div>
          </div>
          <div style={{ flex: 1, background: v.elevated, borderRadius: 10, padding: 10, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: v.accent }}>{totalRatings}</div>
            <div style={{ fontSize: 10, color: v.muted }}>{t("m2.dashboard.ratings", "Ratings")}</div>
          </div>
        </div>
      </div>

      {isGuided && isLive && activeWhisky && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={sectionLabel}>{t("m2.dashboard.currentDram", "Current Dram")}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: v.text, marginBottom: 4 }}>
            {isBlind ? t("m2.dashboard.dramLabel", "Dram {{label}}", { label: blindLabel(guidedIdx) }) : activeWhisky.name}
          </div>
          {!isBlind && (
            <div style={{ fontSize: 12, color: v.muted }}>
              {[activeWhisky.distillery, activeWhisky.abv ? `${activeWhisky.abv}%` : null].filter(Boolean).join(" · ")}
            </div>
          )}
          {isBlind && (
            <div style={{ fontSize: 11, color: v.accent, marginTop: 4 }}>
              {t("m2.dashboard.hostLabel", "Host")}: {activeWhisky.name} — {t("m2.dashboard.guests", "Guests")}: {t("m2.dashboard.dramLabel", "Dram {{label}}", { label: blindLabel(guidedIdx) })}
            </div>
          )}
          <div style={{ fontSize: 11, color: v.muted, marginTop: 6 }}>
            {activeRatedPids.size}/{totalParticipants} {t("m2.dashboard.rated", "rated")}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isDraft && (
          <button
            onClick={handleStartSession}
            disabled={whiskies.length === 0}
            style={{
              ...btnPrimary,
              background: whiskies.length > 0 ? v.success : v.border,
              color: whiskies.length > 0 ? "#fff" : v.muted,
              opacity: whiskies.length === 0 ? 0.5 : 1,
            }}
            data-testid="mobile-start-tasting"
          >
            <Play style={{ width: 16, height: 16 }} />
            {t("m2.dashboard.startTasting", "Start Tasting")}
          </button>
        )}

        {isLive && isGuided && (
          <button
            onClick={() => guidedAdvanceMut.mutate()}
            disabled={guidedAdvanceMut.isPending || guidedIdx >= whiskies.length - 1}
            style={{
              ...btnPrimary,
              opacity: guidedIdx >= whiskies.length - 1 ? 0.5 : 1,
            }}
            data-testid="mobile-next-dram"
          >
            <SkipForward style={{ width: 16, height: 16 }} />
            {guidedIdx < 0 ? t("m2.dashboard.startFirst", "Start First Dram") :
             guidedIdx >= whiskies.length - 1 ? t("m2.dashboard.allDramsDone", "All Drams Done") : t("m2.dashboard.nextDram", "Next Dram")}
          </button>
        )}

        {isLive && isBlind && revealIdx < whiskies.length && (
          <button
            onClick={() => revealNextMut.mutate()}
            disabled={revealNextMut.isPending}
            style={btnSecondary}
            data-testid="mobile-reveal"
          >
            <Eye style={{ width: 14, height: 14 }} />
            {getRevealActionLabel()}
          </button>
        )}

        {isLive && (
          <>
            {!confirmEnd ? (
              <button onClick={handleEndSession} style={btnSecondary} data-testid="mobile-end">
                <Lock style={{ width: 14, height: 14 }} />
                {t("m2.dashboard.endTasting", "Close Ratings")}
              </button>
            ) : (
              <button onClick={handleEndSession} style={btnDanger} data-testid="mobile-confirm-end">
                {t("m2.dashboard.confirmEnd", "Confirm Close")}
              </button>
            )}
          </>
        )}

        {isLive && (
          <Link href={`/m2/tastings/session/${id}/play`} style={{ textDecoration: "none" }}>
            <div style={{
              ...btnSecondary, background: `color-mix(in srgb, ${v.accent} 15%, transparent)`,
              color: v.accent, width: "100%",
            }} data-testid="mobile-rate-btn">
              <Star style={{ width: 14, height: 14 }} />
              {t("m2.hostControl.rateWhiskies", "Rate Whiskies")}
            </div>
          </Link>
        )}

        {status === "closed" && (
          <button onClick={() => updateStatusMut.mutate("reveal")} style={btnPrimary} data-testid="mobile-start-reveal">
            <Eye style={{ width: 16, height: 16 }} />
            {t("m2.dashboard.startReveal", "Begin Unveiling")}
          </button>
        )}

        {isEnded && (
          <button
            onClick={() => navigate(`/m2/tastings/session/${id}/results`)}
            style={btnPrimary}
            data-testid="mobile-view-results"
          >
            <BarChart3 style={{ width: 16, height: 16 }} />
            {t("m2.dashboard.viewResults", "View Results")}
          </button>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
