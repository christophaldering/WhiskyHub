import { useState, useMemo, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import BackLink from "@/labs/components/BackLink";
import { useAppStore } from "@/lib/store";
import { SuggestEntryDialog } from "@/components/suggest-entry-dialog";
import { Building2, MapPin, Calendar, ChevronDown, ChevronLeft, List, Map as MapIcon, ExternalLink } from "lucide-react";

const DistilleryMap = lazy(() => import("@/pages/distillery-map"));

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

function Card({ d, t }: { d: Distillery; t: (key: string, fallback?: string, opts?: any) => string }) {
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
        </div>
      )}
    </div>
  );
}

const COUNTRIES = ["All", "Scotland", "Ireland", "Japan", "USA"];

export default function LabsDistilleries() {
  const { t } = useTranslation();
  const currentParticipant = useAppStore((s) => s.currentParticipant);
  const [search, setSearch] = useState("");
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
    <div className="px-5 py-6 mx-auto" style={{ maxWidth: view === "map" ? 1000 : 600 }} data-testid="labs-discover-distilleries-page">
      <BackLink href="/labs/entdecken" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-distilleries">
          <ChevronLeft className="w-4 h-4" /> {t("discover.title", "Discover")}
        </button>
      </BackLink>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 className="labs-serif" style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }} data-testid="text-distilleries-title">{t("discover.distilleries", "Distilleries")}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
      <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>{isLoading ? t("discover.loading", "Loading...") : t("m2.discover.distilleriesSubtitle", "Explore {{count}} distilleries worldwide", { count: distilleries.length })}</p>

      {view === "list" && (
        <button
          onClick={() => setView("map")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            marginBottom: 16,
            borderRadius: 12,
            border: "1px solid var(--labs-accent)",
            background: "linear-gradient(135deg, var(--labs-surface-elevated) 0%, rgba(var(--labs-accent-rgb, 180, 120, 60), 0.08) 100%)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--labs-accent)";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
          data-testid="banner-map-teaser"
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "var(--labs-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <MapPin style={{ width: 20, height: 20, color: "var(--labs-bg)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", marginBottom: 2 }}>
              {t("discover.mapBannerTitle", "Entdecke alle Brennereien auf der Weltkarte")}
            </div>
            <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
              {t("discover.mapBannerSubtitle", "Interaktive Karte mit {{count}} Brennereien weltweit", { count: distilleries.length })}
            </div>
          </div>
          <MapIcon style={{ width: 18, height: 18, color: "var(--labs-accent)", flexShrink: 0 }} />
        </button>
      )}

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
            {filtered.map((d) => <Card key={d.id} d={d} t={t} />)}
            {filtered.length === 0 && <div className="labs-empty" data-testid="text-distilleries-empty">{t("discover.noMatch", "No distilleries match your search.")}</div>}
          </div>
        </>
      )}
    </div>
  );
}
