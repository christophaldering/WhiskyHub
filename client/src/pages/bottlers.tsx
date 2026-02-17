import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Calendar, Star, ExternalLink, ChevronDown, ChevronUp, Package } from "lucide-react";
import { bottlers, type Bottler } from "@/data/bottlers";

export default function Bottlers() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "founded">("name");

  const countries = useMemo(() => Array.from(new Set(bottlers.map(b => b.country))).sort(), []);

  const filtered = useMemo(() => {
    let result = bottlers;
    if (selectedCountry) result = result.filter(b => b.country === selectedCountry);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.country.toLowerCase().includes(q) ||
        b.region.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.specialty.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) =>
      sortBy === "name" ? a.name.localeCompare(b.name) : a.founded - b.founded
    );
  }, [search, selectedCountry, sortBy]);

  const countryColors: Record<string, string> = {
    "Scotland": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "England": "bg-teal-500/10 text-teal-400 border-teal-500/20",
    "Germany": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Italy": "bg-green-500/10 text-green-400 border-green-500/20",
  };

  return (
    <div className="space-y-8 min-w-0 overflow-x-hidden" data-testid="bottler-encyclopedia">
      <header>
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words">{t("bottler.title")}</h1>
        <p className="text-muted-foreground font-serif italic mt-2 text-base sm:text-lg">{t("bottler.subtitle")}</p>
      </header>

      <div className="bg-card border border-border/50 rounded-lg p-4 space-y-2">
        <h3 className="font-serif font-bold text-sm text-primary flex items-center gap-2">
          <Package className="w-4 h-4" /> {t("bottler.whatIsTitle")}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("bottler.whatIsDesc")}</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("bottler.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-bottler-search"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCountry === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCountry(null)}
            className="text-xs"
            data-testid="filter-country-all"
          >
            {t("bottler.allCountries")} ({bottlers.length})
          </Button>
          {countries.map(c => {
            const count = bottlers.filter(b => b.country === c).length;
            return (
              <Button
                key={c}
                variant={selectedCountry === c ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCountry(c === selectedCountry ? null : c)}
                className="text-xs"
                data-testid={`filter-country-${c}`}
              >
                {c} ({count})
              </Button>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} {t("bottler.results")}
          </p>
          <div className="flex gap-1">
            <Button variant={sortBy === "name" ? "secondary" : "ghost"} size="sm" onClick={() => setSortBy("name")} className="text-xs">
              A-Z
            </Button>
            <Button variant={sortBy === "founded" ? "secondary" : "ghost"} size="sm" onClick={() => setSortBy("founded")} className="text-xs">
              <Calendar className="w-3 h-3 mr-1" /> {t("bottler.sortFounded")}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((b, i) => {
            const isExpanded = expandedId === b.name;
            return (
              <motion.div
                key={b.name}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
              >
                <div
                  className="border border-border/50 bg-card rounded-lg overflow-hidden hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : b.name)}
                  data-testid={`card-bottler-${b.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif font-bold text-base sm:text-lg text-primary truncate max-w-[200px] sm:max-w-none">{b.name}</h3>
                          <Badge variant="outline" className={`text-[10px] ${countryColors[b.country] || "bg-secondary text-muted-foreground"}`}>
                            {b.country}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.region}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t("bottler.est")} {b.founded}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://www.whiskybase.com/search?q=${encodeURIComponent(b.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`link-wb-${b.name.toLowerCase().replace(/\s+/g, "-")}`}
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
                            <p className="text-sm text-foreground/90 leading-relaxed">{b.description}</p>
                            <div className="flex items-start gap-2 bg-primary/5 rounded-md p-3">
                              <Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-primary/90 italic">{b.specialty}</p>
                            </div>
                            {b.notableReleases && b.notableReleases.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-2 font-mono uppercase">{t("bottler.notableReleases")}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {b.notableReleases.map(r => (
                                    <Badge key={r} variant="secondary" className="text-xs font-serif">{r}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
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
