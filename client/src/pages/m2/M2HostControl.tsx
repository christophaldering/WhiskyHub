import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { tastingApi, whiskyApi, ratingApi, blindModeApi, guidedApi, recapApi, paperScanApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { getSession, useSession } from "@/lib/session";
import {
  Play, Lock, Eye, EyeOff, Archive, ChevronRight, CheckCircle, Clock,
  SkipForward, Sparkles, Plus, Trash2, GripVertical, ImageIcon,
  FileText, Info, Loader2, RefreshCw, ChevronDown, ChevronUp, Edit3, Star, Monitor, Printer,
  Camera, Upload, AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { PrintableTastingSheets } from "@/components/printable-tasting-sheets";

export default function M2HostControl() {
  const { t } = useTranslation();
  const [, params] = useRoute("/m2/tastings/session/:id/host");
  const [, navigate] = useLocation();
  const id = params?.id || "";
  const session = useSession();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showWhiskyManager, setShowWhiskyManager] = useState(false);
  const [aiHighlights, setAiHighlights] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingWhisky, setEditingWhisky] = useState<any>(null);
  const [newWhisky, setNewWhisky] = useState({ name: "", distillery: "", abv: "", age: "", caskType: "", notes: "" });
  const [showAddWhisky, setShowAddWhisky] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("status");
  const [scanPhotos, setScanPhotos] = useState<File[]>([]);
  const [scanParticipantId, setScanParticipantId] = useState<string>("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string>("");
  const [scanSuccess, setScanSuccess] = useState<string>("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const scanFileRef = useRef<HTMLInputElement>(null);

  const { data: tasting, isLoading } = useQuery({
    queryKey: ["tasting", id],
    queryFn: () => tastingApi.get(id),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: whiskies = [] } = useQuery({
    queryKey: ["whiskies", id],
    queryFn: () => whiskyApi.getForTasting(id),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ["ratings", id],
    queryFn: () => ratingApi.getForTasting(id),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["tasting-participants", id],
    queryFn: () => tastingApi.getParticipants(id),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const updateStatus = useMutation({
    mutationFn: (params: { status: string; currentAct?: string }) =>
      tastingApi.updateStatus(id, params.status, params.currentAct, session.pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", id] });
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
    },
  });

  const revealNextMutation = useMutation({
    mutationFn: () => blindModeApi.revealNext(id, session.pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", id] });
    },
  });

  const guidedAdvanceMutation = useMutation({
    mutationFn: () => guidedApi.advance(id, session.pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", id] });
    },
  });

  const guidedGoToMutation = useMutation({
    mutationFn: (params: { whiskyIndex: number; revealStep?: number }) =>
      guidedApi.goTo(id, session.pid, params.whiskyIndex, params.revealStep),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", id] });
    },
  });

  const createWhiskyMutation = useMutation({
    mutationFn: (data: any) => whiskyApi.create({ ...data, tastingId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", id] });
      setShowAddWhisky(false);
      setNewWhisky({ name: "", distillery: "", abv: "", age: "", caskType: "", notes: "" });
    },
  });

  const updateWhiskyMutation = useMutation({
    mutationFn: (params: { id: string; data: any }) => whiskyApi.update(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", id] });
      setEditingWhisky(null);
    },
  });

  const deleteWhiskyMutation = useMutation({
    mutationFn: (whiskyId: string) => whiskyApi.delete(whiskyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", id] });
    },
  });

  if (isLoading || !tasting) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: v.muted }}>
        {t("common.loading", "Loading...")}
      </div>
    );
  }

  const status = tasting.status;
  const currentAct = tasting.currentAct || "act1";
  const revealIndex = tasting.revealIndex ?? 0;
  const revealStep = tasting.revealStep ?? 0;
  const guidedWhiskyIndex = tasting.guidedWhiskyIndex ?? -1;
  const isBlind = tasting.blindMode;
  const isGuided = tasting.guidedMode;

  const handleNextState = () => {
    if (status === "draft") updateStatus.mutate({ status: "open" });
    else if (status === "open") updateStatus.mutate({ status: "closed" });
    else if (status === "closed") updateStatus.mutate({ status: "reveal" });
    else if (status === "reveal") {
      if (currentAct === "act1") updateStatus.mutate({ status: "reveal", currentAct: "act2" });
      else if (currentAct === "act2") updateStatus.mutate({ status: "reveal", currentAct: "act3" });
      else if (currentAct === "act3") updateStatus.mutate({ status: "reveal", currentAct: "act4" });
      else if (currentAct === "act4") setShowEndConfirm(true);
    }
  };

  const handleEnd = () => {
    updateStatus.mutate({ status: "archived" });
    setShowEndConfirm(false);
  };

  const getActionLabel = () => {
    if (status === "draft") return t("m2.hostControl.start", "Start Tasting");
    if (status === "open") return t("m2.hostControl.closeRating", "Close Rating");
    if (status === "closed") return t("m2.hostControl.startReveal", "Start Reveal");
    if (status === "reveal") {
      if (currentAct === "act4") return t("m2.hostControl.endTasting", "End Tasting");
      return t("m2.hostControl.nextAct", "Next Act");
    }
    return "";
  };

  const getActionIcon = () => {
    if (status === "draft") return Play;
    if (status === "open") return Lock;
    if (status === "closed") return Eye;
    if (status === "reveal") return currentAct === "act4" ? Archive : ChevronRight;
    return Play;
  };

  const ActionIcon = getActionIcon();
  const uniqueRaters = new Set(ratings.map((r: any) => r.participantId));
  const totalParticipants = participants.length || 1;

  const getRevealStepLabel = (step: number) => {
    if (step === 0) return t("m2.hostControl.revealHidden", "Hidden");
    if (step === 1) return t("m2.hostControl.revealName", "Name");
    if (step === 2) return t("m2.hostControl.revealDetails", "Details");
    if (step === 3) return t("m2.hostControl.revealImage", "Image");
    return "";
  };

  const handleGenerateHighlights = async () => {
    setAiLoading(true);
    try {
      const data = await recapApi.get(id);
      setAiHighlights(data);
    } catch {
      setAiHighlights({ error: true });
    }
    setAiLoading(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sectionHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    background: v.card,
    border: `1px solid ${v.border}`,
    borderRadius: 14,
    marginBottom: 8,
    cursor: "pointer",
    userSelect: "none",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    color: v.muted,
    textTransform: "uppercase",
    fontWeight: 600,
    letterSpacing: "0.05em",
  };

  const cardStyle: React.CSSProperties = {
    background: v.card,
    border: `1px solid ${v.border}`,
    borderRadius: 14,
    padding: "16px",
    marginBottom: 12,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${v.inputBorder}`,
    background: v.inputBg,
    color: v.inputText,
    fontSize: 14,
    fontFamily: "system-ui, sans-serif",
    outline: "none",
  };

  const smallBtnStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <div style={{ padding: "16px", paddingBottom: 100 }} data-testid="m2-host-control-page">
      <M2BackButton />

      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 22,
          fontWeight: 700,
          color: v.accent,
          margin: "12px 0 4px",
        }}
        data-testid="text-m2-host-control-title"
      >
        {t("m2.hostControl.title", "Host Control")}
      </h1>
      <p style={{ fontSize: 13, color: v.textSecondary, margin: "0 0 12px" }}>
        {tasting.title || t("m2.tastings.untitled", "Untitled Tasting")}
      </p>

      <Link href={`/m2/tastings/session/${id}/dashboard`} style={{ textDecoration: "none" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px", borderRadius: 12, marginBottom: 16,
          background: `color-mix(in srgb, ${v.accent} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${v.accent} 30%, transparent)`,
          cursor: "pointer",
        }} data-testid="dashboard-link-banner">
          <Monitor style={{ width: 18, height: 18, color: v.accent, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: v.accent }}>
              {t("m2.hostControl.openDashboard", "Open Hosting Dashboard")}
            </div>
            <div style={{ fontSize: 11, color: v.muted }}>
              {t("m2.hostControl.dashboardDesc", "Full desktop control center for live tastings")}
            </div>
          </div>
          <ChevronRight style={{ width: 16, height: 16, color: v.accent }} />
        </div>
      </Link>

      {/* Status & Stats */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ ...sectionTitleStyle, marginBottom: 4 }}>
              {t("m2.hostControl.status", "Status")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: v.text }}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === "reveal" && ` — ${t("m2.hostControl.act", "Act")} ${currentAct.replace("act", "")}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {isBlind && (
              <span style={{ padding: "4px 8px", borderRadius: 6, background: v.pillBg, color: v.pillText, fontSize: 11, fontWeight: 600 }}>
                <EyeOff style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 3 }} />
                {t("m2.hostControl.blind", "Blind")}
              </span>
            )}
            {isGuided && (
              <span style={{ padding: "4px 8px", borderRadius: 6, background: v.pillBg, color: v.pillText, fontSize: 11, fontWeight: 600 }}>
                <SkipForward style={{ width: 12, height: 12, display: "inline", verticalAlign: "-2px", marginRight: 3 }} />
                {t("m2.hostControl.guided", "Guided")}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: v.elevated, borderRadius: 10, padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{whiskies.length}</div>
            <div style={{ fontSize: 11, color: v.muted }}>{t("m2.hostControl.drams", "Drams")}</div>
          </div>
          <div style={{ flex: 1, background: v.elevated, borderRadius: 10, padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{totalParticipants}</div>
            <div style={{ fontSize: 11, color: v.muted }}>{t("m2.hostControl.participants", "Participants")}</div>
          </div>
          <div style={{ flex: 1, background: v.elevated, borderRadius: 10, padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{ratings.length}</div>
            <div style={{ fontSize: 11, color: v.muted }}>{t("m2.hostControl.ratings", "Ratings")}</div>
          </div>
        </div>

        {tasting && whiskies.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <PrintableTastingSheets tasting={tasting} whiskies={whiskies} />
          </div>
        )}
      </div>

      {/* Blind Reveal Controls */}
      {isBlind && status === "open" && (
        <div style={cardStyle} data-testid="m2-blind-reveal-section">
          <div
            style={{ ...sectionTitleStyle, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Eye style={{ width: 14, height: 14 }} />
            {t("m2.hostControl.blindReveal", "Blind Reveal")}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: v.textSecondary, marginBottom: 8 }}>
              {t("m2.hostControl.revealProgress", "Reveal Progress")}: {revealIndex} / {whiskies.length} {t("m2.hostControl.whiskies", "whiskies")}
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {whiskies.map((_: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: idx < revealIndex ? v.accent : v.elevated,
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
            {revealIndex < whiskies.length && (
              <div style={{ fontSize: 12, color: v.muted, marginBottom: 4 }}>
                {t("m2.hostControl.currentStep", "Current step")}: {getRevealStepLabel(revealStep)}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {whiskies.map((w: any, idx: number) => {
              const isRevealed = idx < revealIndex;
              const isCurrent = idx === revealIndex;
              return (
                <div
                  key={w.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: isCurrent ? v.elevated : "transparent",
                    border: isCurrent ? `1px solid ${v.accent}` : `1px solid transparent`,
                  }}
                  data-testid={`m2-blind-whisky-${idx}`}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    background: isRevealed ? v.success : isCurrent ? v.accent : v.border,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff",
                  }}>
                    {isRevealed ? "✓" : idx + 1}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: isRevealed ? v.text : v.muted }}>
                    {isRevealed ? (w.name || t("m2.hostControl.whiskyN", "Whisky {{n}}", { n: idx + 1 })) : t("m2.hostControl.whiskyN", "Whisky {{n}}", { n: idx + 1 })}
                  </span>
                  {isRevealed && (
                    <span style={{ fontSize: 10, color: v.success, fontWeight: 600 }}>
                      {t("m2.hostControl.revealed", "Revealed")}
                    </span>
                  )}
                  {isCurrent && (
                    <span style={{ fontSize: 10, color: v.accent, fontWeight: 600 }}>
                      {getRevealStepLabel(revealStep)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {revealIndex < whiskies.length && (
            <button
              onClick={() => revealNextMutation.mutate()}
              disabled={revealNextMutation.isPending}
              style={{
                ...smallBtnStyle,
                width: "100%",
                justifyContent: "center",
                marginTop: 12,
                padding: "12px",
                background: v.accent,
                color: v.bg,
              }}
              data-testid="m2-reveal-next-button"
            >
              {revealNextMutation.isPending ? (
                <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              ) : (
                <Eye style={{ width: 16, height: 16 }} />
              )}
              {revealStep === 0
                ? t("m2.hostControl.revealNameBtn", "Reveal Name")
                : revealStep === 1
                ? t("m2.hostControl.revealDetailsBtn", "Reveal Details")
                : revealStep === 2
                ? t("m2.hostControl.revealImageBtn", "Reveal Image")
                : t("m2.hostControl.revealNextWhisky", "Next Whisky")}
            </button>
          )}

          {revealIndex >= whiskies.length && (
            <div style={{ textAlign: "center", padding: "12px", color: v.success, fontSize: 13, fontWeight: 600 }}>
              <CheckCircle style={{ width: 16, height: 16, display: "inline", verticalAlign: "-3px", marginRight: 4 }} />
              {t("m2.hostControl.allRevealed", "All whiskies revealed!")}
            </div>
          )}
        </div>
      )}

      {/* Guided Mode Controls */}
      {isGuided && (status === "open" || status === "reveal") && (
        <div style={cardStyle} data-testid="m2-guided-mode-section">
          <div
            style={{ ...sectionTitleStyle, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}
          >
            <SkipForward style={{ width: 14, height: 14 }} />
            {t("m2.hostControl.guidedMode", "Guided Mode")}
          </div>

          <div style={{ fontSize: 13, color: v.textSecondary, marginBottom: 12 }}>
            {guidedWhiskyIndex < 0
              ? t("m2.hostControl.guidedWaiting", "Participants are waiting. Advance to the first whisky.")
              : `${t("m2.hostControl.guidedCurrent", "Current whisky")}: ${guidedWhiskyIndex + 1} / ${whiskies.length}`}
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {whiskies.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => guidedGoToMutation.mutate({ whiskyIndex: idx })}
                style={{
                  flex: 1,
                  height: 32,
                  borderRadius: 6,
                  border: idx === guidedWhiskyIndex ? `2px solid ${v.accent}` : `1px solid ${v.border}`,
                  background: idx < guidedWhiskyIndex ? v.success : idx === guidedWhiskyIndex ? v.elevated : "transparent",
                  color: idx <= guidedWhiskyIndex ? v.text : v.muted,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                  transition: "all 0.2s",
                }}
                data-testid={`m2-guided-whisky-${idx}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => guidedAdvanceMutation.mutate()}
            disabled={guidedAdvanceMutation.isPending || guidedWhiskyIndex >= whiskies.length - 1}
            style={{
              ...smallBtnStyle,
              width: "100%",
              justifyContent: "center",
              padding: "12px",
              background: guidedWhiskyIndex >= whiskies.length - 1 ? v.border : v.accent,
              color: guidedWhiskyIndex >= whiskies.length - 1 ? v.muted : v.bg,
              opacity: guidedAdvanceMutation.isPending ? 0.6 : 1,
            }}
            data-testid="m2-guided-advance-button"
          >
            {guidedAdvanceMutation.isPending ? (
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
            ) : (
              <SkipForward style={{ width: 16, height: 16 }} />
            )}
            {guidedWhiskyIndex < 0
              ? t("m2.hostControl.guidedStart", "Start First Whisky")
              : guidedWhiskyIndex >= whiskies.length - 1
              ? t("m2.hostControl.guidedAllDone", "All Whiskies Done")
              : t("m2.hostControl.guidedNext", "Next Whisky")}
          </button>
        </div>
      )}

      {/* Participants — Rating Completion Overview */}
      <div
        style={sectionHeaderStyle}
        onClick={() => toggleSection("participants")}
        data-testid="m2-participants-toggle"
      >
        <span style={sectionTitleStyle}>
          {t("m2.hostControl.participants", "Participants")} ({totalParticipants})
        </span>
        {expandedSection === "participants" ? (
          <ChevronUp style={{ width: 16, height: 16, color: v.muted }} />
        ) : (
          <ChevronDown style={{ width: 16, height: 16, color: v.muted }} />
        )}
      </div>
      {expandedSection === "participants" && (() => {
        const pid = (p: any) => p.participantId || p.id;
        const ratedCount = participants.filter((p: any) => uniqueRaters.has(pid(p))).length;
        const progressPct = totalParticipants > 0 ? Math.round((ratedCount / totalParticipants) * 100) : 0;
        const getParticipantRatingSource = (pId: string): "digital" | "paper" | "pending" => {
          const pRatings = ratings.filter((r: any) => r.participantId === pId);
          if (pRatings.length === 0) return "pending";
          const hasPaper = pRatings.some((r: any) => r.source === "paper");
          const hasApp = pRatings.some((r: any) => !r.source || r.source === "app");
          if (hasPaper && !hasApp) return "paper";
          return "digital";
        };
        const missingParticipants = participants.filter((p: any) => !uniqueRaters.has(pid(p)));

        return (
          <div style={{ ...cardStyle, marginTop: -4, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <div style={{ marginBottom: 14 }} data-testid="rating-completion-overview">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: v.text }} data-testid="text-rating-progress">
                  {ratedCount} {t("m2.hostControl.of", "of")} {totalParticipants} {t("m2.hostControl.participantsRated", "participants rated")}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>
                  {progressPct}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: v.elevated, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: progressPct === 100 ? v.success : v.accent,
                  borderRadius: 3,
                  transition: "width 0.5s ease",
                }} />
              </div>
            </div>

            {missingParticipants.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 10, marginBottom: 12,
                background: `color-mix(in srgb, ${v.warning || v.accent} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${v.warning || v.accent} 25%, transparent)`,
              }} data-testid="missing-ratings-banner">
                <AlertCircle style={{ width: 14, height: 14, color: v.warning || v.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: v.textSecondary }}>
                  {missingParticipants.length} {t("m2.hostControl.missingRatings", "missing — collect their sheets")}
                </span>
              </div>
            )}

            {participants.map((p: any) => {
              const pId = pid(p);
              const source = getParticipantRatingSource(pId);
              const hasRated = source !== "pending";
              return (
                <div
                  key={pId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 0",
                    borderBottom: `1px solid ${v.border}`,
                  }}
                  data-testid={`m2-participant-${pId}`}
                >
                  {source === "digital" ? (
                    <CheckCircle style={{ width: 16, height: 16, color: v.success }} />
                  ) : source === "paper" ? (
                    <FileText style={{ width: 16, height: 16, color: v.accent }} />
                  ) : (
                    <Clock style={{ width: 16, height: 16, color: v.muted }} />
                  )}
                  <span style={{ fontSize: 14, color: v.text, flex: 1 }}>
                    {p.name || p.email || t("m2.hostControl.anonymous", "Anonymous")}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: source === "digital"
                      ? `color-mix(in srgb, ${v.success} 12%, transparent)`
                      : source === "paper"
                      ? `color-mix(in srgb, ${v.accent} 12%, transparent)`
                      : `color-mix(in srgb, ${v.muted} 12%, transparent)`,
                    color: source === "digital" ? v.success : source === "paper" ? v.accent : v.muted,
                  }} data-testid={`badge-source-${pId}`}>
                    {source === "digital"
                      ? t("m2.hostControl.sourceDigital", "Digital")
                      : source === "paper"
                      ? t("m2.hostControl.sourcePaper", "Paper")
                      : t("m2.hostControl.pending", "Pending")}
                  </span>
                </div>
              );
            })}
            {participants.length === 0 && (
              <div style={{ fontSize: 13, color: v.muted, textAlign: "center", padding: 12 }}>
                {t("m2.hostControl.noParticipants", "No participants yet")}
              </div>
            )}
          </div>
        );
      })()}

      {/* Whisky Management */}
      <div
        style={{ ...sectionHeaderStyle, marginTop: 4 }}
        onClick={() => toggleSection("whiskies")}
        data-testid="m2-whiskies-toggle"
      >
        <span style={sectionTitleStyle}>
          {t("m2.hostControl.manageWhiskies", "Manage Whiskies")} ({whiskies.length})
        </span>
        {expandedSection === "whiskies" ? (
          <ChevronUp style={{ width: 16, height: 16, color: v.muted }} />
        ) : (
          <ChevronDown style={{ width: 16, height: 16, color: v.muted }} />
        )}
      </div>
      {expandedSection === "whiskies" && (
        <div style={{ ...cardStyle, marginTop: -4, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          {whiskies.map((w: any, idx: number) => (
            <div
              key={w.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 0",
                borderBottom: idx < whiskies.length - 1 ? `1px solid ${v.border}` : "none",
              }}
              data-testid={`m2-whisky-item-${w.id}`}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: v.elevated,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: v.accent,
              }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {w.name || t("m2.hostControl.unnamed", "Unnamed")}
                </div>
                {(w.distillery || w.abv) && (
                  <div style={{ fontSize: 11, color: v.muted }}>
                    {[w.distillery, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              {editingWhisky?.id !== w.id && (
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => setEditingWhisky({ ...w })}
                    style={{ ...smallBtnStyle, padding: "6px 8px", background: v.elevated, color: v.text }}
                    data-testid={`m2-edit-whisky-${w.id}`}
                  >
                    <Edit3 style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t("m2.hostControl.deleteConfirm", "Delete this whisky?"))) {
                        deleteWhiskyMutation.mutate(w.id);
                      }
                    }}
                    style={{ ...smallBtnStyle, padding: "6px 8px", background: v.elevated, color: v.danger }}
                    data-testid={`m2-delete-whisky-${w.id}`}
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {editingWhisky && (
            <div style={{ padding: "12px 0", borderTop: `1px solid ${v.border}` }} data-testid="m2-edit-whisky-form">
              <div style={{ fontSize: 12, fontWeight: 600, color: v.accent, marginBottom: 8 }}>
                {t("m2.hostControl.editWhisky", "Edit Whisky")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  style={inputStyle}
                  placeholder={t("m2.hostControl.whiskyName", "Name")}
                  value={editingWhisky.name || ""}
                  onChange={(e) => setEditingWhisky({ ...editingWhisky, name: e.target.value })}
                  data-testid="input-edit-whisky-name"
                />
                <input
                  style={inputStyle}
                  placeholder={t("m2.hostControl.distillery", "Distillery")}
                  value={editingWhisky.distillery || ""}
                  onChange={(e) => setEditingWhisky({ ...editingWhisky, distillery: e.target.value })}
                  data-testid="input-edit-whisky-distillery"
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder={t("m2.hostControl.abv", "ABV %")}
                    value={editingWhisky.abv || ""}
                    onChange={(e) => setEditingWhisky({ ...editingWhisky, abv: e.target.value })}
                    data-testid="input-edit-whisky-abv"
                  />
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder={t("m2.hostControl.age", "Age")}
                    value={editingWhisky.age || ""}
                    onChange={(e) => setEditingWhisky({ ...editingWhisky, age: e.target.value })}
                    data-testid="input-edit-whisky-age"
                  />
                </div>
                <input
                  style={inputStyle}
                  placeholder={t("m2.hostControl.caskType", "Cask Type")}
                  value={editingWhisky.caskType || ""}
                  onChange={(e) => setEditingWhisky({ ...editingWhisky, caskType: e.target.value })}
                  data-testid="input-edit-whisky-cask"
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setEditingWhisky(null)}
                    style={{ ...smallBtnStyle, flex: 1, justifyContent: "center", background: v.elevated, color: v.text, border: `1px solid ${v.border}` }}
                    data-testid="button-cancel-edit-whisky"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    onClick={() => updateWhiskyMutation.mutate({
                      id: editingWhisky.id,
                      data: {
                        name: editingWhisky.name,
                        distillery: editingWhisky.distillery,
                        abv: editingWhisky.abv,
                        age: editingWhisky.age,
                        caskType: editingWhisky.caskType,
                      }
                    })}
                    style={{ ...smallBtnStyle, flex: 1, justifyContent: "center", background: v.accent, color: v.bg }}
                    data-testid="button-save-edit-whisky"
                  >
                    {t("common.save", "Save")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAddWhisky ? (
            <div style={{ padding: "12px 0", borderTop: `1px solid ${v.border}` }} data-testid="m2-add-whisky-form">
              <div style={{ fontSize: 12, fontWeight: 600, color: v.accent, marginBottom: 8 }}>
                {t("m2.hostControl.addWhisky", "Add Whisky")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  style={inputStyle}
                  placeholder={t("m2.hostControl.whiskyName", "Name") + " *"}
                  value={newWhisky.name}
                  onChange={(e) => setNewWhisky({ ...newWhisky, name: e.target.value })}
                  data-testid="input-new-whisky-name"
                />
                <input
                  style={inputStyle}
                  placeholder={t("m2.hostControl.distillery", "Distillery")}
                  value={newWhisky.distillery}
                  onChange={(e) => setNewWhisky({ ...newWhisky, distillery: e.target.value })}
                  data-testid="input-new-whisky-distillery"
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder={t("m2.hostControl.abv", "ABV %")}
                    value={newWhisky.abv}
                    onChange={(e) => setNewWhisky({ ...newWhisky, abv: e.target.value })}
                    data-testid="input-new-whisky-abv"
                  />
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder={t("m2.hostControl.age", "Age")}
                    value={newWhisky.age}
                    onChange={(e) => setNewWhisky({ ...newWhisky, age: e.target.value })}
                    data-testid="input-new-whisky-age"
                  />
                </div>
                <input
                  style={inputStyle}
                  placeholder={t("m2.hostControl.caskType", "Cask Type")}
                  value={newWhisky.caskType}
                  onChange={(e) => setNewWhisky({ ...newWhisky, caskType: e.target.value })}
                  data-testid="input-new-whisky-cask"
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setShowAddWhisky(false); setNewWhisky({ name: "", distillery: "", abv: "", age: "", caskType: "", notes: "" }); }}
                    style={{ ...smallBtnStyle, flex: 1, justifyContent: "center", background: v.elevated, color: v.text, border: `1px solid ${v.border}` }}
                    data-testid="button-cancel-add-whisky"
                  >
                    {t("common.cancel", "Cancel")}
                  </button>
                  <button
                    onClick={() => {
                      if (!newWhisky.name.trim()) return;
                      createWhiskyMutation.mutate({
                        name: newWhisky.name,
                        distillery: newWhisky.distillery || undefined,
                        abv: newWhisky.abv || undefined,
                        age: newWhisky.age || undefined,
                        caskType: newWhisky.caskType || undefined,
                        notes: newWhisky.notes || undefined,
                        sortOrder: whiskies.length,
                      });
                    }}
                    disabled={!newWhisky.name.trim() || createWhiskyMutation.isPending}
                    style={{
                      ...smallBtnStyle,
                      flex: 1,
                      justifyContent: "center",
                      background: newWhisky.name.trim() ? v.accent : v.border,
                      color: newWhisky.name.trim() ? v.bg : v.muted,
                      opacity: createWhiskyMutation.isPending ? 0.6 : 1,
                    }}
                    data-testid="button-save-add-whisky"
                  >
                    {createWhiskyMutation.isPending ? (
                      <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                    ) : (
                      <Plus style={{ width: 14, height: 14 }} />
                    )}
                    {t("common.add", "Add")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddWhisky(true)}
              style={{
                ...smallBtnStyle,
                width: "100%",
                justifyContent: "center",
                marginTop: 8,
                padding: "10px",
                background: "transparent",
                color: v.accent,
                border: `1px dashed ${v.border}`,
              }}
              data-testid="button-add-whisky"
            >
              <Plus style={{ width: 14, height: 14 }} />
              {t("m2.hostControl.addWhisky", "Add Whisky")}
            </button>
          )}
        </div>
      )}

      {/* Scan Paper Sheets */}
      <div
        style={{ ...sectionHeaderStyle, marginTop: 4 }}
        onClick={() => toggleSection("paperScan")}
        data-testid="m2-paper-scan-toggle"
      >
        <span style={sectionTitleStyle}>
          <Camera style={{ width: 14, height: 14, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
          {t("m2.hostControl.scanPaperSheets", "Scan Paper Sheets")}
        </span>
        {expandedSection === "paperScan" ? (
          <ChevronUp style={{ width: 16, height: 16, color: v.muted }} />
        ) : (
          <ChevronDown style={{ width: 16, height: 16, color: v.muted }} />
        )}
      </div>
      {expandedSection === "paperScan" && (
        <div style={{ ...cardStyle, marginTop: -4, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          {scanSuccess && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 12px", borderRadius: 10, marginBottom: 12,
                background: `color-mix(in srgb, ${v.success} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${v.success} 30%, transparent)`,
              }}
              data-testid="scan-success-message"
            >
              <CheckCircle style={{ width: 16, height: 16, color: v.success, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: v.success, fontWeight: 600 }}>{scanSuccess}</span>
            </div>
          )}

          {scanError && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 12px", borderRadius: 10, marginBottom: 12,
                background: `color-mix(in srgb, ${v.danger} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${v.danger} 30%, transparent)`,
              }}
              data-testid="scan-error-message"
            >
              <AlertCircle style={{ width: 16, height: 16, color: v.danger, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: v.danger }}>{scanError}</span>
            </div>
          )}

          {!scanResult && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
                  {t("m2.hostControl.selectParticipant", "Participant (optional)")}
                </label>
                <select
                  value={scanParticipantId}
                  onChange={(e) => setScanParticipantId(e.target.value)}
                  style={{
                    ...inputStyle,
                    appearance: "auto",
                  }}
                  data-testid="select-scan-participant"
                >
                  <option value="">{t("m2.hostControl.autoDetect", "Auto-detect from sheet")}</option>
                  {participants
                    .filter((p: any) => !uniqueRaters.has(p.participantId || p.id))
                    .map((p: any) => (
                      <option key={p.participantId || p.id} value={p.participantId || p.id}>
                        {p.name || p.participant?.name || p.email || t("m2.hostControl.anonymous", "Anonymous")} — {t("m2.hostControl.pending", "Pending")}
                      </option>
                    ))}
                  {participants
                    .filter((p: any) => uniqueRaters.has(p.participantId || p.id))
                    .map((p: any) => (
                      <option key={p.participantId || p.id} value={p.participantId || p.id}>
                        {p.name || p.participant?.name || p.email || t("m2.hostControl.anonymous", "Anonymous")}
                      </option>
                    ))}
                </select>
              </div>

              <input
                ref={scanFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) setScanPhotos(files);
                }}
                data-testid="input-scan-file"
              />

              {scanPhotos.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: v.muted, marginBottom: 6 }}>
                    {scanPhotos.length} {t("m2.hostControl.photosSelected", "photo(s) selected")}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {scanPhotos.map((f, i) => (
                      <div key={i} style={{
                        width: 56, height: 56, borderRadius: 8, overflow: "hidden",
                        border: `1px solid ${v.border}`, position: "relative",
                      }}>
                        <img
                          src={URL.createObjectURL(f)}
                          alt={f.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => scanFileRef.current?.click()}
                  style={{
                    ...smallBtnStyle,
                    flex: 1,
                    justifyContent: "center",
                    padding: "12px",
                    background: v.elevated,
                    color: v.accent,
                    border: `1px solid ${v.border}`,
                  }}
                  data-testid="button-scan-capture"
                >
                  <Camera style={{ width: 16, height: 16 }} />
                  {scanPhotos.length > 0
                    ? t("m2.hostControl.changePhoto", "Change Photo")
                    : t("m2.hostControl.takePhoto", "Take Photo")}
                </button>

                {scanPhotos.length > 0 && (
                  <button
                    onClick={async () => {
                      setScanLoading(true);
                      setScanError("");
                      setScanSuccess("");
                      try {
                        const result = await paperScanApi.scanSheet(
                          id,
                          scanPhotos,
                          scanParticipantId || undefined
                        );
                        setScanResult(result);
                      } catch (err: any) {
                        setScanError(err.message || t("m2.hostControl.scanFailed", "Scan failed. Please try again."));
                      }
                      setScanLoading(false);
                    }}
                    disabled={scanLoading}
                    style={{
                      ...smallBtnStyle,
                      flex: 1,
                      justifyContent: "center",
                      padding: "12px",
                      background: v.accent,
                      color: v.bg,
                      opacity: scanLoading ? 0.6 : 1,
                    }}
                    data-testid="button-scan-upload"
                  >
                    {scanLoading ? (
                      <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    ) : (
                      <Upload style={{ width: 16, height: 16 }} />
                    )}
                    {scanLoading
                      ? t("m2.hostControl.scanning", "Scanning...")
                      : t("m2.hostControl.analyzeSheet", "Analyze Sheet")}
                  </button>
                )}
              </div>
            </>
          )}

          {scanResult && (
            <div data-testid="scan-review-section">
              <div style={{ fontSize: 14, fontWeight: 700, color: v.text, marginBottom: 4 }}>
                {t("m2.hostControl.reviewScores", "Review Extracted Scores")}
              </div>
              {scanResult.participantName && (
                <div style={{ fontSize: 12, color: v.muted, marginBottom: 12 }}>
                  {t("m2.hostControl.detectedParticipant", "Detected participant")}: <strong style={{ color: v.text }}>{scanResult.participantName}</strong>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(scanResult.scores || []).map((score: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: v.elevated,
                      borderRadius: 10,
                      padding: "12px",
                      border: `1px solid ${v.border}`,
                    }}
                    data-testid={`scan-score-card-${idx}`}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: v.accent, marginBottom: 8 }}>
                      {score.whiskyName || `Whisky #${(score.whiskyIndex ?? idx) + 1}`}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {["nose", "taste", "finish", "balance", "overall"].map((dim) => (
                        <div key={dim} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <label style={{ fontSize: 11, color: v.muted, width: 48, textTransform: "capitalize" }}>
                            {t(`m2.hostControl.${dim}`, dim)}
                          </label>
                          <input
                            type="number"
                            value={score[dim] ?? ""}
                            onChange={(e) => {
                              const updated = [...scanResult.scores];
                              updated[idx] = { ...updated[idx], [dim]: e.target.value === "" ? null : Number(e.target.value) };
                              setScanResult({ ...scanResult, scores: updated });
                            }}
                            style={{
                              ...inputStyle,
                              width: 60,
                              padding: "6px 8px",
                              fontSize: 13,
                              textAlign: "center",
                            }}
                            data-testid={`input-scan-${dim}-${idx}`}
                          />
                        </div>
                      ))}
                    </div>
                    {score.notes && (
                      <div style={{ marginTop: 8 }}>
                        <label style={{ fontSize: 11, color: v.muted, display: "block", marginBottom: 4 }}>
                          {t("m2.hostControl.notes", "Notes")}
                        </label>
                        <textarea
                          value={score.notes || ""}
                          onChange={(e) => {
                            const updated = [...scanResult.scores];
                            updated[idx] = { ...updated[idx], notes: e.target.value };
                            setScanResult({ ...scanResult, scores: updated });
                          }}
                          style={{
                            ...inputStyle,
                            minHeight: 48,
                            resize: "vertical",
                            fontSize: 12,
                          }}
                          data-testid={`input-scan-notes-${idx}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!scanResult.participantId && !scanParticipantId && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: v.muted, display: "block", marginBottom: 6 }}>
                    {t("m2.hostControl.assignParticipant", "Assign to participant")}
                  </label>
                  <select
                    value={scanParticipantId}
                    onChange={(e) => setScanParticipantId(e.target.value)}
                    style={{ ...inputStyle, appearance: "auto" }}
                    data-testid="select-scan-assign-participant"
                  >
                    <option value="">{t("m2.hostControl.selectOne", "— Select —")}</option>
                    {participants.map((p: any) => (
                      <option key={p.participantId || p.id} value={p.participantId || p.id}>
                        {p.name || p.participant?.name || p.email || t("m2.hostControl.anonymous", "Anonymous")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => {
                    setScanResult(null);
                    setScanPhotos([]);
                    setScanParticipantId("");
                    setScanError("");
                    setScanSuccess("");
                  }}
                  style={{
                    ...smallBtnStyle,
                    flex: 1,
                    justifyContent: "center",
                    padding: "12px",
                    background: v.elevated,
                    color: v.text,
                    border: `1px solid ${v.border}`,
                  }}
                  data-testid="button-scan-discard"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  onClick={async () => {
                    const pid = scanResult.participantId || scanParticipantId;
                    if (!pid) {
                      setScanError(t("m2.hostControl.selectParticipantFirst", "Please select a participant first."));
                      return;
                    }
                    setConfirmLoading(true);
                    setScanError("");
                    try {
                      await paperScanApi.confirmScores(id, pid, scanResult.scores);
                      const pName = participants.find((p: any) => (p.participantId || p.id) === pid)?.name || participants.find((p: any) => (p.participantId || p.id) === pid)?.participant?.name || scanResult.participantName || pid;
                      setScanSuccess(t("m2.hostControl.scoresImported", "Scores for {{name}} imported successfully!", { name: pName }));
                      setScanResult(null);
                      setScanPhotos([]);
                      setScanParticipantId("");
                      queryClient.invalidateQueries({ queryKey: ["ratings", id] });
                    } catch (err: any) {
                      setScanError(err.message || t("m2.hostControl.confirmFailed", "Failed to save scores."));
                    }
                    setConfirmLoading(false);
                  }}
                  disabled={confirmLoading || (!scanResult.participantId && !scanParticipantId)}
                  style={{
                    ...smallBtnStyle,
                    flex: 1,
                    justifyContent: "center",
                    padding: "12px",
                    background: (!scanResult.participantId && !scanParticipantId) ? v.border : v.accent,
                    color: (!scanResult.participantId && !scanParticipantId) ? v.muted : v.bg,
                    opacity: confirmLoading ? 0.6 : 1,
                  }}
                  data-testid="button-scan-confirm"
                >
                  {confirmLoading ? (
                    <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                  ) : (
                    <CheckCircle style={{ width: 16, height: 16 }} />
                  )}
                  {t("m2.hostControl.confirmSave", "Confirm & Save")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Highlights */}
      {(status === "closed" || status === "reveal" || status === "archived") && (
        <div style={cardStyle} data-testid="m2-ai-highlights-section">
          <div style={{ ...sectionTitleStyle, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles style={{ width: 14, height: 14 }} />
            {t("m2.hostControl.aiHighlights", "AI Highlights")}
          </div>

          {!aiHighlights && !aiLoading && (
            <button
              onClick={handleGenerateHighlights}
              style={{
                ...smallBtnStyle,
                width: "100%",
                justifyContent: "center",
                padding: "12px",
                background: v.elevated,
                color: v.accent,
                border: `1px solid ${v.border}`,
              }}
              data-testid="button-generate-highlights"
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              {t("m2.hostControl.generateHighlights", "Generate AI Highlights")}
            </button>
          )}

          {aiLoading && (
            <div style={{ textAlign: "center", padding: 16 }}>
              <Loader2 style={{ width: 24, height: 24, color: v.accent, animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, color: v.muted }}>
                {t("m2.hostControl.generatingHighlights", "Generating highlights...")}
              </div>
            </div>
          )}

          {aiHighlights && !aiHighlights.error && (
            <div data-testid="m2-highlights-content">
              {aiHighlights.topRated && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: v.accent, marginBottom: 4 }}>
                    🏆 {t("m2.hostControl.topRated", "Top Rated")}
                  </div>
                  <div style={{ fontSize: 14, color: v.text }}>
                    {aiHighlights.topRated.name || "—"}
                  </div>
                  {aiHighlights.topRated.avgScore && (
                    <div style={{ fontSize: 12, color: v.muted }}>
                      {t("m2.hostControl.avgScore", "Avg Score")}: {Number(aiHighlights.topRated.avgScore).toFixed(1)}
                    </div>
                  )}
                </div>
              )}
              {aiHighlights.mostDivisive && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: v.accent, marginBottom: 4 }}>
                    🔥 {t("m2.hostControl.mostDivisive", "Most Divisive")}
                  </div>
                  <div style={{ fontSize: 14, color: v.text }}>
                    {aiHighlights.mostDivisive.name || "—"}
                  </div>
                </div>
              )}
              {aiHighlights.participantHighlights?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: v.accent, marginBottom: 4 }}>
                    👥 {t("m2.hostControl.participantHighlights", "Participant Highlights")}
                  </div>
                  {aiHighlights.participantHighlights.slice(0, 3).map((h: any, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: v.textSecondary, padding: "2px 0" }}>
                      {h.name}: {h.label}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleGenerateHighlights}
                style={{
                  ...smallBtnStyle,
                  padding: "6px 10px",
                  background: "transparent",
                  color: v.muted,
                  border: `1px solid ${v.border}`,
                }}
                data-testid="button-refresh-highlights"
              >
                <RefreshCw style={{ width: 12, height: 12 }} />
                {t("m2.hostControl.refresh", "Refresh")}
              </button>
            </div>
          )}

          {aiHighlights?.error && (
            <div style={{ fontSize: 13, color: v.danger, textAlign: "center", padding: 8 }}>
              {t("m2.hostControl.highlightsError", "Could not generate highlights. Try again later.")}
            </div>
          )}
        </div>
      )}

      {/* Main Action Button */}
      {status !== "archived" && (
        <button
          onClick={handleNextState}
          disabled={updateStatus.isPending}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "16px",
            borderRadius: 12,
            border: "none",
            background: v.accent,
            color: v.bg,
            fontWeight: 700,
            fontSize: 16,
            cursor: updateStatus.isPending ? "wait" : "pointer",
            fontFamily: "system-ui, sans-serif",
            opacity: updateStatus.isPending ? 0.6 : 1,
            marginTop: 8,
          }}
          data-testid="m2-host-action-button"
        >
          <ActionIcon style={{ width: 20, height: 20 }} />
          {getActionLabel()}
        </button>
      )}

      {/* End Confirm Modal */}
      {showEndConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
          data-testid="m2-end-confirm-overlay"
        >
          <div
            style={{
              background: v.card,
              borderRadius: 16,
              padding: "24px",
              maxWidth: 340,
              width: "100%",
              textAlign: "center",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: v.text, margin: "0 0 8px" }}>
              {t("m2.hostControl.endConfirmTitle", "End Tasting?")}
            </h3>
            <p style={{ fontSize: 14, color: v.textSecondary, margin: "0 0 20px" }}>
              {t("m2.hostControl.endConfirmDesc", "This will archive the tasting. Participants can still view results.")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: `1px solid ${v.border}`,
                  background: "transparent",
                  color: v.text,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid="m2-end-cancel"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={handleEnd}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: v.danger,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid="m2-end-confirm"
              >
                {t("m2.hostControl.endConfirm", "End")}
              </button>
            </div>
          </div>
        </div>
      )}

      <Link
        href={`/m2/tastings/session/${id}/play`}
        style={{ textDecoration: "none" }}
      >
        <div
          style={{
            position: "fixed",
            bottom: 80,
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
          data-testid="button-rate-whiskies-toggle"
        >
          <Star style={{ width: 18, height: 18 }} />
          {t("m2.hostControl.rateWhiskies", "Rate Whiskies")}
        </div>
      </Link>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
