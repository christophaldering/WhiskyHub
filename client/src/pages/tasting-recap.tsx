import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { recapApi, tastingApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Trophy, Copy, Printer, AlertTriangle, Users, Wine, Star, ChevronDown, FileDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ThankYouDialog } from "@/components/thank-you-dialog";
import jsPDF from "jspdf";
import SimpleShell from "@/components/simple/simple-shell";

interface RecapData {
  tasting: { id: string; title: string; date: string; location: string; status: string; hostId: string; ratingScale?: number };
  hostName: string;
  participantCount: number;
  whiskyCount: number;
  topRated: { name: string; distillery: string; avgScore: number; imageUrl: string | null }[];
  mostDivisive: { name: string; stddev: number } | null;
  overallAverages: { nose: number; taste: number; finish: number; balance: number; overall: number };
  participantHighlights: { name: string; ratingsCount: number; avgScore: number }[];
}

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const BAR_COLORS = ["#c8a864", "#a8845c", "#8b6f47", "#d4a853", "#b8934a"];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function TastingRecap() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const params = useParams<{ id: string }>();
  const [selectedTastingId, setSelectedTastingId] = useState<string | null>(null);
  const { toast } = useToast();

  const tastingId = params.id || selectedTastingId;

  const { data: tastings } = useQuery<any[]>({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !params.id,
  });

  const { data: recap, isLoading, isError } = useQuery<RecapData>({
    queryKey: ["recap", tastingId],
    queryFn: () => recapApi.get(tastingId!),
    enabled: !!tastingId,
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const buildShareText = () => {
    if (!recap) return "";
    const lines: string[] = [];
    lines.push(`🥃 ${recap.tasting.title}`);
    lines.push(`📅 ${formatDate(recap.tasting.date)}`);
    if (recap.tasting.location) lines.push(`📍 ${recap.tasting.location}`);
    lines.push(`👤 ${t("recap.host")}: ${recap.hostName}`);
    lines.push(`👥 ${recap.participantCount} ${t("recap.participants")}`);
    lines.push("");
    lines.push(`🏆 ${t("recap.topRated")}:`);
    recap.topRated.slice(0, 5).forEach((w, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      lines.push(`  ${medal} ${w.name}${w.distillery ? ` (${w.distillery})` : ""} — ${w.avgScore.toFixed(1)}`);
    });
    if (recap.mostDivisive) {
      lines.push("");
      lines.push(`⚡ ${t("recap.mostDivisive")}: ${recap.mostDivisive.name} (σ ${recap.mostDivisive.stddev.toFixed(2)})`);
    }
    lines.push("");
    lines.push(`📊 ${t("recap.overallAverages")}:`);
    const avg = recap.overallAverages;
    lines.push(`  ${t("evaluation.nose")}: ${avg.nose.toFixed(1)} | ${t("evaluation.taste")}: ${avg.taste.toFixed(1)} | ${t("evaluation.finish")}: ${avg.finish.toFixed(1)} | ${t("evaluation.balance")}: ${avg.balance.toFixed(1)} | ${t("evaluation.overall")}: ${avg.overall.toFixed(1)}`);
    lines.push("");
    lines.push("— CaskSense");
    return lines.join("\n");
  };

  const handleCopy = async () => {
    const text = buildShareText();
    await navigator.clipboard.writeText(text);
    toast({ title: t("recap.copied") });
  };

  const handlePrint = () => window.print();

  const handlePdfDownload = () => {
    if (!recap) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const margin = 18;
    const cw = pw - margin * 2;
    let y = 20;
    const gold: [number, number, number] = [200, 168, 100];
    const dark: [number, number, number] = [30, 30, 32];
    const muted: [number, number, number] = [120, 120, 125];
    const white: [number, number, number] = [255, 255, 255];
    const bg: [number, number, number] = [245, 243, 240];

    const addPage = () => { doc.addPage(); y = 20; };
    const checkSpace = (need: number) => { if (y + need > 275) addPage(); };

    doc.setFillColor(...bg);
    doc.rect(0, 0, pw, doc.internal.pageSize.getHeight(), "F");

    doc.setFontSize(22);
    doc.setTextColor(...dark);
    doc.text(recap.tasting.title, pw / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(9);
    doc.setTextColor(...muted);
    const meta: string[] = [];
    if (recap.tasting.date) meta.push(formatDate(recap.tasting.date));
    if (recap.tasting.location) meta.push(recap.tasting.location);
    meta.push(`${t("recap.host")}: ${recap.hostName}`);
    meta.push(`${recap.participantCount} ${t("recap.participants")}`);
    meta.push(`${recap.whiskyCount} ${t("recap.whiskies")}`);
    doc.text(meta.join("  ·  "), pw / 2, y, { align: "center" });
    y += 12;

    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pw - margin, y);
    y += 10;

    if (recap.topRated.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(...dark);
      doc.text(`🏆 ${t("recap.topRated")}`, margin, y);
      y += 8;

      recap.topRated.slice(0, 5).forEach((w, i) => {
        checkSpace(10);
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        doc.setFontSize(11);
        doc.setTextColor(...dark);
        doc.text(`${medal}  ${w.name}`, margin + 4, y);
        doc.setFontSize(11);
        doc.setTextColor(...gold);
        doc.text(w.avgScore.toFixed(1), pw - margin, y, { align: "right" });
        if (w.distillery) {
          y += 4.5;
          doc.setFontSize(8);
          doc.setTextColor(...muted);
          doc.text(w.distillery, margin + 12, y);
        }
        y += 7;
      });
      y += 4;
    }

    if (recap.mostDivisive) {
      checkSpace(16);
      doc.setFontSize(14);
      doc.setTextColor(...dark);
      doc.text(`⚡ ${t("recap.mostDivisive")}`, margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(...muted);
      doc.text(`${recap.mostDivisive.name}  (σ ${recap.mostDivisive.stddev.toFixed(2)})`, margin + 4, y);
      y += 10;
    }

    checkSpace(50);
    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.text(`📊 ${t("recap.overallAverages")}`, margin, y);
    y += 8;

    const dims = [
      { label: t("evaluation.nose"), value: recap.overallAverages.nose },
      { label: t("evaluation.taste"), value: recap.overallAverages.taste },
      { label: t("evaluation.finish"), value: recap.overallAverages.finish },
      { label: t("evaluation.balance"), value: recap.overallAverages.balance },
      { label: t("evaluation.overall"), value: recap.overallAverages.overall },
    ];
    const barMaxW = cw - 40;
    dims.forEach((d) => {
      checkSpace(10);
      doc.setFontSize(9);
      doc.setTextColor(...muted);
      doc.text(d.label, margin + 4, y);
      const bw = (d.value / (recap.tasting.ratingScale || 100)) * barMaxW;
      doc.setFillColor(...gold);
      doc.roundedRect(margin + 36, y - 3.5, bw, 4.5, 1, 1, "F");
      doc.setFontSize(8);
      doc.setTextColor(...dark);
      doc.text(d.value.toFixed(1), margin + 38 + bw, y, { align: "left" });
      y += 7;
    });
    y += 6;

    if (recap.participantHighlights.length > 0) {
      checkSpace(20);
      doc.setFontSize(14);
      doc.setTextColor(...dark);
      doc.text(`⭐ ${t("recap.participantHighlights")}`, margin, y);
      y += 8;

      recap.participantHighlights.forEach((p) => {
        checkSpace(8);
        doc.setFontSize(9);
        doc.setTextColor(...dark);
        doc.text(p.name, margin + 4, y);
        doc.setTextColor(...muted);
        doc.text(`${p.ratingsCount} ${t("recap.ratings")}  ·  Ø ${p.avgScore.toFixed(1)}`, pw - margin, y, { align: "right" });
        y += 6;
      });
    }

    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("CaskSense", pw / 2, 288, { align: "center" });

    const slug = recap.tasting.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    doc.save(`casksense-${slug}-recap.pdf`);
  };

  if (!params.id && !selectedTastingId) {
    return (
      <SimpleShell maxWidth={900}>
      <div data-testid="recap-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-7 h-7 text-primary" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-recap-title">
              {t("recap.title")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">{t("recap.subtitle")}</p>

          <div className="bg-card rounded-lg border border-border/40 p-6">
            <h2 className="text-lg font-serif font-semibold mb-4">{t("recap.selectTasting")}</h2>
            {!tastings || tastings.length === 0 ? (
              <p className="text-muted-foreground text-sm" data-testid="text-recap-no-tastings">
                {t("recap.noTastings")}
              </p>
            ) : (
              <div className="space-y-2">
                {tastings.map((tasting: any) => (
                  <button
                    key={tasting.id}
                    onClick={() => setSelectedTastingId(tasting.id)}
                    className="w-full text-left p-4 rounded-lg border border-border/30 hover:border-primary/50 hover:bg-card/80 transition-colors"
                    data-testid={`button-select-tasting-${tasting.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-serif font-semibold text-foreground">{tasting.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {tasting.date ? formatDate(tasting.date) : ""}
                          {tasting.location ? ` · ${tasting.location}` : ""}
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
      </SimpleShell>
    );
  }

  if (isLoading) {
    return (
      <SimpleShell maxWidth={900}>
      <div data-testid="recap-page">
        <div className="h-8 w-48 bg-card/50 rounded animate-pulse mb-4" />
        <div className="h-64 bg-card/50 rounded-lg animate-pulse mb-4" />
        <div className="h-48 bg-card/50 rounded-lg animate-pulse" />
      </div>
      </SimpleShell>
    );
  }

  if (isError || !recap) {
    return (
      <SimpleShell maxWidth={900}>
      <div className="text-center" data-testid="recap-page">
        <p className="text-muted-foreground font-serif" data-testid="text-recap-error">
          {t("recap.error")}
        </p>
        {!params.id && (
          <Button variant="outline" className="mt-4" onClick={() => setSelectedTastingId(null)} data-testid="button-recap-back">
            {t("recap.back")}
          </Button>
        )}
      </div>
      </SimpleShell>
    );
  }

  const avgData = [
    { dimension: t("evaluation.nose"), value: recap.overallAverages.nose },
    { dimension: t("evaluation.taste"), value: recap.overallAverages.taste },
    { dimension: t("evaluation.finish"), value: recap.overallAverages.finish },
    { dimension: t("evaluation.balance"), value: recap.overallAverages.balance },
    { dimension: t("evaluation.overall"), value: recap.overallAverages.overall },
  ];

  const mostRatings = recap.participantHighlights.length > 0
    ? [...recap.participantHighlights].sort((a, b) => b.ratingsCount - a.ratingsCount)[0]
    : null;
  const highestAvg = recap.participantHighlights.length > 0
    ? [...recap.participantHighlights].sort((a, b) => b.avgScore - a.avgScore)[0]
    : null;

  return (
    <SimpleShell maxWidth={900}>
    <div className="print:p-0 min-w-0 overflow-x-hidden" data-testid="recap-page">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          [data-testid="recap-page"], [data-testid="recap-page"] * { visibility: visible; }
          [data-testid="recap-page"] { position: absolute; left: 0; top: 0; width: 100%; }
          [data-testid="button-copy-recap"], [data-testid="button-print-recap"], [data-testid="button-recap-back"] { display: none !important; }
        }
      `}</style>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Trophy className="w-7 h-7 text-primary flex-shrink-0" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary truncate" data-testid="text-recap-title">
              {t("recap.title")}
            </h1>
          </div>
          <div className="flex gap-1.5 sm:gap-2 print:hidden flex-wrap">
            {!params.id && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedTastingId(null)} data-testid="button-recap-back">
                {t("recap.back")}
              </Button>
            )}
            {currentParticipant?.id === recap.tasting.hostId && (
              <ThankYouDialog tastingId={recap.tasting.id} tastingTitle={recap.tasting.title} />
            )}
            <Button variant="outline" size="sm" onClick={handlePdfDownload} data-testid="button-pdf-recap" title="PDF">
              <FileDown className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy-recap" title={t("recap.copyRecap")}>
              <Copy className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">{t("recap.copyRecap")}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-recap" title={t("recap.printRecap")}>
              <Printer className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">{t("recap.printRecap")}</span>
            </Button>
            <Link href={`/export-notes${tastingId ? `?tastingId=${tastingId}` : ""}`}>
              <Button variant="outline" size="sm" data-testid="button-export-notes" title={t("nav.exportNotes")}>
                <Download className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">{t("nav.exportNotes")}</span>
              </Button>
            </Link>
          </div>
        </div>

        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible"
          className="bg-card rounded-lg border border-border/40 p-6 mb-6"
        >
          <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-1" data-testid="text-recap-tasting-title">
            {recap.tasting.title}
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {recap.tasting.date && (
              <span data-testid="text-recap-date">📅 {formatDate(recap.tasting.date)}</span>
            )}
            {recap.tasting.location && (
              <span data-testid="text-recap-location">📍 {recap.tasting.location}</span>
            )}
            <span data-testid="text-recap-host">👤 {recap.hostName}</span>
            <span data-testid="text-recap-participants">
              <Users className="w-3.5 h-3.5 inline mr-1" />
              {recap.participantCount} {t("recap.participants")}
            </span>
            <span data-testid="text-recap-whisky-count">
              <Wine className="w-3.5 h-3.5 inline mr-1" />
              {recap.whiskyCount} {t("recap.whiskies")}
            </span>
          </div>
        </motion.div>

        {recap.topRated.length > 0 && (
          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible"
            className="bg-card rounded-lg border border-border/40 p-6 mb-6"
          >
            <h2 className="text-lg font-serif font-semibold mb-4 flex items-center gap-2" data-testid="text-recap-top-rated-heading">
              <Trophy className="w-5 h-5 text-primary" /> {t("recap.topRated")}
            </h2>
            <div className="space-y-3">
              {recap.topRated.slice(0, 5).map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-2 border-b border-border/20 last:border-0"
                  data-testid={`card-top-rated-${i}`}
                >
                  <div className="w-8 text-center">
                    {i < 3 ? (
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                        style={{ backgroundColor: MEDAL_COLORS[i], color: i === 0 ? "#78350f" : i === 1 ? "#1f2937" : "#451a03" }}
                      >
                        {i + 1}
                      </span>
                    ) : (
                      <span className="text-lg font-serif font-bold text-muted-foreground">{i + 1}</span>
                    )}
                  </div>
                  {w.imageUrl && (
                    <img src={w.imageUrl} alt={w.name} className="w-10 h-10 rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" data-testid={`text-top-rated-name-${i}`}>{w.name}</p>
                    {w.distillery && (
                      <p className="text-xs text-muted-foreground truncate">{w.distillery}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-serif font-bold text-primary" data-testid={`text-top-rated-score-${i}`}>
                      {w.avgScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {recap.mostDivisive && (
          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
            className="bg-card rounded-lg border border-border/40 p-6 mb-6"
          >
            <h2 className="text-lg font-serif font-semibold mb-3 flex items-center gap-2" data-testid="text-recap-most-divisive-heading">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> {t("recap.mostDivisive")}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-foreground" data-testid="text-most-divisive-name">
                  {recap.mostDivisive.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("recap.stddev")}: {recap.mostDivisive.stddev.toFixed(2)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible"
          className="bg-card rounded-lg border border-border/40 p-6 mb-6"
        >
          <h2 className="text-lg font-serif font-semibold mb-4" data-testid="text-recap-averages-heading">
            {t("recap.overallAverages")}
          </h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgData} layout="vertical" margin={{ left: 70 }}>
                <XAxis type="number" domain={[0, recap.tasting.ratingScale || 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <YAxis type="category" dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={65} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [value.toFixed(1), ""]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {avgData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {recap.participantHighlights.length > 0 && (
          <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible"
            className="bg-card rounded-lg border border-border/40 p-6 mb-6"
          >
            <h2 className="text-lg font-serif font-semibold mb-4 flex items-center gap-2" data-testid="text-recap-highlights-heading">
              <Star className="w-5 h-5 text-primary" /> {t("recap.participantHighlights")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {mostRatings && (
                <div className="p-4 rounded-lg bg-secondary/20 border border-border/20" data-testid="card-most-ratings">
                  <p className="text-xs text-muted-foreground mb-1">{t("recap.mostRatings")}</p>
                  <p className="font-serif font-semibold text-foreground">{mostRatings.name}</p>
                  <p className="text-sm text-primary">{mostRatings.ratingsCount} {t("recap.ratings")}</p>
                </div>
              )}
              {highestAvg && (
                <div className="p-4 rounded-lg bg-secondary/20 border border-border/20" data-testid="card-highest-avg">
                  <p className="text-xs text-muted-foreground mb-1">{t("recap.highestAvg")}</p>
                  <p className="font-serif font-semibold text-foreground">{highestAvg.name}</p>
                  <p className="text-sm text-primary">{highestAvg.avgScore.toFixed(1)}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {recap.participantHighlights.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0" data-testid={`row-participant-${i}`}>
                  <span className="text-sm text-foreground">{p.name}</span>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{p.ratingsCount} {t("recap.ratings")}</span>
                    <span>Ø {p.avgScore.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
    </SimpleShell>
  );
}
