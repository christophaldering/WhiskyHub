import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { collectionApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WhiskybaseCollectionItem } from "@shared/schema";

type SortKey = "name" | "rating" | "price" | "added";
type StatusFilter = "all" | "open" | "closed" | "empty";

export default function WhiskybaseCollection() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [deleteTarget, setDeleteTarget] = useState<WhiskybaseCollectionItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      e.target.value = "";
    }
  };

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
      <div className="p-6 text-center">
        <Archive className="w-12 h-12 mx-auto mb-4 opacity-40" />
        <p className="text-muted-foreground">{t("collection.loginRequired")}</p>
      </div>
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
        </div>
      </div>

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground">{t("collection.reimportHint")}</p>
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
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                data-testid={`card-collection-${item.id}`}
              >
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
                      </div>

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
    </div>
  );
}
