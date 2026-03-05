import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLocation, Link } from "wouter";
import { UserPlus, Plus, ArrowRight, Star, Wine, Glasses, BookOpen, Camera, User, ChevronDown, Eye, Sparkles, BarChart3, Users, MapPin, NotebookPen, ScanLine, Heart, Zap, Globe, LogIn, FileUp, Navigation, LayoutDashboard, Bell } from "lucide-react";
import heroImage from "@/assets/images/hero-whisky.png";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { getSession } from "@/lib/session";
import { tastingApi, participantApi, wotdApi, notificationApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LoginDialog } from "@/components/login-dialog";
import { AiTastingImportDialog } from "@/components/ai-tasting-import";
import { queryClient } from "@/lib/queryClient";

function JourneyFlowGraphic({ steps }: { steps: string[] }) {
  const icons = [
    <Heart key="h" className="w-5 h-5" />,
    <Wine key="w" className="w-5 h-5" />,
    <NotebookPen key="n" className="w-5 h-5" />,
  ];
  const colors = [
    "bg-amber-500/20 text-amber-400 border-2 border-amber-500/40",
    "bg-primary/20 text-primary border-2 border-primary/40",
    "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40",
  ];
  return (
    <div className="relative py-4 pb-7">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 240 90" preserveAspectRatio="xMidYMid meet">
        <line x1="68" y1="38" x2="172" y2="38" stroke="currentColor" className="text-muted-foreground/20" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="68" y1="44" x2="120" y2="72" stroke="currentColor" className="text-muted-foreground/20" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="172" y1="44" x2="120" y2="72" stroke="currentColor" className="text-muted-foreground/20" strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
      <div className="relative z-10 flex justify-between items-start px-4">
        <div className="flex flex-col items-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${colors[0]}`}>{icons[0]}</div>
          <span className="text-[10px] text-muted-foreground font-medium mt-1.5">{steps[0]}</span>
        </div>
        <div className="flex flex-col items-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${colors[1]}`}>{icons[1]}</div>
          <span className="text-[10px] text-muted-foreground font-medium mt-1.5">{steps[1]}</span>
        </div>
      </div>
      <div className="relative z-10 flex justify-center mt-1">
        <div className="flex flex-col items-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${colors[2]}`}>{icons[2]}</div>
          <span className="text-[10px] text-muted-foreground font-medium mt-1.5">{steps[2]}</span>
        </div>
      </div>
    </div>
  );
}

function MiniRadarChart() {
  const points = [
    { angle: 0, value: 0.85 },
    { angle: 72, value: 0.7 },
    { angle: 144, value: 0.9 },
    { angle: 216, value: 0.6 },
    { angle: 288, value: 0.75 },
  ];
  const cx = 50, cy = 50, r = 38;
  const toXY = (angle: number, val: number) => ({
    x: cx + r * val * Math.cos((angle - 90) * Math.PI / 180),
    y: cy + r * val * Math.sin((angle - 90) * Math.PI / 180),
  });
  const gridLevels = [0.33, 0.66, 1];
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={points.map(p => toXY(p.angle, level)).map(pt => `${pt.x},${pt.y}`).join(" ")}
          fill="none" stroke="currentColor" className="text-border/40" strokeWidth="0.5"
        />
      ))}
      {points.map(p => {
        const end = toXY(p.angle, 1);
        return <line key={p.angle} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="currentColor" className="text-border/30" strokeWidth="0.3" />;
      })}
      <polygon
        points={points.map(p => toXY(p.angle, p.value)).map(pt => `${pt.x},${pt.y}`).join(" ")}
        fill="hsl(25, 70%, 45%)" fillOpacity="0.25" stroke="hsl(25, 70%, 50%)" strokeWidth="1.5"
      />
      {points.map(p => {
        const pt = toXY(p.angle, p.value);
        return <circle key={p.angle} cx={pt.x} cy={pt.y} r="2" fill="hsl(25, 70%, 50%)" />;
      })}
    </svg>
  );
}

function MiniBarChart({ categories }: { categories: string[] }) {
  const values = [82, 74, 88, 70];
  return (
    <div className="flex items-end justify-center gap-2 h-20 pt-2">
      {categories.map((cat, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-mono text-primary/80">{values[i]}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${values[i] * 0.55}px` }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.6, ease: "easeOut" }}
            className="w-7 rounded-t bg-gradient-to-t from-primary/60 to-primary/30"
          />
          <span className="text-[8px] text-muted-foreground truncate max-w-[40px]">{cat}</span>
        </div>
      ))}
    </div>
  );
}

function AiPipelineGraphic({ labels }: { labels: [string, string, string] }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.15 }}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              i === 0 ? "bg-violet-500/15 border border-violet-500/30" :
              i === 1 ? "bg-blue-500/15 border border-blue-500/30" :
              "bg-emerald-500/15 border border-emerald-500/30"
            }`}>
              {i === 0 ? <ScanLine className="w-5 h-5 text-violet-400" /> :
               i === 1 ? <Sparkles className="w-5 h-5 text-blue-400" /> :
               <Zap className="w-5 h-5 text-emerald-400" />}
            </div>
            <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
          </motion.div>
          {i < 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className="text-muted-foreground/40"
            >
              <ArrowRight className="w-3 h-3" />
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

function CommunityGraphic({ metrics }: { metrics: string[] }) {
  const values = [24, 12, 186];
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      {metrics.map((metric, i) => (
        <motion.div
          key={i}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.1 }}
          className="flex flex-col items-center"
        >
          <span className="text-xl font-mono font-bold text-primary">{values[i]}</span>
          <span className="text-[9px] text-muted-foreground">{metric}</span>
        </motion.div>
      ))}
    </div>
  );
}

function WorldMapDots({ regions }: { regions: string[] }) {
  const dots = [
    { x: 30, y: 25, label: regions[0] },
    { x: 82, y: 35, label: regions[1] },
    { x: 25, y: 30, label: regions[2] },
    { x: 15, y: 35, label: regions[3] },
    { x: 85, y: 40, label: regions[4] },
  ];
  return (
    <svg viewBox="0 0 100 60" className="w-full h-full">
      <ellipse cx="50" cy="32" rx="45" ry="24" fill="none" stroke="currentColor" className="text-border/20" strokeWidth="0.5" strokeDasharray="2 2" />
      <ellipse cx="50" cy="32" rx="30" ry="16" fill="none" stroke="currentColor" className="text-border/15" strokeWidth="0.3" strokeDasharray="2 2" />
      {dots.map((dot, i) => (
        <g key={i}>
          <motion.circle
            cx={dot.x} cy={dot.y} r="2.5"
            fill="hsl(25, 70%, 50%)" fillOpacity="0.7"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          />
          <motion.circle
            cx={dot.x} cy={dot.y} r="5"
            fill="none" stroke="hsl(25, 70%, 50%)" strokeOpacity="0.3" strokeWidth="0.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 + i * 0.1 }}
          />
          <text x={dot.x} y={dot.y + 9} textAnchor="middle" className="fill-muted-foreground" fontSize="4" fontWeight="500">{dot.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [sessionState, setSessionState] = useState(() => getSession());
  const refreshSessionState = useCallback(() => setSessionState(getSession()), []);

  useEffect(() => {
    window.addEventListener("session-change", refreshSessionState);
    return () => window.removeEventListener("session-change", refreshSessionState);
  }, [refreshSessionState]);

  const [joinCode, setJoinCode] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [showQuickJoin, setShowQuickJoin] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPin, setQuickPin] = useState("");
  const [quickJoinLoading, setQuickJoinLoading] = useState(false);
  const [quickJoinError, setQuickJoinError] = useState("");

  const [showHostForm, setShowHostForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [blindMode, setBlindMode] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [reflectionEnabled, setReflectionEnabled] = useState(false);
  const [showFeatures, setShowFeatures] = useState(!currentParticipant);
  const [showGuestCreate, setShowGuestCreate] = useState(false);
  const [guestCreateName, setGuestCreateName] = useState("");
  const [guestCreatePin, setGuestCreatePin] = useState("");
  const [guestCreateLoading, setGuestCreateLoading] = useState(false);
  const [guestCreateError, setGuestCreateError] = useState("");
  const [pendingAction, setPendingAction] = useState<"create" | "photo" | null>(null);

  const { data: tastings } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const activeSessions = tastings?.filter((t: any) => t.status !== "archived" && t.status !== "closed") || [];

  const { data: wotd } = useQuery({
    queryKey: ["whisky-of-the-day"],
    queryFn: wotdApi.get,
    staleTime: 1000 * 60 * 60,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", currentParticipant?.id],
    queryFn: () => notificationApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
    refetchInterval: 30000,
  });

  const unreadNotifications = notifications.filter((n: any) => !n.isRead);

  const createTasting = useMutation({
    mutationFn: (data: any) => tastingApi.create(data),
    onSuccess: (tasting) => {
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      navigate(`/tasting/${tasting.id}`);
    },
  });

  const doJoinSession = async (participantId: string) => {
    if (!joinCode.trim()) return;
    setJoinError("");
    try {
      const code = joinCode.trim().toUpperCase();
      const tasting = await tastingApi.getByCode(code);
      await tastingApi.join(tasting.id, participantId, code);
      navigate(`/tasting/${tasting.id}`);
    } catch (e: any) {
      setJoinError(e.message || t("home.sessionNotFound"));
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    if (!currentParticipant) {
      setShowQuickJoin(true);
      return;
    }
    await doJoinSession(currentParticipant.id);
  };

  const handleQuickJoin = async () => {
    if (!quickName.trim() || quickPin.length < 4) return;
    setQuickJoinLoading(true);
    setQuickJoinError("");
    try {
      const guest = await participantApi.guestJoin(quickName.trim(), quickPin);
      setParticipant({ id: guest.id, name: guest.name, role: guest.role, canAccessWhiskyDb: guest.canAccessWhiskyDb });
      setShowQuickJoin(false);
      setQuickName("");
      setQuickPin("");
      await doJoinSession(guest.id);
    } catch (e: any) {
      if (e.message?.includes("already taken")) {
        setQuickJoinError(t("home.nameTaken"));
      } else {
        setQuickJoinError(e.message || t("home.joinFailed"));
      }
    } finally {
      setQuickJoinLoading(false);
    }
  };

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
      setShowGuestCreate(true);
      return;
    }
    doCreateTasting(currentParticipant.id);
  };

  const handlePhotoTasting = () => {
    if (!currentParticipant) {
      setPendingAction("photo");
      setShowGuestCreate(true);
      return;
    }
    navigate("/photo-tasting");
  };

  const handleGuestCreateSubmit = async () => {
    if (!guestCreateName.trim() || guestCreatePin.length < 4) return;
    setGuestCreateLoading(true);
    setGuestCreateError("");
    try {
      const participant = await participantApi.guestJoin(guestCreateName.trim(), guestCreatePin);
      setParticipant({ id: participant.id, name: participant.name, role: participant.role, canAccessWhiskyDb: participant.canAccessWhiskyDb });
      setShowGuestCreate(false);
      setGuestCreateName("");
      setGuestCreatePin("");
      if (pendingAction === "create") {
        doCreateTasting(participant.id);
      } else if (pendingAction === "photo") {
        navigate("/photo-tasting");
      }
      setPendingAction(null);
    } catch (e: any) {
      setGuestCreateError(e.message || "Failed");
    } finally {
      setGuestCreateLoading(false);
    }
  };

  const journeySteps = t("features.journeySteps", { returnObjects: true }) as string[];
  const tastingCategories = t("features.tastingCategories", { returnObjects: true }) as string[];
  const communityMetrics = t("features.communityMetrics", { returnObjects: true }) as string[];
  const encyclopediaRegions = t("features.encyclopediaRegions", { returnObjects: true }) as string[];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto space-y-10 py-10">
      <LoginDialog open={showLogin} onClose={() => setShowLogin(false)} />
      <AiTastingImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />

      <Dialog open={showQuickJoin} onOpenChange={(v) => { if (!v) { setShowQuickJoin(false); setQuickJoinError(""); } }}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary flex items-center gap-2">
              <User className="w-5 h-5" />
              {t("home.quickJoinTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("home.quickJoinDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("home.yourName")}</Label>
              <Input
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder={t("home.namePlaceholder")}
                className="bg-secondary/20"
                autoFocus
                data-testid="input-quick-name"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("guestAuth.pinLabel")}</Label>
              <Input
                type="password"
                value={quickPin}
                onChange={(e) => setQuickPin(e.target.value)}
                placeholder={t("guestAuth.pinPlaceholder")}
                maxLength={6}
                className="bg-secondary/20"
                data-testid="input-quick-pin"
                onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
              />
              <p className="text-[11px] text-muted-foreground/70">{t("guestAuth.pinReminder")}</p>
            </div>
            {quickJoinError && <p className="text-sm text-destructive" data-testid="text-quick-join-error">{quickJoinError}</p>}
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{t('guestAuth.consentNotice')}</p>
            <Button
              onClick={handleQuickJoin}
              disabled={quickJoinLoading || !quickName.trim() || quickPin.length < 4}
              className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
              data-testid="button-quick-join"
            >
              {quickJoinLoading ? t("home.joining") : t("home.joinNow")}
            </Button>
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{t("guestAuth.hobbyNotice")}</p>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setShowQuickJoin(false); setShowLogin(true); }}
                className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
                data-testid="button-switch-to-signin"
              >
                {t("home.haveAccount")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGuestCreate} onOpenChange={(v) => { if (!v) { setShowGuestCreate(false); setGuestCreateError(""); setPendingAction(null); } }}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary flex items-center gap-2">
              <User className="w-5 h-5" />
              {t("home.quickJoinTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("home.quickJoinDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("home.yourName")}</Label>
              <Input
                value={guestCreateName}
                onChange={(e) => setGuestCreateName(e.target.value)}
                placeholder={t("home.namePlaceholder")}
                className="bg-secondary/20"
                autoFocus
                data-testid="input-guest-create-name"
                onKeyDown={(e) => e.key === "Enter" && handleGuestCreateSubmit()}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-serif text-sm uppercase tracking-widest text-muted-foreground">{t("guestAuth.pinLabel")}</Label>
              <Input
                value={guestCreatePin}
                onChange={(e) => setGuestCreatePin(e.target.value)}
                placeholder={t("guestAuth.pinPlaceholder")}
                type="password"
                maxLength={6}
                className="bg-secondary/20"
                data-testid="input-guest-create-pin"
                onKeyDown={(e) => e.key === "Enter" && handleGuestCreateSubmit()}
              />
              <p className="text-[11px] text-muted-foreground/70">{t("guestAuth.pinReminder")}</p>
            </div>
            {guestCreateError && <p className="text-sm text-destructive" data-testid="text-guest-create-error">{guestCreateError}</p>}
            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{t('guestAuth.consentNotice')}</p>
            <Button
              onClick={handleGuestCreateSubmit}
              disabled={guestCreateLoading || !guestCreateName.trim() || guestCreatePin.length < 4}
              className="w-full bg-primary text-primary-foreground font-serif tracking-wide"
              data-testid="button-guest-create-submit"
            >
              {guestCreateLoading ? t("home.joining") : t("home.joinNow")}
            </Button>
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{t("guestAuth.hobbyNotice")}</p>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setShowGuestCreate(false); setShowLogin(true); }}
                className="text-xs text-muted-foreground hover:text-primary underline transition-colors"
              >
                {t("home.haveAccount")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="w-full space-y-0"
      >
        <div className="relative w-full rounded-xl overflow-hidden shadow-lg">
          <img
            src={heroImage}
            alt="Whisky tasting atmosphere"
            className="w-full object-cover h-36 md:h-48"
            data-testid="img-hero"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tighter text-white drop-shadow-lg pb-1">
              {t('app.name')}
            </h1>
            <p className="text-base md:text-lg text-white/80 max-w-lg font-light leading-relaxed font-serif italic drop-shadow">
              "{t('app.tagline')}"
            </p>
          </div>
        </div>
        {currentParticipant && sessionState.signedIn && (
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-semibold text-primary">{currentParticipant.name}</span>
            </p>
          </div>
        )}
      </motion.div>

      {/* Quick Links - always visible */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.8 }}
        className="w-full space-y-4"
      >
        {currentParticipant && sessionState.signedIn && (
          <h2 className="font-serif text-2xl text-primary" data-testid="text-welcome-back">
            {t("home.welcomeBack", { name: currentParticipant.name })}
          </h2>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/tasting/sessions">
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center hover:shadow-md transition-all duration-300 cursor-pointer" data-testid="card-stat-sessions">
              <Wine className="w-6 h-6 text-primary mx-auto mb-2" />
              {currentParticipant ? (
                <p className="text-2xl font-mono font-bold text-primary">{activeSessions.length}</p>
              ) : (
                <ArrowRight className="w-4 h-4 text-muted-foreground mx-auto" />
              )}
              <p className="text-xs text-muted-foreground mt-1">{t("home.activeSessions")}</p>
            </div>
          </Link>
          <Link href="/my-taste/drams">
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center hover:shadow-md transition-all duration-300 cursor-pointer" data-testid="card-stat-journal">
              <NotebookPen className="w-6 h-6 text-primary mx-auto mb-2" />
              <ArrowRight className="w-4 h-4 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground mt-1">{t("home.myJournal")}</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {currentParticipant && unreadNotifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="w-full"
        >
          <Link href="/news">
            <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-300/30 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-300" data-testid="card-unread-news">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-serif font-bold text-blue-800 dark:text-blue-400">
                    {t("home.unreadNews", { count: unreadNotifications.length })}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-500/60" />
              </div>
              {unreadNotifications.slice(0, 3).map((n: any) => (
                <div key={n.id} className="mt-2 flex items-start gap-2 text-xs text-blue-700/80 dark:text-blue-300/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span className="line-clamp-1">{n.title}</span>
                </div>
              ))}
            </div>
          </Link>
        </motion.div>
      )}

      {currentParticipant && tastings?.some((t: any) => t.hostId === currentParticipant.id) && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.8 }}
          className="w-full"
        >
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300/30 rounded-xl p-4">
            <h3 className="font-serif text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Glasses className="w-4 h-4" />
              {t("hostShortcuts.title")}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Link href="/tasting">
                <div
                  className="bg-white/80 dark:bg-card border border-amber-200/50 rounded-lg p-3 text-center hover:shadow-md hover:border-amber-400/50 transition-all duration-300 cursor-pointer"
                  onClick={(e) => { e.preventDefault(); setShowHostForm(true); }}
                  data-testid="host-shortcut-create"
                >
                  <Plus className="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-foreground">{t("hostShortcuts.createTasting")}</p>
                </div>
              </Link>
              <Link href="/tasting/sessions">
                <div className="bg-white/80 dark:bg-card border border-amber-200/50 rounded-lg p-3 text-center hover:shadow-md hover:border-amber-400/50 transition-all duration-300 cursor-pointer" data-testid="host-shortcut-my-tastings">
                  <Wine className="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-foreground">{t("hostShortcuts.myHostedTastings")}</p>
                </div>
              </Link>
              <Link href="/host-dashboard">
                <div className="bg-white/80 dark:bg-card border border-amber-200/50 rounded-lg p-3 text-center hover:shadow-md hover:border-amber-400/50 transition-all duration-300 cursor-pointer" data-testid="host-shortcut-dashboard">
                  <LayoutDashboard className="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-foreground">{t("hostShortcuts.hostDashboard")}</p>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Join + Host cards - always visible side by side */}
      <div className="grid md:grid-cols-2 gap-8 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
          <Card className="h-full border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 font-serif text-2xl text-primary">
                <UserPlus className="w-5 h-5 text-accent" /> Join Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Access Code"
                className="font-mono uppercase tracking-widest bg-secondary/30 border-border/50"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                data-testid="input-join-code"
              />
              {joinError && <p className="text-xs text-destructive">{joinError}</p>}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button onClick={handleJoin} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-serif tracking-wide" data-testid="button-join-session">
                Enter Tasting Room <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}>
          <Card className="h-full border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-500">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setShowHostForm(!showHostForm)}
              data-testid="button-toggle-host-form"
            >
              <CardTitle className="flex items-center gap-3 font-serif text-2xl text-primary">
                <Plus className="w-5 h-5 text-accent" /> Host Session
                <ChevronDown className={`w-4 h-4 ml-auto text-muted-foreground transition-transform duration-300 ${showHostForm ? "rotate-180" : ""}`} />
              </CardTitle>
              {!showHostForm && (
                <CardDescription className="text-xs text-muted-foreground/80">
                  {t("home.hostDesc")}
                </CardDescription>
              )}
            </CardHeader>
            {showHostForm && (
              <>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Title</Label>
                    <Input placeholder="Friday Night Drams" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-secondary/20" data-testid="input-tasting-title" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Date</Label>
                      <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="bg-secondary/20" data-testid="input-tasting-date" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Location</Label>
                      <Input placeholder="The Library" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="bg-secondary/20" data-testid="input-tasting-location" />
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
                      <Switch checked={blindMode} onCheckedChange={(v) => { setBlindMode(v); if (v) setGuidedMode(true); }} data-testid="switch-blind-mode" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs font-medium">{t("sessionSettings.guidedMode")}</Label>
                          <p className="text-[10px] text-muted-foreground leading-tight">{t("sessionSettings.guidedModeDesc")}</p>
                        </div>
                      </div>
                      <Switch checked={guidedMode} onCheckedChange={setGuidedMode} data-testid="switch-guided-mode" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <Label className="text-xs font-medium">{t("sessionSettings.reflectionPhase")}</Label>
                          <p className="text-[10px] text-muted-foreground leading-tight">{t("sessionSettings.reflectionDesc")}</p>
                        </div>
                      </div>
                      <Switch checked={reflectionEnabled} onCheckedChange={setReflectionEnabled} data-testid="switch-reflection" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCreate}
                    disabled={createTasting.isPending || !newTitle.trim()}
                    className="w-full border-primary/20 hover:border-primary text-primary hover:bg-secondary font-serif tracking-wide"
                    data-testid="button-create-tasting"
                  >
                    {createTasting.isPending ? "Creating..." : "Create New Event"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handlePhotoTasting}
                    className="w-full text-xs gap-2 text-muted-foreground hover:text-primary"
                    data-testid="button-create-from-photos"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {t("home.createFromPhotos")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowImportDialog(true)}
                    className="w-full text-xs gap-2 text-muted-foreground hover:text-primary"
                    data-testid="button-create-from-file"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    {t("aiImport.createFromFile")}
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Features showcase - always visible */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="w-full"
      >
        <Card className="border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-500">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setShowFeatures(!showFeatures)}
            data-testid="button-toggle-features"
          >
            <CardTitle className="flex items-center gap-3 font-serif text-2xl text-primary">
              <Eye className="w-5 h-5 text-accent" />
              {showFeatures ? t("home.hideFeatures") : t("home.showFeatures")}
              <ChevronDown className={`w-4 h-4 ml-auto text-muted-foreground transition-transform duration-300 ${showFeatures ? "rotate-180" : ""}`} />
            </CardTitle>
            {!showFeatures && (
              <CardDescription className="text-xs text-muted-foreground/80">
                {t("home.showFeaturesHint")}
              </CardDescription>
            )}
          </CardHeader>
          <AnimatePresence>
            {showFeatures && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <CardContent className="space-y-4">
                  <p className="text-center text-sm text-foreground/90 font-serif italic px-4">
                    {t("home.introHeadline")}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="border border-border/40 bg-card rounded-xl p-4 space-y-2"
                      data-testid="card-feature-journey"
                    >
                      <h3 className="font-serif font-bold text-primary text-sm flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        {t("features.journey")}
                      </h3>
                      <JourneyFlowGraphic steps={journeySteps} />
                      <p className="text-xs text-muted-foreground leading-relaxed pt-3">{t("features.journeyDesc")}</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="border border-border/40 bg-card rounded-xl p-4 space-y-2"
                      data-testid="card-feature-ai"
                    >
                      <h3 className="font-serif font-bold text-primary text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {t("features.ai")}
                      </h3>
                      <AiPipelineGraphic labels={[t("features.aiScan"), t("features.aiMatch"), t("features.aiRec")]} />
                      <p className="text-xs text-muted-foreground leading-relaxed">{t("features.aiDesc")}</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="border border-border/40 bg-card rounded-xl p-4 space-y-2"
                      data-testid="card-feature-tasting"
                    >
                      <h3 className="font-serif font-bold text-primary text-sm flex items-center gap-2">
                        <Glasses className="w-4 h-4" />
                        {t("features.tasting")}
                      </h3>
                      <MiniBarChart categories={tastingCategories} />
                      <p className="text-xs text-muted-foreground leading-relaxed">{t("features.tastingDesc")}</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="border border-border/40 bg-card rounded-xl p-4 space-y-2"
                      data-testid="card-feature-stats"
                    >
                      <h3 className="font-serif font-bold text-primary text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        {t("features.stats")}
                      </h3>
                      <div className="w-24 h-24 mx-auto">
                        <MiniRadarChart />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t("features.statsDesc")}</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="border border-border/40 bg-card rounded-xl p-4 space-y-2"
                      data-testid="card-feature-community"
                    >
                      <h3 className="font-serif font-bold text-primary text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {t("features.community")}
                      </h3>
                      <CommunityGraphic metrics={communityMetrics} />
                      <p className="text-xs text-muted-foreground leading-relaxed">{t("features.communityDesc")}</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="border border-border/40 bg-card rounded-xl p-4 space-y-2"
                      data-testid="card-feature-encyclopedia"
                    >
                      <h3 className="font-serif font-bold text-primary text-sm flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        {t("features.encyclopedia")}
                      </h3>
                      <div className="h-20">
                        <WorldMapDots regions={encyclopediaRegions} />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t("features.encyclopediaDesc")}</p>
                    </motion.div>
                  </div>

                  <p className="text-center text-xs text-muted-foreground italic pt-1">
                    {t("home.introFooter")}
                  </p>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Whisky of the Day */}
      {wotd && wotd.whisky && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="w-full">
          <div className="bg-card border border-border/50 rounded-lg overflow-hidden shadow-sm" data-testid="card-wotd">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-serif font-bold text-primary uppercase tracking-widest">{t("wotd.title")}</h2>
              </div>
            </div>
            <div className="p-6 flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-shrink-0">
                {wotd.whisky.imageUrl ? (
                  <img src={wotd.whisky.imageUrl} alt={wotd.whisky.name} className="w-24 h-24 object-cover rounded-full border-2 border-primary/20 shadow-md" data-testid="img-wotd" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-secondary/30 border-2 border-primary/20 flex items-center justify-center">
                    <Wine className="w-10 h-10 text-primary/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-center md:text-left space-y-2">
                <h3 className="font-serif text-2xl font-bold text-primary" data-testid="text-wotd-name">{wotd.whisky.name}</h3>
                <p className="text-muted-foreground font-serif italic">{wotd.whisky.distillery || "Unknown distillery"}</p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-2">
                  {wotd.whisky.age && (
                    <span className="text-xs bg-secondary px-2 py-1 rounded text-secondary-foreground">{wotd.whisky.age} yo</span>
                  )}
                  {wotd.whisky.abv && (
                    <span className="text-xs bg-secondary px-2 py-1 rounded text-secondary-foreground font-mono">{wotd.whisky.abv}%</span>
                  )}
                  {wotd.whisky.region && (
                    <span className="text-xs bg-secondary px-2 py-1 rounded text-secondary-foreground">{wotd.whisky.region}</span>
                  )}
                  {wotd.whisky.type && (
                    <span className="text-xs bg-secondary px-2 py-1 rounded text-secondary-foreground">{wotd.whisky.type}</span>
                  )}
                  {wotd.whisky.peatLevel && wotd.whisky.peatLevel !== "None" && (
                    <span className="text-xs bg-secondary px-2 py-1 rounded text-secondary-foreground">Peat: {wotd.whisky.peatLevel}</span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-center space-y-3 min-w-[140px]">
                {wotd.ratingCount > 0 ? (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("wotd.avgRating")}</p>
                      <p className="text-4xl font-mono font-bold text-primary" data-testid="text-wotd-rating">{wotd.avgRating}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("wotd.ratings", { count: wotd.ratingCount })}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-secondary/30 rounded px-2 py-1">
                        <span className="text-muted-foreground block">{t("wotd.nose")}</span>
                        <span className="font-mono font-medium">{wotd.categories.nose}</span>
                      </div>
                      <div className="bg-secondary/30 rounded px-2 py-1">
                        <span className="text-muted-foreground block">{t("wotd.taste")}</span>
                        <span className="font-mono font-medium">{wotd.categories.taste}</span>
                      </div>
                      <div className="bg-secondary/30 rounded px-2 py-1">
                        <span className="text-muted-foreground block">{t("wotd.finish")}</span>
                        <span className="font-mono font-medium">{wotd.categories.finish}</span>
                      </div>
                      <div className="bg-secondary/30 rounded px-2 py-1">
                        <span className="text-muted-foreground block">{t("wotd.balance")}</span>
                        <span className="font-mono font-medium">{wotd.categories.balance}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic font-serif">{t("wotd.noRatings")}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Whisky Wisdom */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.8 }} className="w-full">
        {(() => {
          const facts = t("wisdom.facts", { returnObjects: true }) as string[];
          const today = new Date();
          const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
          const factIndex = dayOfYear % facts.length;
          return (
            <div className="bg-card border border-border/50 rounded-lg overflow-hidden shadow-sm" data-testid="card-wisdom">
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-6 py-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-serif font-bold text-primary uppercase tracking-widest">{t("wisdom.title")}</h2>
                </div>
              </div>
              <div className="p-6">
                <p className="font-serif text-lg leading-relaxed text-foreground/90 italic" data-testid="text-wisdom-fact">
                  "{facts[factIndex]}"
                </p>
              </div>
            </div>
          );
        })()}
      </motion.div>

      <div className="text-center pt-8 pb-2">
        <p className="text-xs text-muted-foreground/40 font-mono tracking-wide" data-testid="text-version-hint">
          v2.8.0 &middot; Feb 17, 2026, 14:30 UTC
        </p>
      </div>

    </div>
  );
}
