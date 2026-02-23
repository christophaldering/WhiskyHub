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
import { Wine, ArrowRight, Check, Download, Trophy, LogIn, ExternalLink, Shield, Sparkles, BookOpen, User, BarChart3, Sun, Moon, X, ArrowUpDown, Maximize2, Clock } from "lucide-react";
import jsPDF from "jspdf";
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
  const [imgErr, setImgErr] = useState(false);

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
      const loaded = {
        nose: existingRating.nose, taste: existingRating.taste,
        finish: existingRating.finish, balance: existingRating.balance,
        overall: existingRating.overall,
      };
      setScores(loaded);
      setNotes(existingRating.notes || "");
      const avg = computeAvgFromScores(loaded);
      if (avg !== null && loaded.overall !== null) {
        setOverallManual(Math.abs(loaded.overall - avg) > 0.01);
      }
      setIsDirty(false);
    }
  }, [existingRating]);

  const computeAvgFromScores = (s: Record<string, ScoreVal>) => {
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
    }, 1200);
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
        if (!overallManual) {
          next.overall = computeAvgFromScores(next);
        }
        return next;
      });
    }
    setIsDirty(true);
    triggerAutoSave();
  };

  const clearScore = (key: string) => {
    setScores(prev => {
      const next = { ...prev, [key]: null };
      if (key === "overall") {
        setOverallManual(false);
        next.overall = computeAvgFromScores(next);
      } else if (!overallManual) {
        next.overall = computeAvgFromScores(next);
      }
      return next;
    });
    setIsDirty(true);
    triggerAutoSave();
  };

  const resetScore = (key: string) => {
    handleScore(key, mid);
  };

  const isLocked = tasting.status !== "open" && tasting.status !== "draft";
  const isBlind = tasting.blindMode && tasting.status === "open";
  const whiskyLabel = isBlind ? `Whisky ${index + 1}` : whisky.name;
  const showImage = !isBlind && whisky.imageUrl && !imgErr;

  const categories = [
    { id: "nose" as const, label: t("evaluation.nose"), emoji: "👃" },
    { id: "taste" as const, label: t("evaluation.taste"), emoji: "👅" },
    { id: "finish" as const, label: t("evaluation.finish"), emoji: "✨" },
    { id: "balance" as const, label: t("evaluation.balance"), emoji: "⚖️" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="p-4 border-border/30 bg-card/70" data-testid={`naked-whisky-${whisky.id}`}>
        <div className="flex gap-3 mb-3">
          {showImage && (
            <img
              src={whisky.imageUrl!}
              alt={whiskyLabel}
              className="w-14 h-14 object-cover rounded-lg border border-border/50 flex-shrink-0"
              onError={() => setImgErr(true)}
              data-testid={`img-naked-whisky-${whisky.id}`}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center font-serif flex-shrink-0">{index + 1}</span>
                <h3 className="font-serif font-bold text-primary text-sm truncate">{whiskyLabel}</h3>
              </div>
              {saved && (
                <span className="text-[10px] text-green-600 flex items-center gap-1 font-mono flex-shrink-0">
                  <Check className="w-3 h-3" /> saved
                </span>
              )}
              {existingRating && !saved && (
                <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                  ✓ {t("evaluation.rated", "bewertet")}
                </span>
              )}
            </div>
            {!isBlind && (whisky.distillery || whisky.age || whisky.abv) && (
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono uppercase">
                {[whisky.distillery, whisky.age ? `${whisky.age}y` : null, whisky.abv ? `${whisky.abv}%` : null].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {!isLocked ? (
          <div className="space-y-3">
            {categories.map(cat => {
              const val = scores[cat.id];
              const isNull = val === null;
              return (
                <div key={cat.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-serif font-bold text-muted-foreground uppercase w-12 flex-shrink-0">{cat.emoji} {cat.label}</span>
                  {isNull ? (
                    <button
                      onClick={() => resetScore(cat.id)}
                      className="flex-1 text-center text-[10px] text-muted-foreground/50 border border-dashed border-border/30 rounded py-1 hover:bg-secondary/30 transition-colors"
                      data-testid={`naked-restore-${cat.id}-${whisky.id}`}
                    >
                      {t("evaluation.tapToRate", "Tippen zum Bewerten")}
                    </button>
                  ) : (
                    <Slider
                      value={[val]}
                      max={scale} step={step} min={0}
                      onValueChange={(v) => handleScore(cat.id, v[0])}
                      className="flex-1"
                      data-testid={`naked-slider-${cat.id}-${whisky.id}`}
                    />
                  )}
                  <span className="text-xs font-mono font-bold w-8 text-right">{isNull ? "–" : val}</span>
                  <button
                    onClick={() => isNull ? resetScore(cat.id) : clearScore(cat.id)}
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                      isNull ? "text-muted-foreground/30 hover:text-primary" : "text-muted-foreground/40 hover:text-destructive"
                    )}
                    data-testid={`naked-clear-${cat.id}-${whisky.id}`}
                    title={isNull ? t("evaluation.tapToRate", "Bewerten") : t("evaluation.clearRating", "Bewertung entfernen")}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <div className="flex items-center gap-2 pt-1 border-t border-border/20">
              <span className="text-[10px] font-serif font-bold text-primary uppercase flex-shrink-0">{t("evaluation.overall")}</span>
              {scores.overall !== null ? (
                <Slider
                  value={[scores.overall]}
                  max={scale} step={step} min={0}
                  onValueChange={(v) => handleScore("overall", v[0])}
                  className="flex-1 [&_[role=slider]]:bg-primary [&_[data-orientation=horizontal]>span:first-child>span]:bg-primary/30"
                  data-testid={`naked-slider-overall-${whisky.id}`}
                />
              ) : (
                <button
                  onClick={() => resetScore("overall")}
                  className="flex-1 text-center text-[10px] text-muted-foreground/50 border border-dashed border-border/30 rounded py-1 hover:bg-secondary/30"
                >
                  {t("evaluation.tapToRate", "Tippen zum Bewerten")}
                </button>
              )}
              <span className="text-sm font-mono font-black text-primary w-8 text-right">{scores.overall !== null ? scores.overall : "–"}</span>
              {overallManual && (
                <button
                  onClick={() => { setOverallManual(false); setScores(prev => ({ ...prev, overall: computeAvgFromScores(prev) })); setIsDirty(true); triggerAutoSave(); }}
                  className="text-[8px] text-primary/60 hover:text-primary font-mono flex-shrink-0"
                  title={t("evaluation.resetToAvg", "Auf Durchschnitt zurücksetzen")}
                >
                  ↺
                </button>
              )}
              <button
                onClick={() => scores.overall !== null ? clearScore("overall") : resetScore("overall")}
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                data-testid={`naked-clear-overall-${whisky.id}`}
              >
                <X className="w-3 h-3" />
              </button>
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

function NakedResultCard({ whisky, rank, avgOverall, count, myScore, t }: { whisky: Whisky; rank: number; avgOverall: number; count: number; myScore: number | null; t: any }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <Card className="p-3 border-border/30 bg-card/70" data-testid={`naked-result-${whisky.id}`}>
      <div className="flex items-center gap-3">
        {whisky.imageUrl && !imgErr ? (
          <img
            src={whisky.imageUrl}
            alt={whisky.name}
            className="w-10 h-10 object-cover rounded-lg border border-border/50 flex-shrink-0"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-sm flex-shrink-0",
            rank === 0 ? "bg-amber-500/20 text-amber-600" :
            rank === 1 ? "bg-gray-300/30 text-gray-600" :
            rank === 2 ? "bg-orange-400/20 text-orange-600" :
            "bg-muted/30 text-muted-foreground"
          )}>
            {rank + 1}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {whisky.imageUrl && !imgErr && (
              <span className={cn(
                "text-xs font-bold font-serif",
                rank === 0 ? "text-amber-600" : rank === 1 ? "text-gray-500" : rank === 2 ? "text-orange-600" : "text-muted-foreground"
              )}>#{rank + 1}</span>
            )}
            <div className="font-serif font-bold text-sm text-primary truncate">{whisky.name}</div>
          </div>
          {whisky.distillery && (
            <div className="text-[10px] text-muted-foreground font-mono uppercase truncate">
              {[whisky.distillery, whisky.age ? `${whisky.age}y` : null, whisky.abv ? `${whisky.abv}%` : null].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-mono font-black text-primary">Ø {avgOverall}</div>
          <div className="text-[9px] text-muted-foreground">{count} Ratings</div>
          {myScore !== null && (
            <div className="text-[10px] text-primary/70 font-mono">{t("naked.you", "Du")}: {myScore}</div>
          )}
        </div>
      </div>
    </Card>
  );
}

function NakedResults({ tasting, whiskies }: { tasting: Tasting; whiskies: Whisky[] }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const [sortByScore, setSortByScore] = useState(true);

  const { data: allRatings = [] } = useQuery({
    queryKey: ["ratings", tasting.id],
    queryFn: () => ratingApi.getForTasting(tasting.id),
    enabled: !!tasting.id,
  });

  const whiskyResults = whiskies.map(w => {
    const ratings = allRatings.filter((r: any) => r.whiskyId === w.id);
    const validOveralls = ratings.filter((r: any) => r.overall != null);
    const avgOverall = validOveralls.length > 0
      ? Math.round((validOveralls.reduce((sum: number, r: any) => sum + r.overall, 0) / validOveralls.length) * 10) / 10
      : 0;
    const myRating = currentParticipant
      ? ratings.find((r: any) => r.participantId === currentParticipant.id)
      : null;
    return { whisky: w, avgOverall, count: ratings.length, myScore: myRating?.overall ?? null };
  });

  const sorted = sortByScore
    ? [...whiskyResults].sort((a, b) => b.avgOverall - a.avgOverall)
    : whiskyResults;

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
    doc.setLineWidth(0.2);
    doc.rect(14, 14, pageW - 28, pageH - 28);

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.15);
    const ornW = 50;
    const ornY = 40;
    doc.line(pageW / 2 - ornW, ornY, pageW / 2 + ornW, ornY);
    doc.setFillColor(148, 163, 184);
    doc.circle(pageW / 2, ornY, 1.5, "F");

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
      doc.text([tasting.date, tasting.location].filter(Boolean).join(" \u00B7 "), pageW / 2, y, { align: "center" });
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
    y += 3;

    doc.setDrawColor(200, 180, 120);
    doc.setLineWidth(0.8);
    doc.line(marginX, y, marginX + 30, y);
    y += 8;

    sorted.forEach((r, i) => {
      if (y > pageH - 40) {
        doc.addPage();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageW, pageH, "F");
        y = 25;
      }

      doc.setFillColor(i === 0 ? 255 : 250, i === 0 ? 251 : 250, i === 0 ? 235 : 252);
      doc.roundedRect(marginX, y - 4, contentW, 18, 2, 2, "F");
      doc.setDrawColor(220, 210, 190);
      doc.setLineWidth(0.15);
      doc.roundedRect(marginX, y - 4, contentW, 18, 2, 2, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(i === 0 ? 180 : i === 1 ? 120 : i === 2 ? 160 : 100, i === 0 ? 140 : i === 1 ? 120 : i === 2 ? 100 : 100, i === 0 ? 30 : i === 1 ? 130 : i === 2 ? 50 : 110);
      doc.text(`${i + 1}`, marginX + 5, y + 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(r.whisky.name, marginX + 15, y + 2);

      if (r.whisky.distillery) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const meta = [r.whisky.distillery, r.whisky.age ? `${r.whisky.age}y` : null, r.whisky.abv ? `${r.whisky.abv}%` : null].filter(Boolean).join(" \u00B7 ");
        doc.text(meta, marginX + 15, y + 8);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(71, 85, 105);
      doc.text(`\u00D8 ${r.avgOverall}`, pageW - marginX - 5, y + 4, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`${r.count} ${t("naked.ratings", "Bewertungen")}`, pageW - marginX - 5, y + 10, { align: "right" });

      y += 22;
    });

    y += 6;
    if (y > pageH - 30) {
      doc.addPage();
      y = 25;
    }
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.15);
    doc.line(marginX + 40, y, pageW - marginX - 40, y);
    y += 8;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("CaskSense \u00B7 casksense.com", pageW / 2, y, { align: "center" });

    doc.save(`${tasting.title.replace(/[^a-zA-Z0-9äöüÄÖÜß ]/g, "_")}_results.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <Trophy className="w-8 h-8 text-amber-500 mx-auto" />
        <h2 className="text-xl font-serif font-black text-primary">{t("naked.results", "Ergebnis")}</h2>
        <p className="text-xs text-muted-foreground">{allRatings.length} {t("naked.totalRatings", "Bewertungen gesamt")}</p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setSortByScore(!sortByScore)}
          className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-serif"
          data-testid="button-toggle-sort"
        >
          <ArrowUpDown className="w-3 h-3" />
          {sortByScore ? t("naked.sortOriginal", "Originalreihenfolge") : t("naked.sortByScore", "Nach Score sortieren")}
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((r, i) => (
          <NakedResultCard key={r.whisky.id} whisky={r.whisky} rank={i} avgOverall={r.avgOverall} count={r.count} myScore={r.myScore} t={t} />
        ))}
      </div>

      <Button
        onClick={generatePdf}
        variant="outline"
        className="w-full font-serif gap-2"
        data-testid="button-download-results"
      >
        <Download className="w-4 h-4" />
        {t("naked.download", "Ergebnis herunterladen")} (PDF)
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-5 border-primary/20 bg-primary/5 mt-4">
          <div className="text-center space-y-3">
            <Sparkles className="w-6 h-6 text-primary mx-auto" />
            <div>
              <h3 className="font-serif font-bold text-primary text-sm">{t("naked.ctaTitle", "Mehr aus deinem Whisky-Erlebnis machen?")}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t("naked.ctaDesc", "Mit einem kostenlosen CaskSense-Konto bekommst du:")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="flex items-start gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-[11px] text-muted-foreground">{t("naked.ctaJournal", "Persönliches Whisky-Tagebuch")}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <User className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-[11px] text-muted-foreground">{t("naked.ctaProfile", "Dein Geschmacksprofil")}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-[11px] text-muted-foreground">{t("naked.ctaStats", "Detaillierte Statistiken")}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Wine className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-[11px] text-muted-foreground">{t("naked.ctaRecommendations", "Whisky-Empfehlungen")}</span>
              </div>
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="w-full font-serif gap-2"
              size="sm"
              data-testid="button-naked-upgrade"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t("naked.ctaButton", "Kostenlos registrieren")}
            </Button>
          </div>
        </Card>
      </motion.div>
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

  const isDraft = tasting.status === "draft";
  const isOpen = tasting.status === "open";
  const isRevealed = tasting.status === "reveal" || tasting.status === "archived" || tasting.status === "closed";

  const { theme, toggleTheme } = useAppStore();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            data-testid="button-naked-theme"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {currentParticipant && tasting && (
            <button
              onClick={() => navigate(`/tasting/${tasting.id}`)}
              className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-1 font-serif"
              data-testid="button-naked-to-full"
            >
              <Maximize2 className="w-3 h-3" />
              {t("naked.switchToFull", "Vollversion")}
            </button>
          )}
        </div>
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

        {isDraft ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 border-amber-500/30 bg-amber-500/5 text-center">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
                  <Clock className="w-7 h-7 text-amber-600" />
                </div>
                <h2 className="font-serif font-bold text-lg text-primary">{t("naked.draftTitle", "Tasting wird vorbereitet")}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("naked.draftDesc", "Das Tasting wurde noch nicht gestartet. Sobald der Gastgeber die Session öffnet, kannst du dich anmelden und mit der Bewertung beginnen.")}
                </p>
                <p className="text-xs text-muted-foreground/60 font-mono">
                  {t("naked.draftHint", "Diese Seite aktualisiert sich automatisch.")}
                </p>
              </div>
            </Card>
            {sortedWhiskies.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] text-muted-foreground/50 font-serif text-center mb-2">
                  {sortedWhiskies.length} {t("naked.whiskiesPlanned", "Whiskys geplant")}
                </p>
                {sortedWhiskies.map((w, i) => (
                  <div key={w.id} className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/20">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center font-serif flex-shrink-0">{i + 1}</span>
                    <span className="text-sm font-serif text-muted-foreground truncate">{tasting.blindMode ? `#${i + 1}` : w.name}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : !currentParticipant ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 border-border/30 bg-card/70">
              <div className="space-y-4">
                <div className="text-center">
                  <LogIn className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-serif">{t("naked.loginPrompt", "Gib deinen Namen und eine PIN ein, um mitzumachen.")}</p>
                </div>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("naked.namePlaceholder", "Dein Name oder Kürzel")}
                  className="text-center h-11 font-serif"
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
                    className="text-center h-11 font-serif"
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    data-testid="input-naked-pin"
                  />
                  <div className="flex items-start gap-1.5 mt-2">
                    <Shield className="w-3 h-3 text-primary/60 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-muted-foreground/70">{t("naked.pinExplain", "Die PIN schützt deine Bewertungen. Falls du die Seite schließt oder dein Gerät abstürzt, kannst du mit Name + PIN jederzeit zurückkommen.")}</p>
                  </div>
                </div>
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

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/")}
            className="text-[11px] text-muted-foreground/50 hover:text-primary transition-colors font-serif inline-flex items-center gap-1"
            data-testid="link-naked-to-full"
          >
            <ExternalLink className="w-3 h-3" />
            {t("naked.openFull", "CaskSense Vollversion öffnen")}
          </button>
        </div>
      </div>
    </div>
  );
}
