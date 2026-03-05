import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { getSession } from "@/lib/session";
import { Play, Lock, Eye, Archive, ChevronRight, CheckCircle, Clock } from "lucide-react";

export default function M2HostControl() {
  const { t } = useTranslation();
  const [, params] = useRoute("/m2/tastings/session/:id/host");
  const id = params?.id || "";
  const session = getSession();
  const [showEndConfirm, setShowEndConfirm] = useState(false);

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

  if (isLoading || !tasting) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: v.muted }}>
        {t("common.loading", "Loading...")}
      </div>
    );
  }

  const status = tasting.status;
  const currentAct = tasting.currentAct || "act1";

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

  return (
    <div style={{ padding: "16px" }} data-testid="m2-host-control-page">
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
      <p style={{ fontSize: 13, color: v.textSecondary, margin: "0 0 20px" }}>
        {tasting.title || t("m2.tastings.untitled", "Untitled Tasting")}
      </p>

      <div
        style={{
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: 14,
          padding: "16px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 12, color: v.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 8 }}>
          {t("m2.hostControl.status", "Status")}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: v.text }}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
          {status === "reveal" && ` — Act ${currentAct.replace("act", "")}`}
        </div>
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
        <div style={{ fontSize: 12, color: v.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 12 }}>
          {t("m2.hostControl.participants", "Participants")} ({totalParticipants})
        </div>
        {participants.map((p: any) => {
          const hasRated = uniqueRaters.has(p.id);
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                borderBottom: `1px solid ${v.border}`,
              }}
              data-testid={`m2-participant-${p.id}`}
            >
              {hasRated ? (
                <CheckCircle style={{ width: 16, height: 16, color: v.success }} />
              ) : (
                <Clock style={{ width: 16, height: 16, color: v.muted }} />
              )}
              <span style={{ fontSize: 14, color: v.text, flex: 1 }}>
                {p.name || p.email || "Anonymous"}
              </span>
              <span style={{ fontSize: 11, color: hasRated ? v.success : v.muted }}>
                {hasRated ? t("m2.hostControl.rated", "Rated") : t("m2.hostControl.pending", "Pending")}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, background: v.elevated, borderRadius: 10, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{whiskies.length}</div>
          <div style={{ fontSize: 11, color: v.muted }}>{t("m2.hostControl.drams", "Drams")}</div>
        </div>
        <div style={{ flex: 1, background: v.elevated, borderRadius: 10, padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{ratings.length}</div>
          <div style={{ fontSize: 11, color: v.muted }}>{t("m2.hostControl.ratings", "Ratings")}</div>
        </div>
      </div>

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
          }}
          data-testid="m2-host-action-button"
        >
          <ActionIcon style={{ width: 20, height: 20 }} />
          {getActionLabel()}
        </button>
      )}

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
    </div>
  );
}
