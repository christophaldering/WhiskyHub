import { useState, useEffect } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS } from "../../tokens";
import SubScreenHeader from "./SubScreenHeader";

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  onBack: () => void;
}

interface CollectionItem {
  name: string;
  distillery: string | null;
  caskType: string | null;
  statedAge: string | null;
  abv: string | null;
  personalRating: number | null;
  communityRating: number | null;
  status: string | null;
  brand: string | null;
}

interface DistilleryInfo {
  name: string;
  region: string;
}

function HBar({ label, count, max, color, th }: { label: string; count: number; max: number; color: string; th: ThemeTokens }) {
  return (
    <div style={{ marginBottom: SP.sm }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: th.muted }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: th.border, overflow: "hidden" }}>
        <div style={{ width: `${(count / max) * 100}%`, height: "100%", background: color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

export default function CollectionAnalysis({ th, t, participantId, onBack }: Props) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [distilleryMap, setDistilleryMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`/api/collection/${participantId}`, { headers: { "x-participant-id": participantId } })
        .then(r => { if (!r.ok) throw new Error("fetch failed"); return r.json(); }),
      fetch("/api/distilleries")
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),
    ])
      .then(([collData, distData]) => {
        setItems(Array.isArray(collData) ? collData : []);
        const dMap = new Map<string, string>();
        if (Array.isArray(distData)) {
          for (const d of distData as DistilleryInfo[]) {
            if (d.name && d.region) dMap.set(d.name.toLowerCase(), d.region);
          }
        }
        setDistilleryMap(dMap);
      })
      .catch(() => { setItems([]); setError(true); })
      .finally(() => setLoading(false));
  }, [participantId]);

  if (loading) {
    return (
      <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
        <SubScreenHeader th={th} title={t.mwCollection} onBack={onBack} />
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted }}>...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
        <SubScreenHeader th={th} title={t.mwCollection} onBack={onBack} />
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.lg, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: th.muted }}>{t.mwCollectionError}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
        <SubScreenHeader th={th} title={t.mwCollection} onBack={onBack} />
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.xl, textAlign: "center" }} data-testid="mw-collection-empty">
          <div style={{ fontSize: 36, marginBottom: SP.sm }}>{"\ud83d\udce6"}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: th.text, marginBottom: SP.xs }}>{t.mwCollectionEmpty}</div>
          <p style={{ fontSize: 13, color: th.muted, margin: 0 }}>{t.mwCollectionEmptyHint}</p>
        </div>
      </div>
    );
  }

  const regionCounts = new Map<string, number>();
  const caskCounts = new Map<string, number>();
  const distilleryCounts = new Map<string, number>();
  let ratingSum = 0;
  let ratingCount = 0;
  const topRated: { name: string; score: number }[] = [];
  const ageBuckets: Record<string, number> = { NAS: 0, "0-10": 0, "10-15": 0, "15-20": 0, "20-30": 0, "30+": 0 };

  for (const item of items) {
    if (item.distillery) {
      distilleryCounts.set(item.distillery, (distilleryCounts.get(item.distillery) || 0) + 1);
      const region = distilleryMap.get(item.distillery.toLowerCase());
      if (region) regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
    }

    if (item.caskType) {
      const ct = item.caskType.trim();
      if (ct) caskCounts.set(ct, (caskCounts.get(ct) || 0) + 1);
    }

    const age = item.statedAge ? parseInt(item.statedAge.replace(/[^\d]/g, ""), 10) : NaN;
    if (isNaN(age)) ageBuckets["NAS"]++;
    else if (age <= 10) ageBuckets["0-10"]++;
    else if (age <= 15) ageBuckets["10-15"]++;
    else if (age <= 20) ageBuckets["15-20"]++;
    else if (age <= 30) ageBuckets["20-30"]++;
    else ageBuckets["30+"]++;

    const score = item.personalRating && item.personalRating > 0 ? item.personalRating : item.communityRating && item.communityRating > 0 ? item.communityRating : null;
    if (score) {
      ratingSum += score;
      ratingCount++;
      topRated.push({ name: item.name, score });
    }
  }

  const avgRating = ratingCount > 0 ? Math.round(ratingSum / ratingCount) : 0;
  const sortedTopRated = topRated.sort((a, b) => b.score - a.score).slice(0, 10);
  const topDistilleries = [...distilleryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topCasks = [...caskCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topRegions = [...regionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxDistillery = topDistilleries.length > 0 ? topDistilleries[0][1] : 1;
  const maxCask = topCasks.length > 0 ? topCasks[0][1] : 1;
  const maxRegion = topRegions.length > 0 ? topRegions[0][1] : 1;

  const uniqueDistilleries = distilleryCounts.size;
  const uniqueCasks = caskCounts.size;
  const uniqueRegions = regionCounts.size;

  const simpsonDiversity = (() => {
    const total = items.length;
    if (total <= 1 || regionCounts.size === 0) return null;
    const sumNi = [...regionCounts.values()].reduce((acc, n) => acc + n * (n - 1), 0);
    return 1 - sumNi / (total * (total - 1));
  })();

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <SubScreenHeader th={th} title={t.mwCollection} onBack={onBack} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: SP.sm, marginBottom: SP.lg }} data-testid="mw-collection-stats">
        {[
          { label: t.mwCollectionBottles, value: items.length },
          { label: "\u00d8 Rating", value: avgRating > 0 ? avgRating : "\u2013" },
          { label: t.soloDistillery, value: uniqueDistilleries },
          { label: t.mwRegion, value: uniqueRegions },
          { label: t.mwCollectionCaskTypes, value: uniqueCasks },
          { label: t.mwCollectionDiversity, value: simpsonDiversity !== null ? `${Math.round(simpsonDiversity * 100)}%` : "\u2013" },
        ].map((s, i) => (
          <div key={i} style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT.display, color: th.gold }}>{s.value}</div>
            <div style={{ fontSize: 11, color: th.muted, marginTop: SP.xs }}>{s.label}</div>
          </div>
        ))}
      </div>

      {Object.values(ageBuckets).some(v => v > 0) && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, marginBottom: SP.md }} data-testid="mw-collection-age">
          <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: SP.sm }}>{t.mwCollectionAgeDist}</div>
          {Object.entries(ageBuckets).filter(([, v]) => v > 0).map(([label, count]) => (
            <HBar key={label} label={label} count={count} max={Math.max(...Object.values(ageBuckets))} color={th.phases.palate.accent} th={th} />
          ))}
        </div>
      )}

      {topRegions.length > 0 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, marginBottom: SP.md }} data-testid="mw-collection-regions">
          <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: SP.sm }}>{t.mwCollectionRegionDist}</div>
          {topRegions.map(([name, count]) => (
            <HBar key={name} label={name} count={count} max={maxRegion} color={th.phases.nose.accent} th={th} />
          ))}
        </div>
      )}

      {topDistilleries.length > 0 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, marginBottom: SP.md }} data-testid="mw-collection-distilleries">
          <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: SP.sm }}>{t.mwCollectionTopDistilleries}</div>
          {topDistilleries.map(([name, count]) => (
            <HBar key={name} label={name} count={count} max={maxDistillery} color={th.phases.overall.accent} th={th} />
          ))}
        </div>
      )}

      {topCasks.length > 0 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md, marginBottom: SP.md }} data-testid="mw-collection-casks">
          <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: SP.sm }}>{t.mwCollectionCaskTypes}</div>
          {topCasks.map(([name, count]) => (
            <HBar key={name} label={name} count={count} max={maxCask} color={th.phases.finish.accent} th={th} />
          ))}
        </div>
      )}

      {sortedTopRated.length > 0 && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.md }} data-testid="mw-collection-top-rated">
          <div style={{ fontSize: 12, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: SP.sm }}>{t.mwCollectionTopRated}</div>
          {sortedTopRated.map((w, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: `${SP.xs}px 0`, borderBottom: `1px solid ${th.border}` }}>
              <span style={{ fontSize: 13, color: th.text }}>{w.name}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: th.gold }}>{w.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
