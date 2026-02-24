import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Calendar, Star, ExternalLink, ChevronDown, ChevronUp, Map } from "lucide-react";
import { distilleries, type Distillery } from "@/data/distilleries";
import { SuggestEntryDialog } from "@/components/suggest-entry-dialog";

export default function DistilleryEncyclopedia() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "founded">("name");

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
        d.country.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) =>
      sortBy === "name" ? a.name.localeCompare(b.name) : a.founded - b.founded
    );
  }, [search, selectedRegion, selectedCountry, sortBy]);

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

  return (
    <div className="space-y-8 min-w-0 overflow-x-hidden" data-testid="distillery-encyclopedia">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words">{t("distillery.title")}</h1>
          <p className="text-muted-foreground font-serif italic mt-2 text-base sm:text-lg">{t("distillery.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <SuggestEntryDialog type="distillery" />
          <Link href="/discover/distilleries?tab=map">
            <Button variant="outline" size="sm" data-testid="link-distillery-map">
              <Map className="w-4 h-4 mr-1" /> {t("distillery.viewOnMap")}
            </Button>
          </Link>
        </div>
      </header>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("distillery.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-distillery-search"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCountry === null ? "default" : "outline"}
            size="sm"
            onClick={() => { setSelectedCountry(null); setSelectedRegion(null); }}
            className="text-xs"
            data-testid="filter-country-all"
          >
            {t("distillery.allCountries")} ({distilleries.length})
          </Button>
          {countries.map(c => {
            const count = distilleries.filter(d => d.country === c).length;
            return (
              <Button
                key={c}
                variant={selectedCountry === c ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectedCountry(c === selectedCountry ? null : c); setSelectedRegion(null); }}
                className="text-xs"
                data-testid={`filter-country-${c}`}
              >
                {c} ({count})
              </Button>
            );
          })}
        </div>

        {selectedCountry && regions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedRegion === null ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedRegion(null)}
              className="text-xs"
            >
              {t("distillery.allRegions")}
            </Button>
            {regions.map(r => (
              <Button
                key={r}
                variant={selectedRegion === r ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedRegion(r === selectedRegion ? null : r)}
                className="text-xs"
                data-testid={`filter-region-${r}`}
              >
                {r}
              </Button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} {t("distillery.results")}
          </p>
          <div className="flex gap-1">
            <Button variant={sortBy === "name" ? "secondary" : "ghost"} size="sm" onClick={() => setSortBy("name")} className="text-xs">
              A-Z
            </Button>
            <Button variant={sortBy === "founded" ? "secondary" : "ghost"} size="sm" onClick={() => setSortBy("founded")} className="text-xs">
              <Calendar className="w-3 h-3 mr-1" /> {t("distillery.sortFounded")}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((d, i) => {
            const isExpanded = expandedId === d.name;
            return (
              <motion.div
                key={d.name}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
              >
                <div
                  className="border border-border/50 bg-card rounded-lg overflow-hidden hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : d.name)}
                  data-testid={`card-distillery-${d.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif font-bold text-lg text-primary">{d.name}</h3>
                          <Badge variant="outline" className={`text-[10px] ${countryColors[d.country] || "bg-secondary text-muted-foreground"}`}>
                            {d.country}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.region}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t("distillery.est")} {d.founded}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://www.whiskybase.com/search?q=${encodeURIComponent(d.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`link-wb-${d.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                            <p className="text-sm text-foreground/90 leading-relaxed">{d.description}</p>
                            <div className="flex items-start gap-2 bg-primary/5 rounded-md p-3">
                              <Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-primary/90 italic">{d.feature}</p>
                            </div>
                            <Link
                              href={`/distillery-map?highlight=${encodeURIComponent(d.name)}`}
                              onClick={(e: React.MouseEvent) => e.stopPropagation()}
                              data-testid={`link-map-${d.name.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              <div className="flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg p-3 transition-colors cursor-pointer">
                                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/20">
                                  <Map className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-primary">{t("distillery.viewOnMap")}</p>
                                  <p className="text-xs text-muted-foreground">{d.region}, {d.country}</p>
                                </div>
                                <MapPin className="w-4 h-4 text-primary/60" />
                              </div>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
