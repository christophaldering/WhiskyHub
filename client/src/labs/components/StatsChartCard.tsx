import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type StatsToolPayload = {
  name: string;
  data: unknown;
};

interface StatsChartCardProps {
  payload: StatsToolPayload;
  isDe: boolean;
  testId?: string;
}

interface CardShellProps {
  title: string;
  subtitle?: string;
  testId?: string;
  children: React.ReactNode;
}

function CardShell({ title, subtitle, testId, children }: CardShellProps) {
  return (
    <div
      data-testid={testId}
      style={{
        width: "100%",
        maxWidth: "85%",
        marginTop: 4,
        padding: "12px 14px",
        borderRadius: 14,
        background: "var(--labs-surface)",
        border: "1px solid var(--labs-border)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "var(--labs-accent)",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function truncateLabel(label: string, max = 28): string {
  if (label.length <= max) return label;
  return label.slice(0, max - 1) + "\u2026";
}

interface BarRowItem {
  label: string;
  value: number;
  display: string;
  sub?: string;
}

function HorizontalBarList({
  items,
  maxValue,
  testIdPrefix,
}: {
  items: BarRowItem[];
  maxValue: number;
  testIdPrefix: string;
}) {
  const denom = maxValue > 0 ? maxValue : 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, idx) => {
        const pct = Math.max(2, Math.min(100, (item.value / denom) * 100));
        return (
          <div
            key={`${testIdPrefix}-${idx}`}
            data-testid={`${testIdPrefix}-${idx}`}
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 8,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  color: "var(--labs-text)",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
                title={item.label}
              >
                {truncateLabel(item.label)}
              </span>
              <span
                style={{
                  color: "var(--labs-accent)",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}
              >
                {item.display}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 6,
                borderRadius: 3,
                background: "var(--labs-border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "var(--labs-accent)",
                  borderRadius: 3,
                  transition: "width 240ms ease",
                }}
              />
            </div>
            {item.sub && (
              <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                {item.sub}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: "1 1 80px",
        minWidth: 80,
        padding: "8px 10px",
        borderRadius: 10,
        background: "rgba(201, 169, 97, 0.08)",
        border: "1px solid var(--labs-border)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          color: "var(--labs-text-muted)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "var(--labs-text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function fmtNumber(value: unknown, fallback = "0"): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) >= 1000
      ? value.toLocaleString()
      : String(Math.round(value * 10) / 10);
  }
  return fallback;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return fallback;
}

function asNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function renderTopWhiskies(data: unknown, isDe: boolean): React.ReactNode {
  const obj = (data ?? {}) as Record<string, unknown>;
  const whiskies = asArray(obj.whiskies)
    .map((w) => w as Record<string, unknown>)
    .filter((w) => asNumber(w.avg_score) > 0);
  if (whiskies.length === 0) return null;
  const items: BarRowItem[] = whiskies.map((w) => {
    const name = asString(w.name, isDe ? "Unbekannt" : "Unknown");
    const distillery = asString(w.distillery);
    const score = asNumber(w.avg_score);
    return {
      label: name,
      value: score,
      display: `${score.toFixed(1)} / 100`,
      sub: distillery || undefined,
    };
  });
  return (
    <CardShell
      testId="stats-chart-top-whiskies"
      title={isDe ? "Top Whiskys nach Score" : "Top whiskies by score"}
      subtitle={isDe ? "Dein persoenlicher Durchschnitt" : "Your personal average"}
    >
      <HorizontalBarList
        items={items}
        maxValue={100}
        testIdPrefix="stats-bar-top-whisky"
      />
    </CardShell>
  );
}

function renderTopTastings(data: unknown, isDe: boolean): React.ReactNode {
  const obj = (data ?? {}) as Record<string, unknown>;
  const tastings = asArray(obj.tastings)
    .map((t) => t as Record<string, unknown>)
    .filter((t) => asNumber(t.avg_score) > 0);
  if (tastings.length === 0) return null;
  const items: BarRowItem[] = tastings.map((t) => {
    const title = asString(t.title, isDe ? "Tasting" : "Tasting");
    const location = asString(t.location);
    const date = asString(t.date);
    const score = asNumber(t.avg_score);
    const subParts = [location, date].filter(Boolean).join(" \u2022 ");
    return {
      label: title,
      value: score,
      display: `${score.toFixed(1)} / 100`,
      sub: subParts || undefined,
    };
  });
  return (
    <CardShell
      testId="stats-chart-top-tastings"
      title={isDe ? "Top Tastings" : "Top tastings"}
      subtitle={isDe ? "Durchschnittliche Bewertung" : "Average rating"}
    >
      <HorizontalBarList
        items={items}
        maxValue={100}
        testIdPrefix="stats-bar-top-tasting"
      />
    </CardShell>
  );
}

function renderOverviewStats(data: unknown, isDe: boolean): React.ReactNode {
  const obj = (data ?? {}) as Record<string, unknown>;
  const ratedWhiskies = asNumber(obj.rated_whiskies);
  const totalTastings = asNumber(obj.total_tastings);
  const totalRatings = asNumber(obj.total_ratings);
  const avgScore = asNumber(obj.avg_score);
  const regions = asArray(obj.top_regions)
    .map((r) => r as Record<string, unknown>)
    .filter((r) => asNumber(r.whisky_count) > 0);
  const regionMax = regions.reduce(
    (m, r) => Math.max(m, asNumber(r.whisky_count)),
    0,
  );
  if (
    ratedWhiskies === 0 &&
    totalTastings === 0 &&
    totalRatings === 0 &&
    regions.length === 0
  ) {
    return null;
  }
  return (
    <CardShell
      testId="stats-chart-overview"
      title={isDe ? "Deine Whisky-Reise" : "Your whisky journey"}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <StatPill
          label={isDe ? "Whiskys" : "Whiskies"}
          value={fmtNumber(ratedWhiskies)}
        />
        <StatPill
          label={isDe ? "Tastings" : "Tastings"}
          value={fmtNumber(totalTastings)}
        />
        <StatPill
          label={isDe ? "Bewertungen" : "Ratings"}
          value={fmtNumber(totalRatings)}
        />
        <StatPill
          label={isDe ? "\u00d8 Score" : "Avg score"}
          value={avgScore > 0 ? avgScore.toFixed(1) : "\u2014"}
        />
      </div>
      {regions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.3,
              color: "var(--labs-text-muted)",
              textTransform: "uppercase",
            }}
          >
            {isDe ? "Top Regionen" : "Top regions"}
          </div>
          <HorizontalBarList
            items={regions.map((r) => {
              const count = asNumber(r.whisky_count);
              return {
                label: asString(r.region, isDe ? "Unbekannt" : "Unknown"),
                value: count,
                display: `${count}`,
              };
            })}
            maxValue={regionMax}
            testIdPrefix="stats-bar-overview-region"
          />
        </div>
      )}
    </CardShell>
  );
}

function renderCountWhiskies(data: unknown, isDe: boolean): React.ReactNode {
  const obj = (data ?? {}) as Record<string, unknown>;
  const total = asNumber(obj.total_count);
  const sample = asArray(obj.sample)
    .map((s) => s as Record<string, unknown>)
    .filter((s) => asNumber(s.user_score) > 0);
  if (total === 0 && sample.length === 0) return null;
  const filters = (obj.applied_filters ?? {}) as Record<string, unknown>;
  const filterParts: string[] = [];
  if (asString(filters.region)) {
    filterParts.push(asString(filters.region));
  }
  if (asString(filters.peat_level)) {
    filterParts.push(
      isDe
        ? `Torf: ${asString(filters.peat_level)}`
        : `peat: ${asString(filters.peat_level)}`,
    );
  }
  if (asString(filters.distillery)) {
    filterParts.push(asString(filters.distillery));
  }
  if (filters.min_score != null && asNumber(filters.min_score) > 0) {
    filterParts.push(`\u2265 ${asNumber(filters.min_score)}`);
  }
  if (filters.max_score != null && asNumber(filters.max_score) > 0) {
    filterParts.push(`\u2264 ${asNumber(filters.max_score)}`);
  }
  return (
    <CardShell
      testId="stats-chart-count-whiskies"
      title={isDe ? "Treffer in deinen Whiskys" : "Whiskies matching your filter"}
      subtitle={filterParts.length > 0 ? filterParts.join(" \u2022 ") : undefined}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          padding: "6px 0",
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "var(--labs-accent)",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
          data-testid="stats-count-total"
        >
          {fmtNumber(total)}
        </span>
        <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
          {isDe ? "Whiskys insgesamt" : "whiskies total"}
        </span>
      </div>
      {sample.length > 0 && (
        <HorizontalBarList
          items={sample.map((w) => {
            const score = asNumber(w.user_score);
            const sub = [asString(w.distillery), asString(w.region)]
              .filter(Boolean)
              .join(" \u2022 ");
            return {
              label: asString(w.name, isDe ? "Unbekannt" : "Unknown"),
              value: score,
              display: `${score.toFixed(1)}`,
              sub: sub || undefined,
            };
          })}
          maxValue={100}
          testIdPrefix="stats-bar-count-sample"
        />
      )}
    </CardShell>
  );
}

function renderRecentRatings(data: unknown, isDe: boolean): React.ReactNode {
  const obj = (data ?? {}) as Record<string, unknown>;
  const ratings = asArray(obj.ratings)
    .map((r) => r as Record<string, unknown>)
    .filter((r) => asNumber(r.score) > 0);
  if (ratings.length === 0) return null;
  const histogramBuckets = [
    { label: "<60", min: 0, max: 60 },
    { label: "60\u201370", min: 60, max: 70 },
    { label: "70\u201380", min: 70, max: 80 },
    { label: "80\u201390", min: 80, max: 90 },
    { label: "90+", min: 90, max: 101 },
  ];
  const counts = histogramBuckets.map((b) => ({
    bucket: b.label,
    count: ratings.filter((r) => {
      const s = asNumber(r.score);
      return s >= b.min && s < b.max;
    }).length,
  }));
  const accent = "var(--labs-accent)";
  return (
    <CardShell
      testId="stats-chart-recent-ratings"
      title={isDe ? "Verteilung der letzten Bewertungen" : "Recent rating distribution"}
      subtitle={
        isDe
          ? `${ratings.length} Bewertungen`
          : `${ratings.length} ratings`
      }
    >
      <div style={{ width: "100%", height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={counts}
            margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
          >
            <XAxis
              dataKey="bucket"
              tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--labs-border)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--labs-border)" }}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "rgba(201, 169, 97, 0.08)" }}
              contentStyle={{
                background: "var(--labs-surface)",
                border: "1px solid var(--labs-border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--labs-text)",
              }}
              labelStyle={{ color: "var(--labs-text-muted)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {counts.map((_, i) => (
                <Cell key={`cell-${i}`} fill={accent} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  );
}

function renderRoleBreakdown(data: unknown, isDe: boolean): React.ReactNode {
  const obj = (data ?? {}) as Record<string, unknown>;
  const asHost = asNumber(obj.as_host);
  const asGuest = asNumber(obj.as_guest);
  const total = asHost + asGuest;
  if (total === 0) return null;
  const hostPct = (asHost / total) * 100;
  const guestPct = 100 - hostPct;
  return (
    <CardShell
      testId="stats-chart-role-breakdown"
      title={isDe ? "Tastings: Host vs. Gast" : "Tastings: host vs. guest"}
      subtitle={
        isDe ? `${total} Tastings insgesamt` : `${total} tastings total`
      }
    >
      <div
        style={{
          width: "100%",
          height: 14,
          borderRadius: 7,
          overflow: "hidden",
          display: "flex",
          background: "var(--labs-border)",
        }}
      >
        {asHost > 0 && (
          <div
            data-testid="stats-role-host-bar"
            style={{
              width: `${hostPct}%`,
              background: "var(--labs-accent)",
              transition: "width 240ms ease",
            }}
          />
        )}
        {asGuest > 0 && (
          <div
            data-testid="stats-role-guest-bar"
            style={{
              width: `${guestPct}%`,
              background: "rgba(201, 169, 97, 0.35)",
              transition: "width 240ms ease",
            }}
          />
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--labs-text-secondary)",
        }}
      >
        <span data-testid="stats-role-host-label">
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 2,
              marginRight: 6,
              background: "var(--labs-accent)",
              verticalAlign: "middle",
            }}
          />
          {isDe ? "Host" : "Host"}: <strong>{asHost}</strong>
        </span>
        <span data-testid="stats-role-guest-label">
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 2,
              marginRight: 6,
              background: "rgba(201, 169, 97, 0.35)",
              verticalAlign: "middle",
            }}
          />
          {isDe ? "Gast" : "Guest"}: <strong>{asGuest}</strong>
        </span>
      </div>
    </CardShell>
  );
}

function renderPerDramStats(data: unknown, isDe: boolean): React.ReactNode {
  const obj = (data ?? {}) as Record<string, unknown>;
  const drams = asArray(obj.drams)
    .map((d) => d as Record<string, unknown>)
    .filter((d) => asNumber(d.avg_overall) > 0);
  if (drams.length === 0) return null;
  const polarising = (obj.most_polarising_dram ?? null) as Record<string, unknown> | null;
  const polarisingId = polarising ? asString(polarising.whisky_id) : "";
  const items: BarRowItem[] = drams.map((d) => {
    const avg = asNumber(d.avg_overall);
    const std = asNumber(d.stddev_overall);
    const isPolarising = polarisingId && asString(d.whisky_id) === polarisingId;
    const subParts = [asString(d.distillery), asString(d.region)].filter(Boolean).join(" \u2022 ");
    const stdLabel = std > 0
      ? (isDe ? `\u03c3 ${std.toFixed(2)}` : `\u03c3 ${std.toFixed(2)}`)
      : "";
    const polarisingLabel = isPolarising
      ? (isDe ? "polarisierend" : "polarising")
      : "";
    const sub = [subParts, stdLabel, polarisingLabel].filter(Boolean).join(" \u2022 ");
    return {
      label: asString(d.name, isDe ? "Unbekannt" : "Unknown"),
      value: avg,
      display: `${avg.toFixed(1)} / 100`,
      sub: sub || undefined,
    };
  });
  return (
    <CardShell
      testId="stats-chart-per-dram"
      title={isDe ? "Pro-Dram-Statistik" : "Per-dram statistics"}
      subtitle={isDe ? "\u00d8 Score \u2022 \u03c3 = Streuung" : "Avg score \u2022 \u03c3 = spread"}
    >
      <HorizontalBarList
        items={items}
        maxValue={100}
        testIdPrefix="stats-bar-per-dram"
      />
    </CardShell>
  );
}

function renderUserConsistency(data: unknown, isDe: boolean): React.ReactNode {
  const obj = (data ?? {}) as Record<string, unknown>;
  const ranked = asArray(obj.ranked_by_consistency)
    .map((r) => r as Record<string, unknown>);
  if (ranked.length === 0) return null;
  const maxDev = ranked.reduce((m, r) => Math.max(m, asNumber(r.avg_deviation)), 0);
  const items: BarRowItem[] = ranked.map((r) => {
    const dev = asNumber(r.avg_deviation);
    const isUser = r.is_user === true;
    const name = asString(r.participant_name, isDe ? "Unbekannt" : "Unknown");
    const ratingCount = asNumber(r.rating_count);
    const sub = isUser
      ? (isDe ? `du \u2022 ${ratingCount} Bewertungen` : `you \u2022 ${ratingCount} ratings`)
      : (isDe ? `${ratingCount} Bewertungen` : `${ratingCount} ratings`);
    return {
      label: name,
      value: dev,
      display: dev > 0 ? `\u00d8 ${dev.toFixed(1)}` : "\u2014",
      sub,
    };
  });
  return (
    <CardShell
      testId="stats-chart-consistency"
      title={isDe ? "Konsistenz vs. Gruppen-Schnitt" : "Consistency vs. group average"}
      subtitle={isDe ? "Niedriger = naeher am Gruppenschnitt" : "Lower = closer to group"}
    >
      <HorizontalBarList
        items={items}
        maxValue={maxDev > 0 ? maxDev : 1}
        testIdPrefix="stats-bar-consistency"
      />
    </CardShell>
  );
}

function renderRevealTimeline(data: unknown, isDe: boolean): React.ReactNode {
  const obj = (data ?? {}) as Record<string, unknown>;
  if (obj.has_reveal_data === false) return null;
  const drams = asArray(obj.drams)
    .map((d) => d as Record<string, unknown>)
    .filter((d) => d.group_delta_avg !== null || d.user_delta !== null);
  if (drams.length === 0) return null;
  const accent = "var(--labs-accent)";
  const muted = "rgba(201, 169, 97, 0.45)";
  const chartData = drams.map((d) => ({
    name: asString(d.name, isDe ? "Unbekannt" : "Unknown"),
    group: asNumber(d.group_delta_avg),
    user: asNumber(d.user_delta),
  }));
  return (
    <CardShell
      testId="stats-chart-reveal"
      title={isDe ? "Reveal-Effekt pro Dram" : "Reveal effect per dram"}
      subtitle={isDe ? "Score-Veraenderung nach Enthuellung" : "Score change after reveal"}
    >
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--labs-text-muted)", fontSize: 10 }}
              axisLine={{ stroke: "var(--labs-border)" }}
              tickLine={false}
              tickFormatter={(v: string) => truncateLabel(v, 10)}
              interval={0}
            />
            <YAxis
              tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--labs-border)" }}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "rgba(201, 169, 97, 0.08)" }}
              contentStyle={{
                background: "var(--labs-surface)",
                border: "1px solid var(--labs-border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--labs-text)",
              }}
              labelStyle={{ color: "var(--labs-text-muted)" }}
            />
            <Bar dataKey="group" name={isDe ? "Gruppe" : "Group"} fill={muted} radius={[3, 3, 0, 0]} />
            <Bar dataKey="user" name={isDe ? "Du" : "You"} fill={accent} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardShell>
  );
}

export default function StatsChartCard({ payload, isDe, testId }: StatsChartCardProps) {
  const node = useMemo(() => {
    switch (payload.name) {
      case "get_user_top_whiskies":
        return renderTopWhiskies(payload.data, isDe);
      case "get_user_top_tastings":
        return renderTopTastings(payload.data, isDe);
      case "get_user_overview_stats":
        return renderOverviewStats(payload.data, isDe);
      case "count_user_whiskies":
        return renderCountWhiskies(payload.data, isDe);
      case "get_user_recent_ratings":
        return renderRecentRatings(payload.data, isDe);
      case "get_user_tastings_role_breakdown":
        return renderRoleBreakdown(payload.data, isDe);
      case "get_per_dram_stats":
        return renderPerDramStats(payload.data, isDe);
      case "get_user_consistency":
        return renderUserConsistency(payload.data, isDe);
      case "get_reveal_timeline":
        return renderRevealTimeline(payload.data, isDe);
      default:
        return null;
    }
  }, [payload.name, payload.data, isDe]);

  if (!node) return null;
  return <div data-testid={testId}>{node}</div>;
}
