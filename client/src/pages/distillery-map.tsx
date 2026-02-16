import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, ExternalLink, MapPin, Filter, Maximize2 } from "lucide-react";
import { distilleries, type Distillery } from "@/data/distilleries";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:hsl(25,70%,45%);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const selectedIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;border-radius:50%;background:hsl(25,80%,50%);border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;transform:scale(1.1);">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const countryColors: Record<string, string> = {
  "Scotland": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Ireland": "bg-green-500/10 text-green-400 border-green-500/20",
  "Japan": "bg-red-500/10 text-red-400 border-red-500/20",
  "USA": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Taiwan": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "India": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Australia": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Wales": "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "Sweden": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Denmark": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "Finland": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "England": "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

function FitBounds({ markers, fitKey }: { markers: Distillery[]; fitKey: number }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 10);
      return;
    }
    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [fitKey]);
  return null;
}

export default function DistilleryMap() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const mapRef = useRef<L.Map | null>(null);

  const countries = useMemo(() => Array.from(new Set(distilleries.map(d => d.country))).sort(), []);
  const regions = useMemo(() => {
    const filtered = selectedCountry
      ? distilleries.filter(d => d.country === selectedCountry)
      : distilleries;
    return Array.from(new Set(filtered.map(d => d.region))).sort();
  }, [selectedCountry]);

  const filtered = useMemo(() => {
    let result = distilleries;
    if (selectedCountry) result = result.filter(d => d.country === selectedCountry);
    if (selectedRegion) result = result.filter(d => d.region === selectedRegion);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [search, selectedRegion, selectedCountry]);

  useEffect(() => {
    setFitKey(k => k + 1);
  }, [selectedCountry, selectedRegion, search]);

  const flyTo = (d: Distillery) => {
    if (mapRef.current) {
      mapRef.current.flyTo([d.lat, d.lng], 13, { duration: 1.2 });
    }
    setHoveredName(d.name);
  };

  const resetView = useCallback(() => {
    setHoveredName(null);
    setFitKey(k => k + 1);
  }, []);

  return (
    <div className="space-y-4" data-testid="distillery-map-page">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-serif font-black text-primary tracking-tight">{t("distilleryMap.title")}</h1>
          <p className="text-muted-foreground font-serif italic mt-1 text-sm">{t("distilleryMap.subtitle")}</p>
        </div>
        <Link href="/distilleries">
          <Button variant="outline" size="sm" data-testid="link-encyclopedia">
            {t("distilleryMap.viewEncyclopedia")}
          </Button>
        </Link>
      </header>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("distilleryMap.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-map-search"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          data-testid="button-toggle-filters"
        >
          <Filter className="w-4 h-4 mr-1" /> {t("distilleryMap.filters")}
        </Button>
      </div>

      {showFilters && (
        <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-card">
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={selectedCountry === null ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedCountry(null); setSelectedRegion(null); }}
              className="text-xs h-7"
            >
              {t("distillery.allCountries")}
            </Button>
            {countries.map(c => (
              <Button
                key={c}
                variant={selectedCountry === c ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectedCountry(c === selectedCountry ? null : c); setSelectedRegion(null); }}
                className="text-xs h-7"
              >
                {c}
              </Button>
            ))}
          </div>
          {selectedCountry && regions.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <Button variant={selectedRegion === null ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedRegion(null)} className="text-xs h-7">
                {t("distillery.allRegions")}
              </Button>
              {regions.map(r => (
                <Button key={r} variant={selectedRegion === r ? "secondary" : "ghost"} size="sm" onClick={() => setSelectedRegion(r === selectedRegion ? null : r)} className="text-xs h-7">
                  {r}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg overflow-hidden border border-border/50 bg-card relative" style={{ height: "65vh", minHeight: 400 }}>
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-3 right-3 z-[1000] shadow-md text-xs"
            onClick={resetView}
            data-testid="button-reset-view"
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1" /> {t("distilleryMap.resetView")}
          </Button>
          <MapContainer
            center={[54.5, -4]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <FitBounds markers={filtered} fitKey={fitKey} />
            {filtered.map(d => (
              <Marker
                key={d.name}
                position={[d.lat, d.lng]}
                icon={hoveredName === d.name ? selectedIcon : defaultIcon}
                eventHandlers={{
                  click: () => setHoveredName(d.name),
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-bold text-base mb-1">{d.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{d.region}, {d.country} &middot; Est. {d.founded}</p>
                    <p className="text-xs leading-relaxed mb-2">{d.description.slice(0, 120)}...</p>
                    <a
                      href={`https://www.whiskybase.com/search?q=${encodeURIComponent(d.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Whiskybase
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="border border-border/50 bg-card rounded-lg overflow-hidden flex flex-col" style={{ height: "65vh", minHeight: 400 }}>
          <div className="p-3 border-b border-border/30 text-sm text-muted-foreground font-medium">
            {filtered.length} {t("distillery.results")}
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map(d => (
              <div
                key={d.name}
                className={`px-3 py-2.5 border-b border-border/20 cursor-pointer transition-colors hover:bg-primary/5 ${hoveredName === d.name ? "bg-primary/10" : ""}`}
                onClick={() => flyTo(d)}
                onMouseEnter={() => setHoveredName(d.name)}
                onMouseLeave={() => hoveredName === d.name && setHoveredName(null)}
                data-testid={`map-list-${d.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-serif font-semibold text-sm text-primary">{d.name}</span>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {d.region}</span>
                      <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> {d.founded}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] flex-shrink-0 ${countryColors[d.country] || "bg-secondary text-muted-foreground"}`}>
                    {d.country}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
