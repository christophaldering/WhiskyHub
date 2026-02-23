import { useState, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { collectionApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        item.changes.forEach((c: SyncChange) => {
          decisions[`${item.existingId}-${c.field}`] = "new";
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
      item.changes.forEach((c) => {
        const decision = changeDecisions[`${item.existingId}-${c.field}`];
        if (decision === "new") {
          updates[c.field] = c.new;
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
    const mainCurrency = currencies.length ? currencies.sort((a, b) => currencies.filter((c) => c === b).length - currencies.filter((c) => c === a).length)[0] : "EUR";

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
      <GuestPreview featureTitle={t("wishlist.title")} featureDescription={t("guestPreview.wishlist")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("wishlist.title")}</h1>
          <div className="grid gap-3">
            {[{name: "Lagavulin 16", distillery: "Lagavulin", region: "Islay"}, {name: "Glenfarclas 25", distillery: "Glenfarclas", region: "Speyside"}, {name: "Springbank 15", distillery: "Springbank", region: "Campbeltown"}].map(w => (
              <div key={w.name} className="bg-card rounded-xl border p-4 flex items-center justify-between">
                <div><div className="font-serif font-semibold">{w.name}</div><div className="text-sm text-muted-foreground">{w.distillery} · {w.region}</div></div>
                <div className="text-yellow-500">★</div>
              </div>
            ))}
          </div>
        </div>
      </GuestPreview>
    );
  }

  const statusColor = (s: string | null) => {
    switch (s) {
      case "open": return "bg-green-500/10 text-green-400 border-green-500/20";
      case "closed": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "empty": return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
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

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display" data-testid="text-collection-title">
            {t("collection.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("collection.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              data-testid="button-toggle-stats"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              {t("collection.statistics")}
            </Button>
          )}
          {items.length > 0 && !priceSelectMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPriceSelectMode(true);
                setSelectedForPrice(new Set());
              }}
              data-testid="button-start-price-estimate"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              {t("collection.estimatePrices")}
            </Button>
          )}
          {items.length > 0 && (
            <Button
              variant="outline"
              onClick={() => syncFileInputRef.current?.click()}
              disabled={syncMutation.isPending}
              data-testid="button-sync-collection"
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {syncMutation.isPending ? t("collection.syncing") : t("collection.syncButton")}
            </Button>
          )}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            data-testid="button-import-collection"
          >
            {importMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {importMutation.isPending ? t("collection.importing") : t("collection.importButton")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
            data-testid="input-import-file"
          />
          <input
            ref={syncFileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleSyncUpload}
            data-testid="input-sync-file"
          />
        </div>
      </div>

      {items.length > 0 && !priceSelectMode && (
        <p className="text-xs text-muted-foreground">{t("collection.reimportHint")}</p>
      )}

      {priceSelectMode && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
          <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t("collection.selectForEstimate")}</p>
            {selectedForPrice.size > 0 && (
              <p className="text-xs text-muted-foreground">{t("collection.selectedCount", { count: selectedForPrice.size })}</p>
            )}
            {rateLimitDate && !isAdmin && (
              <p className="text-xs text-amber-500 mt-1">{t("collection.rateLimited", { date: rateLimitDate })}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={selectAllForPrice}
              data-testid="button-select-all-price"
            >
              <Check className="w-3 h-3 mr-1" />
              {t("collection.filterAll")}
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={selectedForPrice.size === 0 || priceEstimateMutation.isPending}
              onClick={() => priceEstimateMutation.mutate(Array.from(selectedForPrice))}
              data-testid="button-run-price-estimate"
            >
              {priceEstimateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1" />
              )}
              {priceEstimateMutation.isPending ? t("collection.estimatingPrices") : t("collection.estimatePrices")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPriceSelectMode(false);
                setSelectedForPrice(new Set());
              }}
              data-testid="button-cancel-price-select"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showStats && stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="bg-card border rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">{t("collection.totalBottles", { count: stats.total })}</div>
              </div>
              <div className="bg-card border rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{stats.open}</div>
                <div className="text-xs text-muted-foreground">{t("collection.openBottles")}</div>
              </div>
              <div className="bg-card border rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.closed}</div>
                <div className="text-xs text-muted-foreground">{t("collection.closedBottles")}</div>
              </div>
              <div className="bg-card border rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-zinc-400">{stats.empty}</div>
                <div className="text-xs text-muted-foreground">{t("collection.emptyBottles")}</div>
              </div>
              <div className="bg-card border rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.avgRating || "—"}</div>
                <div className="text-xs text-muted-foreground">{t("collection.avgRating")}</div>
              </div>
            </div>

            {stats.totalValue > 0 && (
              <div className="bg-card border rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("collection.totalValue")}</span>
                  <span className="text-lg font-bold">
                    {stats.totalValue.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} {stats.mainCurrency}
                  </span>
                </div>
              </div>
            )}

            {stats.topDistilleries.length > 0 && (
              <div className="bg-card border rounded-lg p-3 mb-4">
                <h3 className="text-sm font-medium mb-2">{t("collection.topDistilleries")}</h3>
                <div className="flex flex-wrap gap-2">
                  {stats.topDistilleries.map(([name, count]) => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("collection.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-collection-search"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("collection.filterAll")}</SelectItem>
                <SelectItem value="open">{t("collection.filterOpen")}</SelectItem>
                <SelectItem value="closed">{t("collection.filterClosed")}</SelectItem>
                <SelectItem value="empty">{t("collection.filterEmpty")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-[140px]" data-testid="select-sort">
                <ArrowUpDown className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t("collection.sortName")}</SelectItem>
                <SelectItem value="rating">{t("collection.sortRating")}</SelectItem>
                <SelectItem value="price">{t("collection.sortPrice")}</SelectItem>
                <SelectItem value="added">{t("collection.sortAdded")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <Archive className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground mb-4">{t("collection.empty")}</p>
          <p className="text-xs text-muted-foreground mb-6">{t("collection.importHint")}</p>
          <Button onClick={() => fileInputRef.current?.click()} data-testid="button-import-empty">
            <Upload className="w-4 h-4 mr-2" />
            {t("collection.importButton")}
          </Button>
        </motion.div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("collection.noResults")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {filtered.length} / {items.length} {t("collection.totalBottles", { count: items.length }).split(" ").slice(1).join(" ")}
          </p>
          {filtered.map((item: WhiskybaseCollectionItem) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card border rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/30 transition-colors"
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
                  <Checkbox
                    checked={selectedForPrice.has(item.id)}
                    onCheckedChange={() => togglePriceSelect(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`checkbox-price-${item.id}`}
                  />
                )}
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-10 h-14 object-contain rounded flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}
                      {item.name}
                    </span>
                    {item.status && (
                      <Badge variant="outline" className={`text-[10px] ${statusColor(item.status)}`}>
                        {statusLabel(item.status)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {item.distillery && <span>{item.distillery}</span>}
                    {item.statedAge && <span>{item.statedAge}y</span>}
                    {item.abv && <span>{item.abv}{item.unit || "%vol"}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {item.communityRating && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {item.communityRating.toFixed(1)}
                      </div>
                    </div>
                  )}
                  {item.estimatedPrice != null && (
                    <div className="text-right" data-testid={`text-estimated-price-${item.id}`}>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <span>{item.estimatedPrice.toFixed(0)} {item.estimatedPriceCurrency || "EUR"}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-400 border-violet-500/20">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                        {item.estimatedPriceSource === "manual" ? t("collection.manualOverride") : t("collection.aiEstimated")}
                      </Badge>
                    </div>
                  )}
                  {(item.avgPrice || item.pricePaid) && (
                    <div className="text-right text-xs text-muted-foreground">
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
                    className="overflow-hidden border-t"
                  >
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {item.bottlingSeries && (
                          <div>
                            <span className="text-muted-foreground">{t("collection.series")}:</span>{" "}
                            <span className="font-medium">{item.bottlingSeries}</span>
                          </div>
                        )}
                        {item.caskType && (
                          <div>
                            <span className="text-muted-foreground">{t("collection.caskType")}:</span>{" "}
                            <span className="font-medium">{item.caskType}</span>
                          </div>
                        )}
                        {item.vintage && (
                          <div>
                            <span className="text-muted-foreground">{t("collection.vintage")}:</span>{" "}
                            <span className="font-medium">{item.vintage}</span>
                          </div>
                        )}
                        {item.size && (
                          <div>
                            <span className="text-muted-foreground">{t("collection.size")}:</span>{" "}
                            <span className="font-medium">{item.size}ml</span>
                          </div>
                        )}
                        {item.pricePaid != null && (
                          <div>
                            <span className="text-muted-foreground">{t("collection.pricePaid")}:</span>{" "}
                            <span className="font-medium">{item.pricePaid.toFixed(2)} {item.currency}</span>
                          </div>
                        )}
                        {item.auctionPrice != null && (
                          <div>
                            <span className="text-muted-foreground">{t("collection.auctionPrice")}:</span>{" "}
                            <span className="font-medium">{item.auctionPrice.toFixed(2)} {item.auctionCurrency || item.avgPriceCurrency || "EUR"}</span>
                          </div>
                        )}
                        {item.personalRating != null && (
                          <div>
                            <span className="text-muted-foreground">{t("collection.personalRating")}:</span>{" "}
                            <span className="font-medium">{item.personalRating}</span>
                          </div>
                        )}
                        {item.addedAt && (
                          <div>
                            <span className="text-muted-foreground">{t("collection.sortAdded")}:</span>{" "}
                            <span className="font-medium">{item.addedAt.split(" ")[0]}</span>
                          </div>
                        )}
                        {item.purchaseLocation && (
                          <div>
                            <span className="text-muted-foreground">{t("collection.purchaseLocation")}:</span>{" "}
                            <span className="font-medium">{item.purchaseLocation}</span>
                          </div>
                        )}
                        {item.estimatedPrice != null && (
                          <div>
                            <span className="text-muted-foreground">{t("collection.estimatePrice")}:</span>{" "}
                            <span className="font-medium">{item.estimatedPrice.toFixed(2)} {item.estimatedPriceCurrency || "EUR"}</span>{" "}
                            <Badge variant="outline" className="text-[9px] ml-1 bg-violet-500/10 text-violet-400 border-violet-500/20" data-testid={`badge-ai-estimated-${item.id}`}>
                              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                              {item.estimatedPriceSource === "manual" ? t("collection.manualOverride") : t("collection.aiEstimated")}
                            </Badge>
                            {item.estimatedPriceDate && (
                              <span className="text-[10px] text-muted-foreground ml-1">
                                {t("collection.priceEstimateDate", { date: new Date(item.estimatedPriceDate).toLocaleDateString() })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {editingPriceId === item.id && (
                        <div className="flex items-center gap-2 text-xs">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            className="h-7 w-24 text-xs"
                            placeholder="0"
                            value={manualPriceValue}
                            onChange={(e) => setManualPriceValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`input-manual-price-${item.id}`}
                          />
                          <span className="text-muted-foreground">EUR</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={!manualPriceValue || manualPriceMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              manualPriceMutation.mutate({ itemId: item.id, price: parseFloat(manualPriceValue), currency: "EUR" });
                            }}
                            data-testid={`button-save-manual-price-${item.id}`}
                          >
                            {manualPriceMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPriceId(null);
                              setManualPriceValue("");
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {item.notes && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">{t("collection.notes")}:</span>{" "}
                          <span>{item.notes}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href={`https://www.whiskybase.com/whiskies/whisky/${item.whiskybaseId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          data-testid={`link-whiskybase-${item.id}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {t("collection.viewOnWhiskybase")}
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            toJournalMutation.mutate(item.id);
                          }}
                          disabled={toJournalMutation.isPending}
                          data-testid={`button-to-journal-${item.id}`}
                        >
                          {toJournalMutation.isPending ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <NotebookPen className="w-3 h-3 mr-1" />
                          )}
                          {t("collection.toJournal")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            priceEstimateMutation.mutate([item.id]);
                          }}
                          disabled={priceEstimateMutation.isPending}
                          data-testid={`button-estimate-price-${item.id}`}
                        >
                          {priceEstimateMutation.isPending ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 mr-1" />
                          )}
                          {t("collection.estimatePrice")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPriceId(editingPriceId === item.id ? null : item.id);
                            setManualPriceValue(item.estimatedPrice?.toString() || "");
                          }}
                          data-testid={`button-manual-price-${item.id}`}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          {t("collection.manualPriceHint")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(item);
                          }}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          {t("collection.deleteItem")}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("collection.deleteItem")}</AlertDialogTitle>
            <AlertDialogDescription>{t("collection.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("journal.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("collection.deleteItem")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={syncDialogOpen} onOpenChange={(open) => { if (!open) { setSyncDialogOpen(false); setSyncDiff(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-sync">
          <DialogHeader>
            <DialogTitle>{t("collection.syncDialogTitle")}</DialogTitle>
            <DialogDescription>{t("collection.syncDialogDesc")}</DialogDescription>
          </DialogHeader>

          {syncDiff && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm font-medium" data-testid="text-sync-summary">
                {t("collection.syncSummary", {
                  newCount: syncDiff.newItems.length,
                  removedCount: syncDiff.removedItems.length,
                  changedCount: syncDiff.changedItems.length,
                  unchangedCount: syncDiff.unchangedCount,
                })}
              </div>

              {syncDiff.newItems.length === 0 && syncDiff.removedItems.length === 0 && syncDiff.changedItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-sync-no-changes">
                  <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>{t("collection.syncNoChanges")}</p>
                </div>
              )}

              {syncDiff.newItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Plus className="w-4 h-4 text-green-500" />
                      {t("collection.syncSectionNew")} ({syncDiff.newItems.length})
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          const all: Record<number, boolean> = {};
                          syncDiff.newItems.forEach((_: any, i: number) => { all[i] = true; });
                          setNewItemChecked(all);
                        }}
                        data-testid="button-sync-add-all"
                      >
                        {t("collection.syncAddAll")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          const none: Record<number, boolean> = {};
                          syncDiff.newItems.forEach((_: any, i: number) => { none[i] = false; });
                          setNewItemChecked(none);
                        }}
                        data-testid="button-sync-add-none"
                      >
                        {t("collection.syncAddNone")}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {syncDiff.newItems.map((item: any, i: number) => (
                      <label
                        key={i}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/30 cursor-pointer text-sm"
                        data-testid={`sync-new-item-${i}`}
                      >
                        <Checkbox
                          checked={!!newItemChecked[i]}
                          onCheckedChange={(checked) => setNewItemChecked(prev => ({ ...prev, [i]: !!checked }))}
                          data-testid={`checkbox-sync-new-${i}`}
                        />
                        <span className="font-medium truncate">
                          {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                        </span>
                        {item.distillery && <span className="text-xs text-muted-foreground ml-auto">{item.distillery}</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {syncDiff.removedItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Minus className="w-4 h-4 text-red-500" />
                    {t("collection.syncSectionRemoved")} ({syncDiff.removedItems.length})
                  </h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {syncDiff.removedItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 p-1.5 rounded text-sm"
                        data-testid={`sync-removed-item-${i}`}
                      >
                        <span className="font-medium truncate flex-1">
                          {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                        </span>
                        <Select
                          value={removeActions[i] || "keep"}
                          onValueChange={(v) => setRemoveActions(prev => ({ ...prev, [i]: v as RemoveAction }))}
                        >
                          <SelectTrigger className="w-[160px] h-7 text-xs" data-testid={`select-sync-remove-${i}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="keep">{t("collection.syncRemoveKeep")}</SelectItem>
                            <SelectItem value="delete">{t("collection.syncRemoveDelete")}</SelectItem>
                            <SelectItem value="empty">{t("collection.syncRemoveMarkEmpty")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncDiff.changedItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-amber-500" />
                    {t("collection.syncSectionChanged")} ({syncDiff.changedItems.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                    {syncDiff.changedItems.map((item, ci) => (
                      <div key={ci} className="border rounded-md p-2 space-y-1.5" data-testid={`sync-changed-item-${ci}`}>
                        <div className="text-sm font-medium">
                          {item.brand && item.brand !== item.name ? `${item.brand} ` : ""}{item.name}
                        </div>
                        {item.changes.map((change, chi) => {
                          const key = `${item.existingId}-${change.field}`;
                          const decision = changeDecisions[key] || "new";
                          return (
                            <div key={chi} className="flex items-center gap-2 text-xs pl-2">
                              <span className="text-muted-foreground w-28 flex-shrink-0">{fieldLabel(change.field)}:</span>
                              <button
                                className={`px-2 py-0.5 rounded border transition-colors ${decision === "old" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent/50"}`}
                                onClick={() => setChangeDecisions(prev => ({ ...prev, [key]: "old" }))}
                                data-testid={`button-sync-keep-old-${ci}-${chi}`}
                              >
                                {String(change.old ?? "—")}
                              </button>
                              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <button
                                className={`px-2 py-0.5 rounded border transition-colors ${decision === "new" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent/50"}`}
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setSyncDialogOpen(false); setSyncDiff(null); }}
              data-testid="button-sync-cancel"
            >
              {t("journal.cancel")}
            </Button>
            {syncDiff && (syncDiff.newItems.length > 0 || syncDiff.removedItems.length > 0 || syncDiff.changedItems.length > 0) && (
              <Button
                onClick={handleApplySync}
                disabled={syncApplyMutation.isPending}
                data-testid="button-sync-apply"
              >
                {syncApplyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                {syncApplyMutation.isPending ? t("collection.syncApplying") : t("collection.syncApply")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
