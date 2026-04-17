import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { collectionApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useLocation } from "wouter";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import {
  Upload, Search, Trash2, Archive, Loader2, Check,
  Star, RefreshCw, Sparkles, X, CheckSquare,
  FileSpreadsheet, Download, ChevronDown, ChevronUp, ChevronLeft,
  ExternalLink, Clock, AlertTriangle, History, MoreHorizontal,
  ArrowRight, Globe, FileDown,
} from "lucide-react";
import type { WhiskybaseCollectionItem } from "@shared/schema";
import WhiskyImage from "@/labs/components/WhiskyImage";

type SortKey = "name" | "rating" | "price" | "added";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "open" | "closed" | "empty";

const sortDefaults: Record<SortKey, SortDirection> = { name: "asc", rating: "desc", price: "desc", added: "desc" };
type ActivePanel = null | "importSync" | "priceSelect";

const STATUS_CYCLE: string[] = ["closed", "open", "empty"];

export default function LabsTasteCollection() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const goBackToTaste = useBackNavigation("/labs/taste");
  const session = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncFileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [deleteTarget, setDeleteTarget] = useState<WhiskybaseCollectionItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [priceSelectMode, setPriceSelectMode] = useState(false);
  const [selectedForPrice, setSelectedForPrice] = useState<Set<string>>(new Set());
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [manualPriceValue, setManualPriceValue] = useState("");
  const [rateLimitDate, setRateLimitDate] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState("");
  const [syncResultDialog, setSyncResultDialog] = useState<any>(null);
  const [expandedSyncLogId, setExpandedSyncLogId] = useState<string | null>(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showTopDistilleries, setShowTopDistilleries] = useState(false);
  const [showSyncHistoryInSheet, setShowSyncHistoryInSheet] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ file: File; preview: { imported: number; updated: number; skipped: number; total: number; addedNames: string[]; updatedNames: string[]; skippedNames: string[]; localEditNames: string[]; localEditCount: number } } | null>(null);

  const pid = session.pid;

  const { data: importProgress } = useQuery({
    queryKey: ["collection-import-progress", pid],
    queryFn: () => collectionApi.getImportProgress(pid!),
    enabled: !!pid && isImporting,
    refetchInterval: isImporting ? 800 : false,
    refetchIntervalInBackground: true,
  });

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["collection", pid],
    queryFn: () => collectionApi.getAll(pid!),
    enabled: !!pid,
  });

  const { data: syncHistory = [] } = useQuery({
    queryKey: ["sync-history", pid],
    queryFn: () => collectionApi.getSyncHistory(pid!),
    enabled: !!pid,
  });

  const { data: importHistory = [] } = useQuery<any[]>({
    queryKey: ["import-history", pid],
    queryFn: () => collectionApi.getImportHistory(pid!),
    enabled: !!pid,
  });

  const undoImportMutation = useMutation({
    mutationFn: (logId: string) => collectionApi.undoImport(pid!, logId),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      queryClient.invalidateQueries({ queryKey: ["import-history"] });
      const removed = result?.removed ?? 0;
      const restored = result?.restored ?? 0;
      setImportMessage({
        type: "success",
        text: t("collectionUi.importUndoneResult", {
          removed,
          restored,
          defaultValue: "Import undone — {{removed}} bottles removed, {{restored}} restored",
        }),
      });
      setTimeout(() => setImportMessage(null), 6000);
    },
    onError: (error: any) => {
      setImportMessage({
        type: "error",
        text: `${t("collectionUi.importError")}: ${error?.message || "Undo failed"}`,
      });
    },
  });

  const importPreviewMutation = useMutation({
    mutationFn: (file: File) => collectionApi.importFile(pid!, file, { dryRun: true }),
    onSuccess: (result: any, file) => {
      setPendingImport({
        file,
        preview: {
          imported: result?.imported ?? 0,
          updated: result?.updated ?? 0,
          skipped: result?.skipped ?? 0,
          total: result?.total ?? 0,
          addedNames: result?.addedNames ?? [],
          updatedNames: result?.updatedNames ?? [],
          skippedNames: result?.skippedNames ?? [],
          localEditNames: result?.localEditNames ?? [],
          localEditCount: result?.localEditCount ?? 0,
        },
      });
    },
    onError: (error: any) => {
      setImportMessage({
        type: "error",
        text: `${t("collectionUi.importError")}: ${error?.message || "Unknown error"}`,
      });
    },
  });

  const [showCancelChoice, setShowCancelChoice] = useState(false);
  const cancelImportMutation = useMutation({
    mutationFn: (opts?: { discard?: boolean }) => collectionApi.cancelImport(pid!, opts),
    onSettled: () => setShowCancelChoice(false),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      setIsImporting(true);
      return collectionApi.importFile(pid!, file);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      setActivePanel(null);
      setPendingImport(null);
      const imported = (result?.imported ?? 0) + (result?.updated ?? 0);
      const skipped = result?.skipped ?? 0;
      if (result?.cancelled) {
        if (result?.discarded) {
          const rolled = (result?.rolledBackInserts ?? 0) + (result?.rolledBackUpdates ?? 0);
          setImportMessage({
            type: "success",
            text: t("collectionUi.importCancelledDiscarded", {
              rolled,
              defaultValue: "Import cancelled — {{rolled}} bottles discarded",
            }),
          });
        } else {
          setImportMessage({
            type: "success",
            text: t("collectionUi.importCancelledResult", { imported, defaultValue: "Import cancelled — {{imported}} bottles kept" }),
          });
        }
      } else {
        setImportMessage({
          type: "success",
          text: t("collectionUi.importResultSuccess", { imported, skipped }),
        });
      }
      setTimeout(() => setImportMessage(null), 6000);
    },
    onError: (error: any) => {
      setPendingImport(null);
      setImportMessage({
        type: "error",
        text: `${t("collectionUi.importError")}: ${error?.message || "Unknown error"}`,
      });
    },
    onSettled: () => {
      setIsImporting(false);
      cancelImportMutation.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => collectionApi.delete(pid!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collection"] }); setDeleteTarget(null); },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => { for (const id of ids) await collectionApi.delete(pid!, id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collection"] }); setSelectedIds(new Set()); setSelectMode(false); setBulkDeleteConfirm(false); },
  });

  const toJournalMutation = useMutation({
    mutationFn: (id: string) => collectionApi.toJournal(pid!, id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["journal"] }); },
  });

  const priceEstimateMutation = useMutation({
    mutationFn: (itemIds: string[]) => collectionApi.estimatePrice(pid!, itemIds),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collection"] }); setPriceSelectMode(false); setActivePanel(null); setSelectedForPrice(new Set()); setRateLimitDate(null); },
    onError: (error: any) => { try { const p = JSON.parse(error.message); if (p.error === "rate_limited" && p.nextAvailable) { setRateLimitDate(new Date(p.nextAvailable).toLocaleDateString()); } } catch {} },
  });

  const manualPriceMutation = useMutation({
    mutationFn: ({ itemId, price, currency }: { itemId: string; price: number; currency: string }) => collectionApi.manualPrice(pid!, itemId, price, currency),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collection"] }); setEditingPriceId(null); setManualPriceValue(""); },
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: { status?: string; personalRating?: number | null; notes?: string | null } }) =>
      collectionApi.patch(pid!, id, fields),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collection"] }); },
  });

  const syncMutation = useMutation({
    mutationFn: (file: File) => collectionApi.sync(pid!, file),
  });

  const syncApplyMutation = useMutation({
    mutationFn: (data: any) => collectionApi.syncApply(pid!, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["collection"] });
      queryClient.invalidateQueries({ queryKey: ["sync-history"] });
      setSyncResultDialog(result);
    },
  });

  const filtered = useMemo(() => {
    let result = [...items] as WhiskybaseCollectionItem[];
    if (statusFilter !== "all") result = result.filter(i => i.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name?.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q) || i.distillery?.toLowerCase().includes(q) || i.caskType?.toLowerCase().includes(q));
    }
    const dir = sortDirection === "asc" ? 1 : -1;
    result.sort((a, b) => {
      switch (sortBy) {
        case "rating": return dir * ((a.communityRating || 0) - (b.communityRating || 0));
        case "price": return dir * ((a.pricePaid || a.avgPrice || 0) - (b.pricePaid || b.avgPrice || 0));
        case "added": return dir * (a.addedAt || "").localeCompare(b.addedAt || "");
        default: return dir * ((a.brand || "").localeCompare(b.brand || "") || (a.name || "").localeCompare(b.name || ""));
      }
    });
    return result;
  }, [items, statusFilter, search, sortBy, sortDirection]);

  const stats = useMemo(() => {
    const all = items as WhiskybaseCollectionItem[];
    const open = all.filter(i => i.status === "open").length;
    const closed = all.filter(i => i.status === "closed").length;
    const empty = all.filter(i => i.status === "empty").length;
    const ratings = all.filter(i => i.communityRating).map(i => i.communityRating!);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
    const prices = all.filter(i => i.avgPrice).map(i => i.avgPrice!);
    const totalValue = prices.reduce((a, b) => a + b, 0);
    const distilleryCounts: Record<string, number> = {};
    all.forEach(i => { const d = i.distillery || i.brand; if (d) distilleryCounts[d] = (distilleryCounts[d] || 0) + 1; });
    const topDistilleries = Object.entries(distilleryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { total: all.length, open, closed, empty, avgRating, totalValue, topDistilleries };
  }, [items]);

  const lastSyncDate = useMemo(() => {
    if (!syncHistory || syncHistory.length === 0) return null;
    return new Date(syncHistory[0].syncedAt);
  }, [syncHistory]);

  const isSyncStale = useMemo(() => {
    if (!lastSyncDate) return false;
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    return lastSyncDate < fourWeeksAgo;
  }, [lastSyncDate]);

  const hasCollection = items.length > 0;

  const statusColor = (s: string | null) => s === "open" ? "var(--labs-success)" : s === "closed" ? "var(--labs-info)" : "var(--labs-text-muted)";
  const statusLabel = (s: string | null) => s === "open" ? t("collectionUi.open") : s === "closed" ? t("collectionUi.closed") : s === "empty" ? t("collectionUi.empty") : (s || "");

  const cycleStatus = (item: WhiskybaseCollectionItem) => {
    const currentIdx = STATUS_CYCLE.indexOf(item.status || "closed");
    const next = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    patchMutation.mutate({ id: item.id, fields: { status: next } });
  };

  const isManualItem = (item: WhiskybaseCollectionItem) => {
    return (item as WhiskybaseCollectionItem & { source?: string }).source === "manual" || item.whiskybaseId?.startsWith("manual-");
  };

  const getWbUrl = (item: WhiskybaseCollectionItem) => {
    if (isManualItem(item)) return null;
    return `https://www.whiskybase.com/whiskies/whisky/${item.whiskybaseId}`;
  };

  const downloadCsv = (itemsToExport: WhiskybaseCollectionItem[]) => {
    const headers = ["Name", "Brand", "Distillery", "Age", "ABV", "Status", "Series", "Cask", "Size", "Rating", "Price Paid", "Currency", "Estimated Price", "Added"];
    const rows = itemsToExport.map(i => [i.name, i.brand || "", i.distillery || "", i.statedAge || "", i.abv || "", i.status || "", i.bottlingSeries || "", i.caskType || "", i.size || "", i.communityRating?.toFixed(1) || "", i.pricePaid?.toFixed(2) || "", i.currency || "", i.estimatedPrice?.toFixed(2) || "", i.addedAt || ""]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `whisky-collection-${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const getExportItems = (): WhiskybaseCollectionItem[] => selectMode && selectedIds.size > 0 ? filtered.filter(i => selectedIds.has(i.id)) : filtered;

  const openPanel = (panel: ActivePanel) => {
    if (activePanel === panel) {
      setActivePanel(null);
      if (panel === "priceSelect") { setPriceSelectMode(false); setSelectedForPrice(new Set()); }
    } else {
      setActivePanel(panel);
      if (panel === "priceSelect") { setPriceSelectMode(true); setSelectedForPrice(new Set()); setSelectMode(false); }
      else { setPriceSelectMode(false); setSelectedForPrice(new Set()); }
    }
    setShowOverflow(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { importPreviewMutation.mutate(f); e.target.value = ""; }
  };

  const handleSyncFile = async (file: File) => {
    try {
      const diffResult = await syncMutation.mutateAsync(file);
      const addItems = diffResult.newItems || [];
      const removeItemIds = (diffResult.removedItems || []).map((r: any) => r.id);
      const updateItems = (diffResult.changedItems || []).map((c: any) => ({
        id: c.existingId,
        data: c.uploadedData,
      }));
      const applyResult = await syncApplyMutation.mutateAsync({
        addItems,
        removeItemIds,
        updateItems,
        unchangedCount: diffResult.unchangedCount || 0,
      });
      const details: any[] = [];
      for (const item of addItems) {
        details.push({ name: item.name || "", action: "added" });
      }
      for (const r of (diffResult.removedItems || [])) {
        details.push({ name: r.name || "", action: "removed" });
      }
      for (const c of (diffResult.changedItems || [])) {
        const hasConflict = c.changes?.some((ch: any) => ch.conflict);
        details.push({
          name: c.name || c.brand || "",
          action: hasConflict ? "conflict" : "updated",
          changes: c.changes?.map((ch: any) => ({
            field: ch.field,
            oldValue: ch.old,
            newValue: ch.new,
            source: ch.conflict ? "casksense" : "whiskybase",
          })),
        });
      }
      setActivePanel(null);
      setSyncResultDialog({ ...applyResult, details });
    } catch {}
  };

  const handleSyncFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { handleSyncFile(f); e.target.value = ""; }
  };

  if (!session.signedIn) {
    return (
      <div className="labs-page" data-testid="labs-taste-collection">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBackToTaste} className="labs-btn-ghost flex items-center gap-1 -ml-2" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-taste"><ChevronLeft className="w-4 h-4" /> {t("collectionUi.myWhisky")}</button>
          <h1 className="labs-h2" style={{ color: "var(--labs-text)" }}>{t("collectionUi.collection")}</h1>
        </div>
        <AuthGateMessage
          icon={<Archive className="w-10 h-10" style={{ color: "var(--labs-accent)" }} />}
          title={t("authGate.collection.title")}
          bullets={[t("authGate.collection.bullet1"), t("authGate.collection.bullet2"), t("authGate.collection.bullet3")]}
          className="labs-empty"
          compact
        />
      </div>
    );
  }

  return (
    <div className="labs-page" style={{ paddingBottom: selectMode ? 140 : 80 }} data-testid="labs-taste-collection">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={handleImportFile} data-testid="input-labs-import-file" />
      <input ref={syncFileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={handleSyncFileInput} data-testid="input-labs-sync-file" />

      <div className="flex items-center gap-3 mb-1">
        <button onClick={goBackToTaste} className="labs-btn-ghost flex items-center gap-1 -ml-2" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-taste"><ChevronLeft className="w-4 h-4" /> {t("collectionUi.myWhisky")}</button>
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-collection-title">{t("collectionUi.collection")}</h1>
      </div>

      {hasCollection && (
        <div
          className="mb-4"
          style={{ marginLeft: 28, cursor: "pointer" }}
          onClick={() => setShowTopDistilleries(!showTopDistilleries)}
          data-testid="labs-compact-stats"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
              {stats.total} {t("collectionUi.bottles")}
            </span>
            {stats.avgRating && (
              <>
                <span style={{ color: "var(--labs-border)" }}>·</span>
                <span className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
                  <Star className="w-3 h-3 inline-block -mt-0.5" style={{ color: "var(--labs-accent)" }} /> {stats.avgRating}
                </span>
              </>
            )}
            {stats.totalValue > 0 && (
              <>
                <span style={{ color: "var(--labs-border)" }}>·</span>
                <span className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
                  ~{stats.totalValue >= 1000 ? `${(stats.totalValue / 1000).toFixed(1)}k` : stats.totalValue.toFixed(0)} €
                </span>
              </>
            )}
            <ChevronDown
              className="w-3 h-3 ml-0.5"
              style={{
                color: "var(--labs-text-muted)",
                transform: showTopDistilleries ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            />
          </div>

          {showTopDistilleries && (
            <div className="mt-2 labs-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-3 text-xs mb-2" style={{ color: "var(--labs-text-muted)" }}>
                <span>{stats.open} {t("collectionUi.open")}</span>
                <span>{stats.closed} {t("collectionUi.closed")}</span>
                <span>{stats.empty} {t("collectionUi.empty")}</span>
              </div>
              {stats.topDistilleries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {stats.topDistilleries.map(([name, count]) => (
                    <span key={name} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>{name} ({count})</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {importMessage && (
        <div
          className="labs-card p-3 mb-4 flex items-start gap-3"
          style={{
            background: importMessage.type === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${importMessage.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.35)"}`,
          }}
          data-testid={importMessage.type === "success" ? "banner-import-success" : "banner-import-error"}
        >
          {importMessage.type === "success"
            ? <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--labs-success)" }} />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--labs-danger)" }} />}
          <p className="text-xs" style={{ color: importMessage.type === "success" ? "var(--labs-text-secondary)" : "var(--labs-danger)", flex: 1, lineHeight: 1.5 }}>
            {importMessage.text}
          </p>
          <button
            onClick={() => setImportMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)" }}
            data-testid="button-dismiss-import-message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isSyncStale && hasCollection && (
        <div className="labs-card p-3 mb-4 flex items-center gap-3" style={{ background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.25)" }} data-testid="banner-sync-stale">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#e6a800" }} />
          <p className="text-xs" style={{ color: "var(--labs-text-secondary)", flex: 1 }}>
            {t("collectionUi.lastSyncWas")} {lastSyncDate ? Math.floor((Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24)) : "?"} {t("collectionUi.daysAgo")}
          </p>
          <button onClick={() => openPanel("importSync")} className="labs-btn-secondary" style={{ padding: "4px 10px", fontSize: 11, flexShrink: 0 }} data-testid="button-sync-stale">
            <RefreshCw className="w-3 h-3" /> Sync
          </button>
        </div>
      )}

      {hasCollection && (
        <div className="flex items-center gap-2 mb-4" style={{ position: "relative" }}>
          <button
            onClick={() => openPanel("importSync")}
            className="flex items-center gap-2"
            disabled={importMutation.isPending || importPreviewMutation.isPending || syncMutation.isPending || syncApplyMutation.isPending}
            style={{
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: "var(--labs-accent)",
              color: "var(--labs-bg)",
              fontSize: 13,
              fontWeight: 600,
              opacity: importMutation.isPending || importPreviewMutation.isPending || syncMutation.isPending ? 0.5 : 1,
              transition: "all 0.15s",
            }}
            data-testid="button-labs-import-sync"
          >
            {(importMutation.isPending || importPreviewMutation.isPending || syncMutation.isPending || syncApplyMutation.isPending)
              ? <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} />
              : <Upload className="w-4 h-4" />
            }
            {hasCollection ? t("collectionUi.importSync") : t("collectionUi.importBtn")}
          </button>

          {selectMode && (
            <button
              onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background: "var(--labs-accent-muted)",
                color: "var(--labs-accent)",
                fontSize: 13,
                fontWeight: 600,
                transition: "all 0.15s",
              }}
              data-testid="button-labs-cancel-select"
            >
              <X className="w-4 h-4" /> {t("ui.cancel")}
            </button>
          )}

          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button
              onClick={() => setShowOverflow(!showOverflow)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                background: showOverflow ? "var(--labs-accent-muted)" : "var(--labs-surface)",
                color: showOverflow ? "var(--labs-accent)" : "var(--labs-text)",
                fontSize: 13,
                transition: "all 0.15s",
              }}
              data-testid="button-labs-overflow"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showOverflow && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowOverflow(false)} />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    background: "var(--labs-surface)",
                    border: "1px solid var(--labs-border)",
                    borderRadius: 12,
                    padding: 4,
                    minWidth: 180,
                    zIndex: 100,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                  }}
                  data-testid="overflow-menu"
                >
                  <OverflowItem
                    icon={<CheckSquare className="w-4 h-4" />}
                    label={t("collectionUi.selectBottles")}
                    onClick={() => { setSelectMode(true); setSelectedIds(new Set()); setActivePanel(null); setPriceSelectMode(false); setSelectedForPrice(new Set()); setShowOverflow(false); }}
                    testId="button-labs-toggle-select"
                  />
                  <OverflowItem
                    icon={<Sparkles className="w-4 h-4" />}
                    label={t("collectionUi.aiPriceEstimation")}
                    onClick={() => openPanel("priceSelect")}
                    testId="button-labs-start-price-estimate"
                  />
                  <OverflowItem
                    icon={<Download className="w-4 h-4" />}
                    label={t("collectionUi.exportCsv")}
                    onClick={() => { downloadCsv(getExportItems()); setShowOverflow(false); }}
                    testId="button-labs-export-csv"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activePanel === "priceSelect" && (
        <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="labs-price-select-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{t("collectionUi.aiPriceEstimation")}</h3>
            </div>
            <button onClick={() => { setActivePanel(null); setPriceSelectMode(false); setSelectedForPrice(new Set()); }} style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }} data-testid="button-close-price-panel"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)", lineHeight: 1.5 }}>
            {t("collectionUi.selectBottlesDesc")}
          </p>
          {selectedForPrice.size > 0 && <p className="text-xs mb-2" style={{ color: "var(--labs-text-secondary)" }}>{selectedForPrice.size} {t("collectionUi.selected")}</p>}
          {rateLimitDate && <p className="text-xs mb-2" style={{ color: "var(--labs-accent)" }}>{t("collectionUi.rateLimitedUntil")} {rateLimitDate}</p>}
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedForPrice(new Set(filtered.map(i => i.id)))} className="labs-btn-secondary" style={{ padding: "6px 10px", fontSize: 12 }} data-testid="button-labs-select-all-price"><Check className="w-3.5 h-3.5" /> All</button>
            <button onClick={() => priceEstimateMutation.mutate(Array.from(selectedForPrice))} disabled={selectedForPrice.size === 0 || priceEstimateMutation.isPending} className="labs-btn-primary" style={{ padding: "6px 12px", fontSize: 12, opacity: selectedForPrice.size === 0 ? 0.5 : 1 }} data-testid="button-labs-estimate-prices">
              {priceEstimateMutation.isPending ? <Loader2 className="w-3.5 h-3.5" style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles className="w-3.5 h-3.5" />} Estimate
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3" style={{ top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--labs-text-muted)" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("collectionUi.searchCollection")}
            style={{ width: "100%", padding: "10px 12px 10px 36px", background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 10, fontSize: 14, color: "var(--labs-text)", outline: "none", boxSizing: "border-box" }}
            data-testid="input-labs-search-collection" />
        </div>
      </div>

      <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {(["all", "open", "closed", "empty"] as StatusFilter[]).map(sf => (
          <button key={sf} onClick={() => setStatusFilter(sf)}
            style={{ padding: "5px 12px", fontSize: 11, fontWeight: statusFilter === sf ? 600 : 400, color: statusFilter === sf ? "var(--labs-accent)" : "var(--labs-text-muted)", background: statusFilter === sf ? "var(--labs-accent-muted)" : "transparent", border: `1px solid ${statusFilter === sf ? "var(--labs-accent)" : "var(--labs-border)"}`, borderRadius: 16, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
            data-testid={`labs-status-${sf}`}>{sf === "all" ? t("collectionUi.filterAll") : statusLabel(sf)}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch", marginTop: 2 }}>
        <span style={{ fontSize: 11, color: "var(--labs-text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{t("collectionUi.sortLabel")}:</span>
        {(["name", "rating", "price", "added"] as SortKey[]).map(sk => (
          <button key={sk} onClick={() => { if (sortBy === sk) { setSortDirection(d => d === "asc" ? "desc" : "asc"); } else { setSortBy(sk); setSortDirection(sortDefaults[sk]); } }}
            style={{ padding: "5px 10px", fontSize: 11, fontWeight: sortBy === sk ? 600 : 400, color: sortBy === sk ? "var(--labs-accent)" : "var(--labs-text-muted)", background: sortBy === sk ? "var(--labs-accent-muted)" : "transparent", border: `1px solid ${sortBy === sk ? "var(--labs-accent)" : "var(--labs-border)"}`, borderRadius: 16, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}
            data-testid={`labs-sort-${sk}`}>
            <span>{t(`collectionUi.sort_${sk}`)}</span>
            {sortBy === sk && <span style={{ fontSize: 10 }}>{sortDirection === "asc" ? "↑" : "↓"}</span>}
          </button>
        ))}
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id)))} className="labs-btn-secondary" style={{ padding: "5px 10px", fontSize: 11 }} data-testid="button-labs-select-all">{selectedIds.size === filtered.length ? "Deselect All" : "Select All"}</button>
          <button onClick={() => setBulkDeleteConfirm(true)} style={{ padding: "5px 10px", fontSize: 11, color: "var(--labs-danger)", background: "transparent", border: "1px solid var(--labs-danger)", borderRadius: 8, cursor: "pointer" }} data-testid="button-labs-bulk-delete">Delete {selectedIds.size}</button>
          <button onClick={() => downloadCsv(getExportItems())} className="labs-btn-secondary" style={{ padding: "5px 10px", fontSize: 11 }} data-testid="button-labs-export-selected"><Download className="w-3 h-3" /> CSV</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map(i => <div key={i} className="labs-card" style={{ height: 72 }} />)}</div>
      ) : isError ? (
        <div className="labs-card p-6 text-center">
          <p className="text-sm mb-3" style={{ color: "var(--labs-danger)" }}>Failed to load</p>
          <button onClick={() => refetch()} className="labs-btn-secondary" data-testid="button-labs-retry-collection">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <EmptyCollectionState onImport={() => openPanel("importSync")} />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-xs mb-1" style={{ color: "var(--labs-text-muted)" }}>{t("collectionUi.ofBottles", { count: filtered.length, total: items.length })}</div>
          {filtered.map((item: WhiskybaseCollectionItem) => {
            const expanded = expandedId === item.id;
            const isSelected = selectMode && selectedIds.has(item.id);
            const isPriceSelected = priceSelectMode && selectedForPrice.has(item.id);
            const manual = isManualItem(item);
            const wbUrl = getWbUrl(item);
            return (
              <div key={item.id} className="labs-card" style={{ overflow: "hidden", border: isSelected || isPriceSelected ? "1px solid var(--labs-accent)" : undefined }} data-testid={`labs-collection-${item.id}`}>
                <div className="flex items-center gap-3 p-3.5 cursor-pointer" onClick={() => {
                  if (selectMode) { const n = new Set(selectedIds); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); setSelectedIds(n); }
                  else if (priceSelectMode) { const n = new Set(selectedForPrice); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); setSelectedForPrice(n); }
                  else setExpandedId(expanded ? null : item.id);
                }}>
                  {(selectMode || priceSelectMode) && (
                    <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSelected || isPriceSelected ? "var(--labs-accent)" : "var(--labs-border)"}`, background: isSelected || isPriceSelected ? "var(--labs-accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {(isSelected || isPriceSelected) && <Check className="w-3 h-3" style={{ color: "var(--labs-bg)" }} />}
                    </div>
                  )}
                  <WhiskyImage imageUrl={item.imageUrl} name={item.name || ""} size={44} height={56} testId={`img-collection-${item.id}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {(() => {
                      const nameLc = (item.name || "").toLowerCase();
                      const brandLc = (item.brand || "").toLowerCase();
                      const distLc = (item.distillery || "").toLowerCase();
                      const showBrandPrefix = !!item.brand && item.brand !== item.name && !(brandLc && nameLc.startsWith(brandLc));
                      const showDistillery = !!item.distillery && !(distLc && nameLc.startsWith(distLc));
                      return (
                        <>
                          <div className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>{showBrandPrefix ? `${item.brand} ` : ""}{item.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--labs-text-muted)" }}>
                            {showDistillery && <span>{item.distillery}</span>}
                            {item.country && <span>{item.country}</span>}
                            {item.statedAge && <span>{item.statedAge}</span>}
                            {item.abv && <span>{t("collectionUi.abvLabel")} {item.abv}</span>}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); cycleStatus(item); }}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ color: statusColor(item.status || "closed"), border: `1px solid ${statusColor(item.status || "closed")}`, background: "transparent", cursor: "pointer" }}
                      data-testid={`button-status-cycle-${item.id}`}
                    >{statusLabel(item.status || "closed")}</button>
                    {item.personalRating != null && item.personalRating > 0 && (
                      <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: "var(--labs-accent)" }}>
                        <span style={{ fontWeight: 500, opacity: 0.8 }}>{t("collectionUi.scoreLabel")}</span>
                        <Star className="w-3 h-3" fill="currentColor" />{item.personalRating.toFixed(1)}
                      </span>
                    )}
                    {item.communityRating != null && item.communityRating > 0 && !item.personalRating && (
                      <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: "var(--labs-text-muted)" }}>
                        <span style={{ fontWeight: 500, opacity: 0.8 }}>{t("collectionUi.scoreLabel")}</span>
                        <Star className="w-3 h-3" />{item.communityRating.toFixed(1)}
                      </span>
                    )}
                    {!selectMode && !priceSelectMode && (expanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />)}
                  </div>
                </div>

                {expanded && (
                  <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--labs-border)" }}>
                    <div className="flex items-start gap-3 mt-3 mb-2">
                      <WhiskyImage imageUrl={item.imageUrl} name={item.name || ""} size={64} height={88} testId={`img-collection-detail-${item.id}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                        background: manual ? "rgba(139,92,246,0.1)" : "rgba(59,130,246,0.1)",
                        color: manual ? "#8b5cf6" : "var(--labs-info)",
                      }} data-testid={`badge-source-${item.id}`}>
                        {manual ? "Manual" : "Whiskybase Import"}
                      </span>
                      {wbUrl && (
                        <a href={wbUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px]" style={{ color: "var(--labs-accent)", textDecoration: "none" }} data-testid={`link-wb-${item.id}`}>
                          WB <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>My Rating:</span>
                      {editingRatingId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0" max="100" step="0.5"
                            value={ratingValue}
                            onChange={(e) => setRatingValue(e.target.value)}
                            placeholder="0-100"
                            style={{ width: 60, padding: "3px 6px", fontSize: 12, background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 6, color: "var(--labs-text)", outline: "none" }}
                            data-testid={`input-rating-${item.id}`}
                          />
                          <button onClick={() => {
                            const val = ratingValue ? parseFloat(ratingValue) : null;
                            patchMutation.mutate({ id: item.id, fields: { personalRating: val } });
                            setEditingRatingId(null); setRatingValue("");
                          }} className="labs-btn-primary" style={{ padding: "3px 8px", fontSize: 11 }} data-testid={`button-save-rating-${item.id}`}>Save</button>
                          <button onClick={() => { setEditingRatingId(null); setRatingValue(""); }} style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }}><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingRatingId(item.id); setRatingValue(item.personalRating?.toString() || ""); }}
                          className="flex items-center gap-1 text-xs"
                          style={{ color: item.personalRating ? "var(--labs-accent)" : "var(--labs-text-muted)", background: "none", border: "1px solid var(--labs-border)", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}
                          data-testid={`button-edit-rating-${item.id}`}
                        >
                          <Star className="w-3 h-3" /> {item.personalRating ? item.personalRating.toFixed(1) : "Rate"}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style={{ color: "var(--labs-text-secondary)" }}>
                      {item.caskType && <div><span style={{ color: "var(--labs-text-muted)" }}>Cask:</span> {item.caskType}</div>}
                      {item.bottlingSeries && <div><span style={{ color: "var(--labs-text-muted)" }}>Series:</span> {item.bottlingSeries}</div>}
                      {item.size && <div><span style={{ color: "var(--labs-text-muted)" }}>Size:</span> {item.size}</div>}
                      {item.addedAt && <div><span style={{ color: "var(--labs-text-muted)" }}>Added:</span> {item.addedAt.split(" ")[0]}</div>}
                      {item.pricePaid != null && <div><span style={{ color: "var(--labs-text-muted)" }}>Paid:</span> {item.pricePaid.toFixed(2)} {item.currency || "EUR"}</div>}
                      {item.estimatedPrice != null && <div><span style={{ color: "var(--labs-text-muted)" }}>Est:</span> {item.estimatedPrice.toFixed(2)} EUR</div>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => toJournalMutation.mutate(item.id)} className="labs-btn-secondary flex items-center gap-1" style={{ padding: "5px 10px", fontSize: 11 }} data-testid={`button-labs-add-dram-${item.id}`}>
                        <Star className="w-3 h-3" /> + Dram
                      </button>
                      {editingPriceId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" value={manualPriceValue} onChange={(e) => setManualPriceValue(e.target.value)} placeholder="Price" style={{ width: 80, padding: "4px 8px", fontSize: 12, background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 6, color: "var(--labs-text)", outline: "none" }} data-testid={`input-labs-manual-price-${item.id}`} />
                          <button onClick={() => { if (manualPriceValue) manualPriceMutation.mutate({ itemId: item.id, price: parseFloat(manualPriceValue), currency: "EUR" }); }} className="labs-btn-primary" style={{ padding: "4px 8px", fontSize: 11 }}>Set</button>
                          <button onClick={() => { setEditingPriceId(null); setManualPriceValue(""); }} style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }}><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingPriceId(item.id)} className="labs-btn-secondary flex items-center gap-1" style={{ padding: "5px 10px", fontSize: 11 }}><Sparkles className="w-3 h-3" /> Price</button>
                      )}
                      <button onClick={() => setDeleteTarget(item)} style={{ padding: "5px 10px", fontSize: 11, color: "var(--labs-danger)", background: "transparent", border: "1px solid var(--labs-danger)", borderRadius: 8, cursor: "pointer", opacity: 0.8 }} data-testid={`button-labs-delete-${item.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activePanel === "importSync" && (
        <ImportSyncSheet
          hasCollection={hasCollection}
          isImporting={importMutation.isPending || importPreviewMutation.isPending}
          importProgress={importMutation.isPending ? importProgress : undefined}
          isSyncing={syncMutation.isPending || syncApplyMutation.isPending}
          syncHistory={syncHistory}
          expandedSyncLogId={expandedSyncLogId}
          setExpandedSyncLogId={setExpandedSyncLogId}
          showSyncHistory={showSyncHistoryInSheet}
          setShowSyncHistory={setShowSyncHistoryInSheet}
          onImport={() => fileInputRef.current?.click()}
          onSync={() => syncFileInputRef.current?.click()}
          onClose={() => setActivePanel(null)}
          onCancelImport={() => setShowCancelChoice(true)}
          isCancellingImport={cancelImportMutation.isPending || importProgress?.status === "cancelled" || (importMutation.isPending && (importProgress as any)?.cancelRequested)}
          importHistory={importHistory}
          onUndoImport={(logId: string) => undoImportMutation.mutate(logId)}
          undoingImportId={undoImportMutation.isPending ? (undoImportMutation.variables as string) : null}
        />
      )}

      {showCancelChoice && (
        <div className="labs-overlay" style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)", zIndex: 10000 }} data-testid="dialog-cancel-import-choice">
          <div className="labs-card" style={{ maxWidth: 420, width: "90%", padding: 24 }}>
            <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }} data-testid="text-cancel-import-title">
              {t("collectionUi.cancelImportTitle", { defaultValue: "Cancel import?" })}
            </h3>
            <p className="text-sm mb-3" style={{ color: "var(--labs-text-secondary)", lineHeight: 1.5 }}>
              {t("collectionUi.cancelImportBody", { defaultValue: "Choose what should happen to the bottles already imported in this run." })}
            </p>
            <p className="text-xs mb-5" style={{ color: "var(--labs-text-muted)", lineHeight: 1.5 }}>
              {t("collectionUi.cancelImportUpdatesNote", { defaultValue: "Discarding restores updated bottles to their previous values where possible." })}
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => cancelImportMutation.mutate({ discard: true })}
                disabled={cancelImportMutation.isPending}
                style={{ padding: "10px 16px", fontSize: 14, fontWeight: 600, color: "var(--labs-bg)", background: "var(--labs-danger)", border: "none", borderRadius: 8, cursor: cancelImportMutation.isPending ? "default" : "pointer", opacity: cancelImportMutation.isPending ? 0.6 : 1 }}
                data-testid="button-cancel-import-discard"
              >
                {t("collectionUi.cancelImportDiscard", { defaultValue: "Cancel & discard imported bottles" })}
              </button>
              <button
                onClick={() => cancelImportMutation.mutate({ discard: false })}
                disabled={cancelImportMutation.isPending}
                style={{ padding: "10px 16px", fontSize: 14, fontWeight: 600, color: "var(--labs-text)", background: "transparent", border: "1px solid var(--labs-border)", borderRadius: 8, cursor: cancelImportMutation.isPending ? "default" : "pointer", opacity: cancelImportMutation.isPending ? 0.6 : 1 }}
                data-testid="button-cancel-import-keep"
              >
                {t("collectionUi.cancelImportKeep", { defaultValue: "Cancel & keep imported bottles" })}
              </button>
              <button
                onClick={() => setShowCancelChoice(false)}
                disabled={cancelImportMutation.isPending}
                className="labs-btn-secondary"
                style={{ padding: "8px 16px", fontSize: 13 }}
                data-testid="button-cancel-import-back"
              >
                {t("collectionUi.cancelImportBack", { defaultValue: "Continue importing" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="labs-overlay" style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)", zIndex: 9999 }} data-testid="dialog-labs-delete-collection">
          <div className="labs-card" style={{ maxWidth: 380, width: "90%", padding: 24 }}>
            <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }}>Delete Bottle</h3>
            <p className="text-sm mb-5" style={{ color: "var(--labs-text-secondary)" }}>Remove "{deleteTarget.name}" from your collection?</p>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="labs-btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }}>Cancel</button>
              <button onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--labs-bg)", background: "var(--labs-danger)", border: "none", borderRadius: 8, cursor: "pointer", opacity: deleteMutation.isPending ? 0.6 : 1 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div className="labs-overlay" style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)", zIndex: 9999 }}>
          <div className="labs-card" style={{ maxWidth: 380, width: "90%", padding: 24 }}>
            <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }}>Delete {selectedIds.size} bottles?</h3>
            <p className="text-sm mb-5" style={{ color: "var(--labs-text-secondary)" }}>This cannot be undone.</p>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setBulkDeleteConfirm(false)} className="labs-btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }}>Cancel</button>
              <button onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))} disabled={bulkDeleteMutation.isPending} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--labs-bg)", background: "var(--labs-danger)", border: "none", borderRadius: 8, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {syncResultDialog && (
        <SyncResultDialog result={syncResultDialog} onClose={() => setSyncResultDialog(null)} />
      )}

      {pendingImport && (
        <ImportConfirmDialog
          preview={pendingImport.preview}
          isImporting={importMutation.isPending}
          onCancel={() => setPendingImport(null)}
          onConfirm={() => importMutation.mutate(pendingImport.file)}
        />
      )}
    </div>
  );
}

function ImportConfirmDialog({
  preview, isImporting, onCancel, onConfirm,
}: {
  preview: { imported: number; updated: number; skipped: number; total: number; addedNames: string[]; updatedNames: string[]; skippedNames: string[]; localEditNames: string[]; localEditCount: number };
  isImporting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const hasOverwrites = preview.updated > 0;
  const hasLocalEdits = (preview.localEditCount ?? 0) > 0;
  const [showDetails, setShowDetails] = useState(false);
  const hasAnyNames = preview.addedNames.length + preview.updatedNames.length + preview.skippedNames.length + (preview.localEditNames?.length ?? 0) > 0;
  return (
    <div
      className="labs-overlay"
      style={{
        position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)",
        WebkitBackdropFilter: "var(--overlay-blur)", zIndex: 9999,
      }}
      data-testid="dialog-import-confirm"
    >
      <div className="labs-card" style={{ maxWidth: 420, width: "90%", padding: 24, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }} data-testid="text-import-confirm-title">
          {t("collectionUi.importConfirmTitle")}
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--labs-text-secondary)", lineHeight: 1.5 }}>
          {t("collectionUi.importConfirmIntro")}
        </p>

        <div className="flex flex-col gap-2 mb-4" style={{
          background: "var(--labs-surface)", borderRadius: 12, padding: 14,
          border: "1px solid var(--labs-border)",
        }}>
          <div className="flex items-center gap-2 text-sm" data-testid="row-import-added">
            <span style={{ color: "var(--labs-success)", fontWeight: 700, minWidth: 36 }}>
              +{preview.imported}
            </span>
            <span style={{ color: "var(--labs-text-secondary)" }}>
              {t("collectionUi.importConfirmAdded")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm" data-testid="row-import-updated">
            <span style={{ color: "var(--labs-info)", fontWeight: 700, minWidth: 36 }}>
              {preview.updated}
            </span>
            <span style={{ color: "var(--labs-text-secondary)" }}>
              {t("collectionUi.importConfirmUpdated")}
            </span>
          </div>
          {preview.skipped > 0 && (
            <div className="flex items-center gap-2 text-sm" data-testid="row-import-skipped">
              <span style={{ color: "var(--labs-text-muted)", fontWeight: 700, minWidth: 36 }}>
                {preview.skipped}
              </span>
              <span style={{ color: "var(--labs-text-secondary)" }}>
                {t("collectionUi.importConfirmSkipped")}
              </span>
            </div>
          )}
        </div>

        {hasOverwrites && (
          <div
            className="flex items-start gap-2 mb-4 text-xs"
            style={{
              background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.25)",
              borderRadius: 10, padding: 10, color: "var(--labs-text-secondary)", lineHeight: 1.5,
            }}
            data-testid="banner-import-overwrite-warning"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#e6a800" }} />
            <span>{t("collectionUi.importConfirmPreserve")}</span>
          </div>
        )}

        {hasLocalEdits && (
          <div
            className="flex items-start gap-2 mb-4 text-xs"
            style={{
              background: "rgba(255,120,80,0.10)", border: "1px solid rgba(255,120,80,0.30)",
              borderRadius: 10, padding: 10, color: "var(--labs-text-secondary)", lineHeight: 1.5,
            }}
            data-testid="banner-import-local-edits-warning"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#e07a3a" }} />
            <span>{t("collectionUi.importConfirmLocalEdits", { count: preview.localEditCount })}</span>
          </div>
        )}

        {hasAnyNames && (
          <div className="mb-4" style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs"
              style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              data-testid="button-toggle-import-details"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? t("collectionUi.importDetailsHide") : t("collectionUi.importDetailsShow")}
            </button>
            {showDetails && (
              <div style={{ maxHeight: 240, overflowY: "auto", marginTop: 8, border: "1px solid var(--labs-border)", borderRadius: 8, padding: 8 }} data-testid="list-import-details">
                {preview.updatedNames.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "var(--labs-info)", fontWeight: 700 }}>
                      {t("collectionUi.importConfirmUpdated")} ({preview.updatedNames.length})
                    </div>
                    {preview.updatedNames.map((n, i) => (
                      <div key={`u-${i}`} className="text-xs truncate py-0.5" style={{ color: "var(--labs-text)" }} data-testid={`text-import-overwrite-${i}`}>{n}</div>
                    ))}
                  </div>
                )}
                {preview.addedNames.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "var(--labs-success)", fontWeight: 700 }}>
                      {t("collectionUi.importConfirmAdded")} ({preview.addedNames.length})
                    </div>
                    {preview.addedNames.map((n, i) => (
                      <div key={`a-${i}`} className="text-xs truncate py-0.5" style={{ color: "var(--labs-text)" }} data-testid={`text-import-add-${i}`}>{n}</div>
                    ))}
                  </div>
                )}
                {preview.skippedNames.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "var(--labs-text-muted)", fontWeight: 700 }}>
                      {t("collectionUi.importConfirmSkipped")} ({preview.skippedNames.length})
                    </div>
                    {preview.skippedNames.map((n, i) => (
                      <div key={`s-${i}`} className="text-xs truncate py-0.5" style={{ color: "var(--labs-text-muted)" }} data-testid={`text-import-skip-${i}`}>{n}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={isImporting}
            className="labs-btn-secondary"
            style={{ padding: "8px 16px", fontSize: 14, opacity: isImporting ? 0.6 : 1 }}
            data-testid="button-import-confirm-cancel"
          >
            {t("collectionUi.importConfirmCancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isImporting}
            className="labs-btn-primary flex items-center gap-2"
            style={{ padding: "8px 16px", fontSize: 14, opacity: isImporting ? 0.7 : 1 }}
            data-testid="button-import-confirm-go"
          >
            {isImporting && <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} />}
            {t("collectionUi.importConfirmGo")}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyCollectionState({ onImport }: { onImport: () => void }) {
  return (
    <div className="labs-fade-in" style={{ minHeight: 340, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px" }} data-testid="labs-empty-collection">
      <div style={{
        width: 72, height: 72, borderRadius: 20, background: "var(--labs-accent-muted)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
      }}>
        <Archive className="w-8 h-8" style={{ color: "var(--labs-accent)" }} />
      </div>

      <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--labs-text)", textAlign: "center" }} data-testid="text-empty-title">
        Start Your Collection
      </h3>
      <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)", maxWidth: 300, lineHeight: 1.6, textAlign: "center" }}>
        Import your whisky collection from Whiskybase in just a few steps.
      </p>

      <div style={{
        width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12, marginBottom: 28,
      }}>
        <OnboardingStep
          number={1}
          icon={<Globe className="w-4 h-4" />}
          title="Go to Whiskybase"
          description={
            <span>
              Visit <a href="https://www.whiskybase.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--labs-accent)", textDecoration: "underline" }}>whiskybase.com</a> and sign in
            </span>
          }
        />
        <OnboardingStep
          number={2}
          icon={<FileDown className="w-4 h-4" />}
          title="Export your collection"
          description="Go to Profile → Collection → Export as CSV"
        />
        <OnboardingStep
          number={3}
          icon={<Upload className="w-4 h-4" />}
          title="Upload here"
          description="Import the CSV, XLS, or XLSX file below"
        />
      </div>

      <button
        onClick={onImport}
        className="labs-btn-primary flex items-center gap-2"
        style={{ padding: "12px 28px", fontSize: 15, borderRadius: 14 }}
        data-testid="button-labs-import-empty"
      >
        <Upload className="w-5 h-5" /> Import Collection
      </button>

      <p className="text-xs mt-4" style={{ color: "var(--labs-text-muted)", opacity: 0.7 }}>
        Supported: CSV, XLS, XLSX
      </p>
    </div>
  );
}

function OnboardingStep({ number, icon, title, description }: { number: number; icon: React.ReactNode; title: string; description: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3" data-testid={`onboarding-step-${number}`}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: "var(--labs-accent-muted)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        color: "var(--labs-accent)", fontSize: 13, fontWeight: 700,
      }}>
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--labs-text)" }}>
          {icon} {title}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)", lineHeight: 1.4 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function ImportProgressBar({ progress, onCancel, isCancelling }: { progress?: { status: string; processed: number; total: number } | undefined; onCancel?: () => void; isCancelling?: boolean }) {
  const { t } = useTranslation();
  const total = progress?.total ?? 0;
  const processed = progress?.processed ?? 0;
  const hasTotal = total > 0;
  const pct = hasTotal ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const label = hasTotal
    ? t("collectionUi.importProgress", { processed, total, defaultValue: "Imported {{processed}} of {{total}}…" })
    : t("collectionUi.importPreparing", { defaultValue: "Preparing import…" });
  return (
    <div
      style={{
        background: "var(--labs-surface)",
        border: "1px solid var(--labs-border)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
      }}
      data-testid="import-progress"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Loader2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
          <span className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }} data-testid="text-import-progress-label">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {hasTotal && (
            <span className="text-xs font-semibold" style={{ color: "var(--labs-accent)" }} data-testid="text-import-progress-pct">
              {pct}%
            </span>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isCancelling}
              className="text-xs font-semibold"
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid var(--labs-border)",
                background: "transparent",
                color: "var(--labs-text)",
                cursor: isCancelling ? "default" : "pointer",
                opacity: isCancelling ? 0.5 : 1,
              }}
              data-testid="button-cancel-import"
            >
              {isCancelling
                ? t("collectionUi.importCancelling", { defaultValue: "Cancelling…" })
                : t("collectionUi.importCancel", { defaultValue: "Cancel import" })}
            </button>
          )}
        </div>
      </div>
      <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--labs-border)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: hasTotal ? `${pct}%` : "30%",
            background: "var(--labs-accent)",
            transition: "width 0.3s ease-out",
            animation: hasTotal ? undefined : "pulse 1.5s ease-in-out infinite",
          }}
          data-testid="import-progress-fill"
        />
      </div>
      {onCancel && (
        <p className="text-xs mt-2" style={{ color: "var(--labs-text-muted)", lineHeight: 1.4 }} data-testid="text-import-cancel-note">
          {t("collectionUi.importCancelNote", { defaultValue: "Cancelling lets you choose: keep the bottles already imported, or discard them to start over with a clean slate." })}
        </p>
      )}
    </div>
  );
}

function ImportSyncSheet({
  hasCollection, isImporting, importProgress, isSyncing, syncHistory,
  expandedSyncLogId, setExpandedSyncLogId,
  showSyncHistory, setShowSyncHistory,
  onImport, onSync, onClose,
  onCancelImport, isCancellingImport,
  importHistory, onUndoImport, undoingImportId,
}: {
  hasCollection: boolean;
  isImporting: boolean;
  importProgress?: { status: string; processed: number; total: number } | undefined;
  isSyncing: boolean;
  syncHistory: any[];
  expandedSyncLogId: string | null;
  setExpandedSyncLogId: (id: string | null) => void;
  showSyncHistory: boolean;
  setShowSyncHistory: (v: boolean) => void;
  onImport: () => void;
  onSync: () => void;
  onClose: () => void;
  onCancelImport?: () => void;
  isCancellingImport?: boolean;
  importHistory?: any[];
  onUndoImport?: (logId: string) => void;
  undoingImportId?: string | null;
}) {
  const { t } = useTranslation();
  const [confirmUndoId, setConfirmUndoId] = useState<string | null>(null);
  const history = importHistory || [];
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
      data-testid="sheet-import-sync"
    >
      <div
        style={{
          width: "100%", maxWidth: 520,
          background: "var(--labs-bg)",
          borderRadius: "20px 20px 0 0",
          padding: "20px 24px 32px",
          maxHeight: "85vh",
          overflowY: "auto",
          animation: "sheetSlideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--labs-border)", margin: "0 auto 16px" }} />

        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--labs-text)" }} data-testid="text-sheet-title">
          {hasCollection ? t("collectionUi.importSync") : t("collectionUi.importCollection")}
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--labs-text-muted)", lineHeight: 1.5 }}>
          {hasCollection
            ? t("collectionUi.importSyncDesc")
            : t("collectionUi.importCollectionDesc")
          }
        </p>

        <div style={{
          background: "var(--labs-surface)",
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
          border: "1px solid var(--labs-border)",
        }}>
          <div className="flex items-center gap-2 mb-2">
            <FileSpreadsheet className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{t("collectionUi.supportedFormats")}</span>
          </div>
          <div className="flex gap-2 mb-3">
            {["CSV", "XLS", "XLSX"].map(fmt => (
              <span key={fmt} style={{
                fontSize: 11, fontWeight: 600, padding: "3px 10px",
                borderRadius: 6, background: "var(--labs-accent-muted)", color: "var(--labs-accent)",
              }}>{fmt}</span>
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)", lineHeight: 1.5 }}>
            {t("collectionUi.whiskybaseHintBefore")}
            <a href="https://www.whiskybase.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--labs-accent)", textDecoration: "underline" }}>
              whiskybase.com
            </a>
            {t("collectionUi.whiskybaseHintAfter")}
          </p>
        </div>

        {isImporting && (
          <ImportProgressBar
            progress={importProgress}
            onCancel={onCancelImport}
            isCancelling={isCancellingImport}
          />
        )}

        {hasCollection ? (
          <div className="flex flex-col gap-3 mb-4">
            <button
              onClick={onImport}
              disabled={isImporting}
              className="flex items-center gap-3"
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                border: "1px solid var(--labs-border)", background: "var(--labs-surface)",
                cursor: isImporting ? "default" : "pointer", textAlign: "left",
                opacity: isImporting ? 0.5 : 1,
              }}
              data-testid="button-labs-import-collection"
            >
              {isImporting
                ? <Loader2 className="w-5 h-5 flex-shrink-0" style={{ color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
                : <Upload className="w-5 h-5 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
              }
              <div style={{ flex: 1 }}>
                <div className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>
                  {isImporting ? t("collectionUi.importLoading") : t("collectionUi.newImport")}
                </div>
                <div className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("collectionUi.newImportDesc")}</div>
              </div>
              <ArrowRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
            </button>

            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-3"
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                border: "1px solid var(--labs-border)", background: "var(--labs-surface)",
                cursor: isSyncing ? "default" : "pointer", textAlign: "left",
                opacity: isSyncing ? 0.5 : 1,
              }}
              data-testid="button-labs-sync-collection"
            >
              {isSyncing
                ? <Loader2 className="w-5 h-5 flex-shrink-0" style={{ color: "var(--labs-accent)", animation: "spin 1s linear infinite" }} />
                : <RefreshCw className="w-5 h-5 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
              }
              <div style={{ flex: 1 }}>
                <div className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{t("collectionUi.syncWhiskybase")}</div>
                <div className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{t("collectionUi.syncWhiskybaseDesc")}</div>
              </div>
              <ArrowRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
            </button>
          </div>
        ) : (
          <button
            onClick={onImport}
            disabled={isImporting}
            className="labs-btn-primary flex items-center justify-center gap-2"
            style={{
              width: "100%", padding: "14px 16px", fontSize: 15, borderRadius: 12,
              marginBottom: 16, opacity: isImporting ? 0.5 : 1,
            }}
            data-testid="button-labs-import-collection"
          >
            {isImporting
              ? <Loader2 className="w-5 h-5" style={{ animation: "spin 1s linear infinite" }} />
              : <Upload className="w-5 h-5" />
            }
            {isImporting ? t("collectionUi.importLoading") : t("collectionUi.chooseFile")}
          </button>
        )}

        {history.length > 0 && (
          <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 12, marginBottom: 12 }} data-testid="labs-import-history-panel">
            <div className="flex items-center gap-2 mb-2" style={{ color: "var(--labs-text-muted)" }}>
              <History className="w-3.5 h-3.5" />
              <span className="text-xs">
                {t("collectionUi.importHistory", { defaultValue: "Recent imports" })} ({history.length})
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {history.slice(0, 5).map((log: any) => {
                const s = log.summary || { imported: 0, updated: 0, skipped: 0, total: 0 };
                const undone = !!log.undone;
                const isUndoing = undoingImportId === log.id;
                const canUndo = !undone && (log.addedCount > 0 || log.updatedCount > 0);
                return (
                  <div
                    key={log.id}
                    style={{
                      border: "1px solid var(--labs-border)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      opacity: undone ? 0.55 : 1,
                    }}
                    data-testid={`import-log-${log.id}`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                      <span className="text-xs" style={{ color: "var(--labs-text-secondary)" }}>
                        {new Date(log.importedAt).toLocaleDateString("de-DE")} {new Date(log.importedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <div className="flex gap-1.5 ml-auto">
                        {s.imported > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "var(--labs-success)" }}>
                            +{s.imported}
                          </span>
                        )}
                        {s.updated > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "var(--labs-info)" }}>
                            {s.updated} {t("collectionUi.badgeUpd")}
                          </span>
                        )}
                        {s.skipped > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(148,163,184,0.15)", color: "var(--labs-text-muted)" }}>
                            {s.skipped} skipped
                          </span>
                        )}
                      </div>
                    </div>
                    {log.filename && (
                      <div className="text-[10px] mt-1 truncate" style={{ color: "var(--labs-text-muted)" }}>
                        {log.filename}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {undone ? (
                        <span className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>
                          {t("collectionUi.importUndone", { defaultValue: "Undone" })}
                          {log.undoneAt ? ` · ${new Date(log.undoneAt).toLocaleDateString("de-DE")}` : ""}
                        </span>
                      ) : confirmUndoId === log.id ? (
                        <>
                          <span className="text-[11px]" style={{ color: "var(--labs-text-secondary)", flex: 1 }}>
                            {t("collectionUi.importUndoConfirm", {
                              added: log.addedCount,
                              updated: log.updatedCount,
                              defaultValue: "Remove {{added}} added bottles and restore {{updated}} previous values?",
                            })}
                          </span>
                          <button
                            onClick={() => setConfirmUndoId(null)}
                            disabled={isUndoing}
                            style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, border: "1px solid var(--labs-border)", background: "transparent", color: "var(--labs-text-muted)", cursor: "pointer" }}
                            data-testid={`button-cancel-undo-${log.id}`}
                          >
                            {t("collectionUi.cancel", { defaultValue: "Cancel" })}
                          </button>
                          <button
                            onClick={() => { onUndoImport?.(log.id); setConfirmUndoId(null); }}
                            disabled={isUndoing}
                            style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, border: "none", background: "var(--labs-danger)", color: "var(--labs-bg)", fontWeight: 600, cursor: "pointer", opacity: isUndoing ? 0.6 : 1 }}
                            data-testid={`button-confirm-undo-import-${log.id}`}
                          >
                            {isUndoing ? <Loader2 className="w-3 h-3 inline" style={{ animation: "spin 1s linear infinite" }} /> : t("collectionUi.importUndoConfirmBtn", { defaultValue: "Yes, undo" })}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmUndoId(log.id)}
                          disabled={!canUndo || isUndoing}
                          style={{
                            padding: "4px 10px", fontSize: 11, borderRadius: 6,
                            border: "1px solid var(--labs-border)",
                            background: "transparent",
                            color: canUndo ? "var(--labs-danger)" : "var(--labs-text-muted)",
                            cursor: canUndo ? "pointer" : "not-allowed",
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}
                          data-testid={`button-undo-import-${log.id}`}
                        >
                          <RefreshCw className="w-3 h-3" />
                          {t("collectionUi.undoImport", { defaultValue: "Undo import" })}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {syncHistory.length > 0 && (
          <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 12 }}>
            <button
              onClick={() => setShowSyncHistory(!showSyncHistory)}
              className="flex items-center gap-2 w-full"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 0", color: "var(--labs-text-muted)" }}
              data-testid="button-labs-sync-history"
            >
              <History className="w-3.5 h-3.5" />
              <span className="text-xs">{t("collectionUi.syncHistory")} ({syncHistory.length})</span>
              {showSyncHistory ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>

            {showSyncHistory && (
              <div className="flex flex-col gap-2 mt-2" data-testid="labs-sync-history-panel">
                {syncHistory.map((log: any) => {
                  const expanded = expandedSyncLogId === log.id;
                  const s = log.summary;
                  return (
                    <div key={log.id} style={{ border: "1px solid var(--labs-border)", borderRadius: 8, overflow: "hidden" }} data-testid={`sync-log-${log.id}`}>
                      <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => setExpandedSyncLogId(expanded ? null : log.id)}>
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--labs-text-secondary)" }}>{new Date(log.syncedAt).toLocaleDateString("de-DE")} {new Date(log.syncedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                        <div className="flex gap-1.5 ml-auto">
                          {s.added > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "var(--labs-success)" }}>+{s.added}</span>}
                          {s.updated > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "var(--labs-info)" }}>{s.updated} {t("collectionUi.badgeUpd")}</span>}
                          {s.conflicts > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color: "#e6a800" }}>{s.conflicts} {t("collectionUi.badgeConf")}</span>}
                          {s.removed > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "var(--labs-danger)" }}>-{s.removed}</span>}
                        </div>
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />}
                      </div>
                      {expanded && log.details && (
                        <div style={{ borderTop: "1px solid var(--labs-border)", padding: "8px 12px", maxHeight: 300, overflowY: "auto" }}>
                          {log.details.map((d: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 py-1.5" style={{ borderBottom: idx < log.details.length - 1 ? "1px solid var(--labs-border)" : "none" }}>
                              <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5" style={{
                                background: d.action === "added" ? "rgba(34,197,94,0.1)" : d.action === "removed" ? "rgba(239,68,68,0.1)" : d.action === "conflict" ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.1)",
                                color: d.action === "added" ? "var(--labs-success)" : d.action === "removed" ? "var(--labs-danger)" : d.action === "conflict" ? "#e6a800" : "var(--labs-info)",
                                fontWeight: 600,
                              }}>{d.action}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span className="text-xs truncate block" style={{ color: "var(--labs-text)" }}>{d.name}</span>
                                {d.changes && d.changes.length > 0 && (
                                  <div className="mt-1">
                                    {d.changes.map((ch: any, ci: number) => (
                                      <div key={ci} className="text-[10px]" style={{ color: ch.source === "casksense" ? "#e6a800" : "var(--labs-text-muted)" }}>
                                        {ch.field}: {String(ch.oldValue ?? "-")} {ch.source === "casksense" ? "kept (CS)" : `\u2192 ${String(ch.newValue ?? "-")} (WB)`}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OverflowItem({ icon, label, onClick, testId }: { icon: React.ReactNode; label: string; onClick: () => void; testId: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full"
      style={{
        padding: "10px 12px", borderRadius: 8, border: "none",
        background: "transparent", cursor: "pointer", textAlign: "left",
        color: "var(--labs-text)", fontSize: 13,
      }}
      data-testid={testId}
    >
      <span style={{ color: "var(--labs-text-muted)" }}>{icon}</span>
      {label}
    </button>
  );
}

function SyncResultDialog({ result, onClose }: { result: { added: number; updated: number; removed: number; conflicts: number; unchanged: number; details?: Array<{ name: string; action: string; changes?: Array<{ field: string; oldValue: string; newValue: string; source: string }> }> }; onClose: () => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const details = result.details || [];
  const hasChanges = details.length > 0;

  return (
    <div className="labs-overlay" style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--overlay-backdrop)", backdropFilter: "var(--overlay-blur)", WebkitBackdropFilter: "var(--overlay-blur)", zIndex: 9999 }} data-testid="dialog-sync-result">
      <div className="labs-card" style={{ maxWidth: 480, width: "90%", padding: 24, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <h3 className="labs-h3 mb-3" style={{ color: "var(--labs-text)" }}>Sync Complete</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {result.added > 0 && <div className="flex items-center gap-2 text-sm"><span style={{ color: "var(--labs-success)", fontWeight: 700 }}>+{result.added}</span> <span style={{ color: "var(--labs-text-muted)" }}>added</span></div>}
          {result.updated > 0 && <div className="flex items-center gap-2 text-sm"><span style={{ color: "var(--labs-info)", fontWeight: 700 }}>{result.updated}</span> <span style={{ color: "var(--labs-text-muted)" }}>updated</span></div>}
          {result.removed > 0 && <div className="flex items-center gap-2 text-sm"><span style={{ color: "var(--labs-danger)", fontWeight: 700 }}>-{result.removed}</span> <span style={{ color: "var(--labs-text-muted)" }}>removed</span></div>}
          {result.conflicts > 0 && <div className="flex items-center gap-2 text-sm"><span style={{ color: "#e6a800", fontWeight: 700 }}>{result.conflicts}</span> <span style={{ color: "var(--labs-text-muted)" }}>conflicts (CS kept)</span></div>}
          {result.unchanged > 0 && <div className="flex items-center gap-2 text-sm"><span style={{ color: "var(--labs-text-muted)", fontWeight: 700 }}>{result.unchanged}</span> <span style={{ color: "var(--labs-text-muted)" }}>unchanged</span></div>}
        </div>
        {result.conflicts > 0 && (
          <p className="text-xs mb-3" style={{ color: "#e6a800" }}>
            Fields you changed in CaskSense were kept. Whiskybase values were logged but not applied.
          </p>
        )}
        {hasChanges && (
          <div className="mb-3">
            <button onClick={() => setShowDetails(!showDetails)} className="flex items-center gap-1 text-xs" style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }} data-testid="button-toggle-sync-details">
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? "Hide" : "Show"} details ({details.length} bottles)
            </button>
            {showDetails && (
              <div style={{ maxHeight: 260, overflowY: "auto", marginTop: 8, border: "1px solid var(--labs-border)", borderRadius: 8, padding: 8 }}>
                {details.map((d, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-1.5" style={{ borderBottom: idx < details.length - 1 ? "1px solid var(--labs-border)" : "none" }}>
                    <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5" style={{
                      background: d.action === "added" ? "rgba(34,197,94,0.1)" : d.action === "removed" ? "rgba(239,68,68,0.1)" : d.action === "conflict" ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.1)",
                      color: d.action === "added" ? "var(--labs-success)" : d.action === "removed" ? "var(--labs-danger)" : d.action === "conflict" ? "#e6a800" : "var(--labs-info)",
                      fontWeight: 600,
                    }}>{d.action}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="text-xs truncate block" style={{ color: "var(--labs-text)" }}>{d.name}</span>
                      {d.changes && d.changes.length > 0 && (
                        <div className="mt-1">
                          {d.changes.map((ch, ci) => (
                            <div key={ci} className="text-[10px]" style={{ color: ch.source === "casksense" ? "#e6a800" : "var(--labs-text-muted)" }}>
                              {ch.field}: {String(ch.oldValue ?? "-")} {ch.source === "casksense" ? "kept (CS)" : `\u2192 ${String(ch.newValue ?? "-")} (WB)`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={onClose} className="labs-btn-primary" style={{ padding: "8px 20px", fontSize: 14 }} data-testid="button-close-sync-result">OK</button>
        </div>
      </div>
    </div>
  );
}
