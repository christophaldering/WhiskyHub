import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { tastingApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAppStore } from "@/lib/store";
import { ArrowRight, Trash2, KeyRound, Loader2, Crown, Users } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Sessions() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"host" | "participant">("host");

  const { data: tastings = [], isLoading } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const deleteMutation = useMutation({
    mutationFn: (tasting: any) =>
      tastingApi.updateStatus(tasting.id, "deleted", undefined, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      setDeleteTarget(null);
      toast({ title: t("session.actions.deleted") });
    },
  });

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || !currentParticipant) return;
    setJoinLoading(true);
    try {
      const tasting = await tastingApi.getByCode(code);
      if (!tasting) {
        toast({ title: t("session.codeNotFound"), variant: "destructive" });
        return;
      }
      await tastingApi.join(tasting.id, currentParticipant.id, code);
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      setJoinCode("");
      toast({ title: t("session.joinedSuccess") });
      navigate(`/tasting/${tasting.id}`);
    } catch (e: any) {
      toast({ title: e?.message || t("session.joinError"), variant: "destructive" });
    } finally {
      setJoinLoading(false);
    }
  };

  const isHostOf = (tasting: any) => currentParticipant && tasting.hostId === currentParticipant.id;

  const hostedTastings = tastings.filter((s: any) => isHostOf(s));
  const participatedTastings = tastings.filter((s: any) => !isHostOf(s));

  const splitByStatus = (list: any[]) => ({
    active: list.filter((s: any) => s.status === "open" || s.status === "closed" || s.status === "reveal"),
    drafts: list.filter((s: any) => s.status === "draft"),
    archived: list.filter((s: any) => s.status === "archived"),
  });

  const sortByDate = (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime();

  const hosted = splitByStatus(hostedTastings);
  const participated = splitByStatus(participatedTastings);

  Object.values(hosted).forEach(arr => arr.sort(sortByDate));
  Object.values(participated).forEach(arr => arr.sort(sortByDate));

  const currentList = viewMode === "host" ? hosted : participated;
  const hasHosted = hostedTastings.length > 0;
  const hasParticipated = participatedTastings.length > 0;

  const canDelete = (tasting: any) => isHostOf(tasting);

  const SessionCard = ({ tasting }: { tasting: any }) => (
    <div
      className="w-full text-left p-4 bg-card border border-border/50 rounded-lg hover:shadow-sm transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 group"
      data-testid={`card-tasting-${tasting.id}`}
    >
      <button
        onClick={() => navigate(`/tasting/${tasting.id}`)}
        className="flex-1 text-left min-w-0"
        data-testid={`link-tasting-${tasting.id}`}
      >
        <div className="font-serif font-bold text-primary group-hover:underline truncate">{tasting.title}</div>
        <div className="text-sm text-muted-foreground">{tasting.location} &bull; {new Date(tasting.date).toLocaleDateString()}</div>
      </button>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground font-mono uppercase">
          {t(`session.status.${tasting.status}`)}
        </span>
        {isHostOf(tasting) && (
          <span className="text-xs font-mono text-muted-foreground">Code: {tasting.code}</span>
        )}
        {canDelete(tasting) && (
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(tasting); }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title={t("session.actions.deleteSession")}
            data-testid={`btn-delete-tasting-${tasting.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
      </div>
    </div>
  );

  const SessionGroup = ({ title, sessions, delay }: { title: string; sessions: any[]; delay: number }) => {
    if (sessions.length === 0) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.6 }}
        className="space-y-3"
      >
        <h2 className="text-lg font-serif font-bold text-primary tracking-tight">{title}</h2>
        <div className="space-y-2">
          {sessions.map((tasting: any) => (
            <SessionCard key={tasting.id} tasting={tasting} />
          ))}
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-serif italic">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-4xl mx-auto min-w-0 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words">{t("nav.sessions")}</h1>
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="bg-card border border-border/50 rounded-lg p-5 space-y-3"
        data-testid="join-by-code-section"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-serif font-bold text-primary">{t("session.joinSessionTitle")}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{t("session.joinSessionSubtitle")}</p>
        <div className="flex gap-2">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder={t("session.codePlaceholder")}
            className="font-mono uppercase tracking-wider max-w-[200px]"
            onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
            data-testid="input-join-code"
          />
          <Button
            onClick={handleJoinByCode}
            disabled={!joinCode.trim() || joinLoading}
            size="sm"
            data-testid="button-join-by-code"
          >
            {joinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("session.joinButton")}
          </Button>
        </div>
      </motion.div>

      {tastings.length > 0 && (
        <div className="flex rounded-lg bg-secondary/30 p-1" data-testid="session-role-tabs">
          <button
            type="button"
            onClick={() => setViewMode("host")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-serif font-medium transition-all flex items-center justify-center gap-2 ${viewMode === "host" ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="tab-hosted"
          >
            <Crown className="w-4 h-4" />
            {t("nav.sessionsHosted")} ({hostedTastings.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("participant")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-serif font-medium transition-all flex items-center justify-center gap-2 ${viewMode === "participant" ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid="tab-participated"
          >
            <Users className="w-4 h-4" />
            {t("nav.sessionsParticipated")} ({participatedTastings.length})
          </button>
        </div>
      )}

      {tastings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-16"
        >
          <p className="text-muted-foreground font-serif text-base sm:text-lg italic" data-testid="text-no-sessions">
            {t("nav.noSessions")}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {viewMode === "host" && !hasHosted && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
              <p className="text-muted-foreground font-serif italic" data-testid="text-no-hosted">{t("nav.noHostedSessions")}</p>
            </motion.div>
          )}
          {viewMode === "participant" && !hasParticipated && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
              <p className="text-muted-foreground font-serif italic" data-testid="text-no-participated">{t("nav.noParticipatedSessions")}</p>
            </motion.div>
          )}
          <SessionGroup title={t("nav.sessionsActive")} sessions={currentList.active} delay={0.1} />
          <SessionGroup title={t("nav.sessionsDraft")} sessions={currentList.drafts} delay={0.2} />
          <SessionGroup title={t("nav.sessionsArchived")} sessions={currentList.archived} delay={0.3} />
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">{t("session.actions.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("session.actions.deleteConfirmMessage")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete">{t("journal.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="btn-confirm-delete"
            >
              {t("session.actions.deleteSession")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
