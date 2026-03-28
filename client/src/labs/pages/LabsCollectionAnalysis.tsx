import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import BackLink from "@/labs/components/BackLink";
import { useSession } from "@/lib/session";
import { collectionApi } from "@/lib/api";
import { distilleries } from "@/data/distilleries";
import {
  ChevronLeft, Library, Wine, MapPin, Clock, Layers, DollarSign,
  Star, Droplets, Calendar, Package, ChevronDown, ChevronUp,
} from "lucide-react";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useAppleTheme, SP, withAlpha } from "@/labs/hooks/useAppleTheme";

const distilleryRegionMap = new Map<string, string>();
for (const d of distilleries) {
  distilleryRegionMap.set(d.name.toLowerCase(), d.region);
}

function deriveRegion(distillery: string | null): string {
  if (!distillery) return "__unknown__";
  const lower = distillery.toLowerCase().trim();
  let found = "__other__";
  distilleryRegionMap.forEach((region, name) => {
    if (lower.includes(name) || name.includes(lower)) found = region;
  });
  return found;
}

function parseAbv(abv: string | null | undefined): number | null {
  if (!abv) return null;
  const n = parseFloat(abv.replace(",", ".").replace("%", "").trim());
  return isNaN(n) ? null : n;
}

function parseAge(age: string | null | undefined): number | null {
  if (!age) return null;
  const n = parseInt(age.replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? null : n;
}

interface BarEntry { label: string; value: number; pct: number }

interface CollectionItem {
  name: string;
  distillery: string | null;
  status: string | null;
  pricePaid: number | null;
  currency: string | null;
  caskType: string | null;
  statedAge: string | null;
  abv: string | null;
  distilledYear: number | null;
  personalRating: number | null;
  communityRating: number | null;
}

function HBar({ entries, color, testIdPrefix }: { entries: BarEntry[]; color: string; testIdPrefix: string }) {
  const th = useAppleTheme();
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
      {entries.map(e => (
        <div key={e.label} data-testid={`${testIdPrefix}-${e.label}`}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: SP.xs }}>
            <span style={{ color: th.text }}>{e.label}</span>
            <span style={{ color: th.faint }}>{e.value} ({e.pct.toFixed(0)}%)</span>
          </div>
          <div style={{ height: 8, background: withAlpha(color, 0.15), borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(e.pct, 2)}%`, background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, testId }: { icon: React.ElementType; label: string; value: string | number; testId: string }) {
  const th = useAppleTheme();
  return (
    <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, flex: 1, minWidth: 110, padding: "14px 12px", textAlign: "center" }} data-testid={testId}>
      <Icon style={{ width: 18, height: 18, color: th.gold, marginBottom: 6 }} />
      <div style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: th.text }}>{value}</div>
      <div style={{ fontSize: 11, color: th.faint, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ExpandableList({ items, limit = 5, t }: { items: { label: string; count: number }[]; limit?: number; t: (key: string, fallback: string, opts?: any) => string }) {
  const th = useAppleTheme();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);
  return (
    <div>
      {visible.map(item => (
        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${th.border}`, fontSize: 13, color: th.text }}>
          <span>{item.label}</span>
          <span style={{ color: th.faint }}>{item.count}</span>
        </div>
      ))}
      {items.length > limit && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: 12, marginTop: SP.sm, display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", color: th.muted, cursor: "pointer", padding: 0,
          }}
          data-testid="button-expand-list"
        >
          {expanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
          {expanded ? t("labs.collection.less", "Less") : t("labs.collection.nMore", "+{{count}} more", { count: items.length - limit })}
        </button>
      )}
    </div>
  );
}

export default function LabsCollectionAnalysis() {
  const { t } = useTranslation();
  const th = useAppleTheme();
  const session = useSession();
  const pid = session.pid;

  const { data: collection, isLoading, error } = useQuery({
    queryKey: ["labs-collection-analysis", pid],
    queryFn: () => collectionApi.getAll(pid!),
    enabled: !!pid,
    staleTime: 120000,
  });

  if (!session.signedIn || !pid) {
    return (
      <AuthGateMessage
        icon={<Library style={{ width: 48, height: 48, color: th.gold }} />}
        title={t("authGate.collectionAnalysis.title")}
        bullets={[t("authGate.collectionAnalysis.bullet1"), t("authGate.collectionAnalysis.bullet2"), t("authGate.collectionAnalysis.bullet3")]}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="labs-page">
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.xl, textAlign: "center" }}>
          <div className="labs-spinner" style={{ margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="labs-page">
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.lg, textAlign: "center", color: "#e06060" }}>{t("labs.collection.loadFailed", "Failed to load collection")}</div>
      </div>
    );
  }

  const items: CollectionItem[] = Array.isArray(collection) ? collection : [];

  if (items.length === 0) {
    return (
      <div className="labs-page">
        <BackLink href="/labs/taste" style={{ textDecoration: "none" }}>
          <button style={{
            display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
            color: th.muted, cursor: "pointer", fontSize: 14, marginBottom: SP.md, padding: 0,
          }} data-testid="button-back-empty">
            <ChevronLeft style={{ width: 16, height: 16 }} /> {t("labs.collection.backTaste", "Taste")}
          </button>
        </BackLink>
        <div style={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.xl, textAlign: "center" }}>
          <Library style={{ width: 40, height: 40, marginBottom: SP.md, color: th.faint }} />
          <p style={{ fontFamily: "Playfair Display, serif", color: th.text, fontSize: 16, fontWeight: 600 }}>{t("labs.collection.noCollection", "No Collection Yet")}</p>
          <p style={{ color: th.muted, fontSize: 13, marginTop: SP.sm }}>{t("labs.collection.noCollectionDesc", "Import your Whiskybase collection to unlock detailed analytics.")}</p>
        </div>
      </div>
    );
  }

  const total = items.length;
  const statusCounts = { open: 0, closed: 0, empty: 0 };
  let totalPaid = 0;
  let paidCount = 0;
  const regionCounts = new Map<string, number>();
  const distilleryCounts = new Map<string, number>();
  const caskCounts = new Map<string, number>();
  const ageBuckets: Record<string, number> = { NAS: 0, "0-10": 0, "10-15": 0, "15-20": 0, "20-30": 0, "30+": 0 };
  const abvBuckets: Record<string, number> = { "< 40%": 0, "40-46%": 0, "46-50%": 0, "50-55%": 0, "55-60%": 0, "60%+": 0 };
  const vintageCounts = new Map<string, number>();
  const ratingPairs: { name: string; personal: number; community: number }[] = [];
  const valuableItems: { name: string; price: number; currency: string }[] = [];

  for (const item of items) {
    const st = (item.status || "closed").toLowerCase();
    if (st in statusCounts) statusCounts[st as keyof typeof statusCounts]++;

    if (item.pricePaid != null && item.pricePaid > 0) {
      totalPaid += item.pricePaid;
      paidCount++;
      valuableItems.push({ name: item.name, price: item.pricePaid, currency: item.currency || "EUR" });
    }

    const rawRegion = deriveRegion(item.distillery);
    const region = rawRegion === "__unknown__" ? t("resultsUi.unknown") : rawRegion === "__other__" ? t("resultsUi.other") : rawRegion;
    regionCounts.set(region, (regionCounts.get(region) || 0) + 1);

    if (item.distillery) distilleryCounts.set(item.distillery, (distilleryCounts.get(item.distillery) || 0) + 1);
    if (item.caskType) {
      const ct = item.caskType.trim();
      if (ct) caskCounts.set(ct, (caskCounts.get(ct) || 0) + 1);
    }

    const age = parseAge(item.statedAge);
    if (age === null) ageBuckets["NAS"]++;
    else if (age <= 10) ageBuckets["0-10"]++;
    else if (age <= 15) ageBuckets["10-15"]++;
    else if (age <= 20) ageBuckets["15-20"]++;
    else if (age <= 30) ageBuckets["20-30"]++;
    else ageBuckets["30+"]++;

    const abvVal = parseAbv(item.abv);
    if (abvVal !== null) {
      if (abvVal < 40) abvBuckets["< 40%"]++;
      else if (abvVal <= 46) abvBuckets["40-46%"]++;
      else if (abvVal <= 50) abvBuckets["46-50%"]++;
      else if (abvVal <= 55) abvBuckets["50-55%"]++;
      else if (abvVal <= 60) abvBuckets["55-60%"]++;
      else abvBuckets["60%+"]++;
    }

    if (item.distilledYear) {
      const v = item.distilledYear;
      if (!isNaN(v)) {
        const decade = `${Math.floor(v / 10) * 10}s`;
        vintageCounts.set(decade, (vintageCounts.get(decade) || 0) + 1);
      }
    }

    if (item.personalRating != null && item.communityRating != null) {
      ratingPairs.push({ name: item.name, personal: item.personalRating, community: item.communityRating });
    }
  }

  const avgPrice = paidCount > 0 ? totalPaid / paidCount : 0;

  const regionEntries: BarEntry[] = Array.from(regionCounts.entries()).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));
  const distilleryList = Array.from(distilleryCounts.entries()).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
  const caskEntries: BarEntry[] = Array.from(caskCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));
  const ageEntries: BarEntry[] = Object.entries(ageBuckets).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));
  const abvEntries: BarEntry[] = Object.entries(abvBuckets).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));
  const vintageEntries: BarEntry[] = Array.from(vintageCounts.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));

  valuableItems.sort((a, b) => b.price - a.price);
  const top10Valuable = valuableItems.slice(0, 10);

  const avgDelta = ratingPairs.length > 0
    ? ratingPairs.reduce((sum, r) => sum + (r.personal - r.community), 0) / ratingPairs.length
    : 0;

  const overrated = ratingPairs.filter(r => r.personal - r.community > 3).sort((a, b) => (b.personal - b.community) - (a.personal - a.community)).slice(0, 5);
  const underrated = ratingPairs.filter(r => r.community - r.personal > 3).sort((a, b) => (b.community - b.personal) - (a.community - a.personal)).slice(0, 5);

  const cardStyle = { background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md, marginBottom: SP.md };
  const sectionLabel = { fontSize: 11, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: th.muted, marginBottom: SP.xs };

  return (
    <div className="labs-page" data-testid="labs-collection-analysis">
      <BackLink href="/labs/taste" style={{ textDecoration: "none" }}>
        <button style={{
          display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
          color: th.muted, cursor: "pointer", fontSize: 14, marginBottom: SP.md, padding: 0,
        }} data-testid="button-back-collection">
          <ChevronLeft style={{ width: 16, height: 16 }} /> {t("labs.collection.backTaste", "Taste")}
        </button>
      </BackLink>

      <div style={{ marginBottom: SP.lg }}>
        <div style={{ display: "flex", alignItems: "center", gap: SP.md, marginBottom: SP.xs }}>
          <Library style={{ width: 20, height: 20, color: th.gold }} />
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 26, fontWeight: 600, color: th.text, margin: 0 }} data-testid="text-collection-analysis-title">
            {t("labs.collection.title", "Collection Analysis")}
          </h1>
        </div>
        <p style={{ fontSize: 14, color: th.muted }}>
          {t("labs.collection.subtitle", "Deep insights into your {{count}} bottles", { count: total })}
        </p>
      </div>

      <div style={cardStyle} data-testid="card-collection-overview">
        <p style={sectionLabel}>{t("labs.collection.overview", "Overview")}</p>
        <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap", marginBottom: SP.md, marginTop: SP.md }}>
          <StatCard icon={Package} label={t("labs.collection.bottles", "Bottles")} value={total} testId="stat-total-bottles" />
          <StatCard icon={DollarSign} label={t("labs.collection.totalValue", "Total Value")} value={paidCount > 0 ? `€${totalPaid.toLocaleString("de-DE", { maximumFractionDigits: 0 })}` : "—"} testId="stat-total-value" />
          <StatCard icon={DollarSign} label={t("labs.collection.avgPrice", "Avg Price")} value={paidCount > 0 ? `€${avgPrice.toFixed(0)}` : "—"} testId="stat-avg-price" />
        </div>
        <div style={{ display: "flex", gap: SP.sm }}>
          {[
            { label: t("labs.collection.open", "Open"), count: statusCounts.open, color: th.green, id: "open" },
            { label: t("labs.collection.sealed", "Sealed"), count: statusCounts.closed, color: th.gold, id: "closed" },
            { label: t("labs.collection.empty", "Empty"), count: statusCounts.empty, color: th.faint, id: "empty" },
          ].map(s => (
            <div key={s.id} style={{ flex: 1, padding: "10px 12px", borderRadius: 14, background: withAlpha(s.color, 0.12), textAlign: "center" }} data-testid={`stat-status-${s.id}`}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, color: th.faint }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle} data-testid="card-collection-regions">
        <p style={sectionLabel}>{t("labs.collection.regionsDistilleries", "Regions & Distilleries")}</p>
        <p style={{ fontSize: 13, color: th.faint, marginBottom: SP.md }}>{t("labs.collection.regionsDesc", "Where your bottles come from")}</p>
        <HBar entries={regionEntries} color={th.gold} testIdPrefix="bar-region" />
        {distilleryList.length > 0 && (
          <div style={{ marginTop: SP.md }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: SP.sm, color: th.text }}>{t("labs.collection.topDistilleries", "Top Distilleries")}</p>
            <ExpandableList items={distilleryList} limit={7} t={t} />
          </div>
        )}
      </div>

      <div style={cardStyle} data-testid="card-collection-age">
        <p style={sectionLabel}>{t("labs.collection.ageDistribution", "Age Distribution")}</p>
        <p style={{ fontSize: 13, color: th.faint, marginBottom: SP.md }}>{t("labs.collection.ageDesc", "How old are the whiskies in your collection?")}</p>
        <HBar entries={ageEntries} color={th.phases.nose.accent} testIdPrefix="bar-age" />
      </div>

      {caskEntries.length > 0 && (
        <div style={cardStyle} data-testid="card-collection-cask">
          <p style={sectionLabel}>{t("labs.collection.caskTypes", "Cask Types")}</p>
          <p style={{ fontSize: 13, color: th.faint, marginBottom: SP.md }}>{t("labs.collection.caskDesc", "Which cask types dominate your collection?")}</p>
          <HBar entries={caskEntries} color={th.gold} testIdPrefix="bar-cask" />
        </div>
      )}

      {top10Valuable.length > 0 && (
        <div style={cardStyle} data-testid="card-collection-price">
          <p style={sectionLabel}>{t("labs.collection.priceAnalysis", "Price Analysis")}</p>
          <p style={{ fontSize: 13, color: th.faint, marginBottom: SP.md }}>{t("labs.collection.priceDesc", "Your most valuable bottles")}</p>
          <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap", marginBottom: SP.md }}>
            <StatCard icon={DollarSign} label={t("labs.collection.lowest", "Lowest")} value={`€${Math.min(...valuableItems.map(i => i.price)).toFixed(0)}`} testId="stat-min-price" />
            <StatCard icon={DollarSign} label={t("labs.collection.highest", "Highest")} value={`€${Math.max(...valuableItems.map(i => i.price)).toFixed(0)}`} testId="stat-max-price" />
            <StatCard icon={DollarSign} label={t("labs.collection.median", "Median")} value={`€${valuableItems.sort((a, b) => a.price - b.price)[Math.floor(valuableItems.length / 2)]?.price.toFixed(0) || "—"}`} testId="stat-median-price" />
          </div>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: SP.sm, color: th.text }}>{t("labs.collection.mostValuable", "Most Valuable Bottles")}</p>
          {top10Valuable.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${th.border}`, fontSize: 13 }} data-testid={`row-valuable-${i}`}>
              <span style={{ color: th.text, flex: 1, marginRight: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
              <span style={{ color: th.gold, fontWeight: 600, whiteSpace: "nowrap" }}>€{item.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>
      )}

      {ratingPairs.length > 0 && (
        <div style={cardStyle} data-testid="card-collection-ratings">
          <p style={sectionLabel}>{t("labs.collection.ratingComparison", "Rating Comparison")}</p>
          <p style={{ fontSize: 13, color: th.faint, marginBottom: SP.md }}>{t("labs.collection.ratingsDesc", "Your ratings vs. community")}</p>
          <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap", marginBottom: SP.md }}>
            <StatCard icon={Star} label={t("labs.collection.rated", "Rated")} value={ratingPairs.length} testId="stat-rated-count" />
            <StatCard icon={Star} label={t("labs.collection.yourAvg", "Your Avg")} value={(ratingPairs.reduce((s, r) => s + r.personal, 0) / ratingPairs.length).toFixed(1)} testId="stat-avg-personal" />
            <StatCard icon={Star} label={t("labs.collection.avgDelta", "Avg Delta")} value={`${avgDelta > 0 ? "+" : ""}${avgDelta.toFixed(1)}`} testId="stat-avg-delta" />
          </div>
          {ratingPairs.slice(0, 10).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${th.border}`, fontSize: 12, gap: SP.sm }} data-testid={`row-rating-${i}`}>
              <span style={{ flex: 1, color: th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <span style={{ color: th.gold, fontWeight: 600, minWidth: 36, textAlign: "right" }}>{r.personal.toFixed(1)}</span>
              <span style={{ color: th.faint, minWidth: 12, textAlign: "center" }}>vs</span>
              <span style={{ color: th.faint, minWidth: 36, textAlign: "right" }}>{r.community.toFixed(1)}</span>
              <span style={{
                color: r.personal - r.community > 0 ? th.green : r.personal - r.community < 0 ? "#e06060" : th.faint,
                fontWeight: 600, minWidth: 40, textAlign: "right", fontSize: 11,
              }}>
                {r.personal - r.community > 0 ? "+" : ""}{(r.personal - r.community).toFixed(1)}
              </span>
            </div>
          ))}
          {overrated.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: th.green, marginBottom: 6 }}>{t("labs.collection.hiddenGems", "Your Hidden Gems ↑")}</p>
              {overrated.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: th.text, padding: "3px 0" }}>
                  {r.name} <span style={{ color: th.green }}>+{(r.personal - r.community).toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
          {underrated.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#e06060", marginBottom: 6 }}>{t("labs.collection.communityHigher", "Community Rates Higher ↓")}</p>
              {underrated.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: th.text, padding: "3px 0" }}>
                  {r.name} <span style={{ color: "#e06060" }}>{(r.personal - r.community).toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={cardStyle} data-testid="card-collection-abv">
        <p style={sectionLabel}>{t("labs.collection.abvDistribution", "ABV Distribution")}</p>
        <p style={{ fontSize: 13, color: th.faint, marginBottom: SP.md }}>{t("labs.collection.abvDesc", "The strength spectrum of your collection")}</p>
        <HBar entries={abvEntries} color={th.phases.nose.accent} testIdPrefix="bar-abv" />
      </div>

      {vintageEntries.length > 0 && (
        <div style={cardStyle} data-testid="card-collection-vintage">
          <p style={sectionLabel}>{t("labs.collection.vintageTimeline", "Vintage Timeline")}</p>
          <p style={{ fontSize: 13, color: th.faint, marginBottom: SP.md }}>{t("labs.collection.vintageDesc", "When were your whiskies distilled?")}</p>
          <HBar entries={vintageEntries} color={th.green} testIdPrefix="bar-vintage" />
        </div>
      )}

      <div style={{ height: 60 }} />
    </div>
  );
}
