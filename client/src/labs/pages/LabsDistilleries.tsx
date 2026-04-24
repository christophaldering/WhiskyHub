import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DiscoverActionBar from "@/labs/components/DiscoverActionBar";
import { useAppStore } from "@/lib/store";
import { SuggestEntryDialog } from "@/components/suggest-entry-dialog";
import { Building2, MapPin, Calendar, ChevronDown, List, Map as MapIcon, ExternalLink } from "lucide-react";
import DistilleryHandoutManager from "@/labs/components/DistilleryHandoutManager";

const DistilleryMap = lazy(() => import("@/pages/distillery-map"));
const MiniMap = lazy(() => import("@/labs/components/MiniMap"));

interface Distillery {
  id: string;
  name: string;
  region: string;
  country: string;
  founded: number | null;
  description: string | null;
  feature: string | null;
  status: string;
  lat: number | null;
  lng: number | null;
}

function Card({ d, t, hostId }: { d: Distillery; t: (key: string, fallback?: string, opts?: any) => string; hostId: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="labs-card" style={{ overflow: "hidden" }} data-testid={`labs-distillery-${d.name.toLowerCase().replace(/\s+/g, "-")}`}>
      <button onClick={() => setOpen(!open)} className="labs-btn-ghost" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", textAlign: "left" }} data-testid={`button-toggle-distillery-${d.name.toLowerCase().replace(/\s+/g, "-")}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 style={{ width: 14, height: 14, color: "var(--labs-accent)", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{d.name}</span>
            {d.status && d.status !== "active" && <span style={{ fontSize: 11, padding: "1px 5px", borderRadius: 4, background: "var(--labs-border)", color: "var(--labs-text-muted)", textTransform: "uppercase" }}>{d.status}</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin style={{ width: 11, height: 11 }} />{d.region}, {d.country}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <a href={`https://www.whiskybase.com/search?q=${encodeURIComponent(d.name)}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--labs-text-muted)", padding: 4 }} onClick={(e) => e.stopPropagation()} data-testid={`link-whiskybase-distillery-${d.name.toLowerCase().replace(/\s+/g, "-")}`}>
            <ExternalLink style={{ width: 13, height: 13 }} />
          </a>
          <ChevronDown style={{ width: 16, height: 16, color: "var(--labs-text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--labs-border)", paddingTop: 12 }}>
          {d.description && <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--labs-text)", margin: 0, opacity: 0.9 }}>{d.description}</p>}
          {d.founded && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 11, color: "var(--labs-accent)" }}>
              <Calendar style={{ width: 12, height: 12 }} />{t("discover.founded", "Founded {{year}}", { year: d.founded })}
            </div>
          )}
          {d.feature && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: "var(--labs-surface-elevated)", borderRadius: 8, border: "1px solid var(--labs-border)" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>{t("discover.keyFact", "Key Fact")}</span>
              <p style={{ fontSize: 11, lineHeight: 1.5, color: "var(--labs-text-muted)", margin: "4px 0 0" }}>{d.feature}</p>
            </div>
          )}
          {d.lat != null && d.lng != null && (
            <Suspense fallback={<div style={{ width: "100%", height: 200, borderRadius: 10, marginTop: 10, background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }} />}>
              <MiniMap lat={d.lat} lng={d.lng} />
            </Suspense>
          )}
          {hostId && (
            <DistilleryHandoutManager distilleryId={d.id} distilleryName={d.name} hostId={hostId} />
          )}
        </div>
      )}
    </div>
  );
}

const COUNTRIES = ["All", "Scotland", "Ireland", "Japan", "USA"];

export default function LabsDistilleries() {
  const { t } = useTranslation();
  const currentParticipant = useAppStore((s) => s.currentParticipant);
  const searchStr = useSearch();
  const initialSearch = useMemo(() => {
    try { return new URLSearchParams(searchStr).get("q") || ""; } catch { return ""; }
  }, [searchStr]);
  const [search, setSearch] = useState(initialSearch);
  useEffect(() => { setSearch(initialSearch); }, [initialSearch]);
  const [country, setCountry] = useState("All");
  const [view, setView] = useState<"list" | "map">("list");
  const [sortBy, setSortBy] = useState<"name" | "founded" | "region">("name");

  const { data: distilleriesData, isLoading } = useQuery<Distillery[]>({
    queryKey: ["encyclopedia-distilleries"],
    queryFn: async () => {
      const res = await fetch("/api/encyclopedia/distilleries");
      if (!res.ok) throw new Error("Failed to fetch distilleries");
      return res.json();
    },
  });

  const distilleries = distilleriesData || [];

  const filtered = useMemo(() => distilleries.filter((d) => {
    const s = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.region.toLowerCase().includes(search.toLowerCase()) || d.country.toLowerCase().includes(search.toLowerCase());
    const c = country === "All" || d.country === country;
    return s && c;
  }).sort((a, b) => sortBy === "name" ? a.name.localeCompare(b.name) : sortBy === "founded" ? (a.founded || 0) - (b.founded || 0) : a.region.localeCompare(b.region)),
  [search, country, sortBy, distilleries]);

  return (
    <div className="labs-page" style={view === "map" ? { maxWidth: 1000 } : undefined} data-testid="labs-discover-distilleries-page">
      <DiscoverActionBar active="bibliothek" />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div className="flex flex-col gap-2 min-w-0">
          <h1 className="labs-h2" style={{ color: "var(--labs-text)", margin: 0 }} data-testid="text-distilleries-title">{t("discover.distilleries", "Distilleries")}</h1>
          <p style={{ fontSize: 14, color: "var(--labs-text-muted)", margin: 0, lineHeight: 1.4 }}>{isLoading ? t("discover.loading", "Loading...") : t("m2.discover.distilleriesSubtitle", "Explore {{count}} distilleries worldwide", { count: distilleries.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end sm:flex-shrink-0">
          {currentParticipant && <SuggestEntryDialog type="distillery" />}
          <div style={{ display: "flex", borderRadius: 10, border: "1px solid var(--labs-border)", overflow: "hidden", background: "var(--labs-surface-elevated)" }}>
            {(["list", "map"] as const).map((m) => (
              <button key={m} onClick={() => setView(m)} className="labs-btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, background: view === m ? "var(--labs-accent)" : "transparent", color: view === m ? "var(--labs-bg)" : "var(--labs-text-muted)", borderRadius: 0, transition: "all 0.2s ease", opacity: view === m ? 1 : 0.8 }} data-testid={`labs-view-${m}`}>
                {m === "list" ? <List style={{ width: 15, height: 15 }} /> : <MapIcon style={{ width: 15, height: 15 }} />}{t(`discover.${m}`, m === "list" ? "List" : "Map")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "map" ? (
        <Suspense fallback={<div style={{ textAlign: "center", padding: 60, color: "var(--labs-text-muted)" }}>{t("discover.loadingMap", "Loading map...")}</div>}>
          <div className="labs-card" style={{ overflow: "hidden" }}><DistilleryMap /></div>
        </Suspense>
      ) : (
        <>
          <input type="text" placeholder={t("discover.searchDistilleries", "Search distilleries...")} value={search} onChange={(e) => setSearch(e.target.value)} className="labs-input" style={{ width: "100%", boxSizing: "border-box" }} data-testid="input-search-distilleries" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 0" }}>
            <div style={{ display: "flex", gap: 2 }}>
              {(["name", "founded", "region"] as const).map((s) => (
                <button key={s} onClick={() => setSortBy(s)} style={{ padding: "3px 8px", borderRadius: 6, border: "none", background: sortBy === s ? "var(--labs-surface-elevated)" : "transparent", color: sortBy === s ? "var(--labs-accent)" : "var(--labs-text-muted)", fontSize: 11, fontWeight: 500, cursor: "pointer" }} data-testid={`labs-sort-${s}`}>{s === "name" ? "A–Z" : s === "founded" ? "Founded" : "Region"}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 0" }}>
            {COUNTRIES.map((c) => (
              <button key={c} onClick={() => setCountry(c)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${country === c ? "var(--labs-accent)" : "var(--labs-border)"}`, background: country === c ? "var(--labs-accent)" : "transparent", color: country === c ? "var(--labs-bg)" : "var(--labs-text-muted)", fontSize: 11, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }} data-testid={`labs-chip-${c.toLowerCase()}`}>{c}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 10 }}>{t("discover.found", "{{count}} found", { count: filtered.length })}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((d) => <Card key={d.id} d={d} t={t} hostId={currentParticipant?.id ?? null} />)}
            {filtered.length === 0 && <div className="labs-empty" data-testid="text-distilleries-empty">{t("discover.noMatch", "No distilleries match your search.")}</div>}
          </div>
        </>
      )}
    </div>
  );
}
