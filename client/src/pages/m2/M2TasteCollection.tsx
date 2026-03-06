import { useState, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { collectionApi } from "@/lib/api";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { M2Loading, M2Error } from "@/components/m2/M2Feedback";
import { getSession } from "@/lib/session";
import {
  Upload, Search, ExternalLink, Trash2, NotebookPen, Archive,
  Loader2, Check, ArrowUpDown, Filter, BarChart3, Star, RefreshCw,
  Sparkles, DollarSign, X, Pencil, CheckSquare, FileSpreadsheet,
  FileText, Download, ChevronDown, ChevronUp,
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

const serif = "'Playfair Display', Georgia, serif";

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

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [syncDiff, setSyncDiff] = useState<SyncDiff | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [newItemChecked, setNewItemChecked] = useState<Record<number, boolean>>({});
  const [removeActions, setRemoveActions] = useState<Record<number, RemoveAction>>({});
  const [changeDecisions, setChangeDecisions] = useState<Record<string, "new" | "old">>({});
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const pid = session.pid;

  const { data: items = [], isLoading, isError, refetch } = useQuery({
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await collectionApi.delete(pid!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setSelectedIds(new Set());
      setSelectMode(false);
      setBulkDeleteConfirm(false);
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i: WhiskybaseCollectionItem) => i.id)));
    }
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

  const downloadCsv = (itemsToExport: WhiskybaseCollectionItem[]) => {
    const headers = [t("m2.taste.exportHeaderName", "Name"), t("m2.taste.exportHeaderBrand", "Brand"), t("m2.taste.exportHeaderDistillery", "Distillery"), t("m2.taste.exportHeaderAge", "Age"), t("m2.taste.exportHeaderAbv", "ABV"), t("m2.taste.exportHeaderStatus", "Status"), t("m2.taste.exportHeaderSeries", "Series"), t("m2.taste.exportHeaderCask", "Cask"), t("m2.taste.exportHeaderSize", "Size"), t("m2.taste.exportHeaderRating", "Rating"), t("m2.taste.exportHeaderPricePaid", "Price Paid"), t("m2.taste.exportHeaderCurrency", "Currency"), t("m2.taste.exportHeaderEstPrice", "Estimated Price"), t("m2.taste.exportHeaderAdded", "Added")];
    const rows = itemsToExport.map(i => [
      i.name, i.brand || "", i.distillery || "", i.statedAge || "", i.abv || "",
      i.status || "", i.bottlingSeries || "", i.caskType || "", i.size || "",
      i.communityRating?.toFixed(1) || "", i.pricePaid?.toFixed(2) || "", i.currency || "",
      i.estimatedPrice?.toFixed(2) || "", i.addedAt || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `whisky-sammlung-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadExcel = async (itemsToExport: WhiskybaseCollectionItem[]) => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(t("m2.taste.collectionTitle", "Whisky Collection"));
    ws.columns = [
      { header: t("m2.taste.exportHeaderName", "Name"), key: "name", width: 35 },
      { header: t("m2.taste.exportHeaderBrand", "Brand"), key: "brand", width: 20 },
      { header: t("m2.taste.exportHeaderDistillery", "Distillery"), key: "distillery", width: 20 },
      { header: t("m2.taste.exportHeaderAge", "Age"), key: "age", width: 8 },
      { header: t("m2.taste.exportHeaderAbv", "ABV"), key: "abv", width: 10 },
      { header: t("m2.taste.exportHeaderStatus", "Status"), key: "status", width: 12 },
      { header: t("m2.taste.exportHeaderSeries", "Series"), key: "series", width: 20 },
      { header: t("m2.taste.exportHeaderCask", "Cask"), key: "cask", width: 20 },
      { header: t("m2.taste.exportHeaderRating", "Rating"), key: "rating", width: 10 },
      { header: t("m2.taste.exportHeaderPricePaid", "Price Paid"), key: "pricePaid", width: 12 },
      { header: t("m2.taste.exportHeaderEstPrice", "Estimated Price"), key: "estPrice", width: 12 },
      { header: t("m2.taste.exportHeaderCurrency", "Currency"), key: "currency", width: 10 },
      { header: t("m2.taste.exportHeaderAdded", "Added"), key: "added", width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    itemsToExport.forEach(i => {
      ws.addRow({
        name: i.name, brand: i.brand || "", distillery: i.distillery || "",
        age: i.statedAge || "", abv: i.abv || "", status: i.status || "",
        series: i.bottlingSeries || "", cask: i.caskType || "",
        rating: i.communityRating || "", pricePaid: i.pricePaid || "",
        estPrice: i.estimatedPrice || "", currency: i.currency || "",
        added: i.addedAt?.split(" ")[0] || "",
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `whisky-sammlung-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadPdf = async (itemsToExport: WhiskybaseCollectionItem[]) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text(t("m2.taste.collectionTitle", "Whisky Collection"), 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(t("m2.taste.exportSubtitle", "{{count}} bottles · Exported on {{date}}", { count: itemsToExport.length, date: new Date().toLocaleDateString() }), 14, 28);
    doc.setTextColor(0);
    const headers = [t("m2.taste.exportHeaderName", "Name"), t("m2.taste.exportHeaderDistillery", "Distillery"), t("m2.taste.exportHeaderAge", "Age"), t("m2.taste.exportHeaderAbv", "ABV"), t("m2.taste.exportHeaderStatus", "Status"), t("m2.taste.exportHeaderRating", "Rating"), t("m2.taste.exportHeaderPrice", "Price")];
    const colWidths = [80, 45, 15, 18, 20, 18, 25];
    let y = 38;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let x = 14;
    headers.forEach((h, idx) => { doc.text(h, x, y); x += colWidths[idx]; });
    doc.setFont("helvetica", "normal");
    y += 6;
    doc.setDrawColor(200);
    doc.line(14, y - 3, 280, y - 3);
    itemsToExport.forEach(i => {
      if (y > 190) { doc.addPage(); y = 20; }
      x = 14;
      const name = `${i.brand && i.brand !== i.name ? i.brand + " " : ""}${i.name}`;
      doc.text(name.substring(0, 45), x, y); x += colWidths[0];
      doc.text((i.distillery || "").substring(0, 25), x, y); x += colWidths[1];
      doc.text(i.statedAge || "", x, y); x += colWidths[2];
      doc.text(i.abv || "", x, y); x += colWidths[3];
      doc.text(i.status || "", x, y); x += colWidths[4];
      doc.text(i.communityRating?.toFixed(1) || "", x, y); x += colWidths[5];
      doc.text(i.estimatedPrice ? `${i.estimatedPrice.toFixed(0)} EUR` : (i.pricePaid ? `${i.pricePaid.toFixed(0)} ${i.currency || "EUR"}` : ""), x, y);
      y += 5;
    });
    doc.save(`whisky-sammlung-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const getExportItems = (): WhiskybaseCollectionItem[] => {
    if (selectMode && selectedIds.size > 0) {
      return filtered.filter((i: WhiskybaseCollectionItem) => selectedIds.has(i.id));
    }
    return filtered;
  };

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

  const statusColor = (s: string | null) => {
    switch (s) {
      case "open": return "#4ade80";
      case "closed": return "#60a5fa";
      case "empty": return "#71717a";
      default: return "#71717a";
    }
  };

  const statusLabel = (s: string | null) => {
    switch (s) {
      case "open": return t("collection.filterOpen", "Offen");
      case "closed": return t("collection.filterClosed", "Verschlossen");
      case "empty": return t("collection.filterEmpty", "Leer");
      default: return s || "";
    }
  };

  if (!session.signedIn) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-taste-collection">
        <M2BackButton />
        <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: v.text, margin: "16px 0 12px" }}>
          {t("m2.taste.collection", "Collection")}
        </h1>
        <div style={{ background: v.elevated, borderRadius: 16, padding: "32px 20px", textAlign: "center", color: v.textSecondary, fontSize: 15 }}>
          {t("m2.taste.signInPrompt", "Sign in to access your taste profile")}
        </div>
      </div>
    );
  }

  const actionBtn = (icon: React.ReactNode, label: string, onClick: () => void, opts?: { primary?: boolean; active?: boolean; disabled?: boolean; testId?: string }) => (
    <button
      onClick={onClick}
      disabled={opts?.disabled}
      data-testid={opts?.testId}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "10px 14px", borderRadius: 12, border: "none", cursor: opts?.disabled ? "default" : "pointer",
        background: opts?.primary ? v.accent : opts?.active ? `color-mix(in srgb, ${v.accent} 15%, transparent)` : v.card,
        color: opts?.primary ? v.bg : opts?.active ? v.accent : v.text,
        opacity: opts?.disabled ? 0.4 : 1,
        fontSize: 11, fontWeight: 500, minWidth: 64, transition: "all 0.15s",
        boxShadow: `0 1px 3px rgba(0,0,0,0.12)`,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div style={{ padding: "16px", paddingBottom: selectMode ? 140 : 80 }} data-testid="m2-taste-collection">
      <M2BackButton />
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={handleFileUpload} data-testid="input-import-file" />
      <input ref={syncFileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={handleSyncUpload} data-testid="input-sync-file" />

      <div style={{ marginTop: 8, marginBottom: 20 }}>
        <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: v.text, margin: "0 0 4px", letterSpacing: -0.5 }} data-testid="text-collection-title">
          {t("collection.title", "Whisky-Sammlung")}
        </h1>
        {items.length > 0 && (
          <p style={{ fontSize: 14, color: v.muted, margin: 0 }}>
            {items.length} {t("collection.totalBottles", { count: items.length }).includes(" ") ? t("collection.totalBottles", { count: items.length }).split(" ").slice(1).join(" ") : "Flaschen"}
            {uniqueExpressions < items.length && <span> · {uniqueExpressions} {t("m2.taste.expressions", "Expressions")}</span>}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
          {actionBtn(<BarChart3 style={{ width: 18, height: 18 }} />, t("collection.statsLabel", "Statistik"), () => setShowStats(!showStats), { active: showStats, testId: "button-toggle-stats" })}
          {!priceSelectMode && actionBtn(<Sparkles style={{ width: 18, height: 18 }} />, t("collection.priceLabel", "KI-Preise"), () => { setPriceSelectMode(true); setSelectedForPrice(new Set()); setSelectMode(false); setSelectedIds(new Set()); }, { testId: "button-start-price-estimate" })}
          {actionBtn(
            syncMutation.isPending ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : <RefreshCw style={{ width: 18, height: 18 }} />,
            t("collection.syncLabel", "Sync"), () => syncFileInputRef.current?.click(), { disabled: syncMutation.isPending, testId: "button-sync-collection" }
          )}
          {actionBtn(
            importMutation.isPending ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : <Upload style={{ width: 18, height: 18 }} />,
            t("collection.importLabel", "Import"), () => fileInputRef.current?.click(), { primary: true, disabled: importMutation.isPending, testId: "button-import-collection" }
          )}
          {actionBtn(
            <CheckSquare style={{ width: 18, height: 18 }} />,
            selectMode ? t("common.cancel", "Abbrechen") : t("collection.selectLabel", "Auswahl"),
            () => { const next = !selectMode; setSelectMode(next); setSelectedIds(new Set()); if (next) { setPriceSelectMode(false); setSelectedForPrice(new Set()); } },
            { active: selectMode, testId: "button-toggle-select" }
          )}
        </div>
      )}

      {priceSelectMode && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: `color-mix(in srgb, ${v.accent} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${v.accent} 20%, transparent)`,
          borderRadius: 14, padding: "14px 16px", marginBottom: 16,
        }}>
          <Sparkles style={{ width: 20, height: 20, color: v.accent, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: v.text, margin: 0 }}>{t("collection.selectForEstimate", "Flaschen fuer Preisschaetzung auswaehlen")}</p>
            {selectedForPrice.size > 0 && <p style={{ fontSize: 13, color: v.muted, margin: "2px 0 0" }}>{selectedForPrice.size} {t("collection.selected", "ausgewaehlt")}</p>}
            {rateLimitDate && <p style={{ fontSize: 13, color: "#f59e0b", margin: "4px 0 0" }}>{t("collection.rateLimited", { date: rateLimitDate })}</p>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "8px 12px", borderRadius: 8, border: `1px solid ${v.border}`,
                background: "transparent", color: v.text, fontSize: 13, cursor: "pointer",
              }}
              onClick={() => setSelectedForPrice(new Set(filtered.map((i: WhiskybaseCollectionItem) => i.id)))}
              data-testid="button-select-all-price"
            >
              <Check style={{ width: 14, height: 14 }} /> {t("collection.filterAll", "Alle")}
            </button>
            <button
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "8px 14px", borderRadius: 8, border: "none",
                background: v.accent, color: v.bg, fontSize: 13, fontWeight: 600, cursor: "pointer",
                opacity: selectedForPrice.size === 0 || priceEstimateMutation.isPending ? 0.4 : 1,
              }}
              disabled={selectedForPrice.size === 0 || priceEstimateMutation.isPending}
              onClick={() => priceEstimateMutation.mutate(Array.from(selectedForPrice))}
              data-testid="button-run-price-estimate"
            >
              {priceEstimateMutation.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: 14, height: 14 }} />}
              {t("collection.estimatePrices", "Schaetzen")}
            </button>
            <button
              style={{ display: "flex", alignItems: "center", padding: 6, borderRadius: 8, border: "none", background: "transparent", color: v.muted, cursor: "pointer" }}
              onClick={() => { setPriceSelectMode(false); setSelectedForPrice(new Set()); }}
              data-testid="button-cancel-price-select"
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>
      )}

      {showStats && stats.total > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 10 }}>
            {[
              { val: stats.total, label: t("collection.totalBottles", { count: stats.total }).split(" ").pop() || "Flaschen", color: v.text },
              { val: stats.open, label: t("collection.openBottles", "Offen"), color: "#4ade80" },
              { val: stats.closed, label: t("collection.closedBottles", "Verschlossen"), color: "#60a5fa" },
              { val: stats.empty, label: t("collection.emptyBottles", "Leer"), color: "#71717a" },
              { val: stats.avgRating || "—", label: t("collection.avgRating", "Bewertung"), color: v.text },
            ].map((s, i) => (
              <div key={i} style={{ background: v.card, borderRadius: 12, padding: "14px 8px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.val}</div>
                <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {stats.totalValue > 0 && (
            <div style={{ background: v.card, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: v.muted }}>{t("collection.totalValue", "Gesch. Wert")}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: v.text, fontVariantNumeric: "tabular-nums" }}>
                {stats.totalValue.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {stats.mainCurrency}
              </span>
            </div>
          )}
          {stats.topDistilleries.length > 0 && (
            <div style={{ background: v.card, borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: v.text, marginBottom: 10 }}>{t("collection.topDistilleries", "Top-Destillerien")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {stats.topDistilleries.map(([name, count]) => (
                  <span key={name} style={{
                    display: "inline-flex", alignItems: "center", padding: "4px 10px",
                    borderRadius: 8, fontSize: 12, fontWeight: 500,
                    background: v.inputBg, color: v.muted, border: `1px solid ${v.border}`,
                  }}>
                    {name} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: v.muted }} />
            <input
              style={{
                width: "100%", padding: "12px 16px 12px 40px", borderRadius: 12,
                border: `1px solid ${v.border}`, background: v.card, color: v.inputText,
                fontSize: 15, outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
              placeholder={t("collection.searchPlaceholder", "Flaschen suchen...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-collection-search"
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: v.card, borderRadius: 10, padding: "0 10px", border: `1px solid ${v.border}` }}>
              <Filter style={{ width: 13, height: 13, color: v.muted }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                style={{ background: "transparent", border: "none", color: v.text, fontSize: 14, padding: "10px 4px", outline: "none", cursor: "pointer" }}
                data-testid="select-status-filter"
              >
                <option value="all">{t("collection.filterAll", "Alle")}</option>
                <option value="open">{t("collection.filterOpen", "Offen")}</option>
                <option value="closed">{t("collection.filterClosed", "Verschlossen")}</option>
                <option value="empty">{t("collection.filterEmpty", "Leer")}</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: v.card, borderRadius: 10, padding: "0 10px", border: `1px solid ${v.border}` }}>
              <ArrowUpDown style={{ width: 13, height: 13, color: v.muted }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                style={{ background: "transparent", border: "none", color: v.text, fontSize: 14, padding: "10px 4px", outline: "none", cursor: "pointer" }}
                data-testid="select-sort"
              >
                <option value="name">{t("collection.sortName", "Name")}</option>
                <option value="rating">{t("collection.sortRating", "Rating")}</option>
                <option value="price">{t("collection.sortPrice", "Preis")}</option>
                <option value="added">{t("collection.sortAdded", "Hinzugefuegt")}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div>
        {isError ? (
          <M2Error onRetry={refetch} />
        ) : isLoading ? (
          <M2Loading />
        ) : items.length === 0 ? (
          <div style={{ background: v.card, borderRadius: 16, padding: "48px 24px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Archive style={{ width: 48, height: 48, color: v.muted, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: v.text, margin: "0 0 8px" }}>
              {t("emptyState.collectionTitle", "Noch keine Flaschen")}
            </h3>
            <p style={{ fontSize: 14, color: v.textSecondary, margin: "0 0 20px", lineHeight: 1.5 }}>
              {t("emptyState.collectionDesc", "Importiere deine Sammlung per CSV oder Excel.")}
            </p>
            <button
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 12, border: "none",
                background: v.accent, color: v.bg, fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-import-empty"
            >
              <Upload style={{ width: 18, height: 18 }} /> {t("emptyState.collectionCta", "CSV/Excel importieren")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: v.muted, fontSize: 15 }}>{t("collection.noResults", "Keine Ergebnisse")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {selectMode && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                <button
                  onClick={toggleSelectAll}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1px solid ${v.border}`, background: "transparent", color: v.text, fontSize: 13, cursor: "pointer" }}
                  data-testid="button-select-all"
                >
                  <CheckSquare style={{ width: 14, height: 14 }} />
                  {selectedIds.size === filtered.length ? t("collection.deselectAll", "Keine") : t("collection.selectAll", "Alle")}
                </button>
                <span style={{ fontSize: 13, color: v.muted }}>{selectedIds.size} {t("collection.selected", "ausgewaehlt")}</span>
              </div>
            )}

            {filtered.map((item: WhiskybaseCollectionItem) => {
              const isExpanded = expandedId === item.id;
              const isSelected = selectedIds.has(item.id);
              const fullName = `${item.brand && item.brand !== item.name ? item.brand + " " : ""}${item.name}`;

              return (
                <div
                  key={item.id}
                  style={{
                    background: v.card,
                    border: `1px solid ${isSelected ? v.accent : v.border}`,
                    borderRadius: 14,
                    overflow: "hidden",
                    boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.06)",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
                    onClick={() => {
                      if (selectMode) toggleSelect(item.id);
                      else if (priceSelectMode) togglePriceSelect(item.id);
                      else setExpandedId(isExpanded ? null : item.id);
                    }}
                    data-testid={`card-collection-${item.id}`}
                  >
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${fullName}`}
                        style={{ width: 20, height: 20, accentColor: v.accent, flexShrink: 0, cursor: "pointer" }}
                        data-testid={`checkbox-select-${item.id}`}
                      />
                    )}
                    {priceSelectMode && (
                      <input
                        type="checkbox"
                        checked={selectedForPrice.has(item.id)}
                        onChange={() => togglePriceSelect(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Price estimate ${fullName}`}
                        style={{ width: 20, height: 20, accentColor: v.accent, flexShrink: 0, cursor: "pointer" }}
                        data-testid={`checkbox-price-${item.id}`}
                      />
                    )}
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} style={{ width: 36, height: 52, objectFit: "contain", borderRadius: 6, flexShrink: 0 }} loading="lazy" />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: v.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {fullName}
                        </span>
                        {duplicateCounts[item.whiskybaseId] > 1 && (
                          <span style={{
                            padding: "2px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                            background: `color-mix(in srgb, ${v.accent} 12%, transparent)`, color: v.accent,
                          }}>
                            x{duplicateCounts[item.whiskybaseId]}
                          </span>
                        )}
                        {item.status && (
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                            background: `color-mix(in srgb, ${statusColor(item.status)} 12%, transparent)`,
                            color: statusColor(item.status),
                          }}>
                            {statusLabel(item.status)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: v.muted, marginTop: 3 }}>
                        {item.distillery && <span>{item.distillery}</span>}
                        {item.statedAge && <span>{item.statedAge}y</span>}
                        {item.abv && <span>{item.abv}{item.unit || "%vol"}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      {item.communityRating && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, color: v.text }}>
                          <Star style={{ width: 13, height: 13, color: "#fbbf24", fill: "#fbbf24" }} />
                          {item.communityRating.toFixed(1)}
                        </div>
                      )}
                      {item.estimatedPrice != null && (
                        <div style={{ textAlign: "right" }} data-testid={`text-estimated-price-${item.id}`}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: v.text }}>{item.estimatedPrice.toFixed(0)} {item.estimatedPriceCurrency || "EUR"}</div>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 2,
                            padding: "1px 5px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                            background: "rgba(139,92,246,0.1)", color: "#a78bfa",
                          }}>
                            <Sparkles style={{ width: 9, height: 9 }} />
                            {item.estimatedPriceSource === "manual" ? t("collection.manualOverride", "Manuell") : t("collection.aiEstimated", "KI-geschaetzt")}
                          </span>
                        </div>
                      )}
                      {(item.avgPrice || item.pricePaid) && !item.estimatedPrice && (
                        <div style={{ textAlign: "right", fontSize: 13, color: v.muted }}>
                          {item.avgPrice ? `~${item.avgPrice.toFixed(0)}` : item.pricePaid?.toFixed(0)} {item.avgPriceCurrency || item.currency || "EUR"}
                        </div>
                      )}
                      {!selectMode && !priceSelectMode && (
                        <div style={{ color: v.muted }}>
                          {isExpanded ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${v.border}`, padding: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 16 }}>
                        {[
                          item.bottlingSeries && { label: t("collection.series", "Serie"), value: item.bottlingSeries },
                          item.caskType && { label: t("collection.caskType", "Fasstyp"), value: item.caskType },
                          item.vintage && { label: t("collection.vintage", "Jahrgang"), value: item.vintage },
                          item.size && { label: t("collection.size", "Groesse"), value: `${item.size}ml` },
                          item.pricePaid != null && { label: t("collection.pricePaid", "Kaufpreis"), value: `${item.pricePaid.toFixed(2)} ${item.currency}` },
                          item.auctionPrice != null && { label: t("collection.auctionPrice", "Auktionspreis"), value: `${item.auctionPrice.toFixed(2)} ${item.auctionCurrency || item.avgPriceCurrency || "EUR"}` },
                          item.personalRating != null && { label: t("collection.personalRating", "Bewertung"), value: String(item.personalRating) },
                          item.addedAt && { label: t("collection.sortAdded", "Hinzugefuegt"), value: item.addedAt.split(" ")[0] },
                          item.purchaseLocation && { label: t("collection.purchaseLocation", "Kaufort"), value: item.purchaseLocation },
                          item.estimatedPrice != null && {
                            label: t("collection.estimatePrice", "Schaetzpreis"),
                            value: `${item.estimatedPrice.toFixed(2)} ${item.estimatedPriceCurrency || "EUR"}`,
                            badge: item.estimatedPriceSource === "manual" ? t("collection.manualOverride", "Manuell") : t("collection.aiEstimated", "KI"),
                            badgeDate: item.estimatedPriceDate ? new Date(item.estimatedPriceDate).toLocaleDateString("de-DE") : null,
                          },
                        ].filter(Boolean).map((field: any, idx) => (
                          <div key={idx}>
                            <div style={{ fontSize: 12, color: v.muted, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>
                              {field.label}
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 500, color: v.text, display: "flex", alignItems: "center", gap: 6 }}>
                              {field.value}
                              {field.badge && (
                                <span style={{
                                  padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                                  background: "rgba(139,92,246,0.1)", color: "#a78bfa",
                                }}>
                                  {field.badge}
                                </span>
                              )}
                              {field.badgeDate && (
                                <span style={{ fontSize: 11, color: v.muted }}>{field.badgeDate}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {editingPriceId === item.id && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                          background: v.inputBg, borderRadius: 10, marginBottom: 12,
                        }}>
                          <DollarSign style={{ width: 16, height: 16, color: v.muted }} />
                          <input
                            type="number" min="0" step="1"
                            style={{
                              flex: 1, maxWidth: 120, padding: "8px 12px", borderRadius: 8,
                              border: `1px solid ${v.border}`, background: v.card, color: v.text, fontSize: 14, outline: "none",
                            }}
                            placeholder="0" value={manualPriceValue}
                            onChange={(e) => setManualPriceValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`input-manual-price-${item.id}`}
                          />
                          <span style={{ fontSize: 14, color: v.muted }}>EUR</span>
                          <button
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 32, height: 32, borderRadius: 8, border: "none",
                              background: v.accent, color: v.bg, cursor: "pointer",
                              opacity: !manualPriceValue || manualPriceMutation.isPending ? 0.4 : 1,
                            }}
                            disabled={!manualPriceValue || manualPriceMutation.isPending}
                            onClick={(e) => { e.stopPropagation(); manualPriceMutation.mutate({ itemId: item.id, price: parseFloat(manualPriceValue), currency: "EUR" }); }}
                            data-testid={`button-save-manual-price-${item.id}`}
                          >
                            {manualPriceMutation.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 14, height: 14 }} />}
                          </button>
                          <button
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 32, height: 32, borderRadius: 8, border: "none",
                              background: "transparent", color: v.muted, cursor: "pointer",
                            }}
                            onClick={(e) => { e.stopPropagation(); setEditingPriceId(null); setManualPriceValue(""); }}
                          >
                            <X style={{ width: 16, height: 16 }} />
                          </button>
                        </div>
                      )}

                      {item.notes && (
                        <div style={{
                          padding: "12px 14px", background: v.inputBg, borderRadius: 10,
                          marginBottom: 12, fontSize: 14, color: v.text, lineHeight: 1.5,
                        }}>
                          <div style={{ fontSize: 12, color: v.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>
                            {t("collection.notes", "Notizen")}
                          </div>
                          {item.notes}
                        </div>
                      )}

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <a
                          href={`https://www.whiskybase.com/whiskies/whisky/${item.whiskybaseId}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                            background: `color-mix(in srgb, ${v.accent} 10%, transparent)`, color: v.accent, textDecoration: "none",
                          }}
                          data-testid={`link-whiskybase-${item.id}`}
                        >
                          <ExternalLink style={{ width: 14, height: 14 }} /> Whiskybase
                        </a>
                        {[
                          { icon: <NotebookPen style={{ width: 14, height: 14 }} />, label: t("collection.toJournal", "Tasted it"), onClick: () => toJournalMutation.mutate(item.id), loading: toJournalMutation.isPending, testId: `button-to-journal-${item.id}` },
                          { icon: <Sparkles style={{ width: 14, height: 14 }} />, label: t("collection.estimatePrice", "KI-Preis"), onClick: () => priceEstimateMutation.mutate([item.id]), loading: priceEstimateMutation.isPending, testId: `button-estimate-price-${item.id}` },
                          { icon: <Pencil style={{ width: 14, height: 14 }} />, label: t("collection.manualPriceHint", "Manuell"), onClick: () => { setEditingPriceId(editingPriceId === item.id ? null : item.id); setManualPriceValue(item.estimatedPrice?.toString() || ""); }, testId: `button-manual-price-${item.id}` },
                        ].map((btn, idx) => (
                          <button
                            key={idx}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                              background: "transparent", border: `1px solid ${v.border}`, color: v.text, cursor: "pointer",
                              opacity: btn.loading ? 0.5 : 1,
                            }}
                            onClick={(e) => { e.stopPropagation(); btn.onClick(); }}
                            disabled={btn.loading}
                            data-testid={btn.testId}
                          >
                            {btn.loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : btn.icon}
                            {btn.label}
                          </button>
                        ))}
                        <button
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                            background: "transparent", border: `1px solid color-mix(in srgb, ${v.danger} 30%, transparent)`,
                            color: v.danger, cursor: "pointer",
                          }}
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 style={{ width: 14, height: 14 }} /> {t("collection.deleteItem", "Entfernen")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div style={{
          position: "fixed", bottom: 68, left: 0, right: 0,
          display: "flex", justifyContent: "center",
          padding: "12px 16px", zIndex: 100,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 16px", borderRadius: 16,
            background: v.elevated, border: `1px solid ${v.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            backdropFilter: "blur(20px)",
            maxWidth: 500, width: "100%",
          }} data-testid="floating-action-bar">
            <span style={{ fontSize: 14, fontWeight: 600, color: v.text, marginRight: 4, whiteSpace: "nowrap" }}>
              {selectedIds.size}
            </span>
            <div style={{ flex: 1, display: "flex", gap: 6, overflowX: "auto" }}>
              {[
                { icon: <FileSpreadsheet style={{ width: 15, height: 15 }} />, label: "Excel", onClick: () => downloadExcel(getExportItems()), testId: "button-export-excel" },
                { icon: <FileText style={{ width: 15, height: 15 }} />, label: "CSV", onClick: () => downloadCsv(getExportItems()), testId: "button-export-csv" },
                { icon: <Download style={{ width: 15, height: 15 }} />, label: "PDF", onClick: () => downloadPdf(getExportItems()), testId: "button-export-pdf" },
              ].map((btn, idx) => (
                <button
                  key={idx}
                  onClick={btn.onClick}
                  data-testid={btn.testId}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "8px 12px", borderRadius: 10, border: `1px solid ${v.border}`,
                    background: "transparent", color: v.text, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {btn.icon} {btn.label}
                </button>
              ))}
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                data-testid="button-bulk-delete"
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "8px 12px", borderRadius: 10, border: `1px solid color-mix(in srgb, ${v.danger} 30%, transparent)`,
                  background: "transparent", color: v.danger, fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                <Trash2 style={{ width: 15, height: 15 }} /> {t("collection.deleteItem", "Loeschen")}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 16, padding: 28, maxWidth: 400, width: "100%" }} data-testid="dialog-bulk-delete-confirm">
            <h3 style={{ fontSize: 18, fontWeight: 600, color: v.text, margin: "0 0 8px" }}>
              {selectedIds.size} {t("collection.deleteMultiple", "Flaschen loeschen")}?
            </h3>
            <p style={{ fontSize: 14, color: v.muted, margin: "0 0 20px", lineHeight: 1.5 }}>
              {t("collection.deleteMultipleDesc", "Diese Aktion kann nicht rueckgaengig gemacht werden.")}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                style={{
                  padding: "10px 20px", borderRadius: 10, border: `1px solid ${v.border}`,
                  background: "transparent", color: v.text, fontSize: 14, fontWeight: 500, cursor: "pointer",
                }}
                onClick={() => setBulkDeleteConfirm(false)}
                data-testid="button-cancel-bulk-delete"
              >
                {t("common.cancel", "Abbrechen")}
              </button>
              <button
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 10, border: "none",
                  background: v.danger, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  opacity: bulkDeleteMutation.isPending ? 0.5 : 1,
                }}
                disabled={bulkDeleteMutation.isPending}
                onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                data-testid="button-confirm-bulk-delete"
              >
                {bulkDeleteMutation.isPending ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Trash2 style={{ width: 16, height: 16 }} />}
                {t("collection.deleteItem", "Loeschen")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 16, padding: 28, maxWidth: 400, width: "100%" }} data-testid="dialog-delete-confirm">
            <h3 style={{ fontSize: 18, fontWeight: 600, color: v.text, margin: "0 0 8px" }}>{t("collection.deleteConfirm", "Flasche entfernen?")}</h3>
            <p style={{ fontSize: 14, color: v.muted, margin: "0 0 20px" }}>
              {deleteTarget.brand && deleteTarget.brand !== deleteTarget.name ? `${deleteTarget.brand} ` : ""}{deleteTarget.name}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                style={{
                  padding: "10px 20px", borderRadius: 10, border: `1px solid ${v.border}`,
                  background: "transparent", color: v.text, fontSize: 14, fontWeight: 500, cursor: "pointer",
                }}
                onClick={() => setDeleteTarget(null)}
                data-testid="button-cancel-delete"
              >
                {t("common.cancel", "Abbrechen")}
              </button>
              <button
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 10, border: "none",
                  background: v.danger, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  opacity: deleteMutation.isPending ? 0.5 : 1,
                }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Trash2 style={{ width: 16, height: 16 }} />}
                {t("collection.deleteItem", "Entfernen")}
              </button>
            </div>
          </div>
        </div>
      )}

      {syncDialogOpen && syncDiff && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 16, padding: 28, maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto" }} data-testid="dialog-sync">
            <h3 style={{ fontSize: 20, fontWeight: 600, color: v.text, margin: "0 0 6px" }}>{t("collection.syncDialogTitle", "Sync-Vorschau")}</h3>
            <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>
              {t("m2.taste.syncSummary", "{{uploaded}} uploaded · {{existing}} existing · {{unchanged}} unchanged", { uploaded: syncDiff.totalUploaded, existing: syncDiff.totalExisting, unchanged: syncDiff.unchangedCount })}
            </p>

            {syncDiff.newItems.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: "#4ade80", margin: "0 0 10px" }}>
                  {t("collection.syncSectionNew", "Neu")} ({syncDiff.newItems.length})
                </h4>
                {syncDiff.newItems.map((item: any, i: number) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 14, color: v.text, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!newItemChecked[i]} onChange={() => setNewItemChecked(prev => ({ ...prev, [i]: !prev[i] }))} style={{ accentColor: v.accent, width: 16, height: 16 }} />
                    {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                  </label>
                ))}
              </div>
            )}

            {syncDiff.removedItems.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: v.danger, margin: "0 0 10px" }}>
                  {t("collection.syncSectionRemoved", "Entfernt")} ({syncDiff.removedItems.length})
                </h4>
                {syncDiff.removedItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", fontSize: 14, color: v.text }}>
                    <span>{item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}</span>
                    <select
                      value={removeActions[i] || "keep"}
                      onChange={(e) => setRemoveActions(prev => ({ ...prev, [i]: e.target.value as RemoveAction }))}
                      style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${v.border}`, background: v.inputBg, color: v.text, fontSize: 13 }}
                    >
                      <option value="keep">{t("collection.syncKeep", "Behalten")}</option>
                      <option value="delete">{t("collection.syncDelete", "Loeschen")}</option>
                      <option value="empty">{t("collection.syncEmpty", "Als leer markieren")}</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            {syncDiff.changedItems.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: v.accent, margin: "0 0 10px" }}>
                  {t("collection.syncSectionChanged", "Geaendert")} ({syncDiff.changedItems.length})
                </h4>
                {syncDiff.changedItems.map((item) => (
                  <div key={item.existingId} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: v.text, marginBottom: 6 }}>
                      {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                    </div>
                    {item.changes.map((ch) => {
                      const key = `${item.existingId}-${ch.field}`;
                      return (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", fontSize: 13 }}>
                          <span style={{ color: v.muted, minWidth: 80 }}>{fieldLabel(ch.field)}</span>
                          <span style={{ color: v.danger, textDecoration: "line-through" }}>{String(ch.old ?? "—")}</span>
                          <span style={{ color: v.muted }}>→</span>
                          <span style={{ color: "#4ade80" }}>{String(ch.new ?? "—")}</span>
                          <select
                            value={changeDecisions[key] || "new"}
                            onChange={(e) => setChangeDecisions(prev => ({ ...prev, [key]: e.target.value as "new" | "old" }))}
                            style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${v.border}`, background: v.inputBg, color: v.text, fontSize: 12 }}
                          >
                            <option value="new">{t("collection.syncUseNew", "Neu")}</option>
                            <option value="old">{t("collection.syncUseOld", "Alt")}</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 12, borderTop: `1px solid ${v.border}` }}>
              <button
                style={{
                  padding: "10px 20px", borderRadius: 10, border: `1px solid ${v.border}`,
                  background: "transparent", color: v.text, fontSize: 14, fontWeight: 500, cursor: "pointer",
                }}
                onClick={() => { setSyncDialogOpen(false); setSyncDiff(null); }}
                data-testid="button-cancel-sync"
              >
                {t("common.cancel", "Abbrechen")}
              </button>
              <button
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", borderRadius: 10, border: "none",
                  background: v.accent, color: v.bg, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  opacity: syncApplyMutation.isPending ? 0.5 : 1,
                }}
                disabled={syncApplyMutation.isPending}
                onClick={handleApplySync}
                data-testid="button-apply-sync"
              >
                {syncApplyMutation.isPending ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 16, height: 16 }} />}
                {t("collection.syncApply", "Uebernehmen")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
