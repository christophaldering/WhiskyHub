import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { pidHeaders } from "@/lib/api";
import CommunityInsights from "@/labs/components/CommunityInsights";
import {
  Search, ChevronRight, Wine, Lock, Calendar,
  BookOpen, Building2, Package, FileText, Map,
  BookMarked, MessageSquare, Sparkles, BarChart3,
  Info, Heart, Flame, Globe, History,
} from "lucide-react";

type DiscoveryTab = "whiskys" | "tastings" | "insights";

export default function LabsEntdecken() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant } = useSession();
  const pid = currentParticipant?.id;
  const lang = i18n.language;

  const [activeTab, setActiveTab] = useState<DiscoveryTab>("whiskys");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("avg");

  const knowledgeItems = [
    { icon: BookOpen, key: "lexicon", path: "/labs/discover/lexicon" },
    { icon: Building2, key: "distilleries", path: "/labs/discover/distilleries" },
    { icon: Package, key: "bottlers", path: "/labs/discover/bottlers" },
    { icon: MessageSquare, key: "vocabulary", path: "/labs/discover/flavour-map" },
  ];

  const tastingGuideItems = [
    { icon: Map, key: "guide", path: "/labs/discover/guide" },
    { icon: FileText, key: "templates", path: "/labs/discover/templates" },
    { icon: Sparkles, key: "aiCuration", path: "/labs/taste/ai-curation" },
  ];

  const deepDiveItems = [
    { icon: BookMarked, key: "rabbitHole", path: "/labs/discover/rabbit-hole" },
    { icon: BarChart3, key: "insights", path: "/labs/host/history/insights" },
  ];

  const moreItems = [
    { icon: Info, key: "about", path: "/labs/about" },
    { icon: Heart, key: "donate", path: "/labs/donate" },
  ];

  const { data: whiskies = [] } = useQuery({
    queryKey: ["discovery-whiskies", search, sort, pid],
    queryFn: async () => {
      const res = await fetch(`/api/labs/explore/whiskies?search=${search}&sort=${sort}`, { headers: pid ? { "x-participant-id": pid } : {} });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "whiskys",
  });

  const { data: tastingsData, isLoading: tastingsLoading } = useQuery({
    queryKey: ["discovery-tastings", pid],
    queryFn: async () => {
      const headers = pid ? { "x-participant-id": pid } : {};
      const [ownRes, histRes, insRes, unifiedRes] = await Promise.all([
        fetch("/api/tastings", { headers }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch("/api/historical-tastings", { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/historical-tastings/insights", { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/historical/tastings?includeOwn=true&limit=200", { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      const ownTastings = unifiedRes?.ownTastings || ownRes || [];
      const archiveTastings = histRes || [];
      const isMember = !!histRes;
      return { ownTastings, archiveTastings, insights: insRes, isMember };
    },
    enabled: activeTab === "tastings" || activeTab === "insights",
  });

  const ownTastings = tastingsData?.ownTastings || [];
  const archiveTastings = tastingsData?.archiveTastings || [];
  const insightsObj = tastingsData?.insights;
  const isMember = tastingsData?.isMember ?? false;

  const allTastings = [
    ...ownTastings.map((t2: any) => ({ ...t2, _source: "own" as const })),
    ...archiveTastings.map((t2: any) => ({ ...t2, _source: "archive" as const })),
  ];
  const filteredTastings = allTastings
    .filter((t2: any) => {
      if (!search) return true;
      const name = (t2.name || t2.title || "").toLowerCase();
      return name.includes(search.toLowerCase());
    })
    .sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());

  const regions = insightsObj?.regionBreakdown ? Object.keys(insightsObj.regionBreakdown) : [];
  const totalTastings = insightsObj?.totalTastings || archiveTastings.length;
  const totalWhiskies = insightsObj?.totalWhiskies || 0;
  const regionCount = regions.length;
  const smokyPct = insightsObj && insightsObj.totalWhiskies > 0
    ? Math.round(((insightsObj.smokyBreakdown?.smoky || 0) / insightsObj.totalWhiskies) * 100)
    : 0;

  const tabs: { id: DiscoveryTab; label: string }[] = [
    { id: "whiskys", label: t("discover.tabWhiskies", "Whiskies") },
    { id: "tastings", label: t("discover.tabTastings", "Tastings") },
    { id: "insights", label: t("discover.tabInsights", "Insights") },
  ];

  return (
    <div style={{ padding: "2rem 1.25rem 6rem", maxWidth: "440px", margin: "0 auto" }} data-testid="labs-entdecken-page">
      <h1 className="labs-serif labs-fade-in" style={{ fontSize: 28, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 2px" }}>
        {t("discoverHub.title", "Entdecken")}
      </h1>
      <p className="labs-fade-in labs-stagger-1" style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: "0 0 24px", opacity: 0.6 }}>
        {t("discoverHub.subtitle", "Explore the whisky world")}
      </p>

      <CommunityInsights />

      <div className="labs-fade-in labs-stagger-1" style={{ marginBottom: 32 }}>
        <p className="labs-section-label flex items-center gap-2" style={{ marginBottom: 10 }}>
          <Wine className="w-3.5 h-3.5" />
          {t("discover.sectionWhiskysTastings", "Whiskies & Tastings")}
        </p>

        <div style={{ position: "sticky", top: 52, zIndex: 5, background: "var(--labs-bg)", paddingBottom: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 0, background: "var(--labs-surface)", borderRadius: 12, border: "1px solid var(--labs-border)", overflow: "hidden" }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch(""); }}
                data-testid={`tab-discovery-${tab.id}`}
                style={{
                  flex: 1,
                  height: 44,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  fontFamily: "inherit",
                  background: activeTab === tab.id ? "var(--labs-accent)" : "transparent",
                  color: activeTab === tab.id ? "var(--labs-on-accent)" : "var(--labs-text-muted)",
                  transition: "all 150ms",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "whiskys" && (
          <div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <Search className="w-4 h-4" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)", opacity: 0.5 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t("discover.searchWhiskies", "Search whiskies...")}
                data-testid="input-discovery-whisky-search"
                style={{
                  width: "100%",
                  minHeight: 44,
                  borderRadius: 12,
                  border: "1px solid var(--labs-border)",
                  background: "var(--labs-surface)",
                  color: "var(--labs-text)",
                  fontSize: 15,
                  padding: "10px 14px 10px 36px",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[
                ["avg", t("discover.sortAvg", "Avg Score")],
                ["most", t("discover.sortMost", "Most Tastings")],
                ["alpha", t("discover.sortAlpha", "A-Z")],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setSort(id as string)}
                  data-testid={`sort-${id}`}
                  style={{
                    height: 36,
                    padding: "0 14px",
                    borderRadius: 18,
                    border: "none",
                    cursor: "pointer",
                    background: sort === id ? "var(--labs-accent)" : "var(--labs-surface)",
                    color: sort === id ? "var(--labs-on-accent)" : "var(--labs-text-muted)",
                    fontSize: 12,
                    fontWeight: sort === id ? 700 : 400,
                    fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {whiskies.map((w: any, i: number) => (
              <button
                key={i}
                onClick={() => w.id && navigate(`/labs/explore/bottles/${w.id}`)}
                data-testid={`whisky-card-${w.id || i}`}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--labs-border)",
                  background: "none",
                  border: "none",
                  borderBottomWidth: 1,
                  borderBottomStyle: "solid",
                  borderBottomColor: "var(--labs-border)",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>{w.name || w.whiskeyName}</div>
                  <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>{w.distillery}{w.region ? ` \u00b7 ${w.region}` : ""}</div>
                  {w.tastingCount > 0 && (
                    <div style={{ fontSize: 11, color: "var(--labs-phase-palate)", marginTop: 2 }}>
                      {t("discover.crossLinkTastings", "Tastings")}: {w.tastingCount}
                    </div>
                  )}
                </div>
                {w.avgScore && (
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-accent)" }}>
                    {Math.round(w.avgScore)}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)", opacity: 0.5, flexShrink: 0 }} />
              </button>
            ))}
            {whiskies.length === 0 && (
              <div style={{ textAlign: "center", padding: 32, color: "var(--labs-text-muted)", fontSize: 14 }}>
                {search ? t("discover.noResults", "No results found.") : t("discover.noWhiskies", "No whiskies yet.")}
              </div>
            )}
          </div>
        )}

        {activeTab === "tastings" && (
          <div>
            {tastingsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                <div style={{ width: 28, height: 28, border: "2px solid var(--labs-border)", borderTopColor: "var(--labs-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : (
              <>
                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search className="w-4 h-4" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--labs-text-muted)", opacity: 0.5 }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t("discover.searchTastings", "Search tastings...")}
                    data-testid="input-discovery-tasting-search"
                    style={{
                      width: "100%",
                      minHeight: 44,
                      borderRadius: 12,
                      border: "1px solid var(--labs-border)",
                      background: "var(--labs-surface)",
                      color: "var(--labs-text)",
                      fontSize: 15,
                      padding: "10px 14px 10px 36px",
                      outline: "none",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginBottom: 8 }}>
                  {filteredTastings.length} Tastings
                </div>
                {filteredTastings.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 32 }}>
                    <Wine className="w-9 h-9" style={{ color: "var(--labs-text-muted)", opacity: 0.3, margin: "0 auto 8px" }} />
                    <div style={{ fontSize: 14, color: "var(--labs-text-muted)" }}>
                      {search
                        ? t("discover.noResults", "No results found.")
                        : t("discover.noTastings", "No tastings yet.")}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filteredTastings.map((tasting: any, i: number) => {
                      const isOwn = tasting._source === "own";
                      const isParticipant = isOwn || isMember;
                      return (
                        <div
                          key={tasting.id || i}
                          className="labs-card"
                          style={{ padding: 16, position: "relative" }}
                          data-testid={`tasting-card-${tasting.id || i}`}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                            {tasting.tastingNumber && (
                              <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: "var(--labs-phase-palate-dim)",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--labs-accent)" }}>#{tasting.tastingNumber}</span>
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {tasting.name || tasting.title || `Tasting #${tasting.tastingNumber || ""}`}
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "var(--labs-text-muted)", marginTop: 3 }}>
                                {tasting.date && (
                                  <span>{new Date(tasting.date).toLocaleDateString(lang.startsWith("de") ? "de-DE" : "en-US", { year: "numeric", month: "short" })}</span>
                                )}
                                {tasting.whiskyCount > 0 && <span>{tasting.whiskyCount} {t("discover.whiskies", "Whiskies")}</span>}
                                {tasting.avgScore != null && <span>{t("discover.avg", "Avg")}: {Math.round(tasting.avgScore)}</span>}
                              </div>
                            </div>
                            {isOwn && (
                              <span style={{
                                fontSize: 11, padding: "3px 10px", borderRadius: 10, flexShrink: 0,
                                background: tasting.status === "open" ? "color-mix(in srgb, var(--labs-success) 15%, transparent)" : "var(--labs-surface)",
                                color: tasting.status === "open" ? "var(--labs-success)" : "var(--labs-text-muted)",
                              }}>{tasting.status}</span>
                            )}
                          </div>
                          {!isParticipant && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 6, marginTop: 8,
                              padding: "6px 10px",
                              background: "color-mix(in srgb, var(--labs-accent) 8%, transparent)",
                              borderRadius: 8,
                            }}>
                              <Lock className="w-3 h-3" style={{ color: "var(--labs-accent)" }} />
                              <span style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 600 }}>
                                {t("discover.participantsOnly", "Participants Only")}
                              </span>
                              <span style={{ fontSize: 11, color: "var(--labs-text-muted)", marginLeft: "auto" }}>
                                {t("discover.aggregatedResults", "Aggregated results")}
                              </span>
                            </div>
                          )}
                          {tasting.whiskies && tasting.whiskies.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 4 }}>
                                {t("discover.crossLinkWhiskys", "Whiskies")}:
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {tasting.whiskies.slice(0, 4).map((w: any, wi: number) => (
                                  <button
                                    key={wi}
                                    onClick={() => w.id && navigate(`/labs/explore/bottles/${w.id}`)}
                                    data-testid={`crosslink-whisky-${w.id || wi}`}
                                    style={{
                                      fontSize: 11, padding: "2px 8px", borderRadius: 8,
                                      background: "var(--labs-phase-palate-dim)",
                                      color: "var(--labs-phase-palate)",
                                      border: "none", cursor: w.id ? "pointer" : "default",
                                      fontFamily: "inherit",
                                    }}
                                  >
                                    {w.name || w.whiskeyName}
                                  </button>
                                ))}
                                {tasting.whiskies.length > 4 && (
                                  <span style={{ fontSize: 11, color: "var(--labs-text-muted)", padding: "2px 4px" }}>
                                    +{tasting.whiskies.length - 4}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "insights" && (
          <div>
            {tastingsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                <div style={{ width: 28, height: 28, border: "2px solid var(--labs-border)", borderTopColor: "var(--labs-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : !isMember ? (
              <div style={{ textAlign: "center", padding: 32 }}>
                <Lock className="w-9 h-9" style={{ color: "var(--labs-text-muted)", opacity: 0.3, margin: "0 auto 8px" }} />
                <div style={{ fontSize: 16, color: "var(--labs-text-muted)", marginBottom: 8 }}>
                  {t("discover.insightsLocked", "Join a tasting to unlock insights")}
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)", margin: "0 0 12px" }}>
                  {t("discover.insightsCommunityStats", "Community Stats")}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
                  {[
                    { label: t("discover.insightsTotalTastings", "Tastings"), value: totalTastings, icon: <History className="w-5 h-5" style={{ color: "var(--labs-accent)" }} /> },
                    { label: t("discover.insightsTotalWhiskies", "Whiskies"), value: totalWhiskies || "\u2013", icon: <Wine className="w-5 h-5" style={{ color: "var(--labs-phase-palate)" }} /> },
                    { label: t("discover.insightsRegions", "Regions"), value: regionCount || "\u2013", icon: <Globe className="w-5 h-5" style={{ color: "var(--labs-phase-nose)" }} /> },
                    { label: t("discover.insightsSmoky", "Smoky"), value: `${smokyPct}%`, icon: <Flame className="w-5 h-5" style={{ color: "var(--labs-phase-finish)" }} /> },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="labs-card"
                      style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                      data-testid={`insight-stat-${i}`}
                    >
                      {s.icon}
                      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-accent)", fontFamily: "var(--font-display)" }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "var(--labs-text-muted)", textAlign: "center" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {regions.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)", margin: "0 0 8px" }}>
                      {t("discover.insightsTopRegions", "Top Regions")}
                    </p>
                    <div className="labs-card" style={{ padding: 16 }}>
                      {regions
                        .sort((a, b) => (insightsObj.regionBreakdown[b] || 0) - (insightsObj.regionBreakdown[a] || 0))
                        .slice(0, 8)
                        .map((region, i, arr) => {
                          const count = insightsObj.regionBreakdown[region] || 0;
                          const maxCount = Math.max(...Object.values(insightsObj.regionBreakdown) as number[], 1);
                          const pct = (count / maxCount) * 100;
                          return (
                            <div
                              key={region}
                              data-testid={`insight-region-${i}`}
                              style={{
                                display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                                borderBottom: i < Math.min(arr.length, 8) - 1 ? "1px solid var(--labs-border)" : "none",
                              }}
                            >
                              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", width: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{region}</span>
                              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--labs-border)", overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, var(--labs-accent), var(--labs-phase-overall))" }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--labs-accent)", minWidth: 28, textAlign: "right" }}>{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {insightsObj?.topWhiskies && insightsObj.topWhiskies.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)", margin: "0 0 8px" }}>
                      {t("discover.insightsTopWhiskys", "Top Whiskies")}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {insightsObj.topWhiskies.slice(0, 5).map((w: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => w.id && navigate(`/labs/explore/bottles/${w.id}`)}
                          data-testid={`insight-top-whisky-${i}`}
                          className="labs-card labs-card-interactive"
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 14px", cursor: w.id ? "pointer" : "default",
                            textAlign: "left", border: "none", width: "100%",
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: 14,
                            background: "linear-gradient(135deg, var(--labs-accent), var(--labs-phase-overall))",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: "var(--labs-on-accent)", flexShrink: 0,
                          }}>{i + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                            <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{w.distillery}{w.region ? ` \u00b7 ${w.region}` : ""}</div>
                          </div>
                          {w.avgScore && (
                            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-accent)" }}>{Math.round(w.avgScore)}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--labs-text-muted)", margin: "0 0 8px" }}>
                    {t("discover.insightsTastingFreq", "Tasting Frequency")}
                  </p>
                  <div className="labs-card" style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
                      {Array.from({ length: 12 }, (_, month) => {
                        const monthTastings = archiveTastings.filter((t2: any) => {
                          const d = new Date(t2.date || t2.createdAt || 0);
                          return d.getMonth() === month;
                        }).length;
                        const maxM = Math.max(
                          ...Array.from({ length: 12 }, (_, m) =>
                            archiveTastings.filter((t2: any) => new Date(t2.date || t2.createdAt || 0).getMonth() === m).length
                          ),
                          1
                        );
                        return (
                          <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <div style={{
                              width: "100%",
                              background: monthTastings > 0 ? "var(--labs-accent)" : "var(--labs-border)",
                              borderRadius: "2px 2px 0 0",
                              height: `${Math.max((monthTastings / maxM) * 100, monthTastings > 0 ? 8 : 2)}%`,
                              minHeight: monthTastings > 0 ? 4 : 1,
                              opacity: monthTastings > 0 ? 0.8 : 0.3,
                            }} />
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                      {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, i) => (
                        <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 8, color: "var(--labs-text-muted)" }}>{m}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <DiscoverSection
        title={t("discover.sectionKnowledge", "Knowledge & Reference")}
        items={knowledgeItems}
        navigate={navigate}
        t={t}
      />

      <DiscoverSection
        title={t("discover.sectionTasting", "Tasting & Guides")}
        items={tastingGuideItems}
        navigate={navigate}
        t={t}
      />

      <DiscoverSection
        title={t("discover.sectionDeepDive", "Deep Dives")}
        items={deepDiveItems}
        navigate={navigate}
        t={t}
      />

      <DiscoverSection
        title={t("discover.sectionMore", "More")}
        items={moreItems}
        navigate={navigate}
        t={t}
        isLast
      />
    </div>
  );
}

function DiscoverSection({
  title,
  items,
  navigate,
  t,
  isLast,
}: {
  title: string;
  items: Array<{ icon: any; key: string; path: string }>;
  navigate: (path: string) => void;
  t: (key: string, fallback: string) => string;
  isLast?: boolean;
}) {
  return (
    <div className="labs-fade-in labs-stagger-2" style={{ marginBottom: isLast ? 0 : 32 }}>
      <p className="labs-section-label" style={{ marginBottom: 8 }}>{title}</p>
      <div className="labs-grouped-list">
        {items.map((item) => (
          <Link key={item.key} href={item.path} style={{ textDecoration: "none" }}>
            <div className="labs-list-row" style={{ cursor: "pointer" }} data-testid={`link-entdecken-${item.key}`}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: "var(--labs-accent-muted)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <item.icon className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>
                  {t(`discover.${item.key}`, item.key)}
                </div>
                <div style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 1 }}>
                  {t(`discover.${item.key}Sub`, "")}
                </div>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", opacity: 0.5, flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
