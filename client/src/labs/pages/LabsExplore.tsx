import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, SlidersHorizontal, Star, Wine, ChevronRight, TrendingUp, Hash, ArrowUpDown } from "lucide-react";
import WhiskyImage from "@/labs/components/WhiskyImage";
import { exploreApi } from "@/lib/api";
import { SkeletonList } from "@/labs/components/LabsSkeleton";

type SortOption = "avg_score" | "most_rated" | "alphabetical";

export default function LabsExplore() {
  const [, navigate] = useLocation();
  const [searchText, setSearchText] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("most_rated");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement>(null);

  const { data: whiskies, isLoading } = useQuery({
    queryKey: ["labs-explore-whiskies", searchText, selectedRegion],
    queryFn: () => exploreApi.getWhiskies(searchText || undefined, selectedRegion || undefined),
  });

  const regions = useMemo(() => {
    if (!whiskies || !Array.isArray(whiskies)) return [];
    const regionSet = new Set<string>();
    whiskies.forEach((w: any) => {
      if (w.region) regionSet.add(w.region);
    });
    return Array.from(regionSet).sort();
  }, [whiskies]);

  const sortedWhiskies = useMemo(() => {
    if (!whiskies || !Array.isArray(whiskies)) return [];
    const list = [...whiskies];
    switch (sortBy) {
      case "avg_score":
        list.sort((a: any, b: any) => (b.avgOverall || 0) - (a.avgOverall || 0));
        break;
      case "most_rated":
        list.sort((a: any, b: any) => (b.ratingCount || 0) - (a.ratingCount || 0));
        break;
      case "alphabetical":
        list.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        break;
    }
    return list;
  }, [whiskies, sortBy]);

  const sortLabels: Record<SortOption, string> = {
    avg_score: "Avg Score",
    most_rated: "Most Rated",
    alphabetical: "A–Z",
  };

  return (
    <div className="labs-page-wide">
      <h1
        className="labs-serif text-xl font-semibold mb-1 labs-fade-in"
        style={{ color: "var(--labs-text)" }}
        data-testid="labs-explore-title"
      >
        Explore
      </h1>
      <p
        className="text-sm mb-5 labs-fade-in labs-stagger-1"
        style={{ color: "var(--labs-text-muted)" }}
      >
        Browse whiskies tasted across all sessions
      </p>

      <div className="relative mb-4 labs-fade-in labs-stagger-1">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--labs-text-muted)" }}
        />
        <input
          className="labs-input"
          style={{ paddingLeft: 44, paddingRight: 16 }}
          placeholder="Search by name, distillery, region…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          data-testid="labs-explore-search"
        />
      </div>

      {regions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 labs-fade-in labs-stagger-2" style={{ scrollbarWidth: "none" }}>
          <button
            className={`labs-badge whitespace-nowrap flex-shrink-0 cursor-pointer transition-colors ${
              !selectedRegion ? "labs-badge-accent" : ""
            }`}
            style={selectedRegion ? { background: "var(--labs-surface)", color: "var(--labs-text-muted)", border: "1px solid var(--labs-border)" } : {}}
            onClick={() => setSelectedRegion(null)}
            data-testid="labs-explore-region-all"
          >
            All Regions
          </button>
          {regions.map((region) => (
            <button
              key={region}
              className={`labs-badge whitespace-nowrap flex-shrink-0 cursor-pointer transition-colors ${
                selectedRegion === region ? "labs-badge-accent" : ""
              }`}
              style={selectedRegion !== region ? { background: "var(--labs-surface)", color: "var(--labs-text-muted)", border: "1px solid var(--labs-border)" } : {}}
              onClick={() => setSelectedRegion(selectedRegion === region ? null : region)}
              data-testid={`labs-explore-region-${region}`}
            >
              {region}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4 labs-fade-in labs-stagger-2">
        <p className="text-xs font-medium" style={{ color: "var(--labs-text-muted)" }}>
          {sortedWhiskies.length} {sortedWhiskies.length === 1 ? "whisky" : "whiskies"}
        </p>
        <div style={{ position: "relative" }}>
          <button
            ref={sortBtnRef}
            className="labs-btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3"
            onClick={() => setShowSortMenu(!showSortMenu)}
            data-testid="labs-explore-sort-toggle"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortLabels[sortBy]}
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setShowSortMenu(false)} />
              <div
                className="py-1 min-w-[140px]"
                style={{
                  position: "fixed",
                  right: 20,
                  top: (() => {
                    const r = sortBtnRef.current?.getBoundingClientRect();
                    return r ? r.bottom + 4 : 100;
                  })(),
                  zIndex: 9999,
                  background: "var(--labs-surface-elevated)",
                  border: "1px solid var(--labs-border)",
                  borderRadius: "var(--labs-radius-sm)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                {(["avg_score", "most_rated", "alphabetical"] as SortOption[]).map((opt) => (
                  <button
                    key={opt}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{
                      color: sortBy === opt ? "var(--labs-accent)" : "var(--labs-text-secondary)",
                      background: sortBy === opt ? "var(--labs-accent-muted)" : "transparent",
                    }}
                    onClick={() => {
                      setSortBy(opt);
                      setShowSortMenu(false);
                    }}
                    data-testid={`labs-explore-sort-${opt}`}
                  >
                    {sortLabels[opt]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading && (
        <SkeletonList count={5} showAvatar />
      )}

      {!isLoading && sortedWhiskies.length === 0 && (
        <div className="labs-empty labs-fade-in" style={{ minHeight: "40vh" }} data-testid="labs-explore-empty">
          <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--labs-text-secondary)" }}>
            {searchText || selectedRegion ? "No matching whiskies" : "No whiskies yet"}
          </p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
            {searchText || selectedRegion
              ? "Try adjusting your search or filters"
              : "Whiskies will appear here once they're added to a tasting session"}
          </p>
        </div>
      )}

      {!isLoading && sortedWhiskies.length > 0 && (
        <div className="space-y-2 labs-fade-in labs-stagger-3">
          {sortedWhiskies.map((w: any) => (
            <div
              key={w.id}
              className="labs-card labs-card-interactive"
              style={{ padding: "12px 14px", overflow: "hidden" }}
              onClick={() => navigate(`/labs/explore/bottles/${w.id}`)}
              data-testid={`labs-explore-whisky-${w.id}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                <div style={{ flexShrink: 0 }}>
                  <WhiskyImage imageUrl={w.imageUrl} name={w.name || ""} size={44} testId={`labs-explore-whisky-img-${w.id}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--labs-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0 }}>
                    {w.name}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                    {w.distillery && (
                      <span className="text-xs" style={{ color: "var(--labs-text-secondary)" }}>
                        {w.distillery}
                      </span>
                    )}
                    {w.region && (
                      <span
                        style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)", fontSize: 10, padding: "1px 6px", borderRadius: 4 }}
                      >
                        {w.region}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  {w.avgOverall != null && w.avgOverall > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Star style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-accent)" }}>
                        {Number(w.avgOverall).toFixed(1)}
                      </span>
                    </div>
                  )}
                  {w.ratingCount != null && w.ratingCount > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Hash style={{ width: 12, height: 12, color: "var(--labs-text-muted)" }} />
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                        {w.ratingCount} {w.ratingCount === 1 ? "rating" : "ratings"}
                      </span>
                    </div>
                  )}
                </div>
                <ChevronRight style={{ width: 16, height: 16, flexShrink: 0, color: "var(--labs-text-muted)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
