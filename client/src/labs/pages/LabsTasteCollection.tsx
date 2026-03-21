import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { collectionApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { Link, useLocation } from "wouter";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import {
  Upload, Search, Trash2, Archive, Loader2, Check, ArrowUpDown,
  BarChart3, Star, RefreshCw, Sparkles, X, CheckSquare,
  FileSpreadsheet, FileText, Download, ChevronDown, ChevronUp, ChevronLeft,
  ExternalLink, Clock, AlertTriangle, History,
} from "lucide-react";
import type { WhiskybaseCollectionItem } from "@shared/schema";

type SortKey = "name" | "rating" | "price" | "added";
type StatusFilter = "all" | "open" | "closed" | "empty";

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
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState("");
  const [syncResultDialog, setSyncResultDialog] = useState<any>(null);
  const [showSyncHistory, setShowSyncHistory] = useState(false);
  const [expandedSyncLogId, setExpandedSyncLogId] = useState<string | null>(null);

  const pid = session.pid;

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

  const importMutation = useMutation({
    mutationFn: (file: File) => collectionApi.importFile(pid!, file),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collection"] }); },
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["collection"] }); setPriceSelectMode(false); setSelectedForPrice(new Set()); setRateLimitDate(null); },
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

  const statusColor = (s: string | null) => s === "open" ? "var(--labs-success)" : s === "closed" ? "var(--labs-info)" : "var(--labs-text-muted)";
  const statusLabel = (s: string | null) => s === "open" ? "Open" : s === "closed" ? "Closed" : s === "empty" ? "Empty" : (s || "");

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
      setSyncResultDialog({ ...applyResult, details });
    } catch {}
  };

  if (!session.signedIn) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-taste-collection">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBackToTaste} className="labs-btn-ghost flex items-center gap-1 -ml-2" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-taste"><ChevronLeft className="w-4 h-4" /> Taste</button>
          <h1 className="labs-h2" style={{ color: "var(--labs-text)" }}>Collection</h1>
        </div>
        <AuthGateMessage
          icon={<Archive className="w-10 h-10" style={{ color: "var(--labs-accent)" }} />}
          message="Sign in to access your collection"
          className="labs-empty"
          compact
        />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" style={{ paddingBottom: selectMode ? 140 : 80 }} data-testid="labs-taste-collection">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { importMutation.mutate(f); e.target.value = ""; } }} data-testid="input-labs-import-file" />
      <input ref={syncFileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleSyncFile(f); e.target.value = ""; } }} data-testid="input-labs-sync-file" />

      <div className="flex items-center gap-3 mb-1">
        <button onClick={goBackToTaste} className="labs-btn-ghost flex items-center gap-1 -ml-2" style={{ color: "var(--labs-text-muted)" }} data-testid="button-labs-back-taste"><ChevronLeft className="w-4 h-4" /> Taste</button>
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-collection-title">Collection</h1>
      </div>
      {items.length > 0 && <p className="text-sm mb-5" style={{ color: "var(--labs-text-muted)", marginLeft: 28 }}>{items.length} bottles</p>}

      {isSyncStale && items.length > 0 && (
        <div className="labs-card p-3 mb-4 flex items-center gap-3" style={{ background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.25)" }} data-testid="banner-sync-stale">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#e6a800" }} />
          <p className="text-xs" style={{ color: "var(--labs-text-secondary)", flex: 1 }}>
            Last sync was {lastSyncDate ? Math.floor((Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24)) : "?"} days ago. Consider syncing your Whiskybase export.
          </p>
          <button onClick={() => syncFileInputRef.current?.click()} className="labs-btn-secondary" style={{ padding: "4px 10px", fontSize: 11, flexShrink: 0 }} data-testid="button-sync-stale">
            <RefreshCw className="w-3 h-3" /> Sync
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          <ActionBtn icon={<BarChart3 className="w-4 h-4" />} label="Stats" onClick={() => setShowStats(!showStats)} active={showStats} testId="button-labs-toggle-stats" />
          {!priceSelectMode && <ActionBtn icon={<Sparkles className="w-4 h-4" />} label="AI Prices" onClick={() => { setPriceSelectMode(true); setSelectedForPrice(new Set()); setSelectMode(false); }} testId="button-labs-start-price-estimate" />}
          <ActionBtn icon={importMutation.isPending ? <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} /> : <Upload className="w-4 h-4" />} label="Import" onClick={() => fileInputRef.current?.click()} primary disabled={importMutation.isPending} testId="button-labs-import-collection" />
          <ActionBtn icon={(syncMutation.isPending || syncApplyMutation.isPending) ? <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw className="w-4 h-4" />} label="Sync" onClick={() => syncFileInputRef.current?.click()} disabled={syncMutation.isPending || syncApplyMutation.isPending} testId="button-labs-sync-collection" />
          <ActionBtn icon={<History className="w-4 h-4" />} label="History" onClick={() => setShowSyncHistory(!showSyncHistory)} active={showSyncHistory} testId="button-labs-sync-history" />
          <ActionBtn icon={<CheckSquare className="w-4 h-4" />} label={selectMode ? "Cancel" : "Select"} onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); if (!selectMode) { setPriceSelectMode(false); } }} active={selectMode} testId="button-labs-toggle-select" />
        </div>
      )}

      {priceSelectMode && (
        <div className="labs-card p-4 mb-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
          <div style={{ flex: 1 }}>
            <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Select bottles for price estimation</p>
            {selectedForPrice.size > 0 && <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{selectedForPrice.size} selected</p>}
            {rateLimitDate && <p className="text-xs mt-1" style={{ color: "var(--labs-accent)" }}>Rate limited until {rateLimitDate}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedForPrice(new Set(filtered.map(i => i.id)))} className="labs-btn-secondary" style={{ padding: "6px 10px", fontSize: 12 }} data-testid="button-labs-select-all-price"><Check className="w-3.5 h-3.5" /> All</button>
            <button onClick={() => priceEstimateMutation.mutate(Array.from(selectedForPrice))} disabled={selectedForPrice.size === 0 || priceEstimateMutation.isPending} className="labs-btn-primary" style={{ padding: "6px 10px", fontSize: 12, opacity: selectedForPrice.size === 0 ? 0.5 : 1 }} data-testid="button-labs-estimate-prices">
              {priceEstimateMutation.isPending ? <Loader2 className="w-3.5 h-3.5" style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles className="w-3.5 h-3.5" />} Estimate
            </button>
            <button onClick={() => { setPriceSelectMode(false); setSelectedForPrice(new Set()); }} style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {showSyncHistory && (
        <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="labs-sync-history-panel">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Sync History</h3>
            <button onClick={() => setShowSyncHistory(false)} style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }}><X className="w-4 h-4" /></button>
          </div>
          {syncHistory.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>No syncs recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
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
                        {s.updated > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "var(--labs-info)" }}>{s.updated} upd</span>}
                        {s.conflicts > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color: "#e6a800" }}>{s.conflicts} conf</span>}
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

      {showStats && (
        <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="labs-collection-stats">
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: "Total", value: stats.total },
              { label: "Open", value: stats.open, color: "var(--labs-success)" },
              { label: "Closed", value: stats.closed, color: "var(--labs-info)" },
              { label: "Empty", value: stats.empty },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="labs-h3" style={{ color: s.color || "var(--labs-accent)" }}>{s.value}</div>
                <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
          {stats.avgRating && <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Avg Rating: <span style={{ color: "var(--labs-accent)", fontWeight: 600 }}>{stats.avgRating}</span></p>}
          {stats.totalValue > 0 && <p className="text-xs mt-1" style={{ color: "var(--labs-text-muted)" }}>Total Value: <span style={{ color: "var(--labs-accent)", fontWeight: 600 }}>{stats.totalValue.toFixed(0)} EUR</span></p>}
          {stats.topDistilleries.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--labs-text-muted)" }}>Top Distilleries</p>
              <div className="flex flex-wrap gap-1">
                {stats.topDistilleries.map(([name, count]) => (
                  <span key={name} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>{name} ({count})</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3" style={{ top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--labs-text-muted)" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search collection..."
            style={{ width: "100%", padding: "10px 12px 10px 36px", background: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: 10, fontSize: 14, color: "var(--labs-text)", outline: "none", boxSizing: "border-box" }}
            data-testid="input-labs-search-collection" />
        </div>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {(["all", "open", "closed", "empty"] as StatusFilter[]).map(sf => (
          <button key={sf} onClick={() => setStatusFilter(sf)}
            style={{ padding: "5px 12px", fontSize: 11, fontWeight: statusFilter === sf ? 600 : 400, color: statusFilter === sf ? "var(--labs-accent)" : "var(--labs-text-muted)", background: statusFilter === sf ? "var(--labs-accent-muted)" : "transparent", border: `1px solid ${statusFilter === sf ? "var(--labs-accent)" : "var(--labs-border)"}`, borderRadius: 16, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
            data-testid={`labs-status-${sf}`}>{sf === "all" ? "All" : statusLabel(sf)}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {(["name", "rating", "price", "added"] as SortKey[]).map(sk => (
            <button key={sk} onClick={() => setSortBy(sk)}
              style={{ padding: "5px 10px", fontSize: 11, fontWeight: sortBy === sk ? 600 : 400, color: sortBy === sk ? "var(--labs-accent)" : "var(--labs-text-muted)", background: "transparent", border: `1px solid ${sortBy === sk ? "var(--labs-accent)" : "var(--labs-border)"}`, borderRadius: 16, cursor: "pointer" }}
              data-testid={`labs-sort-${sk}`}>{sk.charAt(0).toUpperCase() + sk.slice(1)}</button>
          ))}
        </div>
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
        <div className="labs-empty" style={{ minHeight: 280 }}>
          <Archive className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <h3 className="text-base font-semibold mb-1" style={{ color: "var(--labs-text)" }}>No bottles yet</h3>
          <p className="text-sm mb-5" style={{ color: "var(--labs-text-muted)", maxWidth: 320, lineHeight: 1.5 }}>Import your collection from Whiskybase or any spreadsheet with whisky data.</p>
          <button onClick={() => fileInputRef.current?.click()} className="labs-btn-primary flex items-center gap-2" style={{ marginBottom: 12 }} data-testid="button-labs-import-empty"><Upload className="w-4 h-4" /> Import CSV / Excel</button>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            <p className="text-xs" style={{ color: "var(--labs-text-muted)", maxWidth: 280, lineHeight: 1.5, textAlign: "center" }}>
              Export your collection from <a href="https://www.whiskybase.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--labs-accent)", textDecoration: "underline" }}>Whiskybase.com</a> as CSV, then import it here.
            </p>
            <p className="text-xs" style={{ color: "var(--labs-text-muted)", opacity: 0.75 }}>Supported formats: CSV, XLS, XLSX</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-xs mb-1" style={{ color: "var(--labs-text-muted)" }}>{filtered.length} of {items.length} bottles</div>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>{item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--labs-text-muted)" }}>
                      {item.distillery && <span>{item.distillery}</span>}
                      {item.statedAge && <span>{item.statedAge}</span>}
                      {item.abv && <span>{item.abv}</span>}
                    </div>
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
                        <Star className="w-3 h-3" fill="currentColor" />{item.personalRating.toFixed(1)}
                      </span>
                    )}
                    {item.communityRating != null && item.communityRating > 0 && !item.personalRating && (
                      <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: "var(--labs-text-muted)" }}>
                        <Star className="w-3 h-3" />{item.communityRating.toFixed(1)}
                      </span>
                    )}
                    {!selectMode && !priceSelectMode && (expanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />)}
                  </div>
                </div>

                {expanded && (
                  <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--labs-border)" }}>
                    <div className="flex items-center gap-2 mt-3 mb-2">
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

                    <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--labs-text-secondary)" }}>
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && items.length > 0 && !selectMode && (
        <div className="flex gap-2 mt-4 justify-center">
          <button onClick={() => downloadCsv(getExportItems())} className="labs-btn-secondary flex items-center gap-1" style={{ fontSize: 12 }} data-testid="button-labs-export-csv"><FileText className="w-3.5 h-3.5" /> CSV</button>
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
    </div>
  );
}

function ActionBtn({ icon, label, onClick, primary, active, disabled, testId }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean; active?: boolean; disabled?: boolean; testId: string }) {
  return (
    <button onClick={onClick} disabled={disabled} data-testid={testId}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 14px", borderRadius: 12, border: "none", cursor: disabled ? "default" : "pointer", background: primary ? "var(--labs-accent)" : active ? "var(--labs-accent-muted)" : "var(--labs-surface)", color: primary ? "var(--labs-bg)" : active ? "var(--labs-accent)" : "var(--labs-text)", opacity: disabled ? 0.4 : 1, fontSize: 11, fontWeight: 500, minWidth: 64, transition: "all 0.15s" }}>
      {icon}<span>{label}</span>
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
        <div className="grid grid-cols-2 gap-2 mb-4">
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
