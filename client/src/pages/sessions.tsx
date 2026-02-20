import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { tastingApi, participantApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAppStore } from "@/lib/store";
import { ArrowRight, Trash2, KeyRound, Loader2, Crown, Users, Plus, Camera, FileUp, Glasses, BookOpen, ChevronDown, Navigation } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GuestPreview } from "@/components/guest-preview";
import { AiTastingImportDialog } from "@/components/ai-tasting-import";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

export default function Sessions() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant, setParticipant } = useAppStore();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"host" | "participant">("host");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newLocation, setNewLocation] = useState("");
  const [blindMode, setBlindMode] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [reflectionEnabled, setReflectionEnabled] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPin, setGuestPin] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");
  const [pendingAction, setPendingAction] = useState<"create" | "photo" | "join" | null>(null);

  const hasUnsavedCreate = showCreateForm && newTitle.trim().length > 0;
  useUnsavedChanges(hasUnsavedCreate);

  const { data: tastings = [], isLoading } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const createTasting = useMutation({
    mutationFn: (data: any) => tastingApi.create(data),
    onSuccess: (tasting) => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      navigate(`/tasting/${tasting.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (tasting: any) => {
      if (tasting.status === "open" || tasting.status === "closed" || tasting.status === "reveal") {
        await tastingApi.updateStatus(tasting.id, "archived", undefined, currentParticipant!.id);
      }
      return tastingApi.updateStatus(tasting.id, "deleted", undefined, currentParticipant!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      setDeleteTarget(null);
      toast({ title: t("session.actions.deleted") });
    },
    onError: (error: any) => {
      toast({ title: error.message || t("session.actions.deleteFailed"), variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const doCreateTasting = (hostId: string) => {
    if (!newTitle.trim()) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    createTasting.mutate({
      title: newTitle.trim(),
      date: newDate,
      location: newLocation.trim() || "—",
      hostId,
      code,
      status: "draft",
      currentAct: "act1",
      blindMode,
      guidedMode,
      reflectionEnabled,
    });
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    if (!currentParticipant) {
      setPendingAction("create");
      setShowGuestDialog(true);
      return;
    }
    doCreateTasting(currentParticipant.id);
  };

  const handlePhotoTasting = () => {
    if (!currentParticipant) {
      setPendingAction("photo");
      setShowGuestDialog(true);
      return;
    }
    navigate("/photo-tasting");
  };

  const doJoinSession = async (participantId: string) => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoinLoading(true);
    try {
      const tasting = await tastingApi.getByCode(code);
      if (!tasting) {
        toast({ title: t("session.codeNotFound"), variant: "destructive" });
        return;
      }
      await tastingApi.join(tasting.id, participantId, code);
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

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    if (!currentParticipant) {
      setPendingAction("join");
      setShowGuestDialog(true);
      return;
    }
    await doJoinSession(currentParticipant.id);
  };

  const handleGuestSubmit = async () => {
    if (!guestName.trim()) return;
    setGuestLoading(true);
    setGuestError("");
    try {
      const participant = await participantApi.loginOrCreate(guestName.trim(), guestPin || undefined);
      setParticipant({ id: participant.id, name: participant.name, role: participant.role, canAccessWhiskyDb: participant.canAccessWhiskyDb });
      setShowGuestDialog(false);
      setGuestName("");
      setGuestPin("");
      if (pendingAction === "create") {
        doCreateTasting(participant.id);
      } else if (pendingAction === "photo") {
        navigate("/photo-tasting");
      } else if (pendingAction === "join") {
        await doJoinSession(participant.id);
      }
      setPendingAction(null);
    } catch (e: any) {
      setGuestError(e.message || "Failed");
    } finally {
      setGuestLoading(false);
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

  const canDelete = (tasting: any) => isHostOf(tasting) && tasting.status !== "open";

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

  const CreateSection = () => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.6 }}
      className="bg-card border border-border/50 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="w-full p-5 flex items-center gap-3 text-left hover:bg-secondary/10 transition-colors"
        data-testid="button-toggle-create-form"
      >
        <Plus className="w-5 h-5 text-primary" />
        <span className="font-serif font-bold text-primary text-base">{t("sessions.createNew")}</span>
        <ChevronDown className={`w-4 h-4 ml-auto text-muted-foreground transition-transform duration-300 ${showCreateForm ? "rotate-180" : ""}`} />
      </button>
      {showCreateForm && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/30 pt-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("sessions.titleLabel")}</Label>
            <Input placeholder={t("sessions.titlePlaceholder")} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-secondary/20" data-testid="input-session-title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("sessions.dateLabel")}</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="bg-secondary/20" data-testid="input-session-date" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">{t("sessions.locationLabel")}</Label>
              <Input placeholder={t("sessions.locationPlaceholder")} value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="bg-secondary/20" data-testid="input-session-location" />
            </div>
          </div>
          <div className="border-t border-border/30 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Glasses className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs font-medium">{t("sessionSettings.blindMode")}</Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">{t("sessionSettings.blindModeDesc")}</p>
                </div>
              </div>
              <Switch checked={blindMode} onCheckedChange={(v) => { setBlindMode(v); if (v) setGuidedMode(true); }} data-testid="switch-session-blind" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs font-medium">{t("sessionSettings.guidedMode")}</Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">{t("sessionSettings.guidedModeDesc")}</p>
                </div>
              </div>
              <Switch checked={guidedMode} onCheckedChange={setGuidedMode} data-testid="switch-session-guided" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs font-medium">{t("sessionSettings.reflectionPhase")}</Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">{t("sessionSettings.reflectionDesc")}</p>
                </div>
              </div>
              <Switch checked={reflectionEnabled} onCheckedChange={setReflectionEnabled} data-testid="switch-session-reflection" />
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleCreate}
              disabled={createTasting.isPending || !newTitle.trim()}
              className="w-full font-serif tracking-wide"
              data-testid="button-create-session"
            >
              {createTasting.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("sessions.createButton")}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handlePhotoTasting}
                className="flex-1 text-xs gap-2 text-muted-foreground hover:text-primary"
                data-testid="button-session-from-photos"
              >
                <Camera className="w-3.5 h-3.5" />
                {t("home.createFromPhotos")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowImportDialog(true)}
                className="flex-1 text-xs gap-2 text-muted-foreground hover:text-primary"
                data-testid="button-session-from-file"
              >
                <FileUp className="w-3.5 h-3.5" />
                {t("aiImport.createFromFile")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );

  const JoinSection = () => (
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
  );

  if (!currentParticipant) {
    return (
      <div className="space-y-10 max-w-4xl mx-auto min-w-0 overflow-x-hidden">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight break-words">{t("nav.sessions")}</h1>
          <div className="w-12 h-1 bg-primary/50 mt-3" />
        </motion.div>

        <JoinSection />
        <CreateSection />

        <GuestPreview featureTitle={t("sessions.yourSessionsTitle")} featureDescription={t("guestPreview.sessions")}>
          <div className="space-y-4">
            <h2 className="text-lg font-serif font-bold text-primary">{t("sessions.yourSessionsTitle")}</h2>
            <div className="space-y-2">
              {[
                { title: "Highland Evening", location: "The Whisky Lounge", date: "2026-02-15", status: "open" },
                { title: "Islay Exploration", location: "Home Tasting", date: "2026-01-28", status: "reveal" },
                { title: "Speyside Classics", location: "The Library Bar", date: "2025-12-12", status: "archived" },
              ].map(s => (
                <div key={s.title} className="w-full p-4 bg-card border border-border/50 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <div className="font-serif font-bold text-primary">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.location} &bull; {new Date(s.date).toLocaleDateString()}</div>
                  </div>
                  <span className="text-xs bg-secondary px-2 py-1 rounded-full text-secondary-foreground font-mono uppercase">{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </GuestPreview>

        <Dialog open={showGuestDialog} onOpenChange={setShowGuestDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">{t("aiImport.guestIdentify")}</DialogTitle>
              <DialogDescription>{t("home.quickJoinDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t("aiImport.guestNamePlaceholder")}
                onKeyDown={(e) => e.key === "Enter" && handleGuestSubmit()}
                data-testid="input-guest-name-sessions"
              />
              <Input
                value={guestPin}
                onChange={(e) => setGuestPin(e.target.value)}
                placeholder={t("aiImport.guestPinPlaceholder")}
                type="password"
                data-testid="input-guest-pin-sessions"
              />
              {guestError && <p className="text-xs text-destructive">{guestError}</p>}
              <Button onClick={handleGuestSubmit} disabled={!guestName.trim() || guestLoading} className="w-full" data-testid="button-guest-submit-sessions">
                {guestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("home.joinNow")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {showImportDialog && (
          <AiTastingImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

      <JoinSection />
      <CreateSection />

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

      {showImportDialog && (
        <AiTastingImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
      )}
    </div>
  );
}
