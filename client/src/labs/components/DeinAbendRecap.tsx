import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles } from "lucide-react";
import LabsScoreRing from "@/labs/components/LabsScoreRing";
import { formatScore } from "@/lib/utils";
import { trackEvent } from "@/lib/funnelTracker";

const MIN_ROUND_RATERS = 3;

interface DeinAbendRecapProps {
  tasting: any;
  whiskies: any[];
  ratings: any[];
  participants?: any[];
  currentParticipant: { id?: string | null } | null;
}

export default function DeinAbendRecap({
  tasting,
  whiskies,
  ratings,
  participants,
  currentParticipant,
}: DeinAbendRecapProps) {
  const { t } = useTranslation();

  const sMax = (tasting?.ratingScale as number) || 100;
  const scaleMin = sMax === 100 ? 60 : 0;
  const dramLabel = t("liveUi.recap.dram");

  const blindMasked = useMemo(() => {
    if (!tasting?.blindMode) return false;
    const status = String(tasting?.status ?? "");
    // Once the tasting reaches its results phase, names are public.
    if (status === "closed" || status === "archived") return false;
    // Otherwise (e.g. "reveal" status) mask until the name has been revealed,
    // mirroring the reveal-order logic used in the live step view.
    const defaultOrder: string[][] = [
      ["name"],
      ["distillery", "age", "abv", "region", "country", "category", "caskType", "bottler", "vintage", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"],
      ["image"],
    ];
    let stepGroups = defaultOrder;
    try {
      if (tasting?.revealOrder) {
        const parsed = JSON.parse(tasting.revealOrder);
        if (Array.isArray(parsed) && parsed.length > 0) stepGroups = parsed;
      }
    } catch {}
    const revealStep = (tasting?.guidedRevealStep as number) ?? 0;
    const isFullyRevealed = revealStep >= stepGroups.length;
    let nameRevealed = isFullyRevealed;
    for (let s = 0; s < revealStep && s < stepGroups.length; s++) {
      if (stepGroups[s].includes("name")) nameRevealed = true;
    }
    return !nameRevealed;
  }, [tasting?.blindMode, tasting?.status, tasting?.revealOrder, tasting?.guidedRevealStep]);

  const recap = useMemo(() => {
    const toUserScale = (v: number | null | undefined): number | null => {
      if (v == null) return null;
      if (sMax !== 100 && v > sMax) return Math.round((v / 100) * sMax * 10) / 10;
      return v;
    };
    const roundForScale = (v: number) =>
      sMax === 100 ? Math.round(v) : Math.round(v * 10) / 10;

    const excludedPids = new Set<string>(
      (participants || [])
        .filter((p) => p?.excludedFromResults)
        .map((p) => String(p?.participantId || p?.id || "")),
    );
    const includedRatings = excludedPids.size > 0
      ? (ratings || []).filter((r) => !excludedPids.has(String(r?.participantId)))
      : (ratings || []);

    const uniqueRaters = new Set(
      includedRatings
        .filter((r) => r?.overall != null && r.overall > 0)
        .map((r) => String(r?.participantId)),
    ).size;

    const myId = currentParticipant?.id ?? null;
    const curve: { idx: number; label: string; score: number }[] = [];
    let groupAvgSum = 0;
    let groupAvgCount = 0;

    (whiskies || []).forEach((w, i) => {
      const label = blindMasked ? `${dramLabel} ${i + 1}` : (w?.name || `${dramLabel} ${i + 1}`);

      const groupVals = includedRatings
        .filter((r) => r?.whiskyId === w?.id)
        .map((r) => toUserScale(r?.overall))
        .filter((v): v is number => v != null && v > 0);
      if (groupVals.length > 0) {
        groupAvgSum += groupVals.reduce((a, b) => a + b, 0) / groupVals.length;
        groupAvgCount += 1;
      }

      const mine = myId
        ? includedRatings.find((r) => r?.whiskyId === w?.id && r?.participantId === myId)
        : null;
      const myScore = toUserScale(mine?.overall);
      if (myScore != null && myScore > 0) {
        curve.push({ idx: i, label, score: myScore });
      }
    });

    const myAvg = curve.length > 0
      ? roundForScale(curve.reduce((s, c) => s + c.score, 0) / curve.length)
      : null;
    const groupAvg = groupAvgCount > 0
      ? roundForScale(groupAvgSum / groupAvgCount)
      : null;

    const topDram = curve.length > 0
      ? curve.reduce((best, c) => (c.score > best.score ? c : best), curve[0])
      : null;

    return { curve, myAvg, groupAvg, topDram, uniqueRaters };
  }, [whiskies, ratings, participants, currentParticipant, sMax, blindMasked, dramLabel]);

  const hasData = recap.curve.length > 0;

  const firedRef = useRef(false);
  useEffect(() => {
    if (!hasData || firedRef.current) return;
    firedRef.current = true;
    try {
      trackEvent("recap_viewed", {
        page: typeof window !== "undefined" ? window.location.pathname : undefined,
        live: { type: "recap_viewed", detail: String(tasting?.id ?? "") },
      });
    } catch {}
  }, [hasData, tasting?.id]);

  if (!hasData) return null;

  const { curve, myAvg, groupAvg, topDram, uniqueRaters } = recap;
  const showRound = uniqueRaters >= MIN_ROUND_RATERS && myAvg != null && groupAvg != null;
  const delta = showRound ? Math.round((myAvg! - groupAvg!) * 10) / 10 : 0;

  const deltaText = (() => {
    if (!showRound) return null;
    if (delta > 0) return t("liveUi.recap.deltaAbove", { points: formatScore(Math.abs(delta)) });
    if (delta < 0) return t("liveUi.recap.deltaBelow", { points: formatScore(Math.abs(delta)) });
    return t("liveUi.recap.deltaEven");
  })();

  return (
    <div className="labs-fade-in" style={{ display: "flex", justifyContent: "center", padding: "8px 0 24px" }}>
      <div
        className="labs-card-elevated"
        style={{ padding: "28px 24px", maxWidth: 480, width: "100%", borderRadius: "var(--labs-radius-lg)" }}
        data-testid="recap-card"
      >
        <div className="flex items-center gap-1.5 mb-1.5" style={{ color: "var(--labs-accent)" }}>
          <Sparkles className="w-3.5 h-3.5" />
          <span
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
            data-testid="recap-eyebrow"
          >
            {t("liveUi.recap.eyebrow")}
          </span>
        </div>
        <h2 className="labs-h2 mb-5" style={{ color: "var(--labs-text)" }} data-testid="recap-title">
          {t("liveUi.recap.title")}
        </h2>

        {topDram && (
          <div className="flex items-center gap-4 mb-6">
            <LabsScoreRing score={topDram.score} maxScore={sMax} size={76} strokeWidth={5} />
            <div style={{ minWidth: 0 }}>
              <div
                className="text-[11px] font-medium mb-0.5"
                style={{ color: "var(--labs-accent)", letterSpacing: "0.04em", textTransform: "uppercase" }}
              >
                {t("liveUi.recap.topDram")}
              </div>
              <div
                className="labs-serif font-semibold truncate"
                style={{ fontSize: 18, color: "var(--labs-text)" }}
                data-testid="recap-top-dram"
              >
                {topDram.label}
              </div>
            </div>
          </div>
        )}

        <div className="mb-2 text-[11px] font-medium" style={{ color: "var(--labs-text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {t("liveUi.recap.yourCurve")}
        </div>
        <div style={{ width: "100%", height: 150 }} data-testid="recap-curve">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--labs-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--labs-text-muted)", fontSize: 10 }}
                axisLine={{ stroke: "var(--labs-border)" }}
                tickLine={false}
                interval={0}
                height={28}
                tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 9)}…` : v)}
              />
              <YAxis
                domain={[scaleMin, sMax]}
                tick={{ fill: "var(--labs-text-muted)", fontSize: 10 }}
                axisLine={{ stroke: "var(--labs-border)" }}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--labs-surface)",
                  border: "1px solid var(--labs-border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--labs-text)",
                }}
                labelStyle={{ color: "var(--labs-text-muted)" }}
                formatter={(value: any) => [formatScore(Number(value)), t("liveUi.recap.yourAverage")]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--labs-accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--labs-accent)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          className="mt-6 pt-5"
          style={{ borderTop: "1px solid var(--labs-border)" }}
          data-testid="recap-position"
        >
          {showRound ? (
            <>
              <div className="flex items-center justify-around gap-3 mb-2">
                <div className="text-center">
                  <div className="labs-serif font-semibold" style={{ fontSize: 22, color: "var(--labs-text)" }} data-testid="recap-my-avg">
                    {formatScore(myAvg)}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                    {t("liveUi.recap.yourAverage")}
                  </div>
                </div>
                <div style={{ width: 1, alignSelf: "stretch", background: "var(--labs-border)" }} />
                <div className="text-center">
                  <div className="labs-serif font-semibold" style={{ fontSize: 22, color: "var(--labs-text-secondary)" }} data-testid="recap-round-avg">
                    {formatScore(groupAvg)}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                    {t("liveUi.recap.roundAverage")}
                  </div>
                </div>
              </div>
              <p
                className="text-center text-sm font-medium"
                style={{ color: delta > 0 ? "var(--labs-success)" : delta < 0 ? "var(--labs-accent)" : "var(--labs-text-secondary)" }}
                data-testid="recap-delta"
              >
                {deltaText}
              </p>
            </>
          ) : (
            <div className="text-center">
              {myAvg != null && (
                <div className="mb-1">
                  <span className="labs-serif font-semibold" style={{ fontSize: 22, color: "var(--labs-text)" }} data-testid="recap-my-avg">
                    {formatScore(myAvg)}
                  </span>
                  <span className="text-[11px] ml-1.5" style={{ color: "var(--labs-text-muted)" }}>
                    {t("liveUi.recap.yourAverage")}
                  </span>
                </div>
              )}
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }} data-testid="recap-not-enough">
                {t("liveUi.recap.notEnough")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
