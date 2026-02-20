import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { whiskyApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronUp, ChevronDown, Trash2, ChevronLeft, ChevronRight, ImageIcon, Camera, X, Loader2 } from "lucide-react";
import type { Whisky, Tasting } from "@shared/schema";

const ITEMS_PER_PAGE = 12;
const ITEMS_PER_COLUMN = 6;

function buildMetaLine(w: Whisky): string {
  const parts: string[] = [];
  if (w.region) parts.push(w.region);
  if (w.caskInfluence) parts.push(w.caskInfluence);
  if (w.peatLevel && w.peatLevel !== "None") parts.push(w.peatLevel);
  if (w.ppm != null) parts.push(`${w.ppm} ppm`);
  if (w.whiskybaseId) parts.push(`WB ${w.whiskybaseId}`);
  return parts.join(" \u2022 ");
}

function WhiskyThumbnailSmall({ whisky }: { whisky: Whisky }) {
  const [err, setErr] = useState(false);
  if (whisky.imageUrl && !err) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center gap-1 w-[60px]">
        <img
          src={whisky.imageUrl}
          alt={whisky.name}
          className="w-[60px] h-[60px] object-cover rounded-lg border border-border/50"
          onError={() => setErr(true)}
          data-testid={`img-board-${whisky.id}`}
        />
        <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-2 w-full font-serif">{whisky.name}</span>
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1 w-[60px]">
      <div className="w-[60px] h-[60px] rounded-lg bg-secondary/30 border border-secondary flex items-center justify-center">
        <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
      </div>
      <span className="text-[9px] text-muted-foreground text-center leading-tight line-clamp-2 w-full font-serif">{whisky.name}</span>
    </div>
  );
}

interface FlightBoardProps {
  tasting: Tasting;
  whiskies: Whisky[];
  isHost: boolean;
}

export function FlightBoard({ tasting, whiskies, isHost }: FlightBoardProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const [detailWhisky, setDetailWhisky] = useState<Whisky | null>(null);
  const canEdit = isHost && (tasting.status === "draft" || tasting.status === "open");

  const totalPages = Math.max(1, Math.ceil(whiskies.length / ITEMS_PER_PAGE));
  const pageWhiskies = whiskies.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const leftColumn = pageWhiskies.slice(0, ITEMS_PER_COLUMN);
  const rightColumn = pageWhiskies.slice(ITEMS_PER_COLUMN);

  const reorderMutation = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => whiskyApi.reorder(tasting.id, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tasting.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (whiskyId: string) => whiskyApi.delete(whiskyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tasting.id] });
    },
  });

  const handleMove = (whiskyId: string, direction: "up" | "down") => {
    const idx = whiskies.findIndex(w => w.id === whiskyId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= whiskies.length) return;
    const newOrder = whiskies.map((w, i) => {
      if (i === idx) return { id: w.id, sortOrder: newIdx };
      if (i === newIdx) return { id: w.id, sortOrder: idx };
      return { id: w.id, sortOrder: i };
    });
    reorderMutation.mutate(newOrder);
  };

  if (whiskies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-xl font-serif text-muted-foreground italic">{t("flightBoard.empty")}</p>
      </div>
    );
  }

  const renderDram = (w: Whisky, globalIdx: number) => {
    const meta = buildMetaLine(w);
    const isFirst = globalIdx === 0;
    const isLast = globalIdx === whiskies.length - 1;

    return (
      <div
        key={w.id}
        className="flex items-start gap-3 py-3 border-b border-border/20 last:border-b-0 group"
        data-testid={`dram-row-${w.id}`}
      >
        <div className="flex-shrink-0 w-8 text-right">
          <span className="font-serif text-lg font-bold text-primary/60">{globalIdx + 1}</span>
        </div>

        <button onClick={() => setDetailWhisky(w)} className="cursor-pointer" data-testid={`button-detail-${w.id}`}>
          <WhiskyThumbnailSmall whisky={w} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h4 className="font-serif font-bold text-base text-foreground truncate cursor-pointer hover:text-primary transition-colors" onClick={() => setDetailWhisky(w)}>{w.name}</h4>
          </div>
          {w.distillery && (
            <p className="text-sm text-muted-foreground font-serif italic truncate">{w.distillery}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {w.age && <span className="text-xs font-mono text-muted-foreground">{w.age === "NAS" || w.age === "n.a.s." ? "NAS" : `${w.age}y`}</span>}
            {w.abv != null && <span className="text-xs font-mono text-muted-foreground">{w.abv}%</span>}
            {w.type && <span className="text-xs text-muted-foreground/70">{w.type}</span>}
          </div>
          {meta && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{meta}</p>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={isFirst || reorderMutation.isPending}
              onClick={() => handleMove(w.id, "up")}
              data-testid={`button-board-up-${w.id}`}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={isLast || reorderMutation.isPending}
              onClick={() => handleMove(w.id, "down")}
              data-testid={`button-board-down-${w.id}`}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive/60 hover:text-destructive"
                  data-testid={`button-board-delete-${w.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif text-primary">{t("flightBoard.deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("flightBoard.deleteConfirm")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="font-serif">{t("flightBoard.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(w.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-serif"
                  >
                    {t("flightBoard.remove")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="flight-board">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
        <div className="space-y-0">
          {leftColumn.map((w, i) => renderDram(w, currentPage * ITEMS_PER_PAGE + i))}
        </div>
        <div className="space-y-0">
          {rightColumn.map((w, i) => renderDram(w, currentPage * ITEMS_PER_PAGE + ITEMS_PER_COLUMN + i))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => p - 1)}
            className="font-serif"
            data-testid="button-board-prev-page"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground font-serif">
            {t("flightBoard.page", { current: currentPage + 1, total: totalPages })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(p => p + 1)}
            className="font-serif"
            data-testid="button-board-next-page"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <Dialog open={!!detailWhisky} onOpenChange={(open) => !open && setDetailWhisky(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary">{detailWhisky?.name}</DialogTitle>
          </DialogHeader>
          {detailWhisky && (
            <DetailDialogContent whisky={detailWhisky} canEdit={canEdit} tastingId={tasting.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailDialogContent({ whisky, canEdit, tastingId }: { whisky: Whisky; canEdit: boolean; tastingId: string }) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => whiskyApi.uploadImage(whisky.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: () => whiskyApi.deleteImage(whisky.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;
    uploadImageMutation.mutate(file);
  };

  const isUploading = uploadImageMutation.isPending;
  const isDeleting = deleteImageMutation.isPending;

  return (
    <div className="space-y-4">
      {whisky.imageUrl ? (
        <div className="flex justify-center">
          <div className="relative">
            <img src={whisky.imageUrl} alt={whisky.name} className="max-h-64 rounded-lg border border-border/50 object-contain" data-testid="img-detail-whisky" />
            {canEdit && (
              <button
                onClick={() => deleteImageMutation.mutate()}
                disabled={isDeleting}
                className="absolute top-2 right-2 w-7 h-7 bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive transition-colors shadow-md"
                data-testid="button-detail-delete-image"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      ) : canEdit ? (
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-lg bg-secondary/20 border border-dashed border-border flex items-center justify-center">
            <Camera className="w-8 h-8 text-muted-foreground/40" />
          </div>
        </div>
      ) : null}
      {canEdit && (
        <div className="flex justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            data-testid="input-detail-image"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs font-serif"
            data-testid="button-detail-upload-image"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5 mr-1" />
            )}
            {whisky.imageUrl ? t("whisky.replacePhoto") : t("whisky.uploadPhoto")}
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {whisky.distillery && (
          <div><span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailDistillery")}</span><p className="font-serif">{whisky.distillery}</p></div>
        )}
        {whisky.age && (
          <div><span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailAge")}</span><p className="font-serif">{whisky.age === "NAS" || whisky.age === "n.a.s." ? "NAS" : `${whisky.age} years`}</p></div>
        )}
        {whisky.abv != null && (
          <div><span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailAbv")}</span><p className="font-serif">{whisky.abv}%</p></div>
        )}
        {whisky.country && (
          <div><span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailCountry")}</span><p className="font-serif">{whisky.country}</p></div>
        )}
        {(whisky.category || whisky.type) && (
          <div><span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailCategory")}</span><p className="font-serif">{whisky.category || whisky.type}</p></div>
        )}
        {whisky.region && (
          <div><span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailRegion")}</span><p className="font-serif">{whisky.region}</p></div>
        )}
        {whisky.caskInfluence && (
          <div><span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailCask")}</span><p className="font-serif">{whisky.caskInfluence}</p></div>
        )}
        {whisky.peatLevel && whisky.peatLevel !== "None" && (
          <div><span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailPeat")}</span><p className="font-serif">{whisky.peatLevel}{whisky.ppm != null ? ` (${whisky.ppm} ppm)` : ""}</p></div>
        )}
        {(whisky as any).bottler && (
          <div><span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailBottler")}</span><p className="font-serif">{(whisky as any).bottler}</p></div>
        )}
        {(whisky as any).vintage && (
          <div><span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailVintage")}</span><p className="font-serif">{(whisky as any).vintage}</p></div>
        )}
      </div>
      {whisky.notes && (
        <div>
          <span className="text-muted-foreground font-mono text-xs uppercase">{t("flightBoard.detailNotes")}</span>
          <p className="font-serif text-sm mt-1 leading-relaxed">{whisky.notes}</p>
        </div>
      )}
      {whisky.whiskybaseId && (
        <a href={`https://www.whiskybase.com/whiskies/whisky/${whisky.whiskybaseId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary font-mono" data-testid="link-detail-whiskybase">
          Whiskybase #{whisky.whiskybaseId}
        </a>
      )}
    </div>
  );
}
