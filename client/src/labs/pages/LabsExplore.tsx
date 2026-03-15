import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Search, Star, Wine, ChevronRight, ArrowUpDown, Archive, BookOpen, Globe, Package } from "lucide-react";
import WhiskyImage from "@/labs/components/WhiskyImage";
import { exploreApi, collectionApi, journalApi, tastingHistoryApi, getParticipantId } from "@/lib/api";
import { SkeletonList } from "@/labs/components/LabsSkeleton";

type SortOption = "avg_score" | "most_rated" | "alphabetical";
type ExploreTab = "bottles" | "drams" | "all";
type DramFilter = "all" | "solo" | "tasting";

export default function LabsExplore() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const pid = getParticipantId();
  const [activeTab, setActiveTab] = useState<ExploreTab>(pid ? "bottles" : "all");
  const [searchText, setSearchText] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("most_rated");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const [dramFilter, setDramFilter] = useState<DramFilter>("all");

  const { data: whiskies, isLoading: isLoadingAll } = useQuery({
    queryKey: ["labs-explore-whiskies", searchText, selectedRegion],
    queryFn: () => exploreApi.getWhiskies(searchText || undefined, selectedRegion || undefined),
    enabled: activeTab === "all",
  });

  const { data: collectionItems, isLoading: isLoadingCollection } = useQuery({
    queryKey: ["labs-explore-collection", pid],
    queryFn: () => collectionApi.getAll(pid!),
    enabled: !!pid && activeTab === "bottles",
  });

  const { data: journalItems, isLoading: isLoadingJournal } = useQuery({
    queryKey: ["labs-explore-journal", pid],
    queryFn: () => journalApi.getAll(pid!),
    enabled: !!pid && activeTab === "drams",
  });

  const { data: tastingHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["labs-explore-tasting-history", pid],
    queryFn: () => tastingHistoryApi.get(pid!),
    enabled: !!pid && activeTab === "drams",
  });

  const regions = useMemo(() => {
    if (activeTab !== "all" || !whiskies || !Array.isArray(whiskies)) return [];
    const regionSet = new Set<string>();
    whiskies.forEach((w: any) => { if (w.region) regionSet.add(w.region); });
    return Array.from(regionSet).sort();
  }, [whiskies, activeTab]);

  const sortedWhiskies = useMemo(() => {
    if (activeTab !== "all" || !whiskies || !Array.isArray(whiskies)) return [];
    const list = [...whiskies];
    switch (sortBy) {
      case "avg_score": list.sort((a: any, b: any) => (b.avgOverall || 0) - (a.avgOverall || 0)); break;
      case "most_rated": list.sort((a: any, b: any) => (b.ratingCount || 0) - (a.ratingCount || 0)); break;
      case "alphabetical": list.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")); break;
    }
    return list;
  }, [whiskies, sortBy, activeTab]);

  const filteredCollection = useMemo(() => {
    if (!collectionItems || !Array.isArray(collectionItems)) return [];
    if (!searchText.trim()) return collectionItems;
    const q = searchText.toLowerCase();
    return collectionItems.filter((item: any) =>
      (item.name || "").toLowerCase().includes(q) ||
      (item.brand || "").toLowerCase().includes(q) ||
      (item.distillery || "").toLowerCase().includes(q)
    );
  }, [collectionItems, searchText]);

  const dramsData = useMemo(() => {
    const entries: any[] = [];
    if (journalItems && Array.isArray(journalItems)) {
      for (const j of journalItems) {
        entries.push({
          id: j.id,
          name: j.whiskyName || j.title,
          distillery: j.distillery,
          score: j.personalScore,
          occasion: j.occasion,
          source: "journal",
          date: j.createdAt,
          imageUrl: j.imageUrl,
        });
      }
    }
    const historyTastings = (tastingHistory as any)?.tastings || (Array.isArray(tastingHistory) ? tastingHistory : []);
    if (historyTastings.length > 0) {
      for (const t of historyTastings) {
        for (const w of (t.whiskies || [])) {
          if (!w.myRating) continue;
          entries.push({
            id: `rating-${w.id}-${t.id}`,
            name: w.name,
            distillery: w.distillery,
            score: w.myRating.overall,
            occasion: null,
            source: "tasting",
            tastingTitle: t.title,
            date: t.date,
            imageUrl: w.imageUrl,
          });
        }
      }
    }
    entries.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
    let filtered = entries;
    if (dramFilter === "solo") filtered = filtered.filter(e => e.source === "journal");
    else if (dramFilter === "tasting") filtered = filtered.filter(e => e.source === "tasting");
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(e =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.distillery || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [journalItems, tastingHistory, searchText, dramFilter]);

  const isLoading = activeTab === "all" ? isLoadingAll : activeTab === "bottles" ? isLoadingCollection : (isLoadingJournal || isLoadingHistory);

  const sortLabels: Record<SortOption, string> = {
    avg_score: "Avg Score",
    most_rated: "Most Rated",
    alphabetical: "A\u2013Z",
  };

  const tabs: { key: ExploreTab; label: string; icon: any }[] = pid
    ? [
        { key: "bottles", label: t("myTastePage.myBottles"), icon: Archive },
        { key: "drams", label: t("myTastePage.myDrams"), icon: BookOpen },
        { key: "all", label: t("myTastePage.allWhiskies"), icon: Globe },
      ]
    : [{ key: "all", label: t("myTastePage.allWhiskies"), icon: Globe }];

  const statusColors: Record<string, string> = {
    open: "#4CAF50",
    closed: "#9E9E9E",
    empty: "#F44336",
  };

  const statusLabels: Record<string, string> = {
    open: "Open",
    closed: "Closed",
    empty: "Empty",
  };

  return (
    <div className="labs-page-wide">
      <div style={{ marginBottom: 20 }}>
        <h1
          className="labs-serif labs-fade-in"
          style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }}
          data-testid="labs-explore-title"
        >
          Explore
        </h1>
        <p
          className="labs-fade-in labs-stagger-1"
          style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0 }}
        >
          {activeTab === "bottles"
            ? t("myTastePage.collectionSubtitle")
            : activeTab === "drams"
            ? t("myTastePage.journalDesc")
            : "Browse whiskies tasted across all sessions"}
        </p>
      </div>

      {tabs.length > 1 && (
        <div
          className="labs-fade-in"
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 16,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid var(--labs-border)",
            background: "var(--labs-surface)",
          }}
          data-testid="labs-explore-tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSearchText(""); setSelectedRegion(null); }}
                data-testid={`labs-explore-tab-${tab.key}`}
                style={{
                  flex: 1,
                  padding: "10px 6px",
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  color: active ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  background: active ? "var(--labs-accent-muted)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  transition: "all 0.2s",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative labs-fade-in labs-stagger-1" style={{ marginBottom: 16 }}>
        <Search
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--labs-text-muted)", left: 14 }}
        />
        <input
          className="labs-input"
          style={{ paddingLeft: 40, fontSize: 15, height: 44 }}
          placeholder={activeTab === "all" ? "Search by name, distillery, region..." : "Search..."}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          data-testid="labs-explore-search"
        />
      </div>

      {activeTab === "all" && regions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 labs-fade-in labs-stagger-2" style={{ scrollbarWidth: "none" }}>
          <button
            className={`labs-chip ${!selectedRegion ? "labs-chip-active" : ""}`}
            onClick={() => setSelectedRegion(null)}
            data-testid="labs-explore-region-all"
          >
            All Regions
          </button>
          {regions.map((region) => (
            <button
              key={region}
              className={`labs-chip ${selectedRegion === region ? "labs-chip-active" : ""}`}
              onClick={() => setSelectedRegion(selectedRegion === region ? null : region)}
              data-testid={`labs-explore-region-${region}`}
            >
              {region}
            </button>
          ))}
        </div>
      )}

      {activeTab === "all" && (
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
                <div className="fixed inset-0" style={{ zIndex: "var(--z-overlay)" }} onClick={() => setShowSortMenu(false)} data-testid="labs-explore-sort-overlay" />
                <div
                  className="py-1 min-w-[140px]"
                  style={{
                    position: "fixed",
                    right: 20,
                    top: (() => {
                      const r = sortBtnRef.current?.getBoundingClientRect();
                      return r ? r.bottom + 4 : 100;
                    })(),
                    zIndex: "var(--z-toast)",
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
                      onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
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
      )}

      {isLoading && <SkeletonList count={5} showAvatar />}

      {activeTab === "all" && !isLoading && (
        <>
          {sortedWhiskies.length === 0 && (
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
          {sortedWhiskies.length > 0 && (
            <div className="labs-grouped-list labs-fade-in labs-stagger-3">
              {sortedWhiskies.map((w: any) => (
                <div
                  key={w.id}
                  className="labs-list-row"
                  onClick={() => navigate(`/labs/explore/bottles/${w.id}`)}
                  data-testid={`labs-explore-whisky-${w.id}`}
                >
                  <div style={{ flexShrink: 0 }}>
                    <WhiskyImage imageUrl={w.imageUrl} name={w.name || ""} size={44} testId={`labs-explore-whisky-img-${w.id}`} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {w.name}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      {w.distillery && <span style={{ fontSize: 13, color: "var(--labs-text-secondary)" }}>{w.distillery}</span>}
                      {w.region && (
                        <span style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4 }}>
                          {w.region}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                    {w.avgOverall != null && w.avgOverall > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Star style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-accent)" }}>{Number(w.avgOverall).toFixed(1)}</span>
                      </div>
                    )}
                    {w.ratingCount != null && w.ratingCount > 0 && (
                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{w.ratingCount} {w.ratingCount === 1 ? "rating" : "ratings"}</span>
                    )}
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, flexShrink: 0, color: "var(--labs-text-muted)", opacity: 0.5 }} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "bottles" && !isLoading && (
        <>
          {filteredCollection.length === 0 && (
            <div className="labs-empty labs-fade-in" style={{ minHeight: "40vh" }} data-testid="labs-explore-collection-empty">
              <Archive className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--labs-text-secondary)" }}>
                {searchText ? "No matching bottles" : "No bottles in your collection"}
              </p>
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                {searchText ? "Try a different search" : "Add bottles from tastings or import your collection"}
              </p>
            </div>
          )}
          {filteredCollection.length > 0 && (
            <>
              <p className="text-xs font-medium mb-3 labs-fade-in" style={{ color: "var(--labs-text-muted)" }}>
                {filteredCollection.length} {filteredCollection.length === 1 ? "bottle" : "bottles"}
              </p>
              <div className="labs-grouped-list labs-fade-in labs-stagger-3">
                {filteredCollection.map((item: any) => (
                  <div
                    key={item.id}
                    className="labs-list-row"
                    data-testid={`labs-explore-collection-${item.id}`}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <WhiskyImage imageUrl={item.imageUrl} name={item.name || ""} size={44} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        {(item.brand || item.distillery) && (
                          <span style={{ fontSize: 13, color: "var(--labs-text-secondary)" }}>{item.brand || item.distillery}</span>
                        )}
                        {item.statedAge && (
                          <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{item.statedAge}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      {item.status && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: `${statusColors[item.status] || "#9E9E9E"}22`,
                            color: statusColors[item.status] || "#9E9E9E",
                          }}
                          data-testid={`badge-collection-status-${item.id}`}
                        >
                          {statusLabels[item.status] || item.status}
                        </span>
                      )}
                      {item.personalRating != null && item.personalRating > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Star style={{ width: 12, height: 12, color: "var(--labs-accent)" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-accent)" }}>{item.personalRating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {activeTab === "drams" && !isLoading && (
        <>
          <div className="labs-fade-in" style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {(["all", "solo", "tasting"] as DramFilter[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setDramFilter(f)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: dramFilter === f ? "var(--labs-accent)" : "var(--labs-bg-secondary)",
                  color: dramFilter === f ? "#fff" : "var(--labs-text-secondary)",
                  transition: "all 0.15s",
                }}
                data-testid={`filter-dram-${f}`}
              >
                {f === "all" ? t("myTastePage.filterAll") : f === "solo" ? t("myTastePage.filterSolo") : t("myTastePage.filterTastings")}
              </button>
            ))}
          </div>
          {dramsData.length === 0 && (
            <div className="labs-empty labs-fade-in" style={{ minHeight: "40vh" }} data-testid="labs-explore-drams-empty">
              <BookOpen className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--labs-text-secondary)" }}>
                {searchText ? "No matching drams" : "No drams logged yet"}
              </p>
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                {searchText ? "Try a different search" : "Your tastings and journal entries will appear here"}
              </p>
            </div>
          )}
          {dramsData.length > 0 && (
            <>
              <p className="text-xs font-medium mb-3 labs-fade-in" style={{ color: "var(--labs-text-muted)" }}>
                {dramsData.length} {dramsData.length === 1 ? "dram" : "drams"}
              </p>
              <div className="labs-grouped-list labs-fade-in labs-stagger-3">
                {dramsData.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="labs-list-row"
                    data-testid={`labs-explore-dram-${entry.id}`}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <WhiskyImage imageUrl={entry.imageUrl} name={entry.name || ""} size={44} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                        {entry.distillery && <span style={{ fontSize: 13, color: "var(--labs-text-secondary)" }}>{entry.distillery}</span>}
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                          background: entry.source === "journal" ? "rgba(139, 92, 246, 0.15)" : "rgba(59, 130, 246, 0.15)",
                          color: entry.source === "journal" ? "#8B5CF6" : "#3B82F6",
                        }}>
                          {entry.source === "journal" ? "Solo" : "Tasting"}
                        </span>
                        {entry.occasion && (
                          <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{entry.occasion}</span>
                        )}
                      </div>
                      {entry.tastingTitle && (
                        <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.tastingTitle}
                        </p>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                      {entry.score != null && entry.score > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Star style={{ width: 12, height: 12, color: "var(--labs-accent)" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-accent)" }}>{Math.round(entry.score)}</span>
                        </div>
                      )}
                      {entry.date && (
                        <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>
                          {new Date(entry.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
