import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { getSession } from "@/lib/session";
import { Star, ChevronLeft, ChevronRight, Check } from "lucide-react";

export default function M2TastingPlay() {
  const { t } = useTranslation();
  const [, params] = useRoute("/m2/tastings/session/:id/play");
  const id = params?.id || "";
  const session = getSession();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  const { data: tasting } = useQuery({
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

  const { data: existingRatings = [] } = useQuery({
    queryKey: ["my-ratings", id, session.pid],
    queryFn: () => ratingApi.getForTasting(id),
    enabled: !!id && !!session.pid,
  });

  useEffect(() => {
    if (existingRatings.length > 0) {
      const alreadySubmitted = new Set<string>();
      const existingScores: Record<string, number> = {};
      existingRatings
        .filter((r: any) => r.participantId === session.pid)
        .forEach((r: any) => {
          alreadySubmitted.add(r.whiskyId);
          existingScores[r.whiskyId] = r.overall ?? 70;
        });
      setSubmitted(alreadySubmitted);
      setScores((prev) => ({ ...existingScores, ...prev }));
    }
  }, [existingRatings, session.pid]);

  const submitRating = useMutation({
    mutationFn: async (whiskyId: string) => {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session.pid ? { "x-participant-id": session.pid } : {}),
        },
        body: JSON.stringify({
          tastingId: id,
          whiskyId,
          participantId: session.pid,
          overall: scores[whiskyId] ?? 70,
        }),
      });
      if (!res.ok) throw new Error("Rating failed");
      return res.json();
    },
    onSuccess: (_, whiskyId) => {
      setSubmitted((prev) => new Set(prev).add(whiskyId));
      queryClient.invalidateQueries({ queryKey: ["my-ratings", id] });
      queryClient.invalidateQueries({ queryKey: ["ratings", id] });
    },
  });

  const whisky = whiskies[currentIdx];
  const blindMode = tasting?.blindMode;

  if (!session.signedIn) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-play-page">
        <M2BackButton />
        <div style={{ background: v.elevated, borderRadius: 12, padding: "24px 16px", textAlign: "center", color: v.textSecondary, fontSize: 14, marginTop: 24 }}>
          {t("m2.play.signInPrompt", "Sign in to participate in this tasting")}
        </div>
      </div>
    );
  }

  if (!whisky) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-play-page">
        <M2BackButton />
        <div style={{ background: v.elevated, borderRadius: 12, padding: "24px 16px", textAlign: "center", color: v.textSecondary, fontSize: 14, marginTop: 24 }}>
          {t("m2.play.noWhiskies", "No whiskies in this tasting yet")}
        </div>
      </div>
    );
  }

  const isSubmitted = submitted.has(whisky.id);

  return (
    <div style={{ padding: "16px" }} data-testid="m2-play-page">
      <M2BackButton />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0" }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: v.text, margin: 0 }} data-testid="text-m2-play-title">
          {t("m2.play.title", "Tasting Room")}
        </h1>
        <span style={{ fontSize: 13, color: v.muted, fontVariantNumeric: "tabular-nums" }}>
          {currentIdx + 1} / {whiskies.length}
        </span>
      </div>

      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "20px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: v.text, marginBottom: 4 }}>
          {blindMode ? `Dram ${currentIdx + 1}` : (whisky.name || `Dram ${currentIdx + 1}`)}
        </div>
        {!blindMode && whisky.distillery && (
          <div style={{ fontSize: 13, color: v.textSecondary }}>{whisky.distillery}</div>
        )}
        {!blindMode && whisky.age && (
          <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>{whisky.age} years · {whisky.abv ? `${whisky.abv}%` : ""}</div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: v.textSecondary, display: "block", marginBottom: 6 }}>
          {t("m2.play.yourRating", "Your Rating")}: {scores[whisky.id] ?? 70}/100
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={scores[whisky.id] ?? 70}
          onChange={(e) => setScores((prev) => ({ ...prev, [whisky.id]: Number(e.target.value) }))}
          disabled={isSubmitted}
          style={{ width: "100%", accentColor: v.accent }}
          data-testid="m2-play-rating-slider"
        />
      </div>

      {!isSubmitted ? (
        <button
          onClick={() => submitRating.mutate(whisky.id)}
          disabled={submitRating.isPending}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px",
            borderRadius: 12,
            border: "none",
            background: v.accent,
            color: v.bg,
            fontWeight: 700,
            fontSize: 15,
            cursor: submitRating.isPending ? "wait" : "pointer",
            fontFamily: "system-ui, sans-serif",
            marginBottom: 16,
          }}
          data-testid="m2-play-submit"
        >
          <Star style={{ width: 18, height: 18 }} />
          {submitRating.isPending ? t("m2.play.submitting", "Submitting...") : t("m2.play.submitRating", "Submit Rating")}
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px", color: v.success, fontSize: 14, fontWeight: 600, marginBottom: 16 }} data-testid="m2-play-submitted">
          <Check style={{ width: 18, height: 18 }} />
          {t("m2.play.ratingSubmitted", "Rating submitted")}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "12px", borderRadius: 10, border: `1px solid ${v.border}`, background: "transparent", color: currentIdx === 0 ? v.muted : v.text, fontWeight: 600, fontSize: 14, cursor: currentIdx === 0 ? "default" : "pointer", fontFamily: "system-ui, sans-serif" }}
          data-testid="m2-play-prev"
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
          {t("m2.play.prev", "Previous")}
        </button>
        <button
          onClick={() => setCurrentIdx((i) => Math.min(whiskies.length - 1, i + 1))}
          disabled={currentIdx >= whiskies.length - 1}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "12px", borderRadius: 10, border: `1px solid ${v.border}`, background: "transparent", color: currentIdx >= whiskies.length - 1 ? v.muted : v.text, fontWeight: 600, fontSize: 14, cursor: currentIdx >= whiskies.length - 1 ? "default" : "pointer", fontFamily: "system-ui, sans-serif" }}
          data-testid="m2-play-next"
        >
          {t("m2.play.next", "Next")}
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}
