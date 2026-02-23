import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { tastingHistoryApi, journalApi } from "@/lib/api";
import { motion } from "framer-motion";
import { GlassWater, Wine, Star, Search, Loader2, Calendar, ArrowUpDown, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GuestPreview } from "@/components/guest-preview";

interface WhiskyEntry {
  id: string;
  name: string;
  distillery: string | null;
  age: number | null;
  abv: number | null;
  country: string | null;
  region: string | null;
  category: string | null;
  caskInfluence: string | null;
  imageUrl: string | null;
  overall: number | null;
  tastingTitle: string;
  tastingDate: string;
  tastingId: string;
  source?: "casksense" | "imported" | "whiskybase" | "journal";
}

type SortKey = "name" | "score" | "date" | "distillery";

export default function MyWhiskies() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [showImported, setShowImported] = useState(false);
  const [showWhiskybase, setShowWhiskybase] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tasting-history", currentParticipant?.id],
    queryFn: () => tastingHistoryApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: journalEntries } = useQuery({
    queryKey: ["journal", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant && (showImported || showWhiskybase),
  });

  const allWhiskies: WhiskyEntry[] = useMemo(() => {
    const entries: WhiskyEntry[] = [];
    if (data?.tastings) {
      for (const tasting of data.tastings) {
        for (const w of tasting.whiskies) {
          entries.push({
            id: w.id,
            name: w.name,
            distillery: w.distillery,
            age: w.age,
            abv: w.abv,
            country: w.country,
            region: w.region,
            category: w.category,
            caskInfluence: w.caskInfluence,
            imageUrl: w.imageUrl,
            overall: w.myRating?.overall ?? null,
            tastingTitle: tasting.title,
            tastingDate: tasting.date,
            tastingId: tasting.id,
            source: "casksense",
          });
        }
      }
    }

    if (journalEntries && (showImported || showWhiskybase)) {
      for (const je of journalEntries) {
        const src = je.source || "casksense";
        if (src === "imported" && showImported) {
          entries.push({
            id: je.id,
            name: je.whiskyName || je.title,
            distillery: je.distillery || null,
            age: je.age ? parseInt(je.age) : null,
            abv: je.abv ? parseFloat(je.abv) : null,
            country: null,
            region: je.region || null,
            category: null,
            caskInfluence: je.caskType || null,
            imageUrl: je.imageUrl || null,
            overall: je.personalScore ?? null,
            tastingTitle: t("myWhiskies.badgeImported"),
            tastingDate: je.createdAt || new Date().toISOString(),
            tastingId: "",
            source: "imported",
          });
        }
        if (src === "whiskybase" && showWhiskybase) {
          entries.push({
            id: je.id,
            name: je.whiskyName || je.title,
            distillery: je.distillery || null,
            age: je.age ? parseInt(je.age) : null,
            abv: je.abv ? parseFloat(je.abv) : null,
            country: null,
            region: je.region || null,
            category: null,
            caskInfluence: je.caskType || null,
            imageUrl: je.imageUrl || null,
            overall: je.personalScore ?? null,
            tastingTitle: t("myWhiskies.badgeWhiskybase"),
            tastingDate: je.createdAt || new Date().toISOString(),
            tastingId: "",
            source: "whiskybase",
          });
        }
      }
    }
    return entries;
  }, [data, journalEntries, showImported, showWhiskybase, t]);

  const filtered = useMemo(() => {
    let items = allWhiskies;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        w =>
          w.name.toLowerCase().includes(q) ||
          (w.distillery && w.distillery.toLowerCase().includes(q)) ||
          (w.region && w.region.toLowerCase().includes(q)) ||
          (w.country && w.country.toLowerCase().includes(q)) ||
          w.tastingTitle.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "");
          break;
        case "distillery":
          cmp = (a.distillery || "").localeCompare(b.distillery || "");
          break;
        case "score":
          cmp = (a.overall ?? 0) - (b.overall ?? 0);
          break;
        case "date":
          cmp = new Date(a.tastingDate).getTime() - new Date(b.tastingDate).getTime();
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return items;
  }, [allWhiskies, search, sortBy, sortAsc]);

  const formatScore = (score: number | null) => {
    if (score == null) return "–";
    return score.toFixed(1);
  };

  const scoreColor = (score: number | null) => {
    if (score == null) return "text-muted-foreground";
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  };

  if (!currentParticipant) {
    return (
      <GuestPreview featureTitle={t("myWhiskies.title")} featureDescription={t("guestPreview.tastingHistory")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("myWhiskies.title")}</h1>
        </div>
      </GuestPreview>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const ratedCount = allWhiskies.filter(w => w.overall != null).length;
  const uniqueDistilleries = new Set(allWhiskies.map(w => w.distillery).filter(Boolean)).size;

  return (
    <div className="space-y-6 max-w-4xl mx-auto min-w-0 overflow-x-hidden" data-testid="my-whiskies-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight" data-testid="text-my-whiskies-title">
          {t("myWhiskies.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("myWhiskies.subtitle")}</p>
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      {allWhiskies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <GlassWater className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-mono font-bold text-primary">{allWhiskies.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("myWhiskies.statTotal")}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <Star className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-mono font-bold text-primary">{ratedCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("myWhiskies.statRated")}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <Wine className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-mono font-bold text-primary">{uniqueDistilleries}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("myWhiskies.statDistilleries")}</p>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("myWhiskies.searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-whiskies"
            />
          </div>
          <div className="flex gap-1">
            {(["date", "score", "name", "distillery"] as SortKey[]).map(key => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className={`text-[10px] px-2 py-1.5 rounded-md border transition-colors ${sortBy === key ? "bg-primary/10 border-primary/30 text-primary font-medium" : "border-border/40 text-muted-foreground hover:border-primary/20"}`}
                data-testid={`sort-${key}`}
              >
                {t(`myWhiskies.sort.${key}`)}
                {sortBy === key && <ArrowUpDown className="w-2.5 h-2.5 inline ml-0.5" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs" data-testid="source-filter">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">{t("myWhiskies.sourceFilter")}:</span>
          <button
            className="px-2 py-0.5 rounded-full border bg-primary/10 border-primary/30 text-primary font-medium cursor-default text-[10px]"
            data-testid="filter-casksense"
          >
            {t("myWhiskies.sourceCaskSense")}
          </button>
          <button
            onClick={() => setShowImported(!showImported)}
            className={`px-2 py-0.5 rounded-full border text-[10px] transition-colors ${showImported ? "bg-amber-500/10 border-amber-500/30 text-amber-600 font-medium" : "border-border/40 text-muted-foreground hover:border-amber-500/20"}`}
            data-testid="filter-imported"
          >
            {t("myWhiskies.sourceImported")}
          </button>
          <button
            onClick={() => setShowWhiskybase(!showWhiskybase)}
            className={`px-2 py-0.5 rounded-full border text-[10px] transition-colors ${showWhiskybase ? "bg-blue-500/10 border-blue-500/30 text-blue-600 font-medium" : "border-border/40 text-muted-foreground hover:border-blue-500/20"}`}
            data-testid="filter-whiskybase"
          >
            {t("myWhiskies.sourceWhiskybase")}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <GlassWater className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground font-serif text-lg italic">{t("myWhiskies.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((whisky, i) => (
            <motion.div
              key={`${whisky.id}-${whisky.tastingId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * Math.min(i, 15), duration: 0.4 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border/40 hover:border-primary/20 transition-colors"
              data-testid={`whisky-card-${whisky.id}`}
            >
              {whisky.imageUrl ? (
                <img src={whisky.imageUrl} alt={whisky.name} className="w-10 h-13 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-13 rounded bg-secondary/60 flex items-center justify-center flex-shrink-0">
                  <Wine className="w-5 h-5 text-muted-foreground/30" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-serif font-medium text-foreground truncate">
                  {whisky.distillery && <span className="text-primary">{whisky.distillery} </span>}
                  {whisky.name}
                </p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  {whisky.age && <span>{whisky.age}y</span>}
                  {whisky.abv && <span>{whisky.abv}%</span>}
                  {whisky.region && <span>{whisky.region}</span>}
                  {whisky.caskInfluence && <span>{whisky.caskInfluence}</span>}
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/70">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>{whisky.tastingTitle} · {new Date(whisky.tastingDate).toLocaleDateString()}</span>
                  {whisky.source === "imported" && (
                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 bg-amber-500/10 border-amber-500/30 text-amber-600">{t("myWhiskies.badgeImported")}</Badge>
                  )}
                  {whisky.source === "whiskybase" && (
                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 bg-blue-500/10 border-blue-500/30 text-blue-600">{t("myWhiskies.badgeWhiskybase")}</Badge>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                {whisky.overall != null ? (
                  <p className={`text-lg font-mono font-bold ${scoreColor(whisky.overall)}`}>
                    {formatScore(whisky.overall)}
                  </p>
                ) : (
                  <span className="text-xs text-muted-foreground/40 italic">{t("tastingHistory.notRated")}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
