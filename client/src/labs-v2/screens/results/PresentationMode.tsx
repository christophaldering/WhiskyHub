import { useState, useEffect, useCallback, useRef } from "react";
import type { ThemeTokens } from "../../tokens";
import { SP, FONT, RADIUS } from "../../tokens";
import type { Translations } from "../../i18n";

interface WhiskySlide {
  name: string;
  distillery?: string;
  avgOverall: number | null;
  rank: number;
  totalWhiskies: number;
}

interface Props {
  th: ThemeTokens;
  t: Translations;
  tastingId: string;
  participantId: string;
  isHost: boolean;
  whiskies: WhiskySlide[];
}

export default function PresentationMode({ th, t, tastingId, participantId, isHost, whiskies }: Props) {
  const [active, setActive] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [viewerSlide, setViewerSlide] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const postAction = useCallback(async (endpoint: string, body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tastings/${tastingId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Request failed");
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [tastingId]);

  const startPresentation = useCallback(async () => {
    const ok = await postAction("presentation-start", { hostId: participantId });
    if (ok) {
      setActive(true);
      setSlideIndex(0);
    }
  }, [postAction, participantId]);

  const nextSlide = useCallback(async () => {
    const next = slideIndex + 1;
    if (next >= whiskies.length) return;
    const ok = await postAction("presentation-slide", { hostId: participantId, slide: next });
    if (ok) setSlideIndex(next);
  }, [postAction, participantId, slideIndex, whiskies.length]);

  const prevSlide = useCallback(async () => {
    if (slideIndex <= 0) return;
    const prev = slideIndex - 1;
    const ok = await postAction("presentation-slide", { hostId: participantId, slide: prev });
    if (ok) setSlideIndex(prev);
  }, [postAction, participantId, slideIndex]);

  const stopPresentation = useCallback(async () => {
    await postAction("presentation-stop", { hostId: participantId });
    setActive(false);
    setSlideIndex(0);
  }, [postAction, participantId]);

  useEffect(() => {
    if (isHost || active) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/tastings/${tastingId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.presentationSlide != null) {
          setViewerSlide(data.presentationSlide);
          setActive(true);
        } else {
          setActive(false);
          setViewerSlide(null);
        }
      } catch {}
    };

    poll();
    pollingRef.current = setInterval(poll, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isHost, tastingId, active]);

  const currentSlide = isHost ? slideIndex : (viewerSlide ?? 0);
  const whisky = whiskies[currentSlide];

  if (!isHost && !active) {
    return null;
  }

  if (isHost && !active) {
    return (
      <div data-testid="presentation-start" style={{ textAlign: "center", padding: SP.xxxl, fontFamily: FONT.body }}>
        <h3 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: th.text, marginBottom: SP.sm }}>
          {t.resPresentTitle}
        </h3>
        <p style={{ fontSize: 14, color: th.muted, marginBottom: SP.lg }}>
          {t.resPresentDesc}
        </p>
        <button
          data-testid="button-start-presentation"
          onClick={startPresentation}
          disabled={loading}
          style={{
            padding: `${SP.md}px ${SP.xl}px`,
            borderRadius: RADIUS.lg,
            border: "none",
            background: th.gold,
            color: th.bg,
            fontSize: 15,
            fontWeight: 700,
            fontFamily: FONT.body,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {t.resPresentStart}
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="presentation-active"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: th.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT.body,
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `${SP.md}px ${SP.lg}px`,
      }}>
        <span
          data-testid="badge-presentation-live"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            color: th.gold,
            padding: "5px 12px",
            borderRadius: RADIUS.sm,
            background: "rgba(212,162,86,0.1)",
            border: "1px solid rgba(212,162,86,0.2)",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: RADIUS.full, background: th.gold, animation: "pulse 2s infinite" }} />
          LIVE
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: th.muted, fontVariantNumeric: "tabular-nums" }}>
          {currentSlide + 1} / {whiskies.length}
        </span>
        {isHost && (
          <button
            data-testid="button-stop-presentation"
            onClick={stopPresentation}
            style={{
              padding: `${SP.xs}px ${SP.md}px`,
              borderRadius: RADIUS.sm,
              border: `1px solid ${th.border}`,
              background: "transparent",
              color: th.muted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT.body,
            }}
          >
            {t.resPresentStop}
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: SP.lg }}>
        {whisky ? (
          <div
            key={currentSlide}
            data-testid="slide-content"
            style={{
              textAlign: "center",
              animation: "v2FadeIn 0.3s ease",
            }}
          >
            <div style={{
              fontSize: 14,
              color: th.muted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: SP.sm,
            }}>
              #{whisky.rank} / {whisky.totalWhiskies}
            </div>
            <h2 style={{
              fontFamily: FONT.display,
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 700,
              color: th.text,
              marginBottom: SP.sm,
            }}>
              {whisky.name}
            </h2>
            {whisky.distillery && (
              <div style={{ fontSize: 16, color: th.muted, marginBottom: SP.xl }}>
                {whisky.distillery}
              </div>
            )}
            <div style={{
              fontSize: "clamp(48px, 8vw, 80px)",
              fontWeight: 700,
              fontFamily: FONT.display,
              color: th.gold,
              lineHeight: 1,
            }}>
              {whisky.avgOverall?.toFixed(1) ?? "--"}
            </div>
            <div style={{ fontSize: 13, color: th.muted, marginTop: SP.sm }}>
              {t.resGroupAvg}
            </div>
          </div>
        ) : (
          <div style={{ color: th.muted, fontSize: 16 }}>{t.resNoData}</div>
        )}
      </div>

      {isHost && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: SP.md,
          padding: `${SP.lg}px ${SP.lg}px ${SP.xxl}px`,
        }}>
          <button
            data-testid="button-prev-slide"
            onClick={prevSlide}
            disabled={loading || slideIndex <= 0}
            style={{
              padding: `${SP.md}px ${SP.xl}px`,
              borderRadius: RADIUS.lg,
              border: `1px solid ${th.border}`,
              background: th.bgCard,
              color: th.text,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: FONT.body,
              cursor: slideIndex <= 0 ? "default" : "pointer",
              opacity: slideIndex <= 0 ? 0.3 : 1,
            }}
          >
            {t.back}
          </button>
          <button
            data-testid="button-next-slide"
            onClick={nextSlide}
            disabled={loading || slideIndex >= whiskies.length - 1}
            style={{
              padding: `${SP.md}px ${SP.xl}px`,
              borderRadius: RADIUS.lg,
              border: "none",
              background: th.gold,
              color: th.bg,
              fontSize: 15,
              fontWeight: 700,
              fontFamily: FONT.body,
              cursor: slideIndex >= whiskies.length - 1 ? "default" : "pointer",
              opacity: slideIndex >= whiskies.length - 1 ? 0.3 : 1,
            }}
          >
            {t.resNext}
          </button>
        </div>
      )}

      <style>{`
        @keyframes v2FadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
