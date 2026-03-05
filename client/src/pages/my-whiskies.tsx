import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { tastingHistoryApi, journalApi } from "@/lib/api";
import { motion } from "framer-motion";
import { GlassWater, Wine, Star, Search, Loader2, Calendar, ArrowUpDown, Filter } from "lucide-react";
import { c, cardStyle, pageTitleStyle, pageSubtitleStyle, inputStyle } from "@/lib/theme";
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

export default function MyWhiskies({ embedded = false }: { embedded?: boolean }) {
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
    enabled: !!currentParticipant,
  });

  const sourceCounts = useMemo(() => {
    let casksense = 0;
    let imported = 0;
    let whiskybase = 0;
    if (data?.tastings) {
      for (const tasting of data.tastings) {
        casksense += tasting.whiskies.length;
      }
    }
    if (journalEntries) {
      for (const je of journalEntries) {
        const src = je.source || "casksense";
        if (src === "imported") imported++;
        if (src === "whiskybase") whiskybase++;
      }
    }
    return { casksense, imported, whiskybase };
  }, [data, journalEntries]);

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

  const getScoreColor = (score: number | null): string => {
    if (score == null) return c.muted;
    if (score >= 80) return c.success;
    if (score >= 60) return c.accent;
    return c.danger;
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={pageTitleStyle}>{t("myWhiskies.title")}</h1>
        </div>
      </GuestPreview>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 style={{ width: 32, height: 32, color: c.accent, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const ratedCount = allWhiskies.filter(w => w.overall != null).length;
  const uniqueDistilleries = new Set(allWhiskies.map(w => w.distillery).filter(Boolean)).size;

  const statCardStyle: React.CSSProperties = {
    ...cardStyle,
    padding: 16,
    textAlign: "center",
    flex: 1,
  };

  const chipBase: React.CSSProperties = {
    padding: "2px 8px",
    borderRadius: 999,
    border: `1px solid ${c.border}`,
    fontSize: 10,
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
    background: "transparent",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 896, margin: "0 auto", minWidth: 0, overflowX: "hidden" }} data-testid="my-whiskies-page">
      {!embedded && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 style={pageTitleStyle} data-testid="text-my-whiskies-title">
            {t("myWhiskies.title")}
          </h1>
          <p style={pageSubtitleStyle}>{t("myWhiskies.subtitle")}</p>
          <div style={{ width: 48, height: 4, background: `${c.accent}80`, marginTop: 12, borderRadius: 2 }} />
        </motion.div>
      )}

      {allWhiskies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
        >
          <div style={statCardStyle}>
            <GlassWater style={{ width: 20, height: 20, color: c.accent, margin: "0 auto 4px" }} />
            <p style={{ fontSize: 24, fontFamily: "monospace", fontWeight: 700, color: c.accent, margin: 0 }}>{allWhiskies.length}</p>
            <p style={{ fontSize: 10, color: c.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{t("myWhiskies.statTotal")}</p>
          </div>
          <div style={statCardStyle}>
            <Star style={{ width: 20, height: 20, color: c.accent, margin: "0 auto 4px" }} />
            <p style={{ fontSize: 24, fontFamily: "monospace", fontWeight: 700, color: c.accent, margin: 0 }}>{ratedCount}</p>
            <p style={{ fontSize: 10, color: c.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{t("myWhiskies.statRated")}</p>
          </div>
          <div style={statCardStyle}>
            <Wine style={{ width: 20, height: 20, color: c.accent, margin: "0 auto 4px" }} />
            <p style={{ fontSize: 24, fontFamily: "monospace", fontWeight: 700, color: c.accent, margin: 0 }}>{uniqueDistilleries}</p>
            <p style={{ fontSize: 10, color: c.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>{t("myWhiskies.statDistilleries")}</p>
          </div>
        </motion.div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: c.muted }} />
            <input
              placeholder={t("myWhiskies.searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 36 }}
              data-testid="input-search-whiskies"
            />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["date", "score", "name", "distillery"] as SortKey[]).map(key => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                style={{
                  fontSize: 10,
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: `1px solid ${sortBy === key ? `${c.accent}50` : `${c.border}60`}`,
                  background: sortBy === key ? `${c.accent}18` : "transparent",
                  color: sortBy === key ? c.accent : c.muted,
                  fontWeight: sortBy === key ? 500 : 400,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                }}
                data-testid={`sort-${key}`}
              >
                {t(`myWhiskies.sort.${key}`)}
                {sortBy === key && <ArrowUpDown style={{ width: 10, height: 10 }} />}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }} data-testid="source-filter">
          <Filter style={{ width: 12, height: 12, color: c.muted }} />
          <span style={{ color: c.muted }}>{t("myWhiskies.sourceFilter")}:</span>
          <button
            style={{
              ...chipBase,
              background: `${c.accent}18`,
              borderColor: `${c.accent}50`,
              color: c.accent,
              fontWeight: 500,
              cursor: "default",
            }}
            data-testid="filter-casksense"
          >
            {t("myWhiskies.sourceCaskSense")}
            <span style={{ background: `${c.accent}30`, color: c.accent, borderRadius: 999, padding: "0 6px", minWidth: 18, textAlign: "center" }}>{sourceCounts.casksense}</span>
          </button>
          <button
            onClick={() => setShowImported(!showImported)}
            style={{
              ...chipBase,
              background: showImported ? "#d4920018" : "transparent",
              borderColor: showImported ? "#d4920050" : `${c.border}60`,
              color: showImported ? "#d49200" : c.muted,
              fontWeight: showImported ? 500 : 400,
            }}
            data-testid="filter-imported"
          >
            {t("myWhiskies.sourceImported")}
            <span style={{
              borderRadius: 999,
              padding: "0 6px",
              minWidth: 18,
              textAlign: "center",
              background: showImported ? "#d4920030" : `${c.inputBg}`,
              color: showImported ? "#d49200" : c.muted,
            }}>{sourceCounts.imported}</span>
          </button>
          <button
            onClick={() => setShowWhiskybase(!showWhiskybase)}
            style={{
              ...chipBase,
              background: showWhiskybase ? "#4488dd18" : "transparent",
              borderColor: showWhiskybase ? "#4488dd50" : `${c.border}60`,
              color: showWhiskybase ? "#4488dd" : c.muted,
              fontWeight: showWhiskybase ? 500 : 400,
            }}
            data-testid="filter-whiskybase"
          >
            {t("myWhiskies.sourceWhiskybase")}
            <span style={{
              borderRadius: 999,
              padding: "0 6px",
              minWidth: 18,
              textAlign: "center",
              background: showWhiskybase ? "#4488dd30" : `${c.inputBg}`,
              color: showWhiskybase ? "#4488dd" : c.muted,
            }}>{sourceCounts.whiskybase}</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <GlassWater style={{ width: 64, height: 64, color: `${c.muted}30`, margin: "0 auto 16px" }} />
          <p style={{ color: c.muted, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontStyle: "italic" }}>{t("myWhiskies.empty")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((whisky, i) => (
            <motion.div
              key={`${whisky.id}-${whisky.tastingId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * Math.min(i, 15), duration: 0.4 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 12,
                borderRadius: 10,
                background: c.card,
                border: `1px solid ${c.border}60`,
                transition: "border-color 0.2s",
              }}
              data-testid={`whisky-card-${whisky.id}`}
            >
              {whisky.imageUrl ? (
                <img src={whisky.imageUrl} alt={whisky.name} style={{ width: 40, height: 52, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 40, height: 52, borderRadius: 6, background: `${c.border}60`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Wine style={{ width: 20, height: 20, color: `${c.muted}40` }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: c.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {whisky.distillery && <span style={{ color: c.accent }}>{whisky.distillery} </span>}
                  {whisky.name}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", fontSize: 10, color: c.muted }}>
                  {whisky.age && <span>{whisky.age}y</span>}
                  {whisky.abv && <span>{whisky.abv}%</span>}
                  {whisky.region && <span>{whisky.region}</span>}
                  {whisky.caskInfluence && <span>{whisky.caskInfluence}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, fontSize: 10, color: `${c.muted}b0` }}>
                  <Calendar style={{ width: 10, height: 10 }} />
                  <span>{whisky.tastingTitle} · {new Date(whisky.tastingDate).toLocaleDateString()}</span>
                  {whisky.source === "imported" && (
                    <span style={{ fontSize: 8, padding: "0 6px", height: 16, lineHeight: "16px", borderRadius: 4, background: "#d4920018", border: "1px solid #d4920050", color: "#d49200" }}>{t("myWhiskies.badgeImported")}</span>
                  )}
                  {whisky.source === "whiskybase" && (
                    <span style={{ fontSize: 8, padding: "0 6px", height: 16, lineHeight: "16px", borderRadius: 4, background: "#4488dd18", border: "1px solid #4488dd50", color: "#4488dd" }}>{t("myWhiskies.badgeWhiskybase")}</span>
                  )}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                {whisky.overall != null ? (
                  <p style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 700, color: getScoreColor(whisky.overall), margin: 0 }}>
                    {formatScore(whisky.overall)}
                  </p>
                ) : (
                  <span style={{ fontSize: 12, color: `${c.muted}60`, fontStyle: "italic" }}>{t("tastingHistory.notRated")}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
