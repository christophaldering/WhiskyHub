import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { participantApi, ratingApi, tastingApi } from "@/lib/api";
import { trackEvent } from "@/lib/funnelTracker";

// "Dein Abend" (WP 1b): persönliche Abschluss-Karte nach dem Tasting.
// Zeigt die eigene Kurve über die Drams, den Top-Dram und — ab 3 Verkostern
// (K-Anonymität, gleicher Floor wie das Community-Benchmark-Tool) — die
// Position relativ zur Runde. Rendert nichts, solange keine eigenen
// Bewertungen vorliegen.

interface RecapWhisky {
  id: string;
  name?: string | null;
  sortOrder?: number | null;
}

interface RecapRating {
  participantId: string;
  whiskyId: string;
  overall: number | null;
}

interface RecapCardProps {
  tastingId: string;
  whiskies: RecapWhisky[];
  participantId: string;
}

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_SERIF = "'Cormorant Garamond', Georgia, serif";

const MIN_GROUP_RATERS = 3;

function fmt(v: number): string {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export default function RecapCard({ tastingId, whiskies, participantId }: RecapCardProps) {
  const { t } = useTranslation();
  const trackedRef = useRef(false);

  const { data: ratings } = useQuery<RecapRating[]>({
    queryKey: ["recap-ratings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    enabled: !!tastingId && !!participantId,
    staleTime: 60 * 1000,
  });

  // WP 2: Brücke zur Tasting-Story. 409 (Story nicht aktiviert) oder 403
  // lassen die Query fehlschlagen — die Zeile bleibt dann einfach verborgen.
  const { data: storyLink } = useQuery<{ url: string }>({
    queryKey: ["recap-story-link", tastingId],
    queryFn: () => tastingApi.getStoryShareLink(tastingId),
    enabled: !!tastingId && !!participantId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // WP 3 — Konto-Claim: nur echte Gäste (experienceLevel "guest", ohne E-Mail)
  // sehen den Block "Nimm deine Bewertungen mit". Zweistufig: E-Mail + PIN
  // anlegen, dann 6-stelligen Code aus der Mail direkt hier bestätigen —
  // so greift die Verifikations-Grace-Period nie.
  const { data: me } = useQuery<{ id: string; email?: string | null; experienceLevel?: string | null }>({
    queryKey: ["recap-me", participantId],
    queryFn: () => participantApi.get(participantId),
    enabled: !!participantId,
    staleTime: 60 * 1000,
  });
  const isGuest = !!me && me.experienceLevel === "guest" && !me.email;

  const [claimStep, setClaimStep] = useState<"idle" | "code" | "done">("idle");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPin, setClaimPin] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState("");

  const handleClaim = async () => {
    if (claimBusy) return;
    setClaimError("");
    if (!claimEmail.trim() || claimPin.trim().length < 4) {
      setClaimError(t("eveningRecap.claimMissing", "Bitte E-Mail und eine PIN (mind. 4 Zeichen) ausfüllen."));
      return;
    }
    setClaimBusy(true);
    try {
      await participantApi.claim(participantId, claimEmail.trim(), claimPin.trim());
      trackEvent("guest_claim", { page: `/labs/tastings/${tastingId}` });
      setClaimStep("code");
    } catch (e: unknown) {
      setClaimError((e as Error)?.message || t("eveningRecap.claimFailed", "Das hat nicht geklappt. Bitte versuche es erneut."));
    } finally {
      setClaimBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    if (claimBusy) return;
    setClaimError("");
    if (claimCode.trim().length !== 6) {
      setClaimError(t("eveningRecap.codeInvalid", "Der Code hat 6 Ziffern."));
      return;
    }
    setClaimBusy(true);
    try {
      await participantApi.verify(participantId, claimCode.trim());
      setClaimStep("done");
    } catch (e: unknown) {
      setClaimError((e as Error)?.message || t("eveningRecap.codeFailed", "Code ungültig oder abgelaufen."));
    } finally {
      setClaimBusy(false);
    }
  };

  const recap = useMemo(() => {
    if (!ratings || !whiskies || whiskies.length === 0) return null;
    const ordered = [...whiskies].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const mine = new Map<string, number>();
    const allValues: number[] = [];
    const raters = new Set<string>();
    for (const r of ratings) {
      if (typeof r.overall !== "number") continue;
      raters.add(r.participantId);
      allValues.push(r.overall);
      if (r.participantId === participantId) mine.set(r.whiskyId, r.overall);
    }
    const points = ordered
      .map((w, idx) => ({ idx, id: w.id, name: w.name || `Dram ${idx + 1}`, value: mine.get(w.id) }))
      .filter((p): p is { idx: number; id: string; name: string; value: number } => typeof p.value === "number");
    if (points.length === 0) return null;

    let top = points[0];
    for (const p of points) if (p.value > top.value) top = p;

    const myAvg = points.reduce((s, p) => s + p.value, 0) / points.length;
    const groupOk = raters.size >= MIN_GROUP_RATERS && allValues.length > 0;
    const groupAvg = groupOk ? allValues.reduce((s, v) => s + v, 0) / allValues.length : null;

    return { points, top, myAvg, groupAvg, raterCount: raters.size, dramCount: ordered.length };
  }, [ratings, whiskies, participantId]);

  useEffect(() => {
    if (recap && !trackedRef.current) {
      trackedRef.current = true;
      trackEvent("recap_viewed", { page: `/labs/tastings/${tastingId}` });
    }
  }, [recap, tastingId]);

  if (!recap) return null;

  // Sparkline-Geometrie (festes ViewBox, Stroke bleibt formtreu)
  const W = 280;
  const H = 56;
  const PAD = 8;
  const values = recap.points.map((p) => p.value);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const span = vMax - vMin || 1;
  const x = (i: number) =>
    recap.points.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (recap.points.length - 1);
  const y = (v: number) => H - PAD - ((v - vMin) / span) * (H - 2 * PAD);
  const linePoints = recap.points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");

  const delta = recap.groupAvg != null ? recap.myAvg - recap.groupAvg : null;
  const deltaText =
    delta == null
      ? null
      : Math.abs(delta) < 0.5
        ? t("eveningRecap.groupLevel", "Du liegst gleichauf mit der Runde.")
        : delta > 0
          ? t("eveningRecap.groupAbove", "Du liegst {{n}} Punkte über dem Schnitt der Runde.", { n: fmt(Math.abs(delta)) })
          : t("eveningRecap.groupBelow", "Du liegst {{n}} Punkte unter dem Schnitt der Runde.", { n: fmt(Math.abs(delta)) });

  return (
    <div
      className="labs-card labs-fade-in"
      data-testid="recap-card"
      style={{
        padding: "18px 18px 16px",
        marginBottom: 20,
        border: "1px solid var(--labs-accent)",
        borderRadius: 16,
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--labs-accent)", fontWeight: 600 }} data-testid="recap-eyebrow">
        {t("eveningRecap.eyebrow", "Dein Abend")}
      </div>

      <div style={{ marginTop: 12 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          role="img"
          aria-label={t("eveningRecap.curveAria", "Deine Bewertungen im Verlauf des Abends")}
          data-testid="recap-sparkline"
        >
          {recap.points.length > 1 && (
            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--labs-accent)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {recap.points.map((p, i) => (
            <circle
              key={p.id}
              cx={x(i)}
              cy={y(p.value)}
              r={p.id === recap.top.id ? 4 : 2.5}
              fill={p.id === recap.top.id ? "var(--labs-accent)" : "var(--labs-text-muted)"}
            />
          ))}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>
          <span>{t("eveningRecap.curveStart", "Dram 1")}</span>
          <span>{t("eveningRecap.curveEnd", "Dram {{n}}", { n: recap.dramCount })}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{t("eveningRecap.topDram", "Dein Top-Dram")}</div>
          <div
            style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: "var(--labs-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}
            data-testid="recap-top-dram"
          >
            {recap.top.name}
          </div>
          <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: "var(--labs-accent)" }}>
            {fmt(recap.top.value)} {t("eveningRecap.points", "Punkte")}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{t("eveningRecap.yourAvg", "Dein Schnitt")}</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: "var(--labs-text)" }} data-testid="recap-my-avg">
            {fmt(recap.myAvg)}
          </div>
        </div>
        {recap.groupAvg != null && (
          <div>
            <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{t("eveningRecap.groupAvg", "Runde")}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: "var(--labs-text)" }} data-testid="recap-group-avg">
              {fmt(recap.groupAvg)}
            </div>
          </div>
        )}
      </div>

      {deltaText && (
        <div
          style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: "var(--labs-text-secondary)", marginTop: 12 }}
          data-testid="recap-group-line"
        >
          {deltaText}
        </div>
      )}

      {storyLink?.url && (
        <a
          href={storyLink.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent("story_cta_click", { page: `/labs/tastings/${tastingId}` })}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 13, fontWeight: 600, color: "var(--labs-accent)", textDecoration: "none" }}
          data-testid="recap-story-link"
        >
          {t("eveningRecap.storyLink", "Die Story des Abends ansehen")} →
        </a>
      )}

      {isGuest && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--labs-border-subtle)" }} data-testid="recap-claim">
          {claimStep === "idle" && (
            <>
              <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--labs-accent)", fontWeight: 600 }}>
                {t("eveningRecap.claimEyebrow", "Nimm deine Bewertungen mit")}
              </div>
              <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: "var(--labs-text-secondary)", margin: "6px 0 10px" }}>
                {t("eveningRecap.claimText", "Mit E-Mail und PIN wird dieser Abend der Anfang deiner eigenen Sammlung.")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
                <input
                  className="labs-input"
                  type="email"
                  autoComplete="email"
                  placeholder={t("eveningRecap.claimEmail", "Deine E-Mail")}
                  value={claimEmail}
                  onChange={(e) => setClaimEmail(e.target.value)}
                  data-testid="recap-claim-email"
                />
                <input
                  className="labs-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("eveningRecap.claimPin", "Wähle eine PIN (mind. 4 Zeichen)")}
                  value={claimPin}
                  onChange={(e) => setClaimPin(e.target.value)}
                  data-testid="recap-claim-pin"
                />
                <button
                  type="button"
                  className="labs-btn-primary"
                  disabled={claimBusy}
                  onClick={handleClaim}
                  style={{ minHeight: 44 }}
                  data-testid="recap-claim-submit"
                >
                  {claimBusy ? t("eveningRecap.claimBusy", "Einen Moment …") : t("eveningRecap.claimCta", "Konto erstellen")}
                </button>
              </div>
            </>
          )}
          {claimStep === "code" && (
            <>
              <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: "var(--labs-text-secondary)", marginBottom: 10 }}>
                {t("eveningRecap.codeText", "Wir haben dir einen 6-stelligen Code geschickt. Gib ihn hier ein — dann gehört der Abend dir.")}
              </div>
              <div style={{ display: "flex", gap: 8, maxWidth: 360 }}>
                <input
                  className="labs-input"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={t("eveningRecap.codeLabel", "Code")}
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value.replace(/[^0-9]/g, ""))}
                  style={{ flex: 1, letterSpacing: "0.2em" }}
                  data-testid="recap-claim-code"
                />
                <button
                  type="button"
                  className="labs-btn-primary"
                  disabled={claimBusy}
                  onClick={handleVerifyCode}
                  style={{ minHeight: 44 }}
                  data-testid="recap-claim-verify"
                >
                  {t("eveningRecap.codeCta", "Bestätigen")}
                </button>
              </div>
              <button
                type="button"
                className="labs-btn-ghost"
                style={{ marginTop: 8, fontSize: 12 }}
                onClick={() => { participantApi.resendVerification(participantId).catch(() => {}); }}
                data-testid="recap-claim-resend"
              >
                {t("eveningRecap.codeResend", "Code erneut senden")}
              </button>
            </>
          )}
          {claimStep === "done" && (
            <div data-testid="recap-claim-done">
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, color: "var(--labs-text)" }}>
                {t("eveningRecap.doneTitle", "Dein Abend gehört jetzt dir.")}
              </div>
              <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 14, color: "var(--labs-text-secondary)", marginTop: 4 }}>
                {t("eveningRecap.doneText", "Melde dich künftig mit E-Mail und PIN an — deine Bewertungen warten auf dich.")}
              </div>
            </div>
          )}
          {claimError && (
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--labs-danger, #e8a3a3)" }} data-testid="recap-claim-error">
              {claimError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
