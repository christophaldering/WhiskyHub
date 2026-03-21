import { useState, useEffect } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { Back, Spinner, Nose, Palate, Finish, Overall } from "../../icons";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import type { ThemeTokens } from "../../tokens";
interface AggregatedData {
  avgNose: number | null;
  avgTaste: number | null;
  avgFinish: number | null;
  avgOverall: number | null;
  ratingCount: number;
  overallRange: { min: number; max: number } | null;
}

interface RelatedTasting {
  id: string;
  title: string;
  date: string | null;
  status: string;
}

interface BottleData {
  id: string;
  name: string;
  distillery: string | null;
  region: string | null;
  caskType: string | null;
  age: string | null;
  abv: string | null;
  aggregated: AggregatedData;
  relatedTastings: RelatedTasting[];
  ratings: Array<{
    id: string;
    participantId: string;
    nose: number;
    taste: number;
    finish: number;
    overall: number;
  }>;
  tastingContext: { id: string; title: string; date: string | null } | null;
  hasNonStandardScale: boolean;
}

interface BottleDetailProps {
  bottleId: string;
  onBack: () => void;
}

function DimensionBar({ label, value, icon: Icon, th }: { label: string; value: number | null; icon: (p: any) => React.JSX.Element; th: ThemeTokens }) {
  const pct = value != null ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.sm }}>
      <Icon color={th.gold} size={16} />
      <div style={{ width: 60, fontSize: 12, color: th.muted, fontFamily: FONT.body }}>{label}</div>
      <div style={{ flex: 1, height: 6, background: th.bgCard, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: th.gold, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
      <div style={{ width: 32, textAlign: "right", fontSize: 13, fontWeight: 600, color: th.text, fontVariantNumeric: "tabular-nums" }}>
        {value != null ? Math.round(value) : "\u2014"}
      </div>
    </div>
  );
}

export default function BottleDetail({ bottleId, onBack }: BottleDetailProps) {
  const { th } = useV2Theme();
  const { t } = useV2Lang();
  const [bottle, setBottle] = useState<BottleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/labs/explore/whiskies/${bottleId}`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setBottle(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [bottleId]);

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.xs,
          background: "none",
          border: "none",
          color: th.muted,
          fontSize: 14,
          fontFamily: FONT.body,
          cursor: "pointer",
          marginBottom: SP.md,
          minHeight: TOUCH_MIN,
          padding: 0,
        }}
        data-testid="button-back-bottle"
      >
        <Back color={th.muted} size={18} />
        {t.entExplore}
      </button>

      {loading && (
        <div style={{ textAlign: "center", padding: SP.xxl }}>
          <Spinner color={th.muted} size={24} />
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted, fontSize: 14 }} data-testid="text-bottle-error">
          Could not load bottle details
        </div>
      )}

      {!loading && !error && bottle && (
        <>
          <div style={{ marginBottom: SP.lg }}>
            <h1
              style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: th.text, marginBottom: SP.xs }}
              data-testid="text-bottle-name"
            >
              {bottle.name}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm, fontSize: 13, color: th.muted }}>
              {bottle.distillery && <span>{bottle.distillery}</span>}
              {bottle.region && <span>{bottle.region}</span>}
              {bottle.caskType && <span>{bottle.caskType}</span>}
              {bottle.age && <span>{bottle.age}y</span>}
              {bottle.abv && <span>{bottle.abv}%</span>}
            </div>
          </div>

          <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, marginBottom: SP.md }}>
            <h2 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: th.text, marginBottom: SP.md }} data-testid="text-bottle-ratings-title">
              {t.entBottleRatings}
            </h2>

            {bottle.aggregated.avgOverall != null && (
              <div style={{ textAlign: "center", marginBottom: SP.md }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: th.gold, fontVariantNumeric: "tabular-nums" }} data-testid="text-bottle-avg-score">
                  {Math.round(bottle.aggregated.avgOverall * 10) / 10}
                </div>
                <div style={{ fontSize: 12, color: th.muted }}>{bottle.aggregated.ratingCount} ratings</div>
              </div>
            )}

            <DimensionBar label={t.ratingNose} value={bottle.aggregated.avgNose} icon={Nose} th={th} />
            <DimensionBar label={t.ratingPalate} value={bottle.aggregated.avgTaste} icon={Palate} th={th} />
            <DimensionBar label={t.ratingFinish} value={bottle.aggregated.avgFinish} icon={Finish} th={th} />
            <DimensionBar label={t.ratingOverall} value={bottle.aggregated.avgOverall} icon={Overall} th={th} />

            {bottle.aggregated.overallRange && (
              <div style={{ marginTop: SP.md, fontSize: 12, color: th.muted, textAlign: "center" }}>
                Range: {bottle.aggregated.overallRange.min} – {bottle.aggregated.overallRange.max}
              </div>
            )}
          </div>

          {bottle.relatedTastings && bottle.relatedTastings.length > 0 && (
            <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md }}>
              <h2 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: th.text, marginBottom: SP.md }} data-testid="text-bottle-history-title">
                {t.entBottleHistory}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
                {bottle.relatedTastings.map((rt) => (
                  <div key={rt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `${SP.sm}px 0`, borderBottom: `1px solid ${th.border}` }}>
                    <span style={{ fontSize: 13, color: th.text }}>{rt.title}</span>
                    <span style={{ fontSize: 12, color: th.muted }}>{rt.date ?? "\u2014"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
