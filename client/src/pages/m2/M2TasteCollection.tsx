import { useState, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { collectionApi } from "@/lib/api";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { getSession } from "@/lib/session";
import {
  Upload, Search, ExternalLink, Trash2, NotebookPen, Wine, Archive,
  Loader2, Check, ArrowUpDown, Filter, BarChart3, Star, RefreshCw,
  Sparkles, DollarSign, X, Pencil,
} from "lucide-react";
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
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
  cursor: "pointer", border: "none", transition: "opacity 0.15s", whiteSpace: "nowrap",
};

export default function M2TasteCollection() {
  const { t } = useTranslation();
  const session = getSession();
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

  const pid = session.pid;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["collection", pid],
    queryFn: () => collectionApi.getAll(pid!),
    enabled: !!pid,
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => collectionApi.importFile(pid!, file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collection"] }); },
  });

  const syncMutation = useMutation({
    mutationFn: (file: File) => collectionApi.sync(pid!, file),
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
  });

  const syncApplyMutation = useMutation({
    mutationFn: (data: { addItems: any[]; removeItemIds: string[]; updateItems: { id: string; data: any }[] }) =>
      collectionApi.syncApply(pid!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setSyncDialogOpen(false);
      setSyncDiff(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => collectionApi.delete(pid!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setDeleteTarget(null);
    },
  });

  const toJournalMutation = useMutation({
    mutationFn: (id: string) => collectionApi.toJournal(pid!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journal"] }); },
  });

  const priceEstimateMutation = useMutation({
    mutationFn: (itemIds: string[]) => collectionApi.estimatePrice(pid!, itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setPriceSelectMode(false);
      setSelectedForPrice(new Set());
      setRateLimitDate(null);
    },
    onError: (error: any) => {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error === "rate_limited" && parsed.nextAvailable) {
          setRateLimitDate(new Date(parsed.nextAvailable).toLocaleDateString());
          return;
        }
      } catch {}
    },
  });

  const manualPriceMutation = useMutation({
    mutationFn: ({ itemId, price, currency }: { itemId: string; price: number; currency: string }) =>
      collectionApi.manualPrice(pid!, itemId, price, currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setEditingPriceId(null);
      setManualPriceValue("");
    },
  });

  const togglePriceSelect = (id: string) => {
    setSelectedForPrice(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { importMutation.mutate(file); e.target.value = ""; }
  };

  const handleSyncUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { syncMutation.mutate(file); e.target.value = ""; }
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
      if (action === "delete") removeItemIds.push(item.id);
      else if (action === "empty") updateItemsFromRemoved.push({ id: item.id, data: { status: "empty" } });
    });
    const updateItemsFromChanged: { id: string; data: any }[] = [];
    syncDiff.changedItems.forEach((item) => {
      const updates: any = {};
      let hasUpdate = false;
      item.changes.forEach((ch) => {
        const decision = changeDecisions[`${item.existingId}-${ch.field}`];
        if (decision === "new") { updates[ch.field] = ch.new; hasUpdate = true; }
      });
      if (hasUpdate) updateItemsFromChanged.push({ id: item.existingId, data: updates });
    });
    syncApplyMutation.mutate({ addItems, removeItemIds, updateItems: [...updateItemsFromRemoved, ...updateItemsFromChanged] });
  }, [syncDiff, newItemChecked, removeActions, changeDecisions, syncApplyMutation]);

  const filtered = useMemo(() => {
    let result = [...items] as WhiskybaseCollectionItem[];
    if (statusFilter !== "all") result = result.filter((item) => item.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        item.name?.toLowerCase().includes(q) || item.brand?.toLowerCase().includes(q) ||
        item.distillery?.toLowerCase().includes(q) || item.caskType?.toLowerCase().includes(q) ||
        item.bottlingSeries?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "rating": return (b.communityRating || 0) - (a.communityRating || 0);
        case "price": return (b.pricePaid || b.avgPrice || 0) - (a.pricePaid || a.avgPrice || 0);
        case "added": return (b.addedAt || "").localeCompare(a.addedAt || "");
        default: return (a.brand || "").localeCompare(b.brand || "") || (a.name || "").localeCompare(b.name || "");
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
    const topDistilleries = Object.entries(distilleryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { total: all.length, open, closed, empty, avgRating, totalValue, mainCurrency, topDistilleries };
  }, [items]);

  const statusColorStyle = (s: string | null): React.CSSProperties => {
    switch (s) {
      case "open": return { background: "rgba(74,157,110,0.1)", color: "#4a9d6e", border: "1px solid rgba(74,157,110,0.2)" };
      case "closed": return { background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" };
      case "empty": return { background: "rgba(113,113,122,0.1)", color: "#71717a", border: "1px solid rgba(113,113,122,0.2)" };
      default: return { background: "rgba(113,113,122,0.1)", color: "#71717a", border: "1px solid rgba(113,113,122,0.2)" };
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
    display: "inline-flex", alignItems: "center", padding: "2px 6px",
    borderRadius: 6, fontSize: 10, fontWeight: 500, whiteSpace: "nowrap",
  };

  const statCard: React.CSSProperties = {
    background: v.card, border: `1px solid ${v.border}`, borderRadius: 10, padding: 12, textAlign: "center" as const,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${v.inputBorder}`,
    background: v.inputBg, color: v.inputText, fontSize: 14, outline: "none",
  };

  const btnOutline: React.CSSProperties = {
    ...btnBase, background: "transparent", border: `1px solid ${v.border}`, color: v.text,
  };
  const btnPrimary: React.CSSProperties = {
    ...btnBase, background: v.accent, color: v.bg,
  };
  const btnGhost: React.CSSProperties = {
    ...btnBase, background: "transparent", color: v.muted,
  };
  const btnSmall: React.CSSProperties = { padding: "4px 8px", fontSize: 12, borderRadius: 6 };
  const btnDanger: React.CSSProperties = { ...btnGhost, color: v.danger };

  if (!session.signedIn) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-taste-collection">
        <M2BackButton />
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: "16px 0 12px" }}>
          {t("m2.taste.collection", "Collection")}
        </h1>
        <div style={{ background: v.elevated, borderRadius: 12, padding: "24px 16px", textAlign: "center", color: v.textSecondary, fontSize: 14 }}>
          {t("m2.taste.signInPrompt", "Sign in to access your taste profile")}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", paddingBottom: 80 }} data-testid="m2-taste-collection">
      <M2BackButton />

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: "0 0 4px" }} data-testid="text-collection-title">
            {t("collection.title", "Collection")}
          </h1>
          <p style={{ fontSize: 13, color: v.muted, margin: 0 }}>{t("collection.subtitle", "Your Whiskybase collection")}</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          {items.length > 0 && (
            <button style={btnOutline} onClick={() => setShowStats(!showStats)} data-testid="button-toggle-stats">
              <BarChart3 style={{ width: 16, height: 16 }} />
            </button>
          )}
          {items.length > 0 && !priceSelectMode && (
            <button style={btnOutline} onClick={() => { setPriceSelectMode(true); setSelectedForPrice(new Set()); }} data-testid="button-start-price-estimate">
              <Sparkles style={{ width: 16, height: 16 }} />
            </button>
          )}
          {items.length > 0 && (
            <button style={btnOutline} onClick={() => syncFileInputRef.current?.click()} disabled={syncMutation.isPending} data-testid="button-sync-collection">
              {syncMutation.isPending ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <RefreshCw style={{ width: 16, height: 16 }} />}
            </button>
          )}
          <button style={btnPrimary} onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending} data-testid="button-import-collection">
            {importMutation.isPending ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Upload style={{ width: 16, height: 16 }} />}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={handleFileUpload} data-testid="input-import-file" />
          <input ref={syncFileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={handleSyncUpload} data-testid="input-sync-file" />
        </div>
      </div>

      {priceSelectMode && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: `color-mix(in srgb, ${v.accent} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${v.accent} 30%, transparent)`, borderRadius: 10, padding: 12, marginTop: 12 }}>
          <Sparkles style={{ width: 20, height: 20, color: v.accent, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: v.text, margin: 0 }}>{t("collection.selectForEstimate", "Select bottles for price estimation")}</p>
            {selectedForPrice.size > 0 && <p style={{ fontSize: 12, color: v.muted, margin: "2px 0 0" }}>{selectedForPrice.size} selected</p>}
            {rateLimitDate && <p style={{ fontSize: 12, color: "#f59e0b", margin: "4px 0 0" }}>{t("collection.rateLimited", { date: rateLimitDate })}</p>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={{ ...btnGhost, ...btnSmall }} onClick={() => setSelectedForPrice(new Set(filtered.map((i: WhiskybaseCollectionItem) => i.id)))} data-testid="button-select-all-price">
              <Check style={{ width: 12, height: 12 }} /> {t("collection.filterAll", "All")}
            </button>
            <button
              style={{ ...btnPrimary, ...btnSmall, opacity: selectedForPrice.size === 0 || priceEstimateMutation.isPending ? 0.5 : 1 }}
              disabled={selectedForPrice.size === 0 || priceEstimateMutation.isPending}
              onClick={() => priceEstimateMutation.mutate(Array.from(selectedForPrice))}
              data-testid="button-run-price-estimate"
            >
              {priceEstimateMutation.isPending ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: 16, height: 16 }} />}
              {t("collection.estimatePrices", "Estimate")}
            </button>
            <button style={{ ...btnGhost, ...btnSmall }} onClick={() => { setPriceSelectMode(false); setSelectedForPrice(new Set()); }} data-testid="button-cancel-price-select">
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      )}

      {showStats && stats.total > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 12 }}>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: v.text }}>{stats.total}</div>
              <div style={{ fontSize: 11, color: v.muted }}>{t("collection.totalBottles", { count: stats.total })}</div>
            </div>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>{stats.open}</div>
              <div style={{ fontSize: 11, color: v.muted }}>{t("collection.openBottles", "Open")}</div>
            </div>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa" }}>{stats.closed}</div>
              <div style={{ fontSize: 11, color: v.muted }}>{t("collection.closedBottles", "Closed")}</div>
            </div>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#71717a" }}>{stats.empty}</div>
              <div style={{ fontSize: 11, color: v.muted }}>{t("collection.emptyBottles", "Empty")}</div>
            </div>
            <div style={statCard}>
              <div style={{ fontSize: 22, fontWeight: 700, color: v.text }}>{stats.avgRating || "—"}</div>
              <div style={{ fontSize: 11, color: v.muted }}>{t("collection.avgRating", "Avg Rating")}</div>
            </div>
          </div>
          {stats.totalValue > 0 && (
            <div style={{ ...statCard, textAlign: "left" as const, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: v.text }}>{t("collection.totalValue", "Total Value")}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: v.text }}>
                {stats.totalValue.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {stats.mainCurrency}
              </span>
            </div>
          )}
          {stats.topDistilleries.length > 0 && (
            <div style={{ ...statCard, textAlign: "left" as const, marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 500, color: v.text, marginBottom: 8, marginTop: 0 }}>{t("collection.topDistilleries", "Top Distilleries")}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {stats.topDistilleries.map(([name, count]) => (
                  <span key={name} style={{ ...badgeStyle, background: v.inputBg, color: v.muted, border: `1px solid ${v.border}` }}>
                    {name} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: v.muted }} />
            <input
              style={{ ...inputStyle, paddingLeft: 36 }}
              placeholder={t("collection.searchPlaceholder", "Search bottles...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-collection-search"
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Filter style={{ width: 12, height: 12, color: v.muted }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                style={{ ...inputStyle, width: 130, padding: "8px 12px", fontSize: 13 }}
                data-testid="select-status-filter"
              >
                <option value="all">{t("collection.filterAll", "All")}</option>
                <option value="open">{t("collection.filterOpen", "Open")}</option>
                <option value="closed">{t("collection.filterClosed", "Closed")}</option>
                <option value="empty">{t("collection.filterEmpty", "Empty")}</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ArrowUpDown style={{ width: 12, height: 12, color: v.muted }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                style={{ ...inputStyle, width: 140, padding: "8px 12px", fontSize: 13 }}
                data-testid="select-sort"
              >
                <option value="name">{t("collection.sortName", "Name")}</option>
                <option value="rating">{t("collection.sortRating", "Rating")}</option>
                <option value="price">{t("collection.sortPrice", "Price")}</option>
                <option value="added">{t("collection.sortAdded", "Added")}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <Loader2 style={{ width: 32, height: 32, color: v.muted, animation: "spin 1s linear infinite" }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ background: v.elevated, borderRadius: 14, padding: "32px 20px", textAlign: "center" }}>
            <Archive style={{ width: 40, height: 40, color: v.muted, marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 6px" }}>
              {t("emptyState.collectionTitle", "No bottles yet")}
            </h3>
            <p style={{ fontSize: 13, color: v.textSecondary, margin: "0 0 16px" }}>
              {t("emptyState.collectionDesc", "Import your Whiskybase collection or add bottles manually.")}
            </p>
            <button style={btnPrimary} onClick={() => fileInputRef.current?.click()} data-testid="button-import-empty">
              <Upload style={{ width: 16, height: 16 }} /> {t("emptyState.collectionCta", "Import CSV/Excel")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: v.muted }}>{t("collection.noResults", "No results")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: v.muted, margin: 0 }}>
              {filtered.length} / {items.length} {t("collection.totalBottles", { count: items.length }).split(" ").slice(1).join(" ")}
              {uniqueExpressions < items.length && (
                <span style={{ opacity: 0.6 }}> · {uniqueExpressions} expressions</span>
              )}
            </p>
            {filtered.map((item: WhiskybaseCollectionItem) => (
              <div key={item.id} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, cursor: "pointer" }}
                  onClick={() => {
                    if (priceSelectMode) togglePriceSelect(item.id);
                    else setExpandedId(expandedId === item.id ? null : item.id);
                  }}
                  data-testid={`card-collection-${item.id}`}
                >
                  {priceSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedForPrice.has(item.id)}
                      onChange={() => togglePriceSelect(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: 18, height: 18, accentColor: v.accent }}
                      data-testid={`checkbox-price-${item.id}`}
                    />
                  )}
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} style={{ width: 40, height: 56, objectFit: "contain", borderRadius: 4, flexShrink: 0 }} loading="lazy" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 500, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                      </span>
                      {duplicateCounts[item.whiskybaseId] > 1 && (
                        <span style={{ ...badgeStyle, background: `color-mix(in srgb, ${v.accent} 15%, transparent)`, color: v.accent, border: `1px solid color-mix(in srgb, ${v.accent} 30%, transparent)` }}>
                          ×{duplicateCounts[item.whiskybaseId]}
                        </span>
                      )}
                      {item.status && (
                        <span style={{ ...badgeStyle, ...statusColorStyle(item.status), borderRadius: 6 }}>
                          {statusLabel(item.status)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: v.muted, marginTop: 2 }}>
                      {item.distillery && <span>{item.distillery}</span>}
                      {item.statedAge && <span>{item.statedAge}y</span>}
                      {item.abv && <span>{item.abv}{item.unit || "%vol"}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    {item.communityRating && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: v.text }}>
                        <Star style={{ width: 12, height: 12, color: "#fbbf24", fill: "#fbbf24" }} />
                        {item.communityRating.toFixed(1)}
                      </div>
                    )}
                    {item.estimatedPrice != null && (
                      <div style={{ textAlign: "right" }} data-testid={`text-estimated-price-${item.id}`}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: v.text }}>{item.estimatedPrice.toFixed(0)} {item.estimatedPriceCurrency || "EUR"}</div>
                        <span style={{ ...badgeStyle, background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                          <Sparkles style={{ width: 10, height: 10, marginRight: 2 }} />
                          {item.estimatedPriceSource === "manual" ? t("collection.manualOverride", "Manual") : t("collection.aiEstimated", "AI")}
                        </span>
                      </div>
                    )}
                    {(item.avgPrice || item.pricePaid) && (
                      <div style={{ textAlign: "right", fontSize: 12, color: v.muted }}>
                        {item.avgPrice ? `~${item.avgPrice.toFixed(0)}` : item.pricePaid?.toFixed(0)} {item.avgPriceCurrency || item.currency || "€"}
                      </div>
                    )}
                  </div>
                </div>

                {expandedId === item.id && (
                  <div style={{ borderTop: `1px solid ${v.border}`, padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, fontSize: 12 }}>
                      {item.bottlingSeries && (
                        <div><span style={{ color: v.muted }}>{t("collection.series", "Series")}:</span> <span style={{ fontWeight: 500, color: v.text }}>{item.bottlingSeries}</span></div>
                      )}
                      {item.caskType && (
                        <div><span style={{ color: v.muted }}>{t("collection.caskType", "Cask")}:</span> <span style={{ fontWeight: 500, color: v.text }}>{item.caskType}</span></div>
                      )}
                      {item.vintage && (
                        <div><span style={{ color: v.muted }}>{t("collection.vintage", "Vintage")}:</span> <span style={{ fontWeight: 500, color: v.text }}>{item.vintage}</span></div>
                      )}
                      {item.size && (
                        <div><span style={{ color: v.muted }}>{t("collection.size", "Size")}:</span> <span style={{ fontWeight: 500, color: v.text }}>{item.size}ml</span></div>
                      )}
                      {item.pricePaid != null && (
                        <div><span style={{ color: v.muted }}>{t("collection.pricePaid", "Price paid")}:</span> <span style={{ fontWeight: 500, color: v.text }}>{item.pricePaid.toFixed(2)} {item.currency}</span></div>
                      )}
                      {item.auctionPrice != null && (
                        <div><span style={{ color: v.muted }}>{t("collection.auctionPrice", "Auction")}:</span> <span style={{ fontWeight: 500, color: v.text }}>{item.auctionPrice.toFixed(2)} {item.auctionCurrency || item.avgPriceCurrency || "EUR"}</span></div>
                      )}
                      {item.personalRating != null && (
                        <div><span style={{ color: v.muted }}>{t("collection.personalRating", "My Rating")}:</span> <span style={{ fontWeight: 500, color: v.text }}>{item.personalRating}</span></div>
                      )}
                      {item.addedAt && (
                        <div><span style={{ color: v.muted }}>{t("collection.sortAdded", "Added")}:</span> <span style={{ fontWeight: 500, color: v.text }}>{item.addedAt.split(" ")[0]}</span></div>
                      )}
                      {item.purchaseLocation && (
                        <div><span style={{ color: v.muted }}>{t("collection.purchaseLocation", "Location")}:</span> <span style={{ fontWeight: 500, color: v.text }}>{item.purchaseLocation}</span></div>
                      )}
                      {item.estimatedPrice != null && (
                        <div>
                          <span style={{ color: v.muted }}>{t("collection.estimatePrice", "Est. Price")}:</span>{" "}
                          <span style={{ fontWeight: 500, color: v.text }}>{item.estimatedPrice.toFixed(2)} {item.estimatedPriceCurrency || "EUR"}</span>{" "}
                          <span style={{ ...badgeStyle, background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)", marginLeft: 4 }} data-testid={`badge-ai-estimated-${item.id}`}>
                            <Sparkles style={{ width: 10, height: 10, marginRight: 2 }} />
                            {item.estimatedPriceSource === "manual" ? t("collection.manualOverride", "Manual") : t("collection.aiEstimated", "AI")}
                          </span>
                          {item.estimatedPriceDate && (
                            <span style={{ fontSize: 10, color: v.muted, marginLeft: 4 }}>
                              {t("collection.priceEstimateDate", { date: new Date(item.estimatedPriceDate).toLocaleDateString() })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {editingPriceId === item.id && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <DollarSign style={{ width: 12, height: 12, color: v.muted }} />
                        <input
                          type="number" min="0" step="1"
                          style={{ ...inputStyle, width: 96, height: 28, padding: "4px 8px", fontSize: 12 }}
                          placeholder="0" value={manualPriceValue}
                          onChange={(e) => setManualPriceValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`input-manual-price-${item.id}`}
                        />
                        <span style={{ color: v.muted }}>EUR</span>
                        <button
                          style={{ ...btnOutline, ...btnSmall, height: 28, opacity: !manualPriceValue || manualPriceMutation.isPending ? 0.5 : 1 }}
                          disabled={!manualPriceValue || manualPriceMutation.isPending}
                          onClick={(e) => { e.stopPropagation(); manualPriceMutation.mutate({ itemId: item.id, price: parseFloat(manualPriceValue), currency: "EUR" }); }}
                          data-testid={`button-save-manual-price-${item.id}`}
                        >
                          {manualPriceMutation.isPending ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 12, height: 12 }} />}
                        </button>
                        <button style={{ ...btnGhost, ...btnSmall, height: 28 }} onClick={(e) => { e.stopPropagation(); setEditingPriceId(null); setManualPriceValue(""); }}>
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    )}

                    {item.notes && (
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: v.muted }}>{t("collection.notes", "Notes")}:</span> <span style={{ color: v.text }}>{item.notes}</span>
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                      <a
                        href={`https://www.whiskybase.com/whiskies/whisky/${item.whiskybaseId}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: v.accent, textDecoration: "none" }}
                        data-testid={`link-whiskybase-${item.id}`}
                      >
                        <ExternalLink style={{ width: 12, height: 12 }} /> {t("collection.viewOnWhiskybase", "Whiskybase")}
                      </a>
                      <button
                        style={{ ...btnOutline, ...btnSmall, height: 28 }}
                        onClick={(e) => { e.stopPropagation(); toJournalMutation.mutate(item.id); }}
                        disabled={toJournalMutation.isPending}
                        data-testid={`button-to-journal-${item.id}`}
                      >
                        {toJournalMutation.isPending ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <NotebookPen style={{ width: 12, height: 12 }} />}
                        {t("collection.toJournal", "Tasted it")}
                      </button>
                      <button
                        style={{ ...btnOutline, ...btnSmall, height: 28 }}
                        onClick={(e) => { e.stopPropagation(); priceEstimateMutation.mutate([item.id]); }}
                        disabled={priceEstimateMutation.isPending}
                        data-testid={`button-estimate-price-${item.id}`}
                      >
                        {priceEstimateMutation.isPending ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: 12, height: 12 }} />}
                        {t("collection.estimatePrice", "Estimate")}
                      </button>
                      <button
                        style={{ ...btnOutline, ...btnSmall, height: 28 }}
                        onClick={(e) => { e.stopPropagation(); setEditingPriceId(editingPriceId === item.id ? null : item.id); setManualPriceValue(item.estimatedPrice?.toString() || ""); }}
                        data-testid={`button-manual-price-${item.id}`}
                      >
                        <Pencil style={{ width: 12, height: 12 }} /> {t("collection.manualPriceHint", "Manual")}
                      </button>
                      <button
                        style={{ ...btnDanger, ...btnSmall, height: 28 }}
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} /> {t("collection.deleteItem", "Delete")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: 24, maxWidth: 400, width: "100%" }} data-testid="dialog-delete-confirm">
            <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 8px" }}>{t("collection.deleteConfirm", "Delete bottle?")}</h3>
            <p style={{ fontSize: 13, color: v.muted, margin: "0 0 16px" }}>
              {deleteTarget.brand && deleteTarget.brand !== deleteTarget.name ? `${deleteTarget.brand} ` : ""}{deleteTarget.name}
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btnOutline} onClick={() => setDeleteTarget(null)} data-testid="button-cancel-delete">
                {t("common.cancel", "Cancel")}
              </button>
              <button
                style={{ ...btnBase, background: v.danger, color: "#fff", opacity: deleteMutation.isPending ? 0.5 : 1 }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Trash2 style={{ width: 14, height: 14 }} />}
                {t("collection.deleteItem", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {syncDialogOpen && syncDiff && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: 24, maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto" }} data-testid="dialog-sync">
            <h3 style={{ fontSize: 18, fontWeight: 600, color: v.text, margin: "0 0 4px" }}>{t("collection.syncDialogTitle", "Sync Preview")}</h3>
            <p style={{ fontSize: 12, color: v.muted, margin: "0 0 16px" }}>
              {syncDiff.totalUploaded} uploaded · {syncDiff.totalExisting} existing · {syncDiff.unchangedCount} unchanged
            </p>

            {syncDiff.newItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: v.success, margin: "0 0 8px" }}>
                  {t("collection.syncSectionNew", "New")} ({syncDiff.newItems.length})
                </h4>
                {syncDiff.newItems.map((item: any, i: number) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 13, color: v.text, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!newItemChecked[i]} onChange={() => setNewItemChecked(prev => ({ ...prev, [i]: !prev[i] }))} style={{ accentColor: v.accent }} />
                    {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                  </label>
                ))}
              </div>
            )}

            {syncDiff.removedItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: v.danger, margin: "0 0 8px" }}>
                  {t("collection.syncSectionRemoved", "Removed")} ({syncDiff.removedItems.length})
                </h4>
                {syncDiff.removedItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: v.text }}>
                    <span>{item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}</span>
                    <select
                      value={removeActions[i] || "keep"}
                      onChange={(e) => setRemoveActions(prev => ({ ...prev, [i]: e.target.value as RemoveAction }))}
                      style={{ ...inputStyle, width: 110, padding: "4px 8px", fontSize: 12 }}
                    >
                      <option value="keep">{t("collection.syncKeep", "Keep")}</option>
                      <option value="delete">{t("collection.syncDelete", "Delete")}</option>
                      <option value="empty">{t("collection.syncEmpty", "Mark empty")}</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            {syncDiff.changedItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: v.accent, margin: "0 0 8px" }}>
                  {t("collection.syncSectionChanged", "Changed")} ({syncDiff.changedItems.length})
                </h4>
                {syncDiff.changedItems.map((item) => (
                  <div key={item.existingId} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: v.text, marginBottom: 4 }}>
                      {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                    </div>
                    {item.changes.map((ch) => {
                      const key = `${item.existingId}-${ch.field}`;
                      return (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
                          <span style={{ color: v.muted, minWidth: 80 }}>{fieldLabel(ch.field)}</span>
                          <span style={{ color: v.danger, textDecoration: "line-through" }}>{String(ch.old ?? "—")}</span>
                          <span style={{ color: v.muted }}>→</span>
                          <span style={{ color: v.success }}>{String(ch.new ?? "—")}</span>
                          <select
                            value={changeDecisions[key] || "new"}
                            onChange={(e) => setChangeDecisions(prev => ({ ...prev, [key]: e.target.value as "new" | "old" }))}
                            style={{ ...inputStyle, width: 80, padding: "2px 6px", fontSize: 11 }}
                          >
                            <option value="new">{t("collection.syncUseNew", "New")}</option>
                            <option value="old">{t("collection.syncUseOld", "Old")}</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: `1px solid ${v.border}` }}>
              <button style={btnOutline} onClick={() => { setSyncDialogOpen(false); setSyncDiff(null); }} data-testid="button-cancel-sync">
                {t("common.cancel", "Cancel")}
              </button>
              <button
                style={{ ...btnPrimary, opacity: syncApplyMutation.isPending ? 0.5 : 1 }}
                disabled={syncApplyMutation.isPending}
                onClick={handleApplySync}
                data-testid="button-apply-sync"
              >
                {syncApplyMutation.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 14, height: 14 }} />}
                {t("collection.syncApply", "Apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
