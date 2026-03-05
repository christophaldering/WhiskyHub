import { useState, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { collectionApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import EmptyState from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { c, cardStyle, inputStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";
import {
  Upload,
  Search,
  ExternalLink,
  Trash2,
  NotebookPen,
  Wine,
  Archive,
  Loader2,
  Check,
  ArrowUpDown,
  Filter,
  BarChart3,
  Star,
  RefreshCw,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  DollarSign,
  X,
  Pencil,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GuestPreview } from "@/components/guest-preview";
import type { WhiskybaseCollectionItem } from "@shared/schema";

type SortKey = "name" | "rating" | "price" | "added";
type StatusFilter = "all" | "open" | "closed" | "empty";

type SyncChange = { field: string; old: any; new: any };
type SyncNewItem = any;
type SyncRemovedItem = { id: string; whiskybaseId: string; name: string; brand: string | null; status: string | null };
type SyncChangedItem = { existingId: string; whiskybaseId: string; name: string; brand: string | null; changes: SyncChange[]; uploadedData: any };
type SyncDiff = {
  newItems: SyncNewItem[];
  removedItems: SyncRemovedItem[];
  changedItems: SyncChangedItem[];
  unchangedCount: number;
  totalUploaded: number;
  totalExisting: number;
};

type RemoveAction = "keep" | "delete" | "empty";

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 12px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  border: "none",
  transition: "opacity 0.15s",
  whiteSpace: "nowrap",
};

const btnOutline: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  border: `1px solid ${c.border}`,
  color: c.text,
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: c.accent,
  color: c.bg,
};

const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  color: c.muted,
};

const btnSmall: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 12,
  borderRadius: 6,
};

const btnDanger: React.CSSProperties = {
  ...btnGhost,
  color: c.danger,
};

const chipActive: React.CSSProperties = {
  background: c.accent,
  color: c.bg,
};

const chipInactive: React.CSSProperties = {
  background: c.inputBg,
  color: c.muted,
};

export default function WhiskybaseCollection() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncFileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [deleteTarget, setDeleteTarget] = useState<WhiskybaseCollectionItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [priceSelectMode, setPriceSelectMode] = useState(false);
  const [selectedForPrice, setSelectedForPrice] = useState<Set<string>>(new Set());
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [manualPriceValue, setManualPriceValue] = useState("");
  const [rateLimitDate, setRateLimitDate] = useState<string | null>(null);

  const [syncDiff, setSyncDiff] = useState<SyncDiff | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [newItemChecked, setNewItemChecked] = useState<Record<number, boolean>>({});
  const [removeActions, setRemoveActions] = useState<Record<number, RemoveAction>>({});
  const [changeDecisions, setChangeDecisions] = useState<Record<string, "new" | "old">>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["collection", currentParticipant?.id],
    queryFn: () => collectionApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => collectionApi.importFile(currentParticipant!.id, file),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      toast({
        title: t("collection.importButton"),
        description: t("collection.importSuccess", {
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
        }),
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (file: File) => collectionApi.sync(currentParticipant!.id, file),
    onSuccess: (diff: SyncDiff) => {
      setSyncDiff(diff);
      const checked: Record<number, boolean> = {};
      diff.newItems.forEach((_: any, i: number) => { checked[i] = true; });
      setNewItemChecked(checked);
      const actions: Record<number, RemoveAction> = {};
      diff.removedItems.forEach((_: any, i: number) => { actions[i] = "keep"; });
      setRemoveActions(actions);
      const decisions: Record<string, "new" | "old"> = {};
      diff.changedItems.forEach((item: SyncChangedItem) => {
        item.changes.forEach((ch: SyncChange) => {
          decisions[`${item.existingId}-${ch.field}`] = "new";
        });
      });
      setChangeDecisions(decisions);
      setSyncDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const syncApplyMutation = useMutation({
    mutationFn: (data: { addItems: any[]; removeItemIds: string[]; updateItems: { id: string; data: any }[] }) =>
      collectionApi.syncApply(currentParticipant!.id, data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setSyncDialogOpen(false);
      setSyncDiff(null);
      toast({
        title: t("collection.syncDialogTitle"),
        description: t("collection.syncApplySuccess", {
          added: result.added,
          removed: result.removed,
          updated: result.updated,
        }),
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => collectionApi.delete(currentParticipant!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setDeleteTarget(null);
    },
  });

  const toJournalMutation = useMutation({
    mutationFn: (id: string) => collectionApi.toJournal(currentParticipant!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      toast({ title: t("collection.toJournalSuccess") });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const priceEstimateMutation = useMutation({
    mutationFn: (itemIds: string[]) => collectionApi.estimatePrice(currentParticipant!.id, itemIds),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setPriceSelectMode(false);
      setSelectedForPrice(new Set());
      setRateLimitDate(null);
      toast({
        title: t("collection.estimatePrices"),
        description: t("collection.priceEstimateSuccess", { count: result.estimates?.length || 0 }),
      });
    },
    onError: (error: any) => {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error === "rate_limited" && parsed.nextAvailable) {
          setRateLimitDate(new Date(parsed.nextAvailable).toLocaleDateString());
          toast({
            title: t("collection.estimatePrices"),
            description: t("collection.rateLimited", { date: new Date(parsed.nextAvailable).toLocaleDateString() }),
            variant: "destructive",
          });
          return;
        }
      } catch {}
      if (error.message?.includes("rate_limited") || error.message?.includes("next available") || error.message?.includes("Price estimation limited")) {
        const dateMatch = error.message.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
        if (dateMatch) {
          setRateLimitDate(dateMatch[1]);
          toast({
            title: t("collection.estimatePrices"),
            description: t("collection.rateLimited", { date: dateMatch[1] }),
            variant: "destructive",
          });
          return;
        }
      }
      toast({ title: t("collection.priceEstimateError"), description: error.message, variant: "destructive" });
    },
  });

  const manualPriceMutation = useMutation({
    mutationFn: ({ itemId, price, currency }: { itemId: string; price: number; currency: string }) =>
      collectionApi.manualPrice(currentParticipant!.id, itemId, price, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setEditingPriceId(null);
      setManualPriceValue("");
      toast({ title: t("collection.manualPriceSaved") });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const togglePriceSelect = (id: string) => {
    setSelectedForPrice(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllForPrice = () => {
    setSelectedForPrice(new Set(filtered.map((i: WhiskybaseCollectionItem) => i.id)));
  };

  const isAdmin = currentParticipant?.role === "admin";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      e.target.value = "";
    }
  };

  const handleSyncUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      syncMutation.mutate(file);
      e.target.value = "";
    }
  };

  const fieldLabel = useCallback((field: string) => {
    const map: Record<string, string> = {
      status: t("collection.syncFieldStatus"),
      communityRating: t("collection.syncFieldCommunityRating"),
      personalRating: t("collection.syncFieldPersonalRating"),
      pricePaid: t("collection.syncFieldPricePaid"),
      avgPrice: t("collection.syncFieldAvgPrice"),
      auctionPrice: t("collection.syncFieldAuctionPrice"),
    };
    return map[field] || field;
  }, [t]);

  const handleApplySync = useCallback(() => {
    if (!syncDiff) return;

    const addItems = syncDiff.newItems.filter((_: any, i: number) => newItemChecked[i]);

    const removeItemIds: string[] = [];
    const updateItemsFromRemoved: { id: string; data: any }[] = [];
    syncDiff.removedItems.forEach((item, i) => {
      const action = removeActions[i] || "keep";
      if (action === "delete") {
        removeItemIds.push(item.id);
      } else if (action === "empty") {
        updateItemsFromRemoved.push({ id: item.id, data: { status: "empty" } });
      }
    });

    const updateItemsFromChanged: { id: string; data: any }[] = [];
    syncDiff.changedItems.forEach((item) => {
      const updates: any = {};
      let hasUpdate = false;
      item.changes.forEach((ch) => {
        const decision = changeDecisions[`${item.existingId}-${ch.field}`];
        if (decision === "new") {
          updates[ch.field] = ch.new;
          hasUpdate = true;
        }
      });
      if (hasUpdate) {
        updateItemsFromChanged.push({ id: item.existingId, data: updates });
      }
    });

    syncApplyMutation.mutate({
      addItems,
      removeItemIds,
      updateItems: [...updateItemsFromRemoved, ...updateItemsFromChanged],
    });
  }, [syncDiff, newItemChecked, removeActions, changeDecisions, syncApplyMutation]);

  const filtered = useMemo(() => {
    let result = [...items] as WhiskybaseCollectionItem[];

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.brand?.toLowerCase().includes(q) ||
          item.distillery?.toLowerCase().includes(q) ||
          item.caskType?.toLowerCase().includes(q) ||
          item.bottlingSeries?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return (b.communityRating || 0) - (a.communityRating || 0);
        case "price":
          return (b.pricePaid || b.avgPrice || 0) - (a.pricePaid || a.avgPrice || 0);
        case "added":
          return (b.addedAt || "").localeCompare(a.addedAt || "");
        default:
          return (a.brand || "").localeCompare(b.brand || "") || (a.name || "").localeCompare(b.name || "");
      }
    });

    return result;
  }, [items, statusFilter, search, sortBy]);

  const duplicateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (items as WhiskybaseCollectionItem[]).forEach((item) => {
      counts[item.whiskybaseId] = (counts[item.whiskybaseId] || 0) + 1;
    });
    return counts;
  }, [items]);

  const uniqueExpressions = useMemo(() => {
    return new Set((items as WhiskybaseCollectionItem[]).map(i => i.whiskybaseId)).size;
  }, [items]);

  const stats = useMemo(() => {
    const all = items as WhiskybaseCollectionItem[];
    const open = all.filter((i) => i.status === "open").length;
    const closed = all.filter((i) => i.status === "closed").length;
    const empty = all.filter((i) => i.status === "empty").length;
    const ratings = all.filter((i) => i.communityRating).map((i) => i.communityRating!);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
    const prices = all.filter((i) => i.avgPrice).map((i) => i.avgPrice!);
    const totalValue = prices.reduce((a, b) => a + b, 0);
    const currencies = all.map((i) => i.avgPriceCurrency || i.currency).filter(Boolean);
    const mainCurrency = currencies.length ? currencies.sort((a, b) => currencies.filter((cv) => cv === b).length - currencies.filter((cv) => cv === a).length)[0] : "EUR";

    const distilleryCounts: Record<string, number> = {};
    all.forEach((i) => {
      const d = i.distillery || i.brand;
      if (d) distilleryCounts[d] = (distilleryCounts[d] || 0) + 1;
    });
    const topDistilleries = Object.entries(distilleryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return { total: all.length, open, closed, empty, avgRating, totalValue, mainCurrency, topDistilleries };
  }, [items]);

  if (!currentParticipant) {
    return (
      <SimpleShell maxWidth={900}>
        <GuestPreview featureTitle={t("wishlist.title")} featureDescription={t("guestPreview.wishlist")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h1 style={pageTitleStyle}>{t("wishlist.title")}</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[{name: "Lagavulin 16", distillery: "Lagavulin", region: "Islay"}, {name: "Glenfarclas 25", distillery: "Glenfarclas", region: "Speyside"}, {name: "Springbank 15", distillery: "Springbank", region: "Campbeltown"}].map(w => (
                <div key={w.name} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text }}>{w.name}</div>
                    <div style={{ fontSize: 13, color: c.muted }}>{w.distillery} · {w.region}</div>
                  </div>
                  <div style={{ color: "#eab308" }}>★</div>
                </div>
              ))}
            </div>
          </div>
        </GuestPreview>
      </SimpleShell>
    );
  }

  const statusColorStyle = (s: string | null): React.CSSProperties => {
    switch (s) {
      case "open": return { background: "rgba(74,157,110,0.1)", color: "#4a9d6e", border: `1px solid rgba(74,157,110,0.2)` };
      case "closed": return { background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: `1px solid rgba(96,165,250,0.2)` };
      case "empty": return { background: "rgba(113,113,122,0.1)", color: "#71717a", border: `1px solid rgba(113,113,122,0.2)` };
      default: return { background: "rgba(113,113,122,0.1)", color: "#71717a", border: `1px solid rgba(113,113,122,0.2)` };
    }
  };

  const statusLabel = (s: string | null) => {
    switch (s) {
      case "open": return t("collection.filterOpen");
      case "closed": return t("collection.filterClosed");
      case "empty": return t("collection.filterEmpty");
      default: return s || "";
    }
  };

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 6px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 500,
    whiteSpace: "nowrap",
  };

  const statCard: React.CSSProperties = {
    background: c.card,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    padding: 12,
    textAlign: "center" as const,
  };

  return (
    <SimpleShell maxWidth={900}>
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 80 }}>
      <BackButton />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <h1 style={pageTitleStyle} data-testid="text-collection-title">
            {t("collection.title")}
          </h1>
          <p style={{ ...pageSubtitleStyle, marginTop: 4 }}>{t("collection.subtitle")}</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          {items.length > 0 && (
            <button
              style={btnOutline}
              onClick={() => setShowStats(!showStats)}
              title={t("collection.statistics")}
              data-testid="button-toggle-stats"
            >
              <BarChart3 style={{ width: 16, height: 16 }} />
              <span style={{ display: "none" }}>{t("collection.statistics")}</span>
            </button>
          )}
          {items.length > 0 && !priceSelectMode && (
            <button
              style={btnOutline}
              onClick={() => {
                setPriceSelectMode(true);
                setSelectedForPrice(new Set());
              }}
              title={t("collection.estimatePrices")}
              data-testid="button-start-price-estimate"
            >
              <Sparkles style={{ width: 16, height: 16 }} />
              <span style={{ display: "none" }}>{t("collection.estimatePrices")}</span>
            </button>
          )}
          {items.length > 0 && (
            <button
              style={btnOutline}
              onClick={() => syncFileInputRef.current?.click()}
              disabled={syncMutation.isPending}
              title={syncMutation.isPending ? t("collection.syncing") : t("collection.syncButton")}
              data-testid="button-sync-collection"
            >
              {syncMutation.isPending ? (
                <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              ) : (
                <RefreshCw style={{ width: 16, height: 16 }} />
              )}
              <span style={{ display: "none" }}>{syncMutation.isPending ? t("collection.syncing") : t("collection.syncButton")}</span>
            </button>
          )}
          <button
            style={btnPrimary}
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            title={importMutation.isPending ? t("collection.importing") : t("collection.importButton")}
            data-testid="button-import-collection"
          >
            {importMutation.isPending ? (
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
            ) : (
              <Upload style={{ width: 16, height: 16 }} />
            )}
            <span style={{ display: "none" }}>{importMutation.isPending ? t("collection.importing") : t("collection.importButton")}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleFileUpload}
            data-testid="input-import-file"
          />
          <input
            ref={syncFileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleSyncUpload}
            data-testid="input-sync-file"
          />
        </div>
      </div>

      {items.length > 0 && !priceSelectMode && (
        <p style={{ fontSize: 12, color: c.muted }}>{t("collection.reimportHint")}</p>
      )}

      {priceSelectMode && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: `${c.accent}10`, border: `1px solid ${c.accent}30`, borderRadius: 10, padding: 12 }}>
          <Sparkles style={{ width: 20, height: 20, color: c.accent, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{t("collection.selectForEstimate")}</p>
            {selectedForPrice.size > 0 && (
              <p style={{ fontSize: 12, color: c.muted }}>{t("collection.selectedCount", { count: selectedForPrice.size })}</p>
            )}
            {rateLimitDate && !isAdmin && (
              <p style={{ fontSize: 12, color: "#f59e0b", marginTop: 4 }}>{t("collection.rateLimited", { date: rateLimitDate })}</p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              style={{ ...btnGhost, ...btnSmall }}
              onClick={selectAllForPrice}
              data-testid="button-select-all-price"
            >
              <Check style={{ width: 12, height: 12 }} />
              {t("collection.filterAll")}
            </button>
            <button
              style={{ ...btnPrimary, ...btnSmall, opacity: selectedForPrice.size === 0 || priceEstimateMutation.isPending ? 0.5 : 1 }}
              disabled={selectedForPrice.size === 0 || priceEstimateMutation.isPending}
              onClick={() => priceEstimateMutation.mutate(Array.from(selectedForPrice))}
              data-testid="button-run-price-estimate"
            >
              {priceEstimateMutation.isPending ? (
                <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              ) : (
                <Sparkles style={{ width: 16, height: 16 }} />
              )}
              {priceEstimateMutation.isPending ? t("collection.estimatingPrices") : t("collection.estimatePrices")}
            </button>
            <button
              style={{ ...btnGhost, ...btnSmall }}
              onClick={() => {
                setPriceSelectMode(false);
                setSelectedForPrice(new Set());
              }}
              data-testid="button-cancel-price-select"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showStats && stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={statCard}>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{stats.total}</div>
                <div style={{ fontSize: 11, color: c.muted }}>{t("collection.totalBottles", { count: stats.total })}</div>
              </div>
              <div style={statCard}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>{stats.open}</div>
                <div style={{ fontSize: 11, color: c.muted }}>{t("collection.openBottles")}</div>
              </div>
              <div style={statCard}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa" }}>{stats.closed}</div>
                <div style={{ fontSize: 11, color: c.muted }}>{t("collection.closedBottles")}</div>
              </div>
              <div style={statCard}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#71717a" }}>{stats.empty}</div>
                <div style={{ fontSize: 11, color: c.muted }}>{t("collection.emptyBottles")}</div>
              </div>
              <div style={statCard}>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{stats.avgRating || "—"}</div>
                <div style={{ fontSize: 11, color: c.muted }}>{t("collection.avgRating")}</div>
              </div>
            </div>

            {stats.totalValue > 0 && (
              <div style={{ ...statCard, textAlign: "left" as const, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{t("collection.totalValue")}</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: c.text }}>
                  {stats.totalValue.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {stats.mainCurrency}
                </span>
              </div>
            )}

            {stats.topDistilleries.length > 0 && (
              <div style={{ ...statCard, textAlign: "left" as const, marginBottom: 16 }}>
                <h3 style={{ fontSize: 13, fontWeight: 500, color: c.text, marginBottom: 8 }}>{t("collection.topDistilleries")}</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {stats.topDistilleries.map(([name, count]) => (
                    <span key={name} style={{ ...badgeStyle, background: c.inputBg, color: c.muted, border: `1px solid ${c.border}` }}>
                      {name} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: c.muted }} />
            <input
              style={{ ...inputStyle, paddingLeft: 36 }}
              placeholder={t("collection.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-collection-search"
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Filter style={{ width: 12, height: 12, color: c.muted }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                style={{ ...inputStyle, width: 130, padding: "8px 12px", fontSize: 13 }}
                data-testid="select-status-filter"
              >
                <option value="all">{t("collection.filterAll")}</option>
                <option value="open">{t("collection.filterOpen")}</option>
                <option value="closed">{t("collection.filterClosed")}</option>
                <option value="empty">{t("collection.filterEmpty")}</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ArrowUpDown style={{ width: 12, height: 12, color: c.muted }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                style={{ ...inputStyle, width: 140, padding: "8px 12px", fontSize: 13 }}
                data-testid="select-sort"
              >
                <option value="name">{t("collection.sortName")}</option>
                <option value="rating">{t("collection.sortRating")}</option>
                <option value="price">{t("collection.sortPrice")}</option>
                <option value="added">{t("collection.sortAdded")}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Loader2 style={{ width: 32, height: 32, color: c.muted, animation: "spin 1s linear infinite" }} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={t("emptyState.collectionTitle")}
          description={t("emptyState.collectionDesc")}
          actionLabel={t("emptyState.collectionCta")}
          onAction={() => fileInputRef.current?.click()}
        />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ color: c.muted }}>{t("collection.noResults")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 12, color: c.muted }}>
            {filtered.length} / {items.length} {t("collection.totalBottles", { count: items.length }).split(" ").slice(1).join(" ")}
            {uniqueExpressions < items.length && (
              <span style={{ color: c.muted, opacity: 0.6 }}> · {uniqueExpressions} {uniqueExpressions === 1 ? "expression" : "expressions"}</span>
            )}
          </p>
          {filtered.map((item: WhiskybaseCollectionItem) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, cursor: "pointer", transition: "background 0.15s" }}
                onClick={() => {
                  if (priceSelectMode) {
                    togglePriceSelect(item.id);
                  } else {
                    setExpandedId(expandedId === item.id ? null : item.id);
                  }
                }}
                data-testid={`card-collection-${item.id}`}
              >
                {priceSelectMode && (
                  <input
                    type="checkbox"
                    checked={selectedForPrice.has(item.id)}
                    onChange={() => togglePriceSelect(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 18, height: 18, accentColor: c.accent }}
                    data-testid={`checkbox-price-${item.id}`}
                  />
                )}
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: 40, height: 56, objectFit: "contain", borderRadius: 4, flexShrink: 0 }}
                    loading="lazy"
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 500, color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}
                      {item.name}
                    </span>
                    {duplicateCounts[item.whiskybaseId] > 1 && (
                      <span style={{ ...badgeStyle, background: `${c.accent}15`, color: c.accent, border: `1px solid ${c.accent}30` }}>
                        ×{duplicateCounts[item.whiskybaseId]}
                      </span>
                    )}
                    {item.status && (
                      <span style={{ ...badgeStyle, ...statusColorStyle(item.status), borderRadius: 6 }}>
                        {statusLabel(item.status)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: c.muted, marginTop: 2 }}>
                    {item.distillery && <span>{item.distillery}</span>}
                    {item.statedAge && <span>{item.statedAge}y</span>}
                    {item.abv && <span>{item.abv}{item.unit || "%vol"}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  {item.communityRating && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: c.text }}>
                        <Star style={{ width: 12, height: 12, color: "#fbbf24", fill: "#fbbf24" }} />
                        {item.communityRating.toFixed(1)}
                      </div>
                    </div>
                  )}
                  {item.estimatedPrice != null && (
                    <div style={{ textAlign: "right" }} data-testid={`text-estimated-price-${item.id}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: c.text }}>
                        <span>{item.estimatedPrice.toFixed(0)} {item.estimatedPriceCurrency || "EUR"}</span>
                      </div>
                      <span style={{ ...badgeStyle, background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                        <Sparkles style={{ width: 10, height: 10, marginRight: 2 }} />
                        {item.estimatedPriceSource === "manual" ? t("collection.manualOverride") : t("collection.aiEstimated")}
                      </span>
                    </div>
                  )}
                  {(item.avgPrice || item.pricePaid) && (
                    <div style={{ textAlign: "right", fontSize: 12, color: c.muted }}>
                      {item.avgPrice ? `~${item.avgPrice.toFixed(0)}` : item.pricePaid?.toFixed(0)} {item.avgPriceCurrency || item.currency || "€"}
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedId === item.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: "hidden", borderTop: `1px solid ${c.border}` }}
                  >
                    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, fontSize: 12 }}>
                        {item.bottlingSeries && (
                          <div>
                            <span style={{ color: c.muted }}>{t("collection.series")}:</span>{" "}
                            <span style={{ fontWeight: 500, color: c.text }}>{item.bottlingSeries}</span>
                          </div>
                        )}
                        {item.caskType && (
                          <div>
                            <span style={{ color: c.muted }}>{t("collection.caskType")}:</span>{" "}
                            <span style={{ fontWeight: 500, color: c.text }}>{item.caskType}</span>
                          </div>
                        )}
                        {item.vintage && (
                          <div>
                            <span style={{ color: c.muted }}>{t("collection.vintage")}:</span>{" "}
                            <span style={{ fontWeight: 500, color: c.text }}>{item.vintage}</span>
                          </div>
                        )}
                        {item.size && (
                          <div>
                            <span style={{ color: c.muted }}>{t("collection.size")}:</span>{" "}
                            <span style={{ fontWeight: 500, color: c.text }}>{item.size}ml</span>
                          </div>
                        )}
                        {item.pricePaid != null && (
                          <div>
                            <span style={{ color: c.muted }}>{t("collection.pricePaid")}:</span>{" "}
                            <span style={{ fontWeight: 500, color: c.text }}>{item.pricePaid.toFixed(2)} {item.currency}</span>
                          </div>
                        )}
                        {item.auctionPrice != null && (
                          <div>
                            <span style={{ color: c.muted }}>{t("collection.auctionPrice")}:</span>{" "}
                            <span style={{ fontWeight: 500, color: c.text }}>{item.auctionPrice.toFixed(2)} {item.auctionCurrency || item.avgPriceCurrency || "EUR"}</span>
                          </div>
                        )}
                        {item.personalRating != null && (
                          <div>
                            <span style={{ color: c.muted }}>{t("collection.personalRating")}:</span>{" "}
                            <span style={{ fontWeight: 500, color: c.text }}>{item.personalRating}</span>
                          </div>
                        )}
                        {item.addedAt && (
                          <div>
                            <span style={{ color: c.muted }}>{t("collection.sortAdded")}:</span>{" "}
                            <span style={{ fontWeight: 500, color: c.text }}>{item.addedAt.split(" ")[0]}</span>
                          </div>
                        )}
                        {item.purchaseLocation && (
                          <div>
                            <span style={{ color: c.muted }}>{t("collection.purchaseLocation")}:</span>{" "}
                            <span style={{ fontWeight: 500, color: c.text }}>{item.purchaseLocation}</span>
                          </div>
                        )}
                        {item.estimatedPrice != null && (
                          <div>
                            <span style={{ color: c.muted }}>{t("collection.estimatePrice")}:</span>{" "}
                            <span style={{ fontWeight: 500, color: c.text }}>{item.estimatedPrice.toFixed(2)} {item.estimatedPriceCurrency || "EUR"}</span>{" "}
                            <span style={{ ...badgeStyle, background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)", marginLeft: 4 }} data-testid={`badge-ai-estimated-${item.id}`}>
                              <Sparkles style={{ width: 10, height: 10, marginRight: 2 }} />
                              {item.estimatedPriceSource === "manual" ? t("collection.manualOverride") : t("collection.aiEstimated")}
                            </span>
                            {item.estimatedPriceDate && (
                              <span style={{ fontSize: 10, color: c.muted, marginLeft: 4 }}>
                                {t("collection.priceEstimateDate", { date: new Date(item.estimatedPriceDate).toLocaleDateString() })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {editingPriceId === item.id && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <DollarSign style={{ width: 12, height: 12, color: c.muted }} />
                          <input
                            type="number"
                            min="0"
                            step="1"
                            style={{ ...inputStyle, width: 96, height: 28, padding: "4px 8px", fontSize: 12 }}
                            placeholder="0"
                            value={manualPriceValue}
                            onChange={(e) => setManualPriceValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`input-manual-price-${item.id}`}
                          />
                          <span style={{ color: c.muted }}>EUR</span>
                          <button
                            style={{ ...btnOutline, ...btnSmall, height: 28, opacity: !manualPriceValue || manualPriceMutation.isPending ? 0.5 : 1 }}
                            disabled={!manualPriceValue || manualPriceMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              manualPriceMutation.mutate({ itemId: item.id, price: parseFloat(manualPriceValue), currency: "EUR" });
                            }}
                            data-testid={`button-save-manual-price-${item.id}`}
                          >
                            {manualPriceMutation.isPending ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 12, height: 12 }} />}
                          </button>
                          <button
                            style={{ ...btnGhost, ...btnSmall, height: 28 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPriceId(null);
                              setManualPriceValue("");
                            }}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      )}

                      {item.notes && (
                        <div style={{ fontSize: 12 }}>
                          <span style={{ color: c.muted }}>{t("collection.notes")}:</span>{" "}
                          <span style={{ color: c.text }}>{item.notes}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                        <a
                          href={`https://www.whiskybase.com/whiskies/whisky/${item.whiskybaseId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: c.accent, textDecoration: "none" }}
                          data-testid={`link-whiskybase-${item.id}`}
                        >
                          <ExternalLink style={{ width: 12, height: 12 }} />
                          {t("collection.viewOnWhiskybase")}
                        </a>
                        <button
                          style={{ ...btnOutline, ...btnSmall, height: 28 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toJournalMutation.mutate(item.id);
                          }}
                          disabled={toJournalMutation.isPending}
                          data-testid={`button-to-journal-${item.id}`}
                        >
                          {toJournalMutation.isPending ? (
                            <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                          ) : (
                            <NotebookPen style={{ width: 12, height: 12 }} />
                          )}
                          {t("collection.toJournal")}
                        </button>
                        <button
                          style={{ ...btnOutline, ...btnSmall, height: 28 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            priceEstimateMutation.mutate([item.id]);
                          }}
                          disabled={priceEstimateMutation.isPending}
                          data-testid={`button-estimate-price-${item.id}`}
                        >
                          {priceEstimateMutation.isPending ? (
                            <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                          ) : (
                            <Sparkles style={{ width: 12, height: 12 }} />
                          )}
                          {t("collection.estimatePrice")}
                        </button>
                        <button
                          style={{ ...btnOutline, ...btnSmall, height: 28 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPriceId(editingPriceId === item.id ? null : item.id);
                            setManualPriceValue(item.estimatedPrice?.toString() || "");
                          }}
                          data-testid={`button-manual-price-${item.id}`}
                        >
                          <Pencil style={{ width: 12, height: 12 }} />
                          {t("collection.manualPriceHint")}
                        </button>
                        <button
                          style={{ ...btnDanger, ...btnSmall, height: 28 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(item);
                          }}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 style={{ width: 12, height: 12 }} />
                          {t("collection.deleteItem")}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ ...cardStyle, maxWidth: 420, width: "100%" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: c.text, marginBottom: 8 }}>{t("collection.deleteItem")}</h2>
            <p style={{ fontSize: 14, color: c.muted, marginBottom: 20 }}>{t("collection.deleteConfirm")}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button style={btnOutline} onClick={() => setDeleteTarget(null)}>{t("journal.cancel")}</button>
              <button
                style={{ ...btnBase, background: c.danger, color: "#fff" }}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              >
                {t("collection.deleteItem")}
              </button>
            </div>
          </div>
        </div>
      )}

      {syncDialogOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ ...cardStyle, maxWidth: 640, width: "100%", maxHeight: "85vh", overflowY: "auto" }} data-testid="dialog-sync">
            <h2 style={{ fontSize: 18, fontWeight: 600, color: c.text, marginBottom: 4 }}>{t("collection.syncDialogTitle")}</h2>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>{t("collection.syncDialogDesc")}</p>

            {syncDiff && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: c.inputBg, borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 500, color: c.text }} data-testid="text-sync-summary">
                  {t("collection.syncSummary", {
                    newCount: syncDiff.newItems.length,
                    removedCount: syncDiff.removedItems.length,
                    changedCount: syncDiff.changedItems.length,
                    unchangedCount: syncDiff.unchangedCount,
                  })}
                </div>

                {syncDiff.newItems.length === 0 && syncDiff.removedItems.length === 0 && syncDiff.changedItems.length === 0 && (
                  <div style={{ textAlign: "center", padding: "32px 0", color: c.muted }} data-testid="text-sync-no-changes">
                    <Check style={{ width: 32, height: 32, margin: "0 auto 8px", color: c.success }} />
                    <p>{t("collection.syncNoChanges")}</p>
                  </div>
                )}

                {syncDiff.newItems.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: c.text, display: "flex", alignItems: "center", gap: 8 }}>
                        <Plus style={{ width: 16, height: 16, color: c.success }} />
                        {t("collection.syncSectionNew")} ({syncDiff.newItems.length})
                      </h3>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          style={{ ...btnGhost, ...btnSmall, fontSize: 11 }}
                          onClick={() => {
                            const all: Record<number, boolean> = {};
                            syncDiff.newItems.forEach((_: any, i: number) => { all[i] = true; });
                            setNewItemChecked(all);
                          }}
                          data-testid="button-sync-add-all"
                        >
                          {t("collection.syncAddAll")}
                        </button>
                        <button
                          style={{ ...btnGhost, ...btnSmall, fontSize: 11 }}
                          onClick={() => {
                            const none: Record<number, boolean> = {};
                            syncDiff.newItems.forEach((_: any, i: number) => { none[i] = false; });
                            setNewItemChecked(none);
                          }}
                          data-testid="button-sync-add-none"
                        >
                          {t("collection.syncAddNone")}
                        </button>
                      </div>
                    </div>
                    <div style={{ maxHeight: 192, overflowY: "auto", border: `1px solid ${c.border}`, borderRadius: 10, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {syncDiff.newItems.map((item: any, i: number) => (
                        <label
                          key={i}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 13, color: c.text }}
                          data-testid={`sync-new-item-${i}`}
                        >
                          <input
                            type="checkbox"
                            checked={!!newItemChecked[i]}
                            onChange={(e) => setNewItemChecked(prev => ({ ...prev, [i]: e.target.checked }))}
                            style={{ width: 16, height: 16, accentColor: c.accent }}
                            data-testid={`checkbox-sync-new-${i}`}
                          />
                          <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                          </span>
                          {item.distillery && <span style={{ fontSize: 12, color: c.muted, marginLeft: "auto" }}>{item.distillery}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {syncDiff.removedItems.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: c.text, display: "flex", alignItems: "center", gap: 8 }}>
                      <Minus style={{ width: 16, height: 16, color: c.danger }} />
                      {t("collection.syncSectionRemoved")} ({syncDiff.removedItems.length})
                    </h3>
                    <div style={{ maxHeight: 192, overflowY: "auto", border: `1px solid ${c.border}`, borderRadius: 10, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {syncDiff.removedItems.map((item, i) => (
                        <div
                          key={i}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", borderRadius: 6, fontSize: 13, color: c.text }}
                          data-testid={`sync-removed-item-${i}`}
                        >
                          <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                          </span>
                          <select
                            value={removeActions[i] || "keep"}
                            onChange={(e) => setRemoveActions(prev => ({ ...prev, [i]: e.target.value as RemoveAction }))}
                            style={{ ...inputStyle, width: 160, height: 28, padding: "2px 8px", fontSize: 12 }}
                            data-testid={`select-sync-remove-${i}`}
                          >
                            <option value="keep">{t("collection.syncRemoveKeep")}</option>
                            <option value="delete">{t("collection.syncRemoveDelete")}</option>
                            <option value="empty">{t("collection.syncRemoveMarkEmpty")}</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {syncDiff.changedItems.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: c.text, display: "flex", alignItems: "center", gap: 8 }}>
                      <ArrowRight style={{ width: 16, height: 16, color: "#f59e0b" }} />
                      {t("collection.syncSectionChanged")} ({syncDiff.changedItems.length})
                    </h3>
                    <div style={{ maxHeight: 256, overflowY: "auto", border: `1px solid ${c.border}`, borderRadius: 10, padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      {syncDiff.changedItems.map((item, ci) => (
                        <div key={ci} style={{ border: `1px solid ${c.border}`, borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 6 }} data-testid={`sync-changed-item-${ci}`}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: c.text }}>
                            {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                          </div>
                          {item.changes.map((change, chi) => {
                            const key = `${item.existingId}-${change.field}`;
                            const decision = changeDecisions[key] || "new";
                            return (
                              <div key={chi} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, paddingLeft: 8 }}>
                                <span style={{ color: c.muted, width: 112, flexShrink: 0 }}>{fieldLabel(change.field)}:</span>
                                <button
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    border: `1px solid ${decision === "old" ? c.accent : c.border}`,
                                    background: decision === "old" ? c.accent : "transparent",
                                    color: decision === "old" ? c.bg : c.text,
                                    cursor: "pointer",
                                    fontSize: 12,
                                    transition: "all 0.15s",
                                  }}
                                  onClick={() => setChangeDecisions(prev => ({ ...prev, [key]: "old" }))}
                                  data-testid={`button-sync-keep-old-${ci}-${chi}`}
                                >
                                  {String(change.old ?? "—")}
                                </button>
                                <ArrowRight style={{ width: 12, height: 12, color: c.muted, flexShrink: 0 }} />
                                <button
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: 4,
                                    border: `1px solid ${decision === "new" ? c.accent : c.border}`,
                                    background: decision === "new" ? c.accent : "transparent",
                                    color: decision === "new" ? c.bg : c.text,
                                    cursor: "pointer",
                                    fontSize: 12,
                                    transition: "all 0.15s",
                                  }}
                                  onClick={() => setChangeDecisions(prev => ({ ...prev, [key]: "new" }))}
                                  data-testid={`button-sync-accept-new-${ci}-${chi}`}
                                >
                                  {String(change.new ?? "—")}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                style={btnOutline}
                onClick={() => { setSyncDialogOpen(false); setSyncDiff(null); }}
                data-testid="button-sync-cancel"
              >
                {t("journal.cancel")}
              </button>
              {syncDiff && (syncDiff.newItems.length > 0 || syncDiff.removedItems.length > 0 || syncDiff.changedItems.length > 0) && (
                <button
                  style={{ ...btnPrimary, opacity: syncApplyMutation.isPending ? 0.7 : 1 }}
                  onClick={handleApplySync}
                  disabled={syncApplyMutation.isPending}
                  data-testid="button-sync-apply"
                >
                  {syncApplyMutation.isPending ? (
                    <Loader2 style={{ width: 16, height: 16, marginRight: 8, animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Check style={{ width: 16, height: 16, marginRight: 8 }} />
                  )}
                  {syncApplyMutation.isPending ? t("collection.syncApplying") : t("collection.syncApply")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </SimpleShell>
  );
}
