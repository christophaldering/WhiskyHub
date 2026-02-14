import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { whiskyApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronUp, ChevronDown, Trash2, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
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
      <img
        src={whisky.imageUrl}
        alt={whisky.name}
        className="w-10 h-10 object-cover rounded-full border border-border/50 flex-shrink-0"
        onError={() => setErr(true)}
        data-testid={`img-board-${whisky.id}`}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-secondary/30 border border-secondary flex items-center justify-center flex-shrink-0">
      <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
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

        <WhiskyThumbnailSmall whisky={w} />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h4 className="font-serif font-bold text-base text-foreground truncate">{w.name}</h4>
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
    </div>
  );
}
