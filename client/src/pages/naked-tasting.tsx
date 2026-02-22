import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { tastingApi, whiskyApi, ratingApi, participantApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Wine, ArrowRight, Check, Download, Trophy, LogIn } from "lucide-react";
import type { Whisky, Tasting } from "@shared/schema";

function NakedWhiskyCard({
  whisky,
  tasting,
  participantId,
  index,
}: {
  whisky: Whisky;
  tasting: Tasting;
  participantId: string;
  index: number;
}) {
  const { t } = useTranslation();
  const scale = tasting.ratingScale || 100;
  const mid = scale / 2;
  const step = scale >= 100 ? 1 : scale >= 20 ? 0.5 : 0.1;

  const { data: existingRating } = useQuery({
    queryKey: ["rating", participantId, whisky.id],
    queryFn: () => ratingApi.getMyRating(participantId, whisky.id),
    enabled: !!participantId && !!whisky.id,
  });

  const [scores, setScores] = useState({
    nose: mid, taste: mid, finish: mid, balance: mid, overall: mid,
  });
  const [notes, setNotes] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ scores, notes });
  latestRef.current = { scores, notes };

  const saveMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating", participantId, whisky.id] });
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  useEffect(() => {
    if (existingRating) {
      setScores({
        nose: existingRating.nose, taste: existingRating.taste,
        finish: existingRating.finish, balance: existingRating.balance,
        overall: existingRating.overall,
      });
      setNotes(existingRating.notes || "");
      setIsDirty(false);
    }
  }, [existingRating]);

  const computeAvg = (s: typeof scores) => {
    const factor = step < 1 ? (1 / step) : 1;
    const avg = (s.nose + s.taste + s.finish + s.balance) / 4;
    return Math.round(avg * factor) / factor;
  };

  const triggerAutoSave = useCallback(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      if (!participantId) return;
      saveMutation.mutate({
        tastingId: tasting.id,
        whiskyId: whisky.id,
        participantId,
        ...latestRef.current.scores,
        notes: latestRef.current.notes,
      });
    }, 1200);
  }, [participantId, tasting.id, whisky.id, saveMutation]);

  useEffect(() => {
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, []);

  const handleScore = (key: string, value: number) => {
    const factor = step < 1 ? (1 / step) : 1;
    const clamped = Math.max(0, Math.min(scale, Math.round(value * factor) / factor));
    setScores(prev => {
      const next = { ...prev, [key]: clamped };
      if (key !== "overall") {
        next.overall = computeAvg(next);
      }
      return next;
    });
    setIsDirty(true);
    triggerAutoSave();
  };

  const isLocked = tasting.status !== "open" && tasting.status !== "draft";
  const isBlind = tasting.blindMode && tasting.status === "open";
  const whiskyLabel = isBlind ? `Whisky ${index + 1}` : whisky.name;

  const categories = [
    { id: "nose" as const, label: t("evaluation.nose"), emoji: "👃" },
    { id: "taste" as const, label: t("evaluation.taste"), emoji: "👅" },
    { id: "finish" as const, label: t("evaluation.finish"), emoji: "✨" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="p-4 border-border/30 bg-card/70" data-testid={`naked-whisky-${whisky.id}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center font-serif">{index + 1}</span>
            <h3 className="font-serif font-bold text-primary text-sm truncate">{whiskyLabel}</h3>
          </div>
          {saved && (
            <span className="text-[10px] text-green-600 flex items-center gap-1 font-mono">
              <Check className="w-3 h-3" /> saved
            </span>
          )}
          {existingRating && !saved && (
            <span className="text-[10px] text-muted-foreground font-mono">
              ✓ {t("evaluation.rated", "bewertet")}
            </span>
          )}
        </div>

        {!isBlind && (whisky.distillery || whisky.age || whisky.abv) && (
          <p className="text-[10px] text-muted-foreground mb-3 font-mono uppercase">
            {[whisky.distillery, whisky.age ? `${whisky.age}y` : null, whisky.abv ? `${whisky.abv}%` : null].filter(Boolean).join(" · ")}
          </p>
        )}

        {!isLocked ? (
          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-[10px] font-serif font-bold text-muted-foreground uppercase w-12 flex-shrink-0">{cat.emoji} {cat.label}</span>
                <Slider
                  value={[scores[cat.id]]}
                  max={scale} step={step} min={0}
                  onValueChange={(val) => handleScore(cat.id, val[0])}
                  className="flex-1"
                  data-testid={`naked-slider-${cat.id}-${whisky.id}`}
                />
                <span className="text-xs font-mono font-bold w-8 text-right">{scores[cat.id]}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1 border-t border-border/20">
              <span className="text-[10px] font-serif font-bold text-primary uppercase">Gesamt</span>
              <span className="text-sm font-mono font-black text-primary">{scores.overall}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <span className="text-xs text-muted-foreground font-serif">{t("evaluation.locked", "Bewertung abgeschlossen")}</span>
            {existingRating && (
              <div className="mt-1 text-lg font-mono font-black text-primary">{existingRating.overall}</div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function NakedResults({ tasting, whiskies }: { tasting: Tasting; whiskies: Whisky[] }) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();

  const { data: allRatings = [] } = useQuery({
    queryKey: ["ratings", tasting.id],
    queryFn: () => ratingApi.getForTasting(tasting.id),
    enabled: !!tasting.id,
  });

  const whiskyResults = whiskies.map(w => {
    const ratings = allRatings.filter((r: any) => r.whiskyId === w.id);
    const avgOverall = ratings.length > 0
      ? Math.round((ratings.reduce((sum: number, r: any) => sum + r.overall, 0) / ratings.length) * 10) / 10
      : 0;
    const myRating = currentParticipant
      ? ratings.find((r: any) => r.participantId === currentParticipant.id)
      : null;
    return { whisky: w, avgOverall, count: ratings.length, myScore: myRating?.overall ?? null };
  }).sort((a, b) => b.avgOverall - a.avgOverall);

  const handleDownload = () => {
    const lines = [
      `CaskSense - ${tasting.title}`,
      `${tasting.date || ""} · ${tasting.location || ""}`,
      `${"=".repeat(50)}`,
      "",
      `${t("naked.ranking", "Ranking")}:`,
      "",
    ];
    whiskyResults.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.whisky.name}`);
      if (r.whisky.distillery) lines.push(`   ${r.whisky.distillery}`);
      lines.push(`   Ø ${r.avgOverall} (${r.count} ${t("naked.ratings", "Bewertungen")})`);
      if (r.myScore !== null) lines.push(`   ${t("naked.myScore", "Mein Wert")}: ${r.myScore}`);
      lines.push("");
    });
    lines.push(`${"=".repeat(50)}`);
    lines.push(`CaskSense · casksense.replit.app`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, "_")}_results.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <Trophy className="w-8 h-8 text-amber-500 mx-auto" />
        <h2 className="text-xl font-serif font-black text-primary">{t("naked.results", "Ergebnis")}</h2>
        <p className="text-xs text-muted-foreground">{allRatings.length} {t("naked.totalRatings", "Bewertungen gesamt")}</p>
      </div>

      <div className="space-y-2">
        {whiskyResults.map((r, i) => (
          <Card key={r.whisky.id} className="p-3 border-border/30 bg-card/70" data-testid={`naked-result-${r.whisky.id}`}>
            <div className="flex items-center gap-3">
              <span className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-serif font-bold text-sm flex-shrink-0",
                i === 0 ? "bg-amber-500/20 text-amber-600" :
                i === 1 ? "bg-gray-300/30 text-gray-600" :
                i === 2 ? "bg-orange-400/20 text-orange-600" :
                "bg-muted/30 text-muted-foreground"
              )}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-serif font-bold text-sm text-primary truncate">{r.whisky.name}</div>
                {r.whisky.distillery && (
                  <div className="text-[10px] text-muted-foreground font-mono uppercase truncate">
                    {[r.whisky.distillery, r.whisky.age ? `${r.whisky.age}y` : null, r.whisky.abv ? `${r.whisky.abv}%` : null].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-mono font-black text-primary">Ø {r.avgOverall}</div>
                <div className="text-[9px] text-muted-foreground">{r.count} Ratings</div>
                {r.myScore !== null && (
                  <div className="text-[10px] text-primary/70 font-mono">{t("naked.you", "Du")}: {r.myScore}</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleDownload}
        variant="outline"
        className="w-full font-serif gap-2"
        data-testid="button-download-results"
      >
        <Download className="w-4 h-4" />
        {t("naked.download", "Ergebnis herunterladen")}
      </Button>
    </div>
  );
}

export default function NakedTasting() {
  const { t } = useTranslation();
  const params = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const { currentParticipant, setParticipant } = useAppStore();

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { data: tasting, isLoading: tastingLoading, error: tastingError } = useQuery<Tasting>({
    queryKey: ["tasting-by-code", params.code],
    queryFn: () => tastingApi.getByCode(params.code!),
    enabled: !!params.code,
    refetchInterval: 10000,
  });

  const { data: whiskies = [] } = useQuery<Whisky[]>({
    queryKey: ["whiskies", tasting?.id],
    queryFn: () => whiskyApi.getForTasting(tasting!.id),
    enabled: !!tasting?.id,
  });

  const sortedWhiskies = [...whiskies].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  useEffect(() => {
    if (tasting && (tasting.status === "reveal" || tasting.status === "archived" || tasting.status === "closed")) {
      setShowResults(true);
    }
  }, [tasting?.status]);

  const handleJoin = async () => {
    if (!name.trim() || pin.length < 4) return;
    setJoining(true);
    setJoinError("");
    try {
      const participant = await participantApi.guestJoin(name.trim(), pin);
      setParticipant({
        id: participant.id,
        name: participant.name,
        role: participant.role,
        canAccessWhiskyDb: participant.canAccessWhiskyDb,
        experienceLevel: participant.experienceLevel || "guest",
      });
      if (tasting) {
        await tastingApi.join(tasting.id, participant.id, tasting.code);
      }
    } catch (e: any) {
      setJoinError(e.message);
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (currentParticipant && tasting) {
      tastingApi.join(tasting.id, currentParticipant.id, tasting.code).catch(() => {});
    }
  }, [currentParticipant, tasting]);

  if (tastingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (tastingError || !tasting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Wine className="w-10 h-10 text-muted-foreground/30 mb-4" />
        <h1 className="text-xl font-serif font-bold text-primary mb-2">{t("quickTasting.notFound")}</h1>
        <p className="text-sm text-muted-foreground mb-4">{t("quickTasting.notFoundDesc")}</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")} data-testid="button-naked-back">
          {t("quickTasting.backToHome")}
        </Button>
      </div>
    );
  }

  const isOpen = tasting.status === "open" || tasting.status === "draft";
  const isRevealed = tasting.status === "reveal" || tasting.status === "archived" || tasting.status === "closed";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wine className="w-5 h-5 text-primary" />
            <span className="font-serif text-xs text-muted-foreground tracking-widest uppercase">CaskSense</span>
          </div>
          <h1 className="text-2xl font-serif font-black text-primary leading-tight" data-testid="naked-title">{tasting.title}</h1>
          {(tasting.date || tasting.location) && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {[tasting.date, tasting.location].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {!currentParticipant ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 border-border/30 bg-card/70">
              <div className="space-y-4">
                <div className="text-center">
                  <LogIn className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-serif">{t("quickTasting.namePrompt")}</p>
                </div>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("quickTasting.namePlaceholder")}
                  className="text-center h-11 font-serif"
                  autoFocus
                  data-testid="input-naked-name"
                />
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={t("guestAuth.pinPlaceholder")}
                  maxLength={6}
                  className="text-center h-11 font-serif"
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  data-testid="input-naked-pin"
                />
                <p className="text-[10px] text-muted-foreground/60 text-center">{t('guestAuth.consentNotice')}</p>
                {joinError && <p className="text-xs text-destructive text-center">{joinError}</p>}
                <Button
                  onClick={handleJoin}
                  disabled={!name.trim() || pin.length < 4 || joining}
                  className="w-full font-serif gap-2"
                  data-testid="button-naked-join"
                >
                  {t("quickTasting.joinButton")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : showResults || isRevealed ? (
          <NakedResults tasting={tasting} whiskies={sortedWhiskies} />
        ) : isOpen && sortedWhiskies.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-serif">{currentParticipant.name}</span>
              <span className="font-mono">{sortedWhiskies.length} Whiskies</span>
            </div>
            {sortedWhiskies.map((w, i) => (
              <NakedWhiskyCard
                key={w.id}
                whisky={w}
                tasting={tasting}
                participantId={currentParticipant.id}
                index={i}
              />
            ))}
            <p className="text-[10px] text-center text-muted-foreground/50 pt-2 font-serif">
              {t("naked.autoSave", "Bewertungen werden automatisch gespeichert")}
            </p>
          </div>
        ) : sortedWhiskies.length === 0 ? (
          <div className="text-center py-12">
            <Wine className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground font-serif">{t("quickTasting.noWhiskies")}</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground font-serif">
              {t("naked.sessionStatus", "Session Status")}: {tasting.status}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
