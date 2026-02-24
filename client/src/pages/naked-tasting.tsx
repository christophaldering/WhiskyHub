import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { tastingApi, whiskyApi, ratingApi, participantApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Wine, ArrowRight, ArrowLeft, Check, Download, Trophy, Shield, Sparkles, BookOpen, User, BarChart3, Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react";
import jsPDF from "jspdf";
import type { Whisky, Tasting } from "@shared/schema";

type WizardStep = "welcome" | "rating" | "recap" | "done";

function DramCard({
  whisky,
  tasting,
  participantId,
  index,
  total,
  onNext,
  onPrev,
  isFirst,
  isLast,
}: {
  whisky: Whisky;
  tasting: Tasting;
  participantId: string;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
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

  type ScoreVal = number | null;
  const [scores, setScores] = useState<Record<string, ScoreVal>>({
    nose: mid, taste: mid, finish: mid, balance: mid, overall: mid,
  });
  const [overallManual, setOverallManual] = useState(false);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ scores, notes });
  latestRef.current = { scores, notes };

  const saveMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating", participantId, whisky.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  useEffect(() => {
    if (existingRating) {
      const loaded = {
        nose: existingRating.nose, taste: existingRating.taste,
        finish: existingRating.finish, balance: existingRating.balance,
        overall: existingRating.overall,
      };
      setScores(loaded);
      setNotes(existingRating.notes || "");
      const avg = computeAvg(loaded);
      if (avg !== null && loaded.overall !== null) {
        setOverallManual(Math.abs(loaded.overall - avg) > 0.01);
      }
    }
  }, [existingRating]);

  const computeAvg = (s: Record<string, ScoreVal>) => {
    const factor = step < 1 ? (1 / step) : 1;
    const vals = [s.nose, s.taste, s.finish, s.balance].filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
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
    }, 800);
  }, [participantId, tasting.id, whisky.id, saveMutation]);

  useEffect(() => {
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, []);

  const handleScore = (key: string, value: number) => {
    const factor = step < 1 ? (1 / step) : 1;
    const clamped = Math.max(0, Math.min(scale, Math.round(value * factor) / factor));
    if (key === "overall") {
      setOverallManual(true);
      setScores(prev => ({ ...prev, overall: clamped }));
    } else {
      setScores(prev => {
        const next = { ...prev, [key]: clamped };
        if (!overallManual) next.overall = computeAvg(next);
        return next;
      });
    }
    triggerAutoSave();
  };

  const isBlind = tasting.blindMode && tasting.status === "open";
  const whiskyLabel = isBlind ? `Dram ${index + 1}` : whisky.name;

  const dimensions = [
    { id: "nose", label: "Nosing" },
    { id: "taste", label: "Tasting" },
    { id: "finish", label: "Abgang" },
    { id: "balance", label: "Balance" },
  ];

  const handleNext = () => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
      saveMutation.mutate({
        tastingId: tasting.id, whiskyId: whisky.id, participantId,
        ...latestRef.current.scores, notes: latestRef.current.notes,
      });
    }
    onNext();
  };

  return (
    <motion.div
      key={whisky.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      <div className="text-center mb-4">
        <p className="text-[11px] text-muted-foreground/60 font-mono tracking-wider uppercase mb-1">
          Dram {index + 1} {t("naked.of", "von")} {total}
        </p>
        <h2 className="text-xl font-serif font-black text-primary leading-tight" data-testid="text-dram-label">
          {whiskyLabel}
        </h2>
        {!isBlind && whisky.distillery && (
          <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 uppercase tracking-wide">
            {[whisky.distillery, whisky.age ? `${whisky.age}y` : null, whisky.abv ? `${whisky.abv}%` : null].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 mb-5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-primary" : i < index ? "w-3 bg-primary/40" : "w-3 bg-border/40"
            )}
          />
        ))}
      </div>

      <div className="flex-1 space-y-4">
        {dimensions.map(dim => {
          const val = scores[dim.id] ?? mid;
          return (
            <div key={dim.id} data-testid={`slider-row-${dim.id}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-serif font-semibold text-foreground/80 uppercase tracking-wide">{dim.label}</span>
                <span className="text-lg font-mono font-black text-primary tabular-nums" data-testid={`value-${dim.id}`}>
                  {val}
                </span>
              </div>
              <Slider
                value={[val]}
                max={scale}
                min={0}
                step={step}
                onValueChange={(v) => handleScore(dim.id, v[0])}
                className="w-full"
                data-testid={`slider-${dim.id}-${whisky.id}`}
              />
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-muted-foreground/40 font-mono">0</span>
                <span className="text-[9px] text-muted-foreground/40 font-mono">{scale}</span>
              </div>
            </div>
          );
        })}

        <div className="pt-2 border-t border-border/20" data-testid="slider-row-overall">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-serif font-bold text-primary uppercase tracking-wide">Gesamt</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-mono font-black text-primary tabular-nums" data-testid="value-overall">
                {scores.overall ?? "–"}
              </span>
              {overallManual && (
                <button
                  onClick={() => { setOverallManual(false); setScores(prev => ({ ...prev, overall: computeAvg(prev) })); triggerAutoSave(); }}
                  className="text-[9px] text-primary/50 hover:text-primary font-mono"
                  title={t("evaluation.resetToAvg")}
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <Slider
            value={[scores.overall ?? mid]}
            max={scale}
            min={0}
            step={step}
            onValueChange={(v) => handleScore("overall", v[0])}
            className="w-full [&_[role=slider]]:bg-primary [&_[data-orientation=horizontal]>span:first-child>span]:bg-primary/30"
            data-testid={`slider-overall-${whisky.id}`}
          />
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] text-muted-foreground/40 font-mono">0</span>
            <span className="text-[9px] text-muted-foreground/40 font-mono">{scale}</span>
          </div>
        </div>

        <div>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); triggerAutoSave(); }}
            placeholder={t("quickTasting.notesPlaceholder")}
            className="w-full bg-secondary/30 border border-border/20 rounded-lg px-3 py-2 text-sm font-serif text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
            rows={2}
            data-testid="textarea-notes"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/15">
        <Button
          variant="ghost"
          onClick={onPrev}
          disabled={isFirst}
          className="flex-1 font-serif gap-1.5"
          data-testid="button-prev-dram"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("quickTasting.prev")}
        </Button>
        <div className="flex items-center gap-1">
          {saved && <Check className="w-3.5 h-3.5 text-green-600" />}
          <span className="text-[9px] text-muted-foreground/50 font-mono">
            {saved ? t("quickTasting.saved") : t("quickTasting.autoSaving")}
          </span>
        </div>
        <Button
          onClick={handleNext}
          className="flex-1 font-serif gap-1.5"
          data-testid="button-next-dram"
        >
          {isLast ? t("quickTasting.finish") : t("quickTasting.next")}
          {isLast ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </motion.div>
  );
}

function RecapScreen({ tasting, whiskies, participantId }: { tasting: Tasting; whiskies: Whisky[]; participantId: string }) {
  const { t } = useTranslation();
  const scale = tasting.ratingScale || 100;
  const [sortByScore, setSortByScore] = useState(true);

  const { data: allRatings = [] } = useQuery({
    queryKey: ["ratings", tasting.id],
    queryFn: () => ratingApi.getForTasting(tasting.id),
    enabled: !!tasting.id,
    refetchInterval: 5000,
  });

  const whiskyResults = whiskies.map(w => {
    const ratings = allRatings.filter((r: any) => r.whiskyId === w.id);
    const validOveralls = ratings.filter((r: any) => r.overall != null);
    const avgOverall = validOveralls.length > 0
      ? Math.round((validOveralls.reduce((sum: number, r: any) => sum + r.overall, 0) / validOveralls.length) * 10) / 10
      : 0;
    const myRating = ratings.find((r: any) => r.participantId === participantId);
    return { whisky: w, avgOverall, count: ratings.length, myScore: myRating?.overall ?? null, myRating };
  });

  const sorted = sortByScore
    ? [...whiskyResults].sort((a, b) => b.avgOverall - a.avgOverall)
    : whiskyResults;

  const isBlind = tasting.blindMode && tasting.status === "open";
  const isRevealed = tasting.status === "reveal" || tasting.status === "archived" || tasting.status === "closed";

  const generatePdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const marginX = 18;
    const contentW = pageW - marginX * 2;

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.5);
    doc.rect(12, 12, pageW - 24, pageH - 24);

    let y = 52;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("C A S K S E N S E", pageW / 2, y, { align: "center" });
    y += 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text(tasting.title, pageW / 2, y, { align: "center" });
    y += 8;

    if (tasting.date || tasting.location) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text([tasting.date, tasting.location].filter(Boolean).join(" · "), pageW / 2, y, { align: "center" });
      y += 6;
    }

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(marginX + 40, y + 2, pageW - marginX - 40, y + 2);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(71, 85, 105);
    doc.text(t("naked.ranking", "Ranking"), marginX, y);
    y += 11;

    sorted.forEach((r, i) => {
      if (y > pageH - 40) { doc.addPage(); doc.setFillColor(248, 250, 252); doc.rect(0, 0, pageW, pageH, "F"); y = 25; }
      doc.setFillColor(i === 0 ? 255 : 250, i === 0 ? 251 : 250, i === 0 ? 235 : 252);
      doc.roundedRect(marginX, y - 4, contentW, 18, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text(`${i + 1}`, marginX + 5, y + 5);
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(r.whisky.name, marginX + 15, y + 2);
      if (r.whisky.distillery) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text([r.whisky.distillery, r.whisky.age ? `${r.whisky.age}y` : null].filter(Boolean).join(" · "), marginX + 15, y + 8);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(71, 85, 105);
      doc.text(`Ø ${r.avgOverall}`, pageW - marginX - 5, y + 4, { align: "right" });
      y += 22;
    });

    doc.save(`${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, "_")}_results.pdf`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="text-center space-y-2">
        <Trophy className="w-10 h-10 text-amber-500/80 mx-auto" />
        <h2 className="text-2xl font-serif font-black text-primary">{t("naked.results", "Ergebnis")}</h2>
        <p className="text-xs text-muted-foreground/60 font-mono">
          {allRatings.length} {t("naked.totalRatings", "Bewertungen gesamt")} · {t("naked.scale", "Skala")} 0–{scale}
        </p>
      </div>

      <div className="space-y-2">
        {sorted.map((r, i) => {
          const label = isBlind && !isRevealed ? `Dram ${whiskies.indexOf(r.whisky) + 1}` : r.whisky.name;
          return (
            <motion.div
              key={r.whisky.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                i === 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-card/50 border-border/20"
              )}
              data-testid={`recap-result-${r.whisky.id}`}
            >
              <span className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-serif font-bold text-sm flex-shrink-0",
                i === 0 ? "bg-amber-500/20 text-amber-600" :
                i === 1 ? "bg-gray-200/50 text-gray-600" :
                i === 2 ? "bg-orange-400/15 text-orange-600" :
                "bg-muted/20 text-muted-foreground"
              )}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-sm text-foreground truncate">{label}</p>
                {r.whisky.distillery && !isBlind && (
                  <p className="text-[9px] text-muted-foreground/60 font-mono uppercase truncate">
                    {[r.whisky.distillery, r.whisky.age ? `${r.whisky.age}y` : null].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0 space-y-0.5">
                <p className="text-lg font-mono font-black text-primary">Ø {r.avgOverall}</p>
                <p className="text-[9px] text-muted-foreground/50 font-mono">{r.count} {t("naked.ratings", "Bew.")}</p>
                {r.myScore !== null && (
                  <p className="text-[10px] text-primary/60 font-mono">{t("naked.myScore", "Mein Score")}: {r.myScore}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {sorted.some(r => r.myRating) && (
        <div className="space-y-2">
          <h3 className="text-xs font-serif font-semibold text-muted-foreground/70 uppercase tracking-wider text-center">
            {t("naked.myDimensionScores", "Meine Bewertungen im Detail")}
          </h3>
          {sorted.filter(r => r.myRating).map(r => {
            const rating = r.myRating as any;
            const label = isBlind && !isRevealed ? `Dram ${whiskies.indexOf(r.whisky) + 1}` : r.whisky.name;
            return (
              <div key={r.whisky.id} className="bg-card/30 border border-border/15 rounded-lg p-3">
                <p className="font-serif font-bold text-xs text-foreground mb-1.5">{label}</p>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {[
                    { label: "N", val: rating.nose },
                    { label: "T", val: rating.taste },
                    { label: "A", val: rating.finish },
                    { label: "B", val: rating.balance },
                    { label: "G", val: rating.overall },
                  ].map(d => (
                    <div key={d.label}>
                      <p className="text-[8px] text-muted-foreground/50 font-mono uppercase">{d.label}</p>
                      <p className="text-sm font-mono font-bold text-primary">{d.val ?? "–"}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button
        onClick={generatePdf}
        variant="outline"
        className="w-full font-serif gap-2"
        data-testid="button-download-pdf"
      >
        <Download className="w-4 h-4" />
        {t("naked.download", "Ergebnis herunterladen")} (PDF)
      </Button>
    </motion.div>
  );
}

function DoneScreen({ tasting }: { tasting: Tasting }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6 py-8"
    >
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-serif font-black text-primary">
          {t("quickTasting.complete", "Fertig!")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
          {t("quickTasting.completeDesc", 'Deine Bewertungen für "{{title}}" wurden gespeichert. Danke fürs Mitmachen!', { title: tasting.title })}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-primary/5 border border-primary/15 rounded-xl p-5 space-y-3 max-w-sm mx-auto"
      >
        <Sparkles className="w-5 h-5 text-primary mx-auto" />
        <p className="text-xs font-serif text-muted-foreground">{t("quickTasting.fullVersionHint")}</p>
        <div className="grid grid-cols-2 gap-2 text-left text-[10px] text-muted-foreground/80">
          <div className="flex items-start gap-1.5"><BookOpen className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span>{t("naked.ctaJournal")}</span></div>
          <div className="flex items-start gap-1.5"><User className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span>{t("naked.ctaProfile")}</span></div>
          <div className="flex items-start gap-1.5"><BarChart3 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span>{t("naked.ctaStats")}</span></div>
          <div className="flex items-start gap-1.5"><Wine className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span>{t("naked.ctaRecommendations")}</span></div>
        </div>
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          size="sm"
          className="w-full font-serif gap-1.5 mt-2"
          data-testid="button-done-explore"
        >
          {t("quickTasting.fullVersionLink", "CaskSense entdecken")}
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default function NakedTasting() {
  const { t } = useTranslation();
  const params = useParams<{ code: string }>();
  const { currentParticipant, setParticipant, theme, toggleTheme } = useAppStore();

  const [wizardStep, setWizardStep] = useState<WizardStep>("welcome");
  const [dramIndex, setDramIndex] = useState(0);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

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

  const sortedWhiskies = useMemo(() =>
    [...whiskies].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [whiskies]
  );

  useEffect(() => {
    if (tasting && (tasting.status === "reveal" || tasting.status === "archived" || tasting.status === "closed")) {
      if (currentParticipant) setWizardStep("recap");
    }
  }, [tasting?.status, currentParticipant]);

  useEffect(() => {
    if (currentParticipant && tasting && tasting.status === "open" && wizardStep === "welcome") {
      setWizardStep("rating");
    }
  }, [currentParticipant, tasting?.status]);

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
      });
      if (tasting) {
        await tastingApi.join(tasting.id, participant.id, tasting.code);
      }
      setWizardStep("rating");
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

  const handleNextDram = () => {
    if (dramIndex < sortedWhiskies.length - 1) {
      setDramIndex(prev => prev + 1);
    } else {
      setWizardStep("recap");
    }
  };

  const handlePrevDram = () => {
    if (dramIndex > 0) setDramIndex(prev => prev - 1);
  };

  if (tastingLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (tastingError || !tasting) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6">
        <Wine className="w-10 h-10 text-muted-foreground/30 mb-4" />
        <h1 className="text-xl font-serif font-bold text-primary mb-2">{t("quickTasting.notFound")}</h1>
        <p className="text-sm text-muted-foreground text-center mb-4">{t("quickTasting.notFoundDesc")}</p>
      </div>
    );
  }

  const isDraft = tasting.status === "draft";
  const isOpen = tasting.status === "open";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Wine className="w-4 h-4 text-primary/60" />
          <span className="font-serif text-[10px] text-muted-foreground/50 tracking-widest uppercase">CaskSense</span>
        </div>
        <button
          onClick={toggleTheme}
          className="w-7 h-7 rounded-full bg-secondary/30 flex items-center justify-center text-muted-foreground/50 hover:text-primary transition-colors"
          data-testid="button-naked-theme"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-5 pb-6">
        <AnimatePresence mode="wait">
          {wizardStep === "welcome" && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center pt-8 pb-6">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Wine className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-serif font-black text-primary leading-tight mb-1" data-testid="naked-title">
                  {tasting.title}
                </h1>
                {(tasting.date || tasting.location) && (
                  <p className="text-xs text-muted-foreground/60 font-mono">
                    {[tasting.date, tasting.location].filter(Boolean).join(" · ")}
                  </p>
                )}
                {sortedWhiskies.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/40 font-mono mt-2">
                    {sortedWhiskies.length} Drams
                  </p>
                )}
              </div>

              {isDraft ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-6">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                    <Wine className="w-6 h-6 text-amber-600" />
                  </div>
                  <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                    {t("naked.draftDesc")}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 font-mono">{t("naked.draftHint")}</p>
                </motion.div>
              ) : !currentParticipant ? (
                <div className="space-y-4 max-w-sm mx-auto">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("naked.namePlaceholder")}
                    className="text-center h-12 font-serif text-base bg-secondary/20 border-border/30"
                    autoFocus
                    data-testid="input-naked-name"
                  />
                  <div>
                    <Input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder={t("guestAuth.pinPlaceholder")}
                      maxLength={6}
                      className="text-center h-12 font-serif text-base bg-secondary/20 border-border/30"
                      onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                      data-testid="input-naked-pin"
                    />
                    <div className="flex items-start gap-1.5 mt-2">
                      <Shield className="w-3 h-3 text-primary/40 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{t("naked.pinExplain")}</p>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground/40 text-center">{t("guestAuth.consentNotice")}</p>
                  {joinError && <p className="text-xs text-destructive text-center">{joinError}</p>}
                  <Button
                    onClick={handleJoin}
                    disabled={!name.trim() || pin.length < 4 || joining}
                    className="w-full h-12 font-serif text-base gap-2"
                    data-testid="button-naked-join"
                  >
                    {t("quickTasting.joinButton")}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ) : isOpen && sortedWhiskies.length > 0 ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground font-serif">
                    {t("naked.welcomeBack", "Willkommen, {{name}}!", { name: currentParticipant.name })}
                  </p>
                  <Button
                    onClick={() => setWizardStep("rating")}
                    className="font-serif gap-2 h-12 px-8"
                    data-testid="button-naked-start"
                  >
                    {t("naked.startRating", "Verkostung starten")}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ) : null}
            </motion.div>
          )}

          {wizardStep === "rating" && currentParticipant && sortedWhiskies.length > 0 && (
            <DramCard
              key={`dram-${dramIndex}`}
              whisky={sortedWhiskies[dramIndex]}
              tasting={tasting}
              participantId={currentParticipant.id}
              index={dramIndex}
              total={sortedWhiskies.length}
              onNext={handleNextDram}
              onPrev={handlePrevDram}
              isFirst={dramIndex === 0}
              isLast={dramIndex === sortedWhiskies.length - 1}
            />
          )}

          {wizardStep === "recap" && currentParticipant && (
            <motion.div key="recap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RecapScreen
                tasting={tasting}
                whiskies={sortedWhiskies}
                participantId={currentParticipant.id}
              />
              <div className="mt-6 text-center">
                <Button
                  onClick={() => setWizardStep("done")}
                  className="font-serif gap-2"
                  data-testid="button-recap-done"
                >
                  {t("quickTasting.done", "Fertig")}
                  <Check className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => { setDramIndex(0); setWizardStep("rating"); }}
                  className="block mx-auto mt-3 text-[11px] text-muted-foreground/50 hover:text-primary transition-colors font-serif"
                  data-testid="button-back-to-rating"
                >
                  <ArrowLeft className="w-3 h-3 inline mr-1" />
                  {t("naked.backToRating", "Zurück zur Bewertung")}
                </button>
              </div>
            </motion.div>
          )}

          {wizardStep === "done" && (
            <DoneScreen key="done" tasting={tasting} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
