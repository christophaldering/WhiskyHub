import { useState, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { collectionApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Link } from "wouter";
import {
  Upload, Search, Trash2, Archive, Loader2, Check, ArrowUpDown,
  BarChart3, Star, RefreshCw, Sparkles, X, CheckSquare,
  FileSpreadsheet, FileText, Download, ChevronDown, ChevronUp, ArrowLeft,
} from "lucide-react";
import type { WhiskybaseCollectionItem } from "@shared/schema";

type SortKey = "name" | "rating" | "price" | "added";
type StatusFilter = "all" | "open" | "closed" | "empty";

export default function LabsTasteCollection() {
  const { t } = useTranslation();
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

  const statusColor = (s: string | null) => s === "open" ? "var(--labs-success)" : s === "closed" ? "var(--labs-info)" : "var(--labs-text-muted)";
  const statusLabel = (s: string | null) => s === "open" ? "Open" : s === "closed" ? "Closed" : s === "empty" ? "Empty" : (s || "");

  const downloadCsv = (itemsToExport: WhiskybaseCollectionItem[]) => {
    const headers = ["Name", "Brand", "Distillery", "Age", "ABV", "Status", "Series", "Cask", "Size", "Rating", "Price Paid", "Currency", "Estimated Price", "Added"];
    const rows = itemsToExport.map(i => [i.name, i.brand || "", i.distillery || "", i.statedAge || "", i.abv || "", i.status || "", i.bottlingSeries || "", i.caskType || "", i.size || "", i.communityRating?.toFixed(1) || "", i.pricePaid?.toFixed(2) || "", i.currency || "", i.estimatedPrice?.toFixed(2) || "", i.addedAt || ""]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `whisky-collection-${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const getExportItems = (): WhiskybaseCollectionItem[] => selectMode && selectedIds.size > 0 ? filtered.filter(i => selectedIds.has(i.id)) : filtered;

  if (!session.signedIn) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-taste-collection">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/labs/taste"><button style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}><ArrowLeft className="w-4 h-4" /></button></Link>
          <h1 className="labs-serif text-xl font-semibold" style={{ color: "var(--labs-text)" }}>Collection</h1>
        </div>
        <div className="labs-empty" style={{ minHeight: 200 }}>
          <Archive className="w-10 h-10 mb-3" style={{ color: "var(--labs-accent)" }} />
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Sign in to access your collection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" style={{ paddingBottom: selectMode ? 140 : 80 }} data-testid="labs-taste-collection">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { importMutation.mutate(f); e.target.value = ""; } }} data-testid="input-labs-import-file" />
      <input ref={syncFileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} data-testid="input-labs-sync-file" />

      <div className="flex items-center gap-3 mb-1">
        <Link href="/labs/taste"><button style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }} data-testid="button-labs-back-taste"><ArrowLeft className="w-4 h-4" /></button></Link>
        <h1 className="labs-serif text-xl font-semibold" style={{ color: "var(--labs-text)" }} data-testid="labs-collection-title">Collection</h1>
      </div>
      {items.length > 0 && <p className="text-sm mb-5" style={{ color: "var(--labs-text-muted)", marginLeft: 28 }}>{items.length} bottles</p>}

      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
          <ActionBtn icon={<BarChart3 className="w-4 h-4" />} label="Stats" onClick={() => setShowStats(!showStats)} active={showStats} testId="button-labs-toggle-stats" />
          {!priceSelectMode && <ActionBtn icon={<Sparkles className="w-4 h-4" />} label="AI Prices" onClick={() => { setPriceSelectMode(true); setSelectedForPrice(new Set()); setSelectMode(false); }} testId="button-labs-start-price-estimate" />}
          <ActionBtn icon={importMutation.isPending ? <Loader2 className="w-4 h-4" style={{ animation: "spin 1s linear infinite" }} /> : <Upload className="w-4 h-4" />} label="Import" onClick={() => fileInputRef.current?.click()} primary disabled={importMutation.isPending} testId="button-labs-import-collection" />
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
                <div className="labs-serif text-lg font-bold" style={{ color: s.color || "var(--labs-accent)" }}>{s.value}</div>
                <div className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
          {stats.avgRating && <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Avg Rating: <span style={{ color: "var(--labs-accent)", fontWeight: 600 }}>{stats.avgRating}</span></p>}
          {stats.totalValue > 0 && <p className="text-xs mt-1" style={{ color: "var(--labs-text-muted)" }}>Total Value: <span style={{ color: "var(--labs-accent)", fontWeight: 600 }}>{stats.totalValue.toFixed(0)} EUR</span></p>}
          {stats.topDistilleries.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--labs-text-muted)" }}>Top Distilleries</p>
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
              style={{ padding: "5px 10px", fontSize: 10, fontWeight: sortBy === sk ? 600 : 400, color: sortBy === sk ? "var(--labs-accent)" : "var(--labs-text-muted)", background: "transparent", border: `1px solid ${sortBy === sk ? "var(--labs-accent)" : "var(--labs-border)"}`, borderRadius: 16, cursor: "pointer" }}
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
        <div className="labs-empty" style={{ minHeight: 200 }}>
          <Archive className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <h3 className="text-base font-semibold mb-1" style={{ color: "var(--labs-text)" }}>No bottles yet</h3>
          <p className="text-sm mb-4" style={{ color: "var(--labs-text-muted)" }}>Import your Whiskybase collection</p>
          <button onClick={() => fileInputRef.current?.click()} className="labs-btn-primary flex items-center gap-2" data-testid="button-labs-import-empty"><Upload className="w-4 h-4" /> Import CSV/Excel</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-xs mb-1" style={{ color: "var(--labs-text-muted)" }}>{filtered.length} of {items.length} bottles</div>
          {filtered.map((item: WhiskybaseCollectionItem) => {
            const expanded = expandedId === item.id;
            const isSelected = selectMode && selectedIds.has(item.id);
            const isPriceSelected = priceSelectMode && selectedForPrice.has(item.id);
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
                    {item.status && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: statusColor(item.status), border: `1px solid ${statusColor(item.status)}` }}>{statusLabel(item.status)}</span>}
                    {item.communityRating && <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: "var(--labs-accent)" }}><Star className="w-3 h-3" />{item.communityRating.toFixed(1)}</span>}
                    {!selectMode && !priceSelectMode && (expanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />)}
                  </div>
                </div>

                {expanded && (
                  <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--labs-border)" }}>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs" style={{ color: "var(--labs-text-secondary)" }}>
                      {item.caskType && <div><span style={{ color: "var(--labs-text-muted)" }}>Cask:</span> {item.caskType}</div>}
                      {item.bottlingSeries && <div><span style={{ color: "var(--labs-text-muted)" }}>Series:</span> {item.bottlingSeries}</div>}
                      {item.size && <div><span style={{ color: "var(--labs-text-muted)" }}>Size:</span> {item.size}</div>}
                      {item.addedAt && <div><span style={{ color: "var(--labs-text-muted)" }}>Added:</span> {item.addedAt.split(" ")[0]}</div>}
                      {item.pricePaid != null && <div><span style={{ color: "var(--labs-text-muted)" }}>Paid:</span> {item.pricePaid.toFixed(2)} {item.currency || "EUR"}</div>}
                      {item.estimatedPrice != null && <div><span style={{ color: "var(--labs-text-muted)" }}>Est:</span> {item.estimatedPrice.toFixed(2)} EUR</div>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => toJournalMutation.mutate(item.id)} className="labs-btn-secondary flex items-center gap-1" style={{ padding: "5px 10px", fontSize: 11 }} data-testid={`button-labs-to-journal-${item.id}`}>
                        <Star className="w-3 h-3" /> To Journal
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
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} data-testid="dialog-labs-delete-collection">
          <div className="labs-card" style={{ maxWidth: 380, width: "90%", padding: 24 }}>
            <h3 className="labs-serif text-lg font-bold mb-2" style={{ color: "var(--labs-text)" }}>Delete Bottle</h3>
            <p className="text-sm mb-5" style={{ color: "var(--labs-text-secondary)" }}>Remove "{deleteTarget.name}" from your collection?</p>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="labs-btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }}>Cancel</button>
              <button onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--labs-bg)", background: "var(--labs-danger)", border: "none", borderRadius: 8, cursor: "pointer", opacity: deleteMutation.isPending ? 0.6 : 1 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }}>
          <div className="labs-card" style={{ maxWidth: 380, width: "90%", padding: 24 }}>
            <h3 className="labs-serif text-lg font-bold mb-2" style={{ color: "var(--labs-text)" }}>Delete {selectedIds.size} bottles?</h3>
            <p className="text-sm mb-5" style={{ color: "var(--labs-text-secondary)" }}>This cannot be undone.</p>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setBulkDeleteConfirm(false)} className="labs-btn-secondary" style={{ padding: "8px 16px", fontSize: 14 }}>Cancel</button>
              <button onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))} disabled={bulkDeleteMutation.isPending} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "var(--labs-bg)", background: "var(--labs-danger)", border: "none", borderRadius: 8, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
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
