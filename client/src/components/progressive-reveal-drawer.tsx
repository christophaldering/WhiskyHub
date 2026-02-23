import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { ratingApi } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, BarChart3, Wrench, Info, Lock } from "lucide-react";
import type { Tasting, Whisky } from "@shared/schema";
import type { BlindState } from "@/hooks/use-blind-state";

type Tab = "context" | "comparison" | "tools";

interface ProgressiveRevealDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasting: Tasting;
  whiskies: Whisky[];
  activeWhiskyIdx: number;
  getBlindState: (idx: number, whisky?: Whisky, forEval?: boolean) => BlindState;
  isHost: boolean;
  canShowGroupComparison: (idx: number, hasUserRated: boolean, hostUnlocked: boolean) => boolean;
}

function ContextTab({ whisky, blindState, tasting, t }: {
  whisky: Whisky;
  blindState: BlindState;
  tasting: Tasting;
  t: any;
}) {
  if (!blindState.showName && !blindState.showMeta) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center">
          <EyeOff className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground font-serif">{t("progressiveReveal.detailsHidden")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="reveal-context-content">
      {blindState.showName && (
        <div>
          <h3 className="font-serif font-bold text-lg text-primary" data-testid="text-context-name">{whisky.name}</h3>
          {whisky.distillery && <p className="text-sm text-muted-foreground">{whisky.distillery}</p>}
        </div>
      )}
      {blindState.showMeta && (
        <div className="grid grid-cols-2 gap-3">
          {whisky.region && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("progressiveReveal.region")}</span>
              <p className="text-sm font-medium mt-0.5">{whisky.region}</p>
            </div>
          )}
          {whisky.age && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("progressiveReveal.age")}</span>
              <p className="text-sm font-medium mt-0.5">{whisky.age}</p>
            </div>
          )}
          {whisky.abv && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">ABV</span>
              <p className="text-sm font-medium mt-0.5">{whisky.abv}%</p>
            </div>
          )}
          {whisky.caskType && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("progressiveReveal.caskType")}</span>
              <p className="text-sm font-medium mt-0.5">{whisky.caskType}</p>
            </div>
          )}
        </div>
      )}
      {blindState.showImage && whisky.imageUrl && (
        <div className="flex justify-center pt-2">
          <img
            src={whisky.imageUrl}
            alt={whisky.name}
            className="max-h-48 rounded-lg border border-border/50 object-contain"
            data-testid="img-context-whisky"
          />
        </div>
      )}
    </div>
  );
}

function ComparisonTab({ tasting, whisky, whiskyIdx, participantId, canShow, t }: {
  tasting: Tasting;
  whisky: Whisky;
  whiskyIdx: number;
  participantId: string;
  canShow: boolean;
  t: any;
}) {
  const { data: myRating } = useQuery({
    queryKey: ["rating", participantId, whisky.id],
    queryFn: () => ratingApi.getMyRating(participantId, whisky.id),
    enabled: !!participantId && !!whisky.id,
  });

  const { data: allRatings = [] } = useQuery({
    queryKey: ["ratings-whisky", whisky.id],
    queryFn: () => ratingApi.getForWhisky(whisky.id),
    enabled: canShow && !!whisky.id,
  });

  if (!canShow) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground font-serif">{t("progressiveReveal.comparisonLocked")}</p>
      </div>
    );
  }

  const validRatings = allRatings.filter((r: any) => r.overall != null);
  const avgOverall = validRatings.length > 0
    ? Math.round((validRatings.reduce((sum: number, r: any) => sum + r.overall, 0) / validRatings.length) * 10) / 10
    : null;

  return (
    <div className="space-y-4" data-testid="reveal-comparison-content">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">{t("progressiveReveal.yourScore")}</span>
          <span className="text-2xl font-serif font-bold text-primary" data-testid="text-comparison-my-score">
            {myRating?.overall != null ? myRating.overall : "—"}
          </span>
          <span className="text-xs text-muted-foreground"> / {tasting.ratingScale || 100}</span>
        </div>
        <div className="bg-secondary/30 border border-border/30 rounded-lg p-4 text-center">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">{t("progressiveReveal.groupAverage")}</span>
          <span className="text-2xl font-serif font-bold" data-testid="text-comparison-group-avg">
            {avgOverall ?? "—"}
          </span>
          <span className="text-xs text-muted-foreground"> / {tasting.ratingScale || 100}</span>
        </div>
      </div>
      {validRatings.length > 0 && (
        <div className="bg-secondary/20 rounded-lg p-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("progressiveReveal.totalRatings")}</span>
          <p className="text-sm font-medium mt-0.5">{validRatings.length} {t("progressiveReveal.participants")}</p>
        </div>
      )}
      {myRating && (
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("progressiveReveal.yourBreakdown")}</span>
          {["nose", "taste", "finish", "balance"].map((dim) => (
            <div key={dim} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-14 capitalize">{t(`evaluation.${dim}`)}</span>
              <div className="flex-1 h-2 bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${((myRating as any)[dim] || 0) / (tasting.ratingScale || 100) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono w-8 text-right">{(myRating as any)[dim] ?? "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolsTab({ tasting, isHost, t }: {
  tasting: Tasting;
  isHost: boolean;
  t: any;
}) {
  return (
    <div className="space-y-3" data-testid="reveal-tools-content">
      <p className="text-sm text-muted-foreground font-serif">{t("progressiveReveal.toolsDesc")}</p>
      {isHost && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <span className="text-xs font-serif font-bold text-amber-600">{t("progressiveReveal.hostTools")}</span>
          <p className="text-xs text-muted-foreground mt-1">{t("progressiveReveal.hostToolsDesc")}</p>
        </div>
      )}
    </div>
  );
}

export function ProgressiveRevealDrawer({
  open,
  onOpenChange,
  tasting,
  whiskies,
  activeWhiskyIdx,
  getBlindState,
  isHost,
  canShowGroupComparison,
}: ProgressiveRevealDrawerProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { currentParticipant } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>("context");
  const participantId = currentParticipant?.id || "";
  const expLevel = currentParticipant?.experienceLevel || "guest";

  const LEVELS = ["guest", "explorer", "connoisseur", "analyst"] as const;
  const levelIndex = LEVELS.indexOf(expLevel as any);
  const isAnalyst = levelIndex >= LEVELS.indexOf("analyst");
  const showTools = isAnalyst || isHost || currentParticipant?.role === "admin";

  const activeWhisky = whiskies[activeWhiskyIdx] || whiskies[0];
  if (!activeWhisky) return null;

  const blindState = getBlindState(activeWhiskyIdx, activeWhisky);
  const hasUserRated = false;
  const canCompare = canShowGroupComparison(activeWhiskyIdx, hasUserRated, false);

  const tabs: { id: Tab; label: string; icon: typeof Info; available: boolean }[] = [
    { id: "context", label: t("progressiveReveal.context"), icon: Info, available: true },
    { id: "comparison", label: t("progressiveReveal.comparison"), icon: BarChart3, available: true },
    { id: "tools", label: t("progressiveReveal.tools"), icon: Wrench, available: showTools },
  ];

  const content = (
    <div className="px-1">
      <div className="flex border-b border-border/40 mb-4">
        {tabs.filter(tab => tab.available).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-xs font-serif font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-testid={`tab-reveal-${tab.id}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pb-6">
        {activeTab === "context" && (
          <ContextTab whisky={activeWhisky} blindState={blindState} tasting={tasting} t={t} />
        )}
        {activeTab === "comparison" && (
          <ComparisonTab
            tasting={tasting}
            whisky={activeWhisky}
            whiskyIdx={activeWhiskyIdx}
            participantId={participantId}
            canShow={canCompare}
            t={t}
          />
        )}
        {activeTab === "tools" && showTools && (
          <ToolsTab tasting={tasting} isHost={isHost} t={t} />
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="font-serif text-primary text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {blindState.showName ? activeWhisky.name : `${t("blind.expressionLabel")} ${activeWhiskyIdx + 1}`}
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              {t("progressiveReveal.drawerDesc")}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[440px] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="font-serif text-primary text-base flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {blindState.showName ? activeWhisky.name : `${t("blind.expressionLabel")} ${activeWhiskyIdx + 1}`}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {t("progressiveReveal.drawerDesc")}
          </SheetDescription>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
