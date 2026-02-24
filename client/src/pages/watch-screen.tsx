import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Wine, Trophy, BarChart3, Eye, EyeOff, Loader2, WifiOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type WatchDram = {
  label: string;
  ratingCount: number;
  avgOverall?: number | null;
  avgNose?: number | null;
  avgTaste?: number | null;
  avgFinish?: number | null;
  avgBalance?: number | null;
  whiskyName?: string | null;
  whiskyDistillery?: string | null;
  whiskyAge?: string | null;
  whiskyAbv?: number | null;
  whiskyImageUrl?: string | null;
  revealed: boolean;
};

type WatchData = {
  sessionTitle: string;
  status: string;
  ratingScale: number;
  isBlind: boolean;
  revealIndex: number;
  revealStep: number;
  viewerAllowAverages: boolean;
  viewerAllowRanking: boolean;
  totalDrams: number;
  totalRatings: number;
  drams: WatchDram[];
  dramRanking: { label: string; avgOverall: number | null; rank: number }[];
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { color: string; label: string }> = {
    open: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: t("watchScreen.statusOpen", "Live") },
    closed: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: t("watchScreen.statusClosed", "Closed") },
    reveal: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: t("watchScreen.statusReveal", "Reveal") },
    archived: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: t("watchScreen.statusArchived", "Archived") },
  };
  const s = map[status] || map.open;
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border", s.color)} data-testid="badge-status">
      {s.label}
    </span>
  );
}

function DramCard({ dram, scale, showAvg }: { dram: WatchDram; scale: number; showAvg: boolean }) {
  const { t } = useTranslation();
  const hasIdentity = !!dram.whiskyName;

  return (
    <div className="border border-border/20 rounded-xl bg-card/60 backdrop-blur-sm p-4 space-y-2" data-testid={`watch-dram-${dram.label}`}>
      <div className="flex items-center gap-3">
        {dram.whiskyImageUrl ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted/10 border border-border/10">
            <img src={dram.whiskyImageUrl} alt={dram.whiskyName || dram.label} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted/15 border border-border/15 flex items-center justify-center flex-shrink-0">
            {hasIdentity ? (
              <Wine className="w-4 h-4 text-muted-foreground/40" />
            ) : (
              <EyeOff className="w-4 h-4 text-muted-foreground/30" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground/50 uppercase">{dram.label}</span>
            {dram.revealed && hasIdentity && (
              <Eye className="w-3 h-3 text-green-500/60" />
            )}
          </div>
          {hasIdentity ? (
            <>
              <p className="font-serif font-bold text-sm text-foreground truncate" data-testid={`text-dram-name-${dram.label}`}>{dram.whiskyName}</p>
              {(dram.whiskyDistillery || dram.whiskyAge || dram.whiskyAbv) && (
                <p className="text-[10px] text-muted-foreground/60 font-mono uppercase truncate">
                  {[dram.whiskyDistillery, dram.whiskyAge ? `${dram.whiskyAge}y` : null, dram.whiskyAbv ? `${dram.whiskyAbv}%` : null].filter(Boolean).join(" · ")}
                </p>
              )}
            </>
          ) : (
            <p className="font-serif text-sm text-muted-foreground/50 italic" data-testid={`text-dram-blind-${dram.label}`}>
              {t("watchScreen.blindHidden", "Hidden")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          {showAvg && dram.avgOverall != null ? (
            <span className="text-lg font-mono font-black text-primary tabular-nums" data-testid={`value-avg-${dram.label}`}>
              {dram.avgOverall}
            </span>
          ) : showAvg ? (
            <span className="text-xs text-muted-foreground/40 font-mono">–</span>
          ) : null}
          <span className="text-[9px] text-muted-foreground/40 font-mono">
            {dram.ratingCount} {t("watchScreen.ratings", "ratings")}
          </span>
        </div>
      </div>
      {showAvg && dram.avgOverall != null && (
        <div className="grid grid-cols-4 gap-1 pt-1 border-t border-border/10">
          {[
            { key: "nose", label: "Nose", val: dram.avgNose },
            { key: "taste", label: "Taste", val: dram.avgTaste },
            { key: "finish", label: "Finish", val: dram.avgFinish },
            { key: "balance", label: "Balance", val: dram.avgBalance },
          ].map(dim => (
            <div key={dim.key} className="text-center">
              <p className="text-[8px] text-muted-foreground/40 uppercase font-mono tracking-wider">{dim.label}</p>
              <p className="text-xs font-mono font-bold text-foreground/70 tabular-nums">{dim.val ?? "–"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RankingList({ ranking, scale }: { ranking: WatchData["dramRanking"]; scale: number }) {
  const { t } = useTranslation();
  if (ranking.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="watch-ranking">
      <h3 className="text-xs font-serif font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
        <Trophy className="w-3.5 h-3.5" />
        {t("watchScreen.ranking", "Ranking")}
      </h3>
      <div className="space-y-1">
        {ranking.map((r) => (
          <div
            key={r.label}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg border",
              r.rank === 1 ? "border-yellow-500/30 bg-yellow-500/5" :
              r.rank === 2 ? "border-gray-400/20 bg-gray-400/5" :
              r.rank === 3 ? "border-amber-600/20 bg-amber-600/5" :
              "border-border/10 bg-card/30"
            )}
            data-testid={`watch-rank-${r.rank}`}
          >
            <span className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold",
              r.rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
              r.rank === 2 ? "bg-gray-400/20 text-gray-300" :
              r.rank === 3 ? "bg-amber-600/20 text-amber-500" :
              "bg-muted/20 text-muted-foreground/60"
            )}>
              {r.rank}
            </span>
            <span className="flex-1 text-sm font-serif text-foreground/80">{r.label}</span>
            <span className="text-sm font-mono font-bold text-primary tabular-nums">{r.avgOverall ?? "–"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingState() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" data-testid="watch-loading">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground font-serif">{t("watchScreen.loading", "Loading...")}</p>
      </div>
    </div>
  );
}

function ErrorState({ status }: { status?: number }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6" data-testid="watch-error">
      <div className="text-center space-y-3 max-w-xs">
        <WifiOff className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <h2 className="text-lg font-serif font-bold text-foreground">
          {status === 403 ? t("watchScreen.notLiveTitle", "Not live yet") : t("watchScreen.notFoundTitle", "Not found")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {status === 403
            ? t("watchScreen.notLiveDesc", "This session isn't live right now. The board will appear once the host opens the tasting.")
            : t("watchScreen.notFoundDesc", "This watch link is invalid or the session no longer exists.")}
        </p>
      </div>
    </div>
  );
}

function NotLiveState({ sessionStatus }: { sessionStatus?: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6" data-testid="watch-not-live">
      <div className="text-center space-y-3 max-w-xs">
        <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <h2 className="text-lg font-serif font-bold text-foreground">
          {t("watchScreen.notLiveTitle", "Not live yet")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("watchScreen.notLiveDesc", "This session isn't live right now. The board will appear once the host opens the tasting.")}
        </p>
        <p className="text-[10px] text-muted-foreground/50 font-mono">
          {t("watchScreen.autoRefresh", "This page refreshes automatically.")}
        </p>
      </div>
    </div>
  );
}

export default function WatchScreen() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();

  const { data, isLoading, isError, error } = useQuery<WatchData>({
    queryKey: [`/api/watch/${token}`],
    refetchInterval: 3000,
    staleTime: 2000,
    retry: (failureCount, err) => {
      const msg = (err as Error)?.message || "";
      if (msg.startsWith("403") || msg.startsWith("404")) return false;
      return failureCount < 3;
    },
  });

  if (isLoading) return <LoadingState />;

  if (isError) {
    const msg = (error as Error)?.message || "";
    if (msg.startsWith("403")) return <NotLiveState />;
    if (msg.startsWith("404")) return <ErrorState status={404} />;
    return <ErrorState />;
  }

  if (!data) return <ErrorState />;

  return (
    <div className="min-h-screen bg-background" data-testid="watch-screen">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/20 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <BarChart3 className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
                {t("watchScreen.header", "Live Board (Spectator)")}
              </span>
            </div>
            <h1 className="text-base font-serif font-bold text-foreground truncate" data-testid="text-session-title">
              {data.sessionTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <StatusBadge status={data.status} />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 font-mono">
          <span data-testid="text-total-drams">{data.totalDrams} Drams</span>
          <span data-testid="text-total-ratings">{data.totalRatings} {t("watchScreen.totalRatings", "total ratings")}</span>
          <span>{t("watchScreen.scale", "Scale")}: 0–{data.ratingScale}</span>
        </div>

        {data.isBlind && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/10 border border-border/15">
            <EyeOff className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              {t("watchScreen.blindInfo", "Blind tasting — identities are revealed step by step.")}
            </span>
          </div>
        )}

        <div className="space-y-2">
          {data.drams.map((dram) => (
            <DramCard key={dram.label} dram={dram} scale={data.ratingScale} showAvg={data.viewerAllowAverages} />
          ))}
        </div>

        {data.viewerAllowRanking && data.dramRanking.length > 0 && (
          <RankingList ranking={data.dramRanking} scale={data.ratingScale} />
        )}

        <div className="text-center pt-4 border-t border-border/10">
          <p className="text-[9px] text-muted-foreground/30 font-mono">
            {t("watchScreen.spectatorNotice", "Spectator view — no participant data shown.")}
          </p>
        </div>
      </main>
    </div>
  );
}
