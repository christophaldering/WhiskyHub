import { useState, useEffect, useMemo, useCallback } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import { Back, Search, Spinner } from "../../icons";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";

interface WhiskyItem {
  id: string;
  name: string;
  distillery: string | null;
  region: string | null;
  avgOverall: number | null;
  ratingCount: number;
}

interface ExploreWhiskiesProps {
  onBack: () => void;
  onSelectBottle: (id: string) => void;
}

const REGIONS = ["All", "Islay", "Speyside", "Highland", "Lowland", "Campbeltown", "Islands", "Japan", "Ireland", "USA"];
const SORTS = ["avg", "most", "alpha"] as const;
type SortMode = typeof SORTS[number];
const PAGE_SIZE = 20;

export default function ExploreWhiskies({ onBack, onSelectBottle }: ExploreWhiskiesProps) {
  const { th } = useV2Theme();
  const { t } = useV2Lang();

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All");
  const [sort, setSort] = useState<SortMode>("avg");
  const [whiskies, setWhiskies] = useState<WhiskyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);

  const fetchWhiskies = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (region !== "All") params.set("region", region);
      const res = await fetch(`/api/labs/explore/whiskies?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setWhiskies(data.whiskies ?? data ?? []);
    } catch {
      setError(true);
      setWhiskies([]);
    } finally {
      setLoading(false);
    }
  }, [search, region]);

  useEffect(() => {
    const timer = setTimeout(fetchWhiskies, 300);
    return () => clearTimeout(timer);
  }, [fetchWhiskies]);

  useEffect(() => { setPage(1); }, [search, region, sort]);

  const sorted = useMemo(() => {
    const list = [...whiskies];
    if (sort === "avg") list.sort((a, b) => (b.avgOverall ?? 0) - (a.avgOverall ?? 0));
    else if (sort === "most") list.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
    else if (sort === "alpha") list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return list;
  }, [whiskies, sort]);

  const paged = useMemo(() => sorted.slice(0, page * PAGE_SIZE), [sorted, page]);
  const hasMore = paged.length < sorted.length;

  const sortLabels: Record<SortMode, string> = {
    avg: t.entSortAvg,
    most: t.entSortMost,
    alpha: t.entSortAlpha,
  };

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
        data-testid="button-back-explore"
      >
        <Back color={th.muted} size={18} />
        {t.entTitle}
      </button>

      <h1
        style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, color: th.text, marginBottom: SP.sm }}
        data-testid="text-explore-title"
      >
        {t.entExplore}
      </h1>
      <p style={{ fontSize: 13, color: th.muted, marginBottom: SP.md }}>{t.entExploreSub}</p>

      <div style={{ position: "relative", marginBottom: SP.md }}>
        <Search color={th.muted} size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.entSearch}
          style={{
            width: "100%",
            boxSizing: "border-box",
            height: TOUCH_MIN,
            paddingLeft: 36,
            paddingRight: SP.md,
            background: th.inputBg,
            border: `1px solid ${th.border}`,
            borderRadius: RADIUS.md,
            color: th.text,
            fontSize: 14,
            fontFamily: FONT.body,
            outline: "none",
          }}
          data-testid="input-explore-search"
        />
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: SP.sm, paddingBottom: 4 }}>
        {REGIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            style={{
              padding: "5px 12px",
              borderRadius: RADIUS.full,
              border: `1px solid ${region === r ? th.gold : th.border}`,
              background: region === r ? th.gold : "transparent",
              color: region === r ? th.bg : th.muted,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: FONT.body,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            data-testid={`chip-region-${r.toLowerCase()}`}
          >
            {r === "All" ? t.entFilterAll : r}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "inline-flex",
          border: `1px solid ${th.border}`,
          borderRadius: RADIUS.md,
          overflow: "hidden",
          marginBottom: SP.md,
        }}
      >
        {SORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            style={{
              padding: "6px 14px",
              background: sort === s ? th.bgCard : "transparent",
              color: sort === s ? th.gold : th.muted,
              border: "none",
              fontSize: 12,
              fontWeight: sort === s ? 600 : 400,
              fontFamily: FONT.body,
              cursor: "pointer",
            }}
            data-testid={`sort-${s}`}
          >
            {sortLabels[s]}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: SP.xxl }}>
          <Spinner color={th.muted} size={24} />
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted, fontSize: 14 }} data-testid="text-explore-error">
          Error loading whiskies
        </div>
      )}

      {!loading && !error && whiskies.length === 0 && (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted, fontSize: 14 }} data-testid="text-explore-empty">
          No whiskies found
        </div>
      )}

      {!loading && !error && paged.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: th.muted, marginBottom: SP.sm }}>{whiskies.length} whiskies</div>
          <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
            {paged.map((w) => (
              <button
                key={w.id}
                onClick={() => onSelectBottle(w.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: SP.md,
                  padding: `${SP.md}px`,
                  background: th.bgCard,
                  border: `1px solid ${th.border}`,
                  borderRadius: RADIUS.md,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
                data-testid={`whisky-card-${w.id}`}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: 12, color: th.muted, marginTop: 2, display: "flex", gap: SP.sm, flexWrap: "wrap" }}>
                    {w.distillery && <span>{w.distillery}</span>}
                    {w.region && <span>{w.region}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {w.avgOverall != null && (
                    <div style={{ fontSize: 16, fontWeight: 700, color: th.gold, fontVariantNumeric: "tabular-nums" }}>
                      {Math.round(w.avgOverall * 10) / 10}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: th.muted }}>{w.ratingCount} ratings</div>
                </div>
              </button>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              style={{
                display: "block",
                margin: `${SP.md}px auto`,
                padding: `${SP.sm}px ${SP.lg}px`,
                background: th.bgCard,
                border: `1px solid ${th.border}`,
                borderRadius: RADIUS.md,
                color: th.gold,
                fontSize: 13,
                fontFamily: FONT.body,
                cursor: "pointer",
              }}
              data-testid="button-load-more"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
