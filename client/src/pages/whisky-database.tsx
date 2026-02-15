import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUpDown, ExternalLink, Wine, ShieldAlert, Star } from "lucide-react";
import { Link } from "wouter";

interface DbWhisky {
  id: string;
  name: string;
  distillery: string | null;
  age: string | null;
  abv: number | null;
  type: string | null;
  region: string | null;
  category: string | null;
  caskInfluence: string | null;
  peatLevel: string | null;
  wbScore: number | null;
  whiskybaseId: string | null;
  imageUrl: string | null;
  tastingId: string;
  tastingTitle: string;
  tastingDate: string;
  hostName: string;
  ratingCount: number;
  avgScore: number | null;
}

type SortKey = "name" | "avgScore" | "ratingCount" | "tastingDate" | "wbScore";

export default function WhiskyDatabase() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("tastingDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [regionFilter, setRegionFilter] = useState<string>("all");

  const { data: whiskies = [], isLoading, error } = useQuery<DbWhisky[]>({
    queryKey: ["global-whisky-database", currentParticipant?.id],
    queryFn: async () => {
      const res = await fetch(`/api/global-whisky-database?participantId=${currentParticipant!.id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    enabled: !!currentParticipant,
  });

  const regions = useMemo(() => {
    const set = new Set<string>();
    whiskies.forEach(w => { if (w.region) set.add(w.region); });
    return Array.from(set).sort();
  }, [whiskies]);

  const filtered = useMemo(() => {
    let result = whiskies;
    if (regionFilter !== "all") result = result.filter(w => w.region === regionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(w =>
        w.name.toLowerCase().includes(q) ||
        (w.distillery || "").toLowerCase().includes(q) ||
        (w.region || "").toLowerCase().includes(q) ||
        w.tastingTitle.toLowerCase().includes(q) ||
        w.hostName.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "avgScore": cmp = (a.avgScore || 0) - (b.avgScore || 0); break;
        case "ratingCount": cmp = a.ratingCount - b.ratingCount; break;
        case "tastingDate": cmp = new Date(a.tastingDate).getTime() - new Date(b.tastingDate).getTime(); break;
        case "wbScore": cmp = (a.wbScore || 0) - (b.wbScore || 0); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [whiskies, search, sortBy, sortDir, regionFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  if (!currentParticipant) {
    return (
      <div className="text-center py-20 space-y-4">
        <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground font-serif">{t("whiskyDb.loginRequired")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 space-y-4">
        <ShieldAlert className="w-12 h-12 mx-auto text-destructive" />
        <p className="text-lg font-serif text-destructive">{t("whiskyDb.accessDenied")}</p>
        <p className="text-sm text-muted-foreground">{t("whiskyDb.accessDeniedDesc")}</p>
      </div>
    );
  }

  const uniqueWhiskies = new Set(whiskies.map(w => `${w.name}-${w.distillery}`)).size;
  const avgOverall = whiskies.filter(w => w.avgScore).length > 0
    ? Math.round(whiskies.filter(w => w.avgScore).reduce((s, w) => s + (w.avgScore || 0), 0) / whiskies.filter(w => w.avgScore).length * 10) / 10
    : null;

  return (
    <div className="space-y-8" data-testid="whisky-database">
      <header>
        <h1 className="text-4xl font-serif font-black text-primary tracking-tight">{t("whiskyDb.title")}</h1>
        <p className="text-muted-foreground font-serif italic mt-2 text-lg">{t("whiskyDb.subtitle")}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-mono font-bold text-primary">{whiskies.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("whiskyDb.totalEntries")}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-mono font-bold text-primary">{uniqueWhiskies}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("whiskyDb.uniqueWhiskies")}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-mono font-bold text-primary">{regions.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("whiskyDb.regions")}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-mono font-bold text-primary">{avgOverall || "—"}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("whiskyDb.avgScore")}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("whiskyDb.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-db-search"
          />
        </div>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-full md:w-48" data-testid="select-db-region">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("whiskyDb.allRegions")}</SelectItem>
            {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground font-serif">{t("whiskyDb.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground font-serif">{t("whiskyDb.noResults")}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-whisky-db">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="py-3 px-2 font-serif font-bold text-muted-foreground cursor-pointer hover:text-primary" onClick={() => toggleSort("name")}>
                  <span className="inline-flex items-center gap-1">{t("whiskyDb.colName")} <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="py-3 px-2 font-serif font-bold text-muted-foreground hidden md:table-cell">{t("whiskyDb.colRegion")}</th>
                <th className="py-3 px-2 font-serif font-bold text-muted-foreground hidden lg:table-cell">{t("whiskyDb.colTasting")}</th>
                <th className="py-3 px-2 font-serif font-bold text-muted-foreground cursor-pointer hover:text-primary text-center" onClick={() => toggleSort("ratingCount")}>
                  <span className="inline-flex items-center gap-1">{t("whiskyDb.colRatings")} <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="py-3 px-2 font-serif font-bold text-muted-foreground cursor-pointer hover:text-primary text-center" onClick={() => toggleSort("avgScore")}>
                  <span className="inline-flex items-center gap-1">{t("whiskyDb.colAvg")} <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="py-3 px-2 font-serif font-bold text-muted-foreground cursor-pointer hover:text-primary text-center hidden md:table-cell" onClick={() => toggleSort("wbScore")}>
                  <span className="inline-flex items-center gap-1">WB <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="py-3 px-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={`${w.id}-${w.tastingId}`} className="border-b border-border/20 hover:bg-secondary/30 transition-colors" data-testid={`row-db-${w.id}`}>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {w.imageUrl && (
                        <img src={w.imageUrl} alt={w.name} className="w-8 h-8 rounded-full object-cover border border-border/50" />
                      )}
                      <div>
                        <span className="font-serif font-medium text-foreground">{w.name}</span>
                        {w.distillery && <span className="block text-xs text-muted-foreground">{w.distillery}</span>}
                        <span className="block text-xs text-muted-foreground md:hidden">{w.region || ""}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                    <div>
                      <span className="text-xs">{w.region || "—"}</span>
                      {w.abv && <span className="block text-xs text-muted-foreground/60">{w.abv}% ABV</span>}
                    </div>
                  </td>
                  <td className="py-3 px-2 hidden lg:table-cell">
                    <Link href={`/tasting/${w.tastingId}`}>
                      <span className="text-xs text-primary hover:underline cursor-pointer">{w.tastingTitle}</span>
                    </Link>
                    <span className="block text-xs text-muted-foreground/60">{new Date(w.tastingDate).toLocaleDateString()}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge variant="outline" className="text-xs">{w.ratingCount}</Badge>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {w.avgScore != null ? (
                      <span className="font-mono font-medium text-primary flex items-center justify-center gap-1">
                        <Star className="w-3 h-3" /> {w.avgScore}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center hidden md:table-cell">
                    {w.wbScore != null ? (
                      <span className="font-mono text-xs">{w.wbScore.toFixed(1)}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    {w.whiskybaseId && (
                      <a
                        href={`https://www.whiskybase.com/whiskies/whisky/${w.whiskybaseId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
