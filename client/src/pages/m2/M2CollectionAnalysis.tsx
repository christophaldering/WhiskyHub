import { useTranslation } from "react-i18next";
import { v, alpha } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { M2Loading, M2Error } from "@/components/m2/M2Feedback";
import { getSession, useSession } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { collectionApi } from "@/lib/api";
import { distilleries } from "@/data/distilleries";
import {
  Library, Wine, MapPin, Clock, Layers, DollarSign,
  Star, Droplets, Calendar, Package, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";

const cardStyle: React.CSSProperties = {
  background: v.elevated,
  borderRadius: 14,
  padding: 20,
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: v.text,
  marginBottom: 4,
  fontFamily: "'Playfair Display', serif",
};

const sectionSub: React.CSSProperties = {
  fontSize: 12,
  color: v.muted,
  marginBottom: 16,
};

const distilleryRegionMap = new Map<string, string>();
for (const d of distilleries) {
  distilleryRegionMap.set(d.name.toLowerCase(), d.region);
}

function deriveRegion(distillery: string | null): string {
  if (!distillery) return "Unknown";
  const lower = distillery.toLowerCase().trim();
  let found = "Other";
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

interface BarEntry {
  label: string;
  value: number;
  pct: number;
}

function HBar({ entries, color, testIdPrefix }: { entries: BarEntry[]; color: string; testIdPrefix: string }) {
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map((e) => (
        <div key={e.label} data-testid={`${testIdPrefix}-${e.label}`}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: v.text, marginBottom: 3 }}>
            <span>{e.label}</span>
            <span style={{ color: v.muted }}>{e.value} ({e.pct.toFixed(0)}%)</span>
          </div>
          <div style={{ height: 8, background: alpha(color, "15"), borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(e.pct, 2)}%`, background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, testId }: { icon: any; label: string; value: string | number; sub?: string; testId: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 130,
        background: v.card,
        border: `1px solid ${v.border}`,
        borderRadius: 12,
        padding: "14px 12px",
        textAlign: "center",
      }}
      data-testid={testId}
    >
      <Icon size={18} color={v.accent} style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 22, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif" }}>{value}</div>
      <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: v.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ExpandableList({ items, limit = 5 }: { items: { label: string; count: number }[]; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);
  return (
    <div>
      {visible.map((item) => (
        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${v.border}`, fontSize: 13, color: v.text }}>
          <span>{item.label}</span>
          <span style={{ color: v.muted }}>{item.count}</span>
        </div>
      ))}
      {items.length > limit && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: "none", border: "none", color: v.accent, fontSize: 12, cursor: "pointer", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Less" : `+${items.length - limit} more`}
        </button>
      )}
    </div>
  );
}

export default function M2CollectionAnalysis() {
  const { t } = useTranslation();
  const session = useSession();
  const pid = session.pid;

  const { data: collection, isLoading, error } = useQuery({
    queryKey: ["m2-collection-analysis", pid],
    queryFn: () => collectionApi.getAll(pid!),
    enabled: !!pid,
    staleTime: 120000,
  });

  if (isLoading) return <M2Loading />;
  if (error) return <M2Error message={t("m2.collAnalysis.loadError", "Failed to load collection")} />;

  const items = Array.isArray(collection) ? collection : [];

  if (items.length === 0) {
    return (
      <div style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>
        <M2BackButton />
        <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
          <Library size={40} color={v.muted} style={{ marginBottom: 12 }} />
          <h2 style={{ ...sectionTitle, fontSize: 18 }}>{t("m2.collAnalysis.emptyTitle", "No Collection Yet")}</h2>
          <p style={{ fontSize: 13, color: v.muted, marginTop: 8 }}>{t("m2.collAnalysis.emptyDesc", "Import your Whiskybase collection to unlock detailed analytics.")}</p>
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
  const ageBuckets: Record<string, number> = { NAS: 0, "0–10": 0, "10–15": 0, "15–20": 0, "20–30": 0, "30+": 0 };
  const abvBuckets: Record<string, number> = { "< 40%": 0, "40–46%": 0, "46–50%": 0, "50–55%": 0, "55–60%": 0, "60%+": 0 };
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

    const region = deriveRegion(item.distillery);
    regionCounts.set(region, (regionCounts.get(region) || 0) + 1);

    if (item.distillery) {
      distilleryCounts.set(item.distillery, (distilleryCounts.get(item.distillery) || 0) + 1);
    }

    if (item.caskType) {
      const ct = item.caskType.trim();
      if (ct) caskCounts.set(ct, (caskCounts.get(ct) || 0) + 1);
    }

    const age = parseAge(item.statedAge);
    if (age === null) ageBuckets["NAS"]++;
    else if (age <= 10) ageBuckets["0–10"]++;
    else if (age <= 15) ageBuckets["10–15"]++;
    else if (age <= 20) ageBuckets["15–20"]++;
    else if (age <= 30) ageBuckets["20–30"]++;
    else ageBuckets["30+"]++;

    const abvVal = parseAbv(item.abv);
    if (abvVal !== null) {
      if (abvVal < 40) abvBuckets["< 40%"]++;
      else if (abvVal <= 46) abvBuckets["40–46%"]++;
      else if (abvVal <= 50) abvBuckets["46–50%"]++;
      else if (abvVal <= 55) abvBuckets["50–55%"]++;
      else if (abvVal <= 60) abvBuckets["55–60%"]++;
      else abvBuckets["60%+"]++;
    }

    if (item.vintage) {
      const v = parseInt(item.vintage, 10);
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

  const regionEntries: BarEntry[] = Array.from(regionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));

  const distilleryList = Array.from(distilleryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const caskEntries: BarEntry[] = Array.from(caskCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));

  const ageEntries: BarEntry[] = Object.entries(ageBuckets)
    .filter(([, v]) => v > 0)
    .map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));

  const abvEntries: BarEntry[] = Object.entries(abvBuckets)
    .filter(([, v]) => v > 0)
    .map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));

  const vintageEntries: BarEntry[] = Array.from(vintageCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, value]) => ({ label, value, pct: (value / total) * 100 }));

  valuableItems.sort((a, b) => b.price - a.price);
  const top10Valuable = valuableItems.slice(0, 10);

  const avgDelta = ratingPairs.length > 0
    ? ratingPairs.reduce((sum, r) => sum + (r.personal - r.community), 0) / ratingPairs.length
    : 0;

  const overrated = ratingPairs
    .filter((r) => r.personal - r.community > 3)
    .sort((a, b) => (b.personal - b.community) - (a.personal - a.community))
    .slice(0, 5);

  const underrated = ratingPairs
    .filter((r) => r.community - r.personal > 3)
    .sort((a, b) => (b.community - b.personal) - (a.community - a.personal))
    .slice(0, 5);

  return (
    <div style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>
      <M2BackButton />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif" }} data-testid="text-collection-analysis-title">
          {t("m2.collAnalysis.title", "Collection Analysis")}
        </h1>
        <p style={{ fontSize: 13, color: v.muted, marginTop: 4 }} data-testid="text-collection-analysis-subtitle">
          {t("m2.collAnalysis.subtitle", "Deep insights into your {{count}} bottles", { count: total })}
        </p>
      </div>

      {/* Section 1: Overview */}
      <div style={cardStyle} data-testid="card-collection-overview">
        <h2 style={sectionTitle}>{t("m2.collAnalysis.overview", "Overview")}</h2>
        <p style={sectionSub}>{t("m2.collAnalysis.overviewDesc", "Your collection at a glance")}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatCard icon={Package} label={t("m2.collAnalysis.totalBottles", "Bottles")} value={total} testId="stat-total-bottles" />
          <StatCard icon={DollarSign} label={t("m2.collAnalysis.totalValue", "Total Value")} value={paidCount > 0 ? `€${totalPaid.toLocaleString("de-DE", { maximumFractionDigits: 0 })}` : "—"} testId="stat-total-value" />
          <StatCard icon={DollarSign} label={t("m2.collAnalysis.avgPrice", "Avg Price")} value={paidCount > 0 ? `€${avgPrice.toFixed(0)}` : "—"} testId="stat-avg-price" />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: alpha("#4ade80", "15"), textAlign: "center" }} data-testid="stat-status-open">
            <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80" }}>{statusCounts.open}</div>
            <div style={{ fontSize: 11, color: v.muted }}>{t("m2.collAnalysis.statusOpen", "Open")}</div>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: alpha(v.accent, "15"), textAlign: "center" }} data-testid="stat-status-closed">
            <div style={{ fontSize: 18, fontWeight: 700, color: v.accent }}>{statusCounts.closed}</div>
            <div style={{ fontSize: 11, color: v.muted }}>{t("m2.collAnalysis.statusClosed", "Sealed")}</div>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: alpha(v.muted, "15"), textAlign: "center" }} data-testid="stat-status-empty">
            <div style={{ fontSize: 18, fontWeight: 700, color: v.muted }}>{statusCounts.empty}</div>
            <div style={{ fontSize: 11, color: v.muted }}>{t("m2.collAnalysis.statusEmpty", "Empty")}</div>
          </div>
        </div>
      </div>

      {/* Section 2: Region & Distillery */}
      <div style={cardStyle} data-testid="card-collection-regions">
        <h2 style={sectionTitle}>{t("m2.collAnalysis.regions", "Regions & Distilleries")}</h2>
        <p style={sectionSub}>{t("m2.collAnalysis.regionsDesc", "Where your bottles come from")}</p>
        <HBar entries={regionEntries} color={v.accent} testIdPrefix="bar-region" />
        {distilleryList.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: v.text, marginBottom: 8 }}>
              {t("m2.collAnalysis.topDistilleries", "Top Distilleries")}
            </h3>
            <ExpandableList items={distilleryList} limit={7} />
          </div>
        )}
      </div>

      {/* Section 3: Age Distribution */}
      <div style={cardStyle} data-testid="card-collection-age">
        <h2 style={sectionTitle}>{t("m2.collAnalysis.ageDistribution", "Age Distribution")}</h2>
        <p style={sectionSub}>{t("m2.collAnalysis.ageDesc", "How old are the whiskies in your collection?")}</p>
        <HBar entries={ageEntries} color="#a78bfa" testIdPrefix="bar-age" />
      </div>

      {/* Section 4: Cask Type */}
      {caskEntries.length > 0 && (
        <div style={cardStyle} data-testid="card-collection-cask">
          <h2 style={sectionTitle}>{t("m2.collAnalysis.caskTypes", "Cask Types")}</h2>
          <p style={sectionSub}>{t("m2.collAnalysis.caskDesc", "Which cask types dominate your collection?")}</p>
          <HBar entries={caskEntries} color="#f59e0b" testIdPrefix="bar-cask" />
        </div>
      )}

      {/* Section 5: Price Analysis */}
      {top10Valuable.length > 0 && (
        <div style={cardStyle} data-testid="card-collection-price">
          <h2 style={sectionTitle}>{t("m2.collAnalysis.priceAnalysis", "Price Analysis")}</h2>
          <p style={sectionSub}>{t("m2.collAnalysis.priceDesc", "Your most valuable bottles and price insights")}</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <StatCard
              icon={DollarSign}
              label={t("m2.collAnalysis.minPrice", "Lowest")}
              value={`€${Math.min(...valuableItems.map((i) => i.price)).toFixed(0)}`}
              testId="stat-min-price"
            />
            <StatCard
              icon={DollarSign}
              label={t("m2.collAnalysis.maxPrice", "Highest")}
              value={`€${Math.max(...valuableItems.map((i) => i.price)).toFixed(0)}`}
              testId="stat-max-price"
            />
            <StatCard
              icon={DollarSign}
              label={t("m2.collAnalysis.medianPrice", "Median")}
              value={`€${valuableItems.sort((a, b) => a.price - b.price)[Math.floor(valuableItems.length / 2)]?.price.toFixed(0) || "—"}`}
              testId="stat-median-price"
            />
          </div>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: v.text, marginBottom: 8 }}>
            {t("m2.collAnalysis.topValuable", "Most Valuable Bottles")}
          </h3>
          {top10Valuable.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${v.border}`, fontSize: 13 }} data-testid={`row-valuable-${i}`}>
              <span style={{ color: v.text, flex: 1, marginRight: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
              <span style={{ color: v.accent, fontWeight: 600, whiteSpace: "nowrap" }}>€{item.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>
      )}

      {/* Section 6: Rating Comparison */}
      {ratingPairs.length > 0 && (
        <div style={cardStyle} data-testid="card-collection-ratings">
          <h2 style={sectionTitle}>{t("m2.collAnalysis.ratingComparison", "Rating Comparison")}</h2>
          <p style={sectionSub}>{t("m2.collAnalysis.ratingDesc", "Your ratings vs. the Whiskybase community")}</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <StatCard
              icon={Star}
              label={t("m2.collAnalysis.ratedBottles", "Rated")}
              value={ratingPairs.length}
              testId="stat-rated-count"
            />
            <StatCard
              icon={Star}
              label={t("m2.collAnalysis.avgPersonal", "Your Avg")}
              value={(ratingPairs.reduce((s, r) => s + r.personal, 0) / ratingPairs.length).toFixed(1)}
              testId="stat-avg-personal"
            />
            <StatCard
              icon={Star}
              label={t("m2.collAnalysis.avgDelta", "Avg Delta")}
              value={`${avgDelta > 0 ? "+" : ""}${avgDelta.toFixed(1)}`}
              testId="stat-avg-delta"
            />
          </div>
          {ratingPairs.slice(0, 10).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${v.border}`, fontSize: 12, gap: 8 }} data-testid={`row-rating-${i}`}>
              <span style={{ flex: 1, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <span style={{ color: v.accent, fontWeight: 600, minWidth: 36, textAlign: "right" }}>{r.personal.toFixed(1)}</span>
              <span style={{ color: v.muted, minWidth: 12, textAlign: "center" }}>vs</span>
              <span style={{ color: v.muted, minWidth: 36, textAlign: "right" }}>{r.community.toFixed(1)}</span>
              <span style={{
                color: r.personal - r.community > 0 ? "#4ade80" : r.personal - r.community < 0 ? "#f87171" : v.muted,
                fontWeight: 600,
                minWidth: 40,
                textAlign: "right",
                fontSize: 11,
              }}>
                {r.personal - r.community > 0 ? "+" : ""}{(r.personal - r.community).toFixed(1)}
              </span>
            </div>
          ))}
          {overrated.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#4ade80", marginBottom: 6 }}>
                {t("m2.collAnalysis.yourFavorites", "Your Hidden Gems")} ↑
              </h3>
              {overrated.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: v.text, padding: "3px 0" }}>
                  {r.name} <span style={{ color: "#4ade80" }}>+{(r.personal - r.community).toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
          {underrated.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#f87171", marginBottom: 6 }}>
                {t("m2.collAnalysis.communityFavorites", "Community Rates Higher")} ↓
              </h3>
              {underrated.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: v.text, padding: "3px 0" }}>
                  {r.name} <span style={{ color: "#f87171" }}>{(r.personal - r.community).toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 7: ABV Distribution */}
      <div style={cardStyle} data-testid="card-collection-abv">
        <h2 style={sectionTitle}>{t("m2.collAnalysis.abvDistribution", "ABV Distribution")}</h2>
        <p style={sectionSub}>{t("m2.collAnalysis.abvDesc", "The strength spectrum of your collection")}</p>
        <HBar entries={abvEntries} color="#06b6d4" testIdPrefix="bar-abv" />
      </div>

      {/* Section 8: Vintage Timeline */}
      {vintageEntries.length > 0 && (
        <div style={cardStyle} data-testid="card-collection-vintage">
          <h2 style={sectionTitle}>{t("m2.collAnalysis.vintageTimeline", "Vintage Timeline")}</h2>
          <p style={sectionSub}>{t("m2.collAnalysis.vintageDesc", "When were your whiskies distilled?")}</p>
          <HBar entries={vintageEntries} color="#e879f9" testIdPrefix="bar-vintage" />
        </div>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}
