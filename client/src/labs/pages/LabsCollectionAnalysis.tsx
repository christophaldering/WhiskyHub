import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useSession } from "@/lib/session";
import { collectionApi } from "@/lib/api";
import { distilleries } from "@/data/distilleries";
import {
  ChevronLeft, Library, Wine, MapPin, Clock, Layers, DollarSign,
  Star, Droplets, Calendar, Package, ChevronDown, ChevronUp,
} from "lucide-react";

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
  vintage: string | null;
  personalRating: number | null;
  communityRating: number | null;
}

function HBar({ entries, color, testIdPrefix }: { entries: BarEntry[]; color: string; testIdPrefix: string }) {
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map(e => (
        <div key={e.label} data-testid={`${testIdPrefix}-${e.label}`}>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "var(--labs-text)" }}>{e.label}</span>
            <span style={{ color: "var(--labs-text-muted)" }}>{e.value} ({e.pct.toFixed(0)}%)</span>
          </div>
          <div style={{ height: 8, background: "color-mix(in srgb, " + color + " 15%, transparent)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(e.pct, 2)}%`, background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, testId }: { icon: React.ElementType; label: string; value: string | number; testId: string }) {
  return (
    <div className="labs-card" style={{ flex: 1, minWidth: 110, padding: "14px 12px", textAlign: "center" }} data-testid={testId}>
      <Icon style={{ width: 18, height: 18, color: "var(--labs-accent)", marginBottom: 6 }} />
      <div className="labs-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--labs-text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ExpandableList({ items, limit = 5 }: { items: { label: string; count: number }[]; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);
  return (
    <div>
      {visible.map(item => (
        <div key={item.label} className="flex justify-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--labs-border)", fontSize: 13, color: "var(--labs-text)" }}>
          <span>{item.label}</span>
          <span style={{ color: "var(--labs-text-muted)" }}>{item.count}</span>
        </div>
      ))}
      {items.length > limit && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="labs-btn-ghost"
          style={{ fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}
          data-testid="button-expand-list"
        >
          {expanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
          {expanded ? "Less" : `+${items.length - limit} more`}
        </button>
      )}
    </div>
  );
}

export default function LabsCollectionAnalysis() {
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
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Library className="w-12 h-12 mb-4" style={{ color: "var(--labs-accent)" }} />
        <p style={{ color: "var(--labs-text)", fontSize: 16, fontWeight: 600 }}>Collection Analysis</p>
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>Sign in to analyze your collection</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto">
        <div className="labs-card p-8 text-center"><div className="labs-spinner mx-auto" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto">
        <div className="labs-card p-6 text-center" style={{ color: "var(--labs-danger)" }}>Failed to load collection</div>
      </div>
    );
  }

  const items: CollectionItem[] = Array.isArray(collection) ? collection : [];

  if (items.length === 0) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto">
        <Link href="/labs/taste" style={{ textDecoration: "none" }}>
          <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-empty"><ChevronLeft className="w-4 h-4" /> Taste</button>
        </Link>
        <div className="labs-empty">
          <Library className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p className="labs-serif" style={{ color: "var(--labs-text)", fontSize: 16, fontWeight: 600 }}>No Collection Yet</p>
          <p style={{ color: "var(--labs-text-muted)", fontSize: 13, marginTop: 8 }}>Import your Whiskybase collection to unlock detailed analytics.</p>
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

    const region = deriveRegion(item.distillery);
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

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-collection-analysis">
      <Link href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-collection">
          <ChevronLeft className="w-4 h-4" /> Taste
        </button>
      </Link>

      <div className="mb-5 labs-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <Library className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
          <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="text-collection-analysis-title">
            Collection Analysis
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
          Deep insights into your {total} bottles
        </p>
      </div>

      <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="card-collection-overview">
        <p className="labs-section-label mb-3">Overview</p>
        <div className="flex gap-2.5 flex-wrap mb-3">
          <StatCard icon={Package} label="Bottles" value={total} testId="stat-total-bottles" />
          <StatCard icon={DollarSign} label="Total Value" value={paidCount > 0 ? `€${totalPaid.toLocaleString("de-DE", { maximumFractionDigits: 0 })}` : "—"} testId="stat-total-value" />
          <StatCard icon={DollarSign} label="Avg Price" value={paidCount > 0 ? `€${avgPrice.toFixed(0)}` : "—"} testId="stat-avg-price" />
        </div>
        <div className="flex gap-2.5">
          {[
            { label: "Open", count: statusCounts.open, color: "var(--labs-success)", id: "open" },
            { label: "Sealed", count: statusCounts.closed, color: "var(--labs-accent)", id: "closed" },
            { label: "Empty", count: statusCounts.empty, color: "var(--labs-text-muted)", id: "empty" },
          ].map(s => (
            <div key={s.id} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: `color-mix(in srgb, ${s.color} 12%, transparent)`, textAlign: "center" }} data-testid={`stat-status-${s.id}`}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="card-collection-regions">
        <p className="labs-section-label mb-1">Regions & Distilleries</p>
        <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>Where your bottles come from</p>
        <HBar entries={regionEntries} color="var(--labs-accent)" testIdPrefix="bar-region" />
        {distilleryList.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--labs-text)" }}>Top Distilleries</p>
            <ExpandableList items={distilleryList} limit={7} />
          </div>
        )}
      </div>

      <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="card-collection-age">
        <p className="labs-section-label mb-1">Age Distribution</p>
        <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>How old are the whiskies in your collection?</p>
        <HBar entries={ageEntries} color="var(--labs-info)" testIdPrefix="bar-age" />
      </div>

      {caskEntries.length > 0 && (
        <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="card-collection-cask">
          <p className="labs-section-label mb-1">Cask Types</p>
          <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>Which cask types dominate your collection?</p>
          <HBar entries={caskEntries} color="var(--labs-accent)" testIdPrefix="bar-cask" />
        </div>
      )}

      {top10Valuable.length > 0 && (
        <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="card-collection-price">
          <p className="labs-section-label mb-1">Price Analysis</p>
          <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>Your most valuable bottles</p>
          <div className="flex gap-2.5 flex-wrap mb-3">
            <StatCard icon={DollarSign} label="Lowest" value={`€${Math.min(...valuableItems.map(i => i.price)).toFixed(0)}`} testId="stat-min-price" />
            <StatCard icon={DollarSign} label="Highest" value={`€${Math.max(...valuableItems.map(i => i.price)).toFixed(0)}`} testId="stat-max-price" />
            <StatCard icon={DollarSign} label="Median" value={`€${valuableItems.sort((a, b) => a.price - b.price)[Math.floor(valuableItems.length / 2)]?.price.toFixed(0) || "—"}`} testId="stat-median-price" />
          </div>
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--labs-text)" }}>Most Valuable Bottles</p>
          {top10Valuable.map((item, i) => (
            <div key={i} className="flex justify-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--labs-border)", fontSize: 13 }} data-testid={`row-valuable-${i}`}>
              <span style={{ color: "var(--labs-text)", flex: 1, marginRight: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
              <span style={{ color: "var(--labs-accent)", fontWeight: 600, whiteSpace: "nowrap" }}>€{item.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}</span>
            </div>
          ))}
        </div>
      )}

      {ratingPairs.length > 0 && (
        <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="card-collection-ratings">
          <p className="labs-section-label mb-1">Rating Comparison</p>
          <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>Your ratings vs. community</p>
          <div className="flex gap-2.5 flex-wrap mb-3">
            <StatCard icon={Star} label="Rated" value={ratingPairs.length} testId="stat-rated-count" />
            <StatCard icon={Star} label="Your Avg" value={(ratingPairs.reduce((s, r) => s + r.personal, 0) / ratingPairs.length).toFixed(1)} testId="stat-avg-personal" />
            <StatCard icon={Star} label="Avg Delta" value={`${avgDelta > 0 ? "+" : ""}${avgDelta.toFixed(1)}`} testId="stat-avg-delta" />
          </div>
          {ratingPairs.slice(0, 10).map((r, i) => (
            <div key={i} className="flex items-center" style={{ padding: "6px 0", borderBottom: "1px solid var(--labs-border)", fontSize: 12, gap: 8 }} data-testid={`row-rating-${i}`}>
              <span style={{ flex: 1, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <span style={{ color: "var(--labs-accent)", fontWeight: 600, minWidth: 36, textAlign: "right" }}>{r.personal.toFixed(1)}</span>
              <span style={{ color: "var(--labs-text-muted)", minWidth: 12, textAlign: "center" }}>vs</span>
              <span style={{ color: "var(--labs-text-muted)", minWidth: 36, textAlign: "right" }}>{r.community.toFixed(1)}</span>
              <span style={{
                color: r.personal - r.community > 0 ? "var(--labs-success)" : r.personal - r.community < 0 ? "var(--labs-danger)" : "var(--labs-text-muted)",
                fontWeight: 600, minWidth: 40, textAlign: "right", fontSize: 11,
              }}>
                {r.personal - r.community > 0 ? "+" : ""}{(r.personal - r.community).toFixed(1)}
              </span>
            </div>
          ))}
          {overrated.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-success)", marginBottom: 6 }}>Your Hidden Gems ↑</p>
              {overrated.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--labs-text)", padding: "3px 0" }}>
                  {r.name} <span style={{ color: "var(--labs-success)" }}>+{(r.personal - r.community).toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
          {underrated.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-danger)", marginBottom: 6 }}>Community Rates Higher ↓</p>
              {underrated.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--labs-text)", padding: "3px 0" }}>
                  {r.name} <span style={{ color: "var(--labs-danger)" }}>{(r.personal - r.community).toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="card-collection-abv">
        <p className="labs-section-label mb-1">ABV Distribution</p>
        <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>The strength spectrum of your collection</p>
        <HBar entries={abvEntries} color="var(--labs-info)" testIdPrefix="bar-abv" />
      </div>

      {vintageEntries.length > 0 && (
        <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="card-collection-vintage">
          <p className="labs-section-label mb-1">Vintage Timeline</p>
          <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>When were your whiskies distilled?</p>
          <HBar entries={vintageEntries} color="var(--labs-success)" testIdPrefix="bar-vintage" />
        </div>
      )}

      <div style={{ height: 60 }} />
    </div>
  );
}
