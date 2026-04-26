import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";
import { downloadBlob } from "@/lib/download";
import { formatScore, stripGuestSuffix } from "@/lib/utils";
import { pidHeaders } from "@/lib/api";
import { exportStoryPdf } from "@/lib/pdf-story";
import {
  type RGB,
  mean,
  median,
  stdDev,
  minMax,
  spearman,
  histogramBuckets,
  heatmapColor,
  topItemsByCount,
} from "@/labs/utils/labsStats";

const STORY_ELIGIBLE_STATUSES = new Set(["reveal", "completed", "closed", "archived"]);

export function getStoryPdfAvailable(
  tasting: { status?: string | null; storyEnabled?: boolean | null } | null | undefined,
  isHost: boolean,
): boolean {
  if (!tasting) return false;
  if (!STORY_ELIGIBLE_STATUSES.has(tasting.status ?? "")) return false;
  return isHost || !!tasting.storyEnabled;
}

export async function labsExportFromServer(
  tastingId: string,
  format: "csv" | "xlsx",
  t?: (key: string, opts?: any) => string,
): Promise<boolean> {
  const res = await fetch(`/api/tastings/${tastingId}/results/export?format=${format}`);
  if (!res.ok) {
    const msg = t
      ? t("downloads.exportErrorServer", { status: res.status, defaultValue: `Export failed (${res.status})` })
      : `Export failed (${res.status})`;
    throw new Error(msg);
  }
  const blob = await res.blob();
  const disp = res.headers.get("Content-Disposition");
  const filenameMatch = disp?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] || `results.${format}`;
  downloadBlob(blob, filename);
  return true;
}

const ACCENT: RGB = [212, 162, 86];
const MUTED: RGB = [138, 126, 109];
const BG: RGB = [26, 23, 20];
const BG_SOFT: RGB = [40, 35, 28];
const TEXT: RGB = [245, 240, 232];
const HIGHLIGHT_BG: RGB = [
  Math.round(BG[0] + (ACCENT[0] - BG[0]) * 0.12),
  Math.round(BG[1] + (ACCENT[1] - BG[1]) * 0.12),
  Math.round(BG[2] + (ACCENT[2] - BG[2]) * 0.12),
];
const PAGE_W_PORTRAIT = 210;
const PAGE_H_PORTRAIT = 297;
const MARGIN_X = 18;

interface OverviewStats {
  nWhiskies: number;
  nParticipants: number;
  nRatings: number;
  nPossible: number;
  overallAvg: number | null;
  overallMedian: number | null;
  overallStdDev: number | null;
  highest: { value: number; whiskyName: string; participantName: string } | null;
  lowest: { value: number; whiskyName: string; participantName: string } | null;
  avgPerDim: { nose: number | null; taste: number | null; finish: number | null };
  consensusIndex: number | null;
  histogram: { binStart: number; binEnd: number; count: number }[];
  blindAbv: { avgGuess: number; avgReal: number | null; n: number } | null;
  blindAge: { avgGuess: number; avgReal: number | null; n: number } | null;
}

interface WhiskyStatsRow {
  id: string;
  name: string;
  distillery: string;
  avgOverall: number | null;
  avgNose: number | null;
  avgTaste: number | null;
  avgFinish: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  stdDev: number | null;
  n: number;
  topAromas: string[];
}

interface ParticipantStatsRow {
  pid: string;
  displayName: string;
  avgGiven: number | null;
  stdDevOwn: number | null;
  deltaGroup: number | null;
  correlation: number | null;
  top1Name: string | null;
  flopName: string | null;
  n: number;
}

interface AwardEntry { name: string; value: number }

interface MatrixData {
  whiskyIds: string[];
  whiskyNames: string[];
  participantIds: string[];
  participantHeaders: string[];
  cells: (number | null)[][];
  rowAvg: (number | null)[];
  colAvg: (number | null)[];
  cellMin: number;
  cellMax: number;
}

export interface FullStats {
  overview: OverviewStats;
  whiskies: WhiskyStatsRow[];
  participants: ParticipantStatsRow[];
  awards: {
    strictest: AwardEntry | null;
    mostGenerous: AwardEntry | null;
    groupWhisperer: AwardEntry | null;
  };
  matrix: MatrixData;
  highlights: {
    biggestAgreement: { name: string; stdDev: number } | null;
    biggestDispute: { name: string; spread: number } | null;
  };
  scaleMax: number;
  isBlind: boolean;
}

function fmtScale(v: number | null | undefined, scaleMax: number): string {
  if (v == null) return "—";
  const rounded = scaleMax === 100 ? Math.round(v) : Math.round(v * 10) / 10;
  return formatScore(rounded);
}

function fmtSigma(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toFixed(1);
}

function fmtDelta(v: number | null | undefined): string {
  if (v == null) return "—";
  const r = Math.round(v * 10) / 10;
  return r > 0 ? `+${r.toFixed(1)}` : r.toFixed(1);
}

function fmtCorr(v: number | null | undefined): string {
  if (v == null) return "—";
  return (Math.round(v * 100) / 100).toFixed(2);
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}

function toUserScale(v: number | null | undefined, scaleMax: number): number | null {
  if (v == null) return null;
  if (scaleMax !== 100 && v > scaleMax) return Math.round((v / 100) * scaleMax * 10) / 10;
  return v;
}

function detectAnonymized(tasting: any, includedParticipants: any[]): boolean {
  if (tasting?.reflectionVisibility === "anonymous") return true;
  if (tasting?.guestMode === "ultra") return true;
  if (includedParticipants.length === 0) return false;
  let anyNamed = false;
  for (const tp of includedParticipants) {
    const raw = tp.participant?.name ?? tp.name ?? "";
    if (stripGuestSuffix(raw).trim()) {
      anyNamed = true;
      break;
    }
  }
  return !anyNamed;
}

export function computeFullStats(
  tasting: any,
  whiskies: any[],
  allRatings: any[],
  participants: any[],
): FullStats {
  const scaleMax = (tasting?.ratingScale as number) || 100;
  const isBlind = !!tasting?.blindMode;

  const excludedPids = new Set<string>(
    participants.filter((p: any) => p.excludedFromResults).map((p: any) => p.participantId || p.id),
  );
  const includedParticipants = participants.filter((p: any) => !excludedPids.has(p.participantId || p.id));
  const filteredRatings = allRatings.filter((r: any) => !excludedPids.has(r.participantId));

  const ratingsScaled = filteredRatings.map((r: any) => ({
    ...r,
    nose: toUserScale(r.nose, scaleMax),
    taste: toUserScale(r.taste, scaleMax),
    finish: toUserScale(r.finish, scaleMax),
    overall: toUserScale(r.overall, scaleMax),
  }));

  const whiskyById = new Map<string, any>();
  for (const w of whiskies) whiskyById.set(w.id, w);

  const isAnonymized = detectAnonymized(tasting, includedParticipants);

  const participantDisplayById = new Map<string, string>();
  for (let i = 0; i < includedParticipants.length; i++) {
    const tp = includedParticipants[i];
    const pid = tp.participantId || tp.id;
    const rawName = tp.participant?.name ?? tp.name ?? "";
    const cleaned = stripGuestSuffix(rawName).trim();
    const display = isAnonymized || !cleaned ? `P${i + 1}` : cleaned;
    participantDisplayById.set(pid, display);
  }

  const whiskyRows: WhiskyStatsRow[] = whiskies.map((w: any) => {
    const wRatings = ratingsScaled.filter((r: any) => r.whiskyId === w.id);
    const overallVals = wRatings.map((r: any) => r.overall).filter((v: number | null): v is number => v != null && v > 0);
    const noseVals = wRatings.map((r: any) => r.nose).filter((v: number | null): v is number => v != null && v > 0);
    const tasteVals = wRatings.map((r: any) => r.taste).filter((v: number | null): v is number => v != null && v > 0);
    const finishVals = wRatings.map((r: any) => r.finish).filter((v: number | null): v is number => v != null && v > 0);
    const mm = minMax(overallVals);
    const allTags: string[] = [];
    for (const r of wRatings) {
      if (Array.isArray(r.flavorTags)) {
        for (const tag of r.flavorTags) {
          if (typeof tag === "string" && tag.trim()) allTags.push(tag.trim());
        }
      }
    }
    return {
      id: w.id,
      name: w.name || "",
      distillery: w.distillery || "",
      avgOverall: mean(overallVals),
      avgNose: mean(noseVals),
      avgTaste: mean(tasteVals),
      avgFinish: mean(finishVals),
      median: median(overallVals),
      min: mm?.min ?? null,
      max: mm?.max ?? null,
      stdDev: stdDev(overallVals),
      n: overallVals.length,
      topAromas: topItemsByCount(allTags, 3),
    };
  });

  const sortedWhiskies = [...whiskyRows].sort((a, b) => (b.avgOverall ?? -Infinity) - (a.avgOverall ?? -Infinity));
  const groupRankMap = new Map<string, number>();
  sortedWhiskies.forEach((w, i) => groupRankMap.set(w.id, i + 1));
  const groupAvgByWhisky = new Map<string, number | null>();
  for (const w of whiskyRows) groupAvgByWhisky.set(w.id, w.avgOverall);

  const allOverallVals: number[] = [];
  for (const r of ratingsScaled) {
    if (r.overall != null && r.overall > 0) allOverallVals.push(r.overall);
  }
  const allNoseVals: number[] = [];
  const allTasteVals: number[] = [];
  const allFinishVals: number[] = [];
  for (const r of ratingsScaled) {
    if (r.nose != null && r.nose > 0) allNoseVals.push(r.nose);
    if (r.taste != null && r.taste > 0) allTasteVals.push(r.taste);
    if (r.finish != null && r.finish > 0) allFinishVals.push(r.finish);
  }

  let highest: OverviewStats["highest"] = null;
  let lowest: OverviewStats["lowest"] = null;
  for (const r of ratingsScaled) {
    if (r.overall == null || r.overall <= 0) continue;
    const wName = whiskyById.get(r.whiskyId)?.name || "";
    const pName = participantDisplayById.get(r.participantId) || "";
    if (!highest || r.overall > highest.value) {
      highest = { value: r.overall, whiskyName: wName, participantName: pName };
    }
    if (!lowest || r.overall < lowest.value) {
      lowest = { value: r.overall, whiskyName: wName, participantName: pName };
    }
  }

  const stdDevs = whiskyRows.map(w => w.stdDev).filter((v): v is number => v != null);
  const avgStdDev = mean(stdDevs);
  let consensusIndex: number | null = null;
  if (avgStdDev != null) {
    const normalizedStdDev = scaleMax > 0 ? (avgStdDev / scaleMax) * 100 : 0;
    consensusIndex = Math.max(0, Math.min(100, 100 - normalizedStdDev * 4));
    consensusIndex = Math.round(consensusIndex);
  }

  const histogram = histogramBuckets(allOverallVals, 0, scaleMax, 10);

  let blindAbv: OverviewStats["blindAbv"] = null;
  let blindAge: OverviewStats["blindAge"] = null;
  if (isBlind) {
    const abvGuessesPaired: number[] = [];
    const abvRealsPaired: number[] = [];
    const ageGuessesPaired: number[] = [];
    const ageRealsPaired: number[] = [];
    for (const r of ratingsScaled) {
      const w = whiskyById.get(r.whiskyId);
      if (r.guessAbv != null && !isNaN(r.guessAbv) && w?.abv != null) {
        abvGuessesPaired.push(r.guessAbv);
        abvRealsPaired.push(w.abv);
      }
      if (r.guessAge != null && w?.age != null) {
        const ag = parseFloat(String(r.guessAge));
        const realAge = parseFloat(String(w.age));
        if (!isNaN(ag) && !isNaN(realAge)) {
          ageGuessesPaired.push(ag);
          ageRealsPaired.push(realAge);
        }
      }
    }
    if (abvGuessesPaired.length > 0) {
      blindAbv = { avgGuess: mean(abvGuessesPaired)!, avgReal: mean(abvRealsPaired), n: abvGuessesPaired.length };
    }
    if (ageGuessesPaired.length > 0) {
      blindAge = { avgGuess: mean(ageGuessesPaired)!, avgReal: mean(ageRealsPaired), n: ageGuessesPaired.length };
    }
  }

  const overview: OverviewStats = {
    nWhiskies: whiskies.length,
    nParticipants: includedParticipants.length,
    nRatings: allOverallVals.length,
    nPossible: whiskies.length * includedParticipants.length,
    overallAvg: mean(allOverallVals),
    overallMedian: median(allOverallVals),
    overallStdDev: stdDev(allOverallVals),
    highest,
    lowest,
    avgPerDim: {
      nose: mean(allNoseVals),
      taste: mean(allTasteVals),
      finish: mean(allFinishVals),
    },
    consensusIndex,
    histogram,
    blindAbv,
    blindAge,
  };

  const participantRows: ParticipantStatsRow[] = includedParticipants.map((tp: any, idx: number) => {
    const pid: string = tp.participantId || tp.id;
    const displayName = participantDisplayById.get(pid) || `P${idx + 1}`;
    const myRatings = ratingsScaled.filter((r: any) => r.participantId === pid);
    const myVals = myRatings.map((r: any) => r.overall).filter((v: number | null): v is number => v != null && v > 0);
    const myAvg = mean(myVals);
    const mySd = stdDev(myVals);
    const groupAvg = mean(allOverallVals);
    const deltaGroup = (myAvg != null && groupAvg != null) ? myAvg - groupAvg : null;

    const matchedWhiskyIds: string[] = [];
    const myScores: number[] = [];
    const groupScores: number[] = [];
    for (const r of myRatings) {
      if (r.overall == null || r.overall <= 0) continue;
      const gAvg = groupAvgByWhisky.get(r.whiskyId);
      if (gAvg == null) continue;
      matchedWhiskyIds.push(r.whiskyId);
      myScores.push(r.overall);
      groupScores.push(gAvg);
    }
    const correlation = spearman(myScores, groupScores);

    let top1Name: string | null = null;
    let flopName: string | null = null;
    if (myRatings.length > 0) {
      const sortedMine = [...myRatings]
        .filter((r: any) => r.overall != null && r.overall > 0)
        .sort((a: any, b: any) => (b.overall as number) - (a.overall as number));
      if (sortedMine.length > 0) {
        top1Name = whiskyById.get(sortedMine[0].whiskyId)?.name || null;
        flopName = whiskyById.get(sortedMine[sortedMine.length - 1].whiskyId)?.name || null;
      }
    }

    return {
      pid,
      displayName,
      avgGiven: myAvg,
      stdDevOwn: mySd,
      deltaGroup,
      correlation,
      top1Name,
      flopName,
      n: myVals.length,
    };
  });

  let strictest: AwardEntry | null = null;
  let mostGenerous: AwardEntry | null = null;
  let groupWhisperer: AwardEntry | null = null;
  for (const p of participantRows) {
    if (p.avgGiven != null) {
      if (!strictest || p.avgGiven < strictest.value) strictest = { name: p.displayName, value: p.avgGiven };
      if (!mostGenerous || p.avgGiven > mostGenerous.value) mostGenerous = { name: p.displayName, value: p.avgGiven };
    }
    if (p.correlation != null) {
      if (!groupWhisperer || p.correlation > groupWhisperer.value) groupWhisperer = { name: p.displayName, value: p.correlation };
    }
  }

  let biggestAgreement: { name: string; stdDev: number } | null = null;
  let biggestDispute: { name: string; spread: number } | null = null;
  for (const w of whiskyRows) {
    if (w.stdDev != null && w.n >= 2) {
      if (!biggestAgreement || w.stdDev < biggestAgreement.stdDev) {
        biggestAgreement = { name: w.name, stdDev: w.stdDev };
      }
    }
    if (w.min != null && w.max != null && w.n >= 2) {
      const spread = w.max - w.min;
      if (!biggestDispute || spread > biggestDispute.spread) {
        biggestDispute = { name: w.name, spread };
      }
    }
  }

  const matrixWhiskies = sortedWhiskies;
  const cells: (number | null)[][] = [];
  let cellMin = Infinity;
  let cellMax = -Infinity;
  for (const w of matrixWhiskies) {
    const row: (number | null)[] = [];
    for (const p of participantRows) {
      const r = ratingsScaled.find((x: any) => x.whiskyId === w.id && x.participantId === p.pid);
      const val = (r && r.overall != null && r.overall > 0) ? r.overall : null;
      row.push(val);
      if (val != null) {
        if (val < cellMin) cellMin = val;
        if (val > cellMax) cellMax = val;
      }
    }
    cells.push(row);
  }
  if (!isFinite(cellMin) || !isFinite(cellMax)) {
    cellMin = 0;
    cellMax = scaleMax;
  }
  const rowAvg = matrixWhiskies.map(w => w.avgOverall);
  const colAvg = participantRows.map(p => p.avgGiven);

  const matrix: MatrixData = {
    whiskyIds: matrixWhiskies.map(w => w.id),
    whiskyNames: matrixWhiskies.map(w => w.name),
    participantIds: participantRows.map(p => p.pid),
    participantHeaders: participantRows.map(p => p.displayName),
    cells,
    rowAvg,
    colAvg,
    cellMin,
    cellMax,
  };

  return {
    overview,
    whiskies: whiskyRows,
    participants: participantRows,
    awards: { strictest, mostGenerous, groupWhisperer },
    matrix,
    highlights: { biggestAgreement, biggestDispute },
    scaleMax,
    isBlind,
  };
}

function makePageHelpers(doc: jsPDF, pageW: number, pageH: number, t: (key: string, opts?: any) => string) {
  const drawPageBg = () => {
    doc.setFillColor(...BG);
    doc.rect(0, 0, pageW, pageH, "F");
  };
  const drawHeader = () => {
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, pageW, 3, "F");
  };
  const drawFooter = () => {
    const footerY = pageH - 12;
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, footerY - 4, pageW - MARGIN_X, footerY - 4);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(t("resultsUi.generatedBy"), MARGIN_X, footerY);
    doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageW - MARGIN_X, footerY, { align: "right" });
  };
  return { drawPageBg, drawHeader, drawFooter };
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  pageH: number,
  helpers: { drawPageBg: () => void; drawHeader: () => void; drawFooter: () => void },
): number {
  if (y + needed > pageH - 18) {
    helpers.drawFooter();
    doc.addPage();
    helpers.drawPageBg();
    helpers.drawHeader();
    return 18;
  }
  return y;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, pageW: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ACCENT);
  doc.text(title, MARGIN_X, y);
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X, y + 1.8, pageW - MARGIN_X, y + 1.8);
  return y + 7;
}

function drawMetricCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  sub?: string,
) {
  doc.setFillColor(...BG_SOFT);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(label, x + 3, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...TEXT);
  doc.text(value, x + 3, y + 10);
  if (sub) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(sub, x + 3, y + 14);
  }
}

function renderOverviewBlock(
  doc: jsPDF,
  stats: FullStats,
  yStart: number,
  pageW: number,
  t: (key: string, opts?: any) => string,
): number {
  const contentW = pageW - MARGIN_X * 2;
  let y = drawSectionTitle(doc, t("resultsUi.section.overview"), yStart, pageW);

  const cardW = (contentW - 4) / 3;
  const cardH = 16;
  const ov = stats.overview;
  drawMetricCard(doc, MARGIN_X, y, cardW, cardH, t("resultsUi.stats.numWhiskies"), String(ov.nWhiskies));
  drawMetricCard(doc, MARGIN_X + cardW + 2, y, cardW, cardH, t("resultsUi.stats.numParticipants"), String(ov.nParticipants));
  drawMetricCard(
    doc, MARGIN_X + (cardW + 2) * 2, y, cardW, cardH,
    t("resultsUi.stats.numRatings"), String(ov.nRatings),
    t("resultsUi.stats.completenessFmt", { actual: ov.nRatings, possible: ov.nPossible, defaultValue: `${ov.nRatings} / ${ov.nPossible}` }),
  );
  y += cardH + 2;

  drawMetricCard(doc, MARGIN_X, y, cardW, cardH, t("resultsUi.stats.average"), fmtScale(ov.overallAvg, stats.scaleMax));
  drawMetricCard(doc, MARGIN_X + cardW + 2, y, cardW, cardH, t("resultsUi.stats.median"), fmtScale(ov.overallMedian, stats.scaleMax));
  drawMetricCard(doc, MARGIN_X + (cardW + 2) * 2, y, cardW, cardH, t("resultsUi.stats.stdDev"), fmtSigma(ov.overallStdDev));
  y += cardH + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(t("resultsUi.stats.byDimension"), MARGIN_X, y);
  y += 3;
  const dimLabels = [t("resultsUi.nose"), t("resultsUi.taste"), t("resultsUi.finish")];
  const dimVals = [ov.avgPerDim.nose, ov.avgPerDim.taste, ov.avgPerDim.finish];
  const dimBarMaxW = contentW - 60;
  for (let i = 0; i < 3; i++) {
    const dy = y + i * 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(dimLabels[i], MARGIN_X, dy + 1);
    doc.setFillColor(60, 55, 45);
    doc.roundedRect(MARGIN_X + 22, dy - 1.5, dimBarMaxW, 3, 1, 1, "F");
    if (dimVals[i] != null) {
      const pct = stats.scaleMax > 0 ? Math.min(dimVals[i]!, stats.scaleMax) / stats.scaleMax : 0;
      doc.setFillColor(...ACCENT);
      doc.roundedRect(MARGIN_X + 22, dy - 1.5, dimBarMaxW * pct, 3, 1, 1, "F");
      doc.setFontSize(7);
      doc.setTextColor(...TEXT);
      doc.text(fmtScale(dimVals[i], stats.scaleMax), MARGIN_X + 24 + dimBarMaxW, dy + 1, { align: "right" });
    }
  }
  y += 3 * 5 + 4;

  const halfW = (contentW - 4) / 2;
  const hHi = 16;
  doc.setFillColor(...BG_SOFT);
  doc.roundedRect(MARGIN_X, y, halfW, hHi, 1.5, 1.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(t("resultsUi.stats.highestRating"), MARGIN_X + 3, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ACCENT);
  doc.text(ov.highest ? fmtScale(ov.highest.value, stats.scaleMax) : "—", MARGIN_X + 3, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT);
  if (ov.highest) {
    const ctx = `${truncate(ov.highest.whiskyName, 28)} \u00B7 ${truncate(ov.highest.participantName, 18)}`;
    doc.text(ctx, MARGIN_X + 3, y + 14);
  }

  doc.setFillColor(...BG_SOFT);
  doc.roundedRect(MARGIN_X + halfW + 4, y, halfW, hHi, 1.5, 1.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(t("resultsUi.stats.lowestRating"), MARGIN_X + halfW + 7, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ACCENT);
  doc.text(ov.lowest ? fmtScale(ov.lowest.value, stats.scaleMax) : "—", MARGIN_X + halfW + 7, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...TEXT);
  if (ov.lowest) {
    const ctx = `${truncate(ov.lowest.whiskyName, 28)} \u00B7 ${truncate(ov.lowest.participantName, 18)}`;
    doc.text(ctx, MARGIN_X + halfW + 7, y + 14);
  }
  y += hHi + 4;

  const histH = 22;
  const histW = halfW;
  doc.setFillColor(...BG_SOFT);
  doc.roundedRect(MARGIN_X, y, histW, histH, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(t("resultsUi.stats.distribution"), MARGIN_X + 3, y + 4);
  const bins = ov.histogram;
  const maxCount = bins.reduce((m, b) => Math.max(m, b.count), 0);
  if (maxCount > 0) {
    const barAreaW = histW - 6;
    const barW = barAreaW / bins.length;
    const barAreaH = histH - 9;
    const barAreaY = y + 6;
    for (let i = 0; i < bins.length; i++) {
      const h = (bins[i].count / maxCount) * (barAreaH - 1);
      doc.setFillColor(...ACCENT);
      doc.rect(MARGIN_X + 3 + i * barW + 0.4, barAreaY + (barAreaH - h), barW - 0.8, h, "F");
    }
    doc.setFontSize(5.5);
    doc.setTextColor(...MUTED);
    doc.text("0", MARGIN_X + 3, y + histH - 1);
    doc.text(String(stats.scaleMax), MARGIN_X + 3 + barAreaW, y + histH - 1, { align: "right" });
  }

  doc.setFillColor(...BG_SOFT);
  doc.roundedRect(MARGIN_X + halfW + 4, y, histW, histH, 1.5, 1.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(t("resultsUi.stats.consensusIndex"), MARGIN_X + halfW + 7, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...ACCENT);
  doc.text(ov.consensusIndex != null ? `${ov.consensusIndex}` : "—", MARGIN_X + halfW + 7, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(t("resultsUi.stats.consensusHint"), MARGIN_X + halfW + 7, y + 19);
  y += histH + 4;

  if (stats.isBlind && (ov.blindAbv || ov.blindAge)) {
    const blindLines: string[] = [];
    if (ov.blindAbv) {
      const real = ov.blindAbv.avgReal != null ? `${ov.blindAbv.avgReal.toFixed(1)}%` : "—";
      blindLines.push(`${t("resultsUi.stats.blindAbvGuess")}: ${ov.blindAbv.avgGuess.toFixed(1)}% \u00B7 ${t("resultsUi.stats.realAvg")}: ${real}`);
    }
    if (ov.blindAge) {
      const real = ov.blindAge.avgReal != null ? `${ov.blindAge.avgReal.toFixed(1)}` : "—";
      blindLines.push(`${t("resultsUi.stats.blindAgeGuess")}: ${ov.blindAge.avgGuess.toFixed(1)} \u00B7 ${t("resultsUi.stats.realAvg")}: ${real}`);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    for (let i = 0; i < blindLines.length; i++) {
      doc.text(blindLines[i], MARGIN_X, y + i * 4);
    }
    y += blindLines.length * 4 + 2;
  }

  return y;
}

interface TableColumn {
  key: string;
  label: string;
  width: number;
  align?: "left" | "right" | "center";
}

function drawTableHeader(doc: jsPDF, cols: TableColumn[], y: number): number {
  let x = MARGIN_X;
  doc.setFillColor(...BG_SOFT);
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  doc.rect(MARGIN_X, y - 4, totalW, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...ACCENT);
  for (const c of cols) {
    const tx = c.align === "right" ? x + c.width - 1.5 : c.align === "center" ? x + c.width / 2 : x + 1.5;
    doc.text(c.label, tx, y, { align: c.align ?? "left" });
    x += c.width;
  }
  return y + 4;
}

function drawTableRow(
  doc: jsPDF,
  cols: TableColumn[],
  values: string[],
  y: number,
  rowH: number,
  highlight: boolean,
  textColor: RGB,
): void {
  if (highlight) {
    const totalW = cols.reduce((s, c) => s + c.width, 0);
    doc.setFillColor(...HIGHLIGHT_BG);
    doc.rect(MARGIN_X, y - rowH + 1.5, totalW, rowH, "F");
  }
  let x = MARGIN_X;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...textColor);
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    const tx = c.align === "right" ? x + c.width - 1.5 : c.align === "center" ? x + c.width / 2 : x + 1.5;
    doc.text(values[i] ?? "", tx, y, { align: c.align ?? "left" });
    x += c.width;
  }
}

function renderWhiskyTableBlock(
  doc: jsPDF,
  stats: FullStats,
  yStart: number,
  pageW: number,
  pageH: number,
  helpers: ReturnType<typeof makePageHelpers>,
  t: (key: string, opts?: any) => string,
): number {
  let y = ensureSpace(doc, yStart, 14, pageH, helpers);
  y = drawSectionTitle(doc, t("resultsUi.section.perWhisky"), y, pageW);

  const cols: TableColumn[] = [
    { key: "rank", label: "#", width: 7, align: "center" },
    { key: "name", label: t("resultsUi.cols.whisky"), width: 36 },
    { key: "distillery", label: t("resultsUi.cols.distillery"), width: 24 },
    { key: "avg", label: t("resultsUi.cols.avg"), width: 11, align: "right" },
    { key: "nose", label: t("resultsUi.cols.avgNose"), width: 10, align: "right" },
    { key: "taste", label: t("resultsUi.cols.avgTaste"), width: 10, align: "right" },
    { key: "finish", label: t("resultsUi.cols.avgFinish"), width: 10, align: "right" },
    { key: "median", label: t("resultsUi.cols.median"), width: 10, align: "right" },
    { key: "minmax", label: t("resultsUi.cols.minMax"), width: 14, align: "center" },
    { key: "sigma", label: t("resultsUi.cols.sigma"), width: 9, align: "right" },
    { key: "n", label: t("resultsUi.cols.n"), width: 7, align: "right" },
    { key: "aromas", label: t("resultsUi.cols.topAromas"), width: 26 },
  ];
  y = drawTableHeader(doc, cols, y);
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.1);
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  doc.line(MARGIN_X, y - 1.5, MARGIN_X + totalW, y - 1.5);

  const sorted = [...stats.whiskies].sort((a, b) => (b.avgOverall ?? -Infinity) - (a.avgOverall ?? -Infinity));
  const rowH = 6;
  for (let i = 0; i < sorted.length; i++) {
    y = ensureSpace(doc, y, rowH + 1, pageH, helpers);
    if (y === 18) {
      y = drawTableHeader(doc, cols, y + 4);
    }
    const w = sorted[i];
    const minMaxStr = (w.min != null && w.max != null) ? `${fmtScale(w.min, stats.scaleMax)}\u2013${fmtScale(w.max, stats.scaleMax)}` : "—";
    const aromas = w.topAromas.length > 0 ? truncate(w.topAromas.join(", "), 28) : "—";
    const values = [
      String(i + 1),
      truncate(w.name, 36),
      truncate(w.distillery, 22),
      fmtScale(w.avgOverall, stats.scaleMax),
      fmtScale(w.avgNose, stats.scaleMax),
      fmtScale(w.avgTaste, stats.scaleMax),
      fmtScale(w.avgFinish, stats.scaleMax),
      fmtScale(w.median, stats.scaleMax),
      minMaxStr,
      fmtSigma(w.stdDev),
      String(w.n),
      aromas,
    ];
    y += rowH;
    drawTableRow(doc, cols, values, y - 1.5, rowH, i < 3, i < 3 ? ACCENT : TEXT);
  }
  y += 4;

  if (stats.highlights.biggestAgreement || stats.highlights.biggestDispute) {
    y = ensureSpace(doc, y, 14, pageH, helpers);
    if (stats.highlights.biggestAgreement) {
      const ha = stats.highlights.biggestAgreement;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...ACCENT);
      doc.text(t("resultsUi.highlights.biggestAgreement"), MARGIN_X, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      doc.text(`${truncate(ha.name, 50)}  (\u03C3 = ${ha.stdDev.toFixed(1)})`, MARGIN_X + 38, y);
      y += 4.5;
    }
    if (stats.highlights.biggestDispute) {
      const hd = stats.highlights.biggestDispute;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...ACCENT);
      doc.text(t("resultsUi.highlights.biggestDispute"), MARGIN_X, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      doc.text(`${truncate(hd.name, 50)}  (\u0394 = ${hd.spread.toFixed(1)})`, MARGIN_X + 38, y);
      y += 4.5;
    }
    y += 2;
  }

  return y;
}

function renderParticipantTableBlock(
  doc: jsPDF,
  stats: FullStats,
  yStart: number,
  pageW: number,
  pageH: number,
  helpers: ReturnType<typeof makePageHelpers>,
  t: (key: string, opts?: any) => string,
): number {
  let y = ensureSpace(doc, yStart, 24, pageH, helpers);
  y = drawSectionTitle(doc, t("resultsUi.section.perParticipant"), y, pageW);

  const cols: TableColumn[] = [
    { key: "name", label: t("resultsUi.cols.participant"), width: 30 },
    { key: "avg", label: t("resultsUi.cols.avgGiven"), width: 16, align: "right" },
    { key: "sd", label: t("resultsUi.cols.sigmaOwn"), width: 14, align: "right" },
    { key: "delta", label: t("resultsUi.cols.deltaGroup"), width: 16, align: "right" },
    { key: "corr", label: t("resultsUi.cols.correlation"), width: 14, align: "right" },
    { key: "top", label: t("resultsUi.cols.top1"), width: 32 },
    { key: "flop", label: t("resultsUi.cols.flop"), width: 32 },
    { key: "n", label: t("resultsUi.cols.n"), width: 8, align: "right" },
  ];
  let headerY = drawTableHeader(doc, cols, y);
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.1);
  doc.line(MARGIN_X, headerY - 1.5, MARGIN_X + totalW, headerY - 1.5);
  y = headerY;

  const rowH = 6;
  const sorted = [...stats.participants].sort((a, b) => (b.avgGiven ?? -Infinity) - (a.avgGiven ?? -Infinity));
  for (const p of sorted) {
    y = ensureSpace(doc, y, rowH + 1, pageH, helpers);
    if (y === 18) {
      y = drawTableHeader(doc, cols, y + 4);
      doc.line(MARGIN_X, y - 1.5, MARGIN_X + totalW, y - 1.5);
    }
    const values = [
      truncate(p.displayName, 28),
      fmtScale(p.avgGiven, stats.scaleMax),
      fmtSigma(p.stdDevOwn),
      fmtDelta(p.deltaGroup),
      fmtCorr(p.correlation),
      truncate(p.top1Name || "—", 30),
      truncate(p.flopName || "—", 30),
      String(p.n),
    ];
    y += rowH;
    drawTableRow(doc, cols, values, y - 1.5, rowH, false, TEXT);
  }
  y += 4;

  y = ensureSpace(doc, y, 18, pageH, helpers);
  const awardsCfg: { key: string; entry: AwardEntry | null; valueFmt: (v: number) => string }[] = [
    { key: "strictest", entry: stats.awards.strictest, valueFmt: v => fmtScale(v, stats.scaleMax) },
    { key: "mostGenerous", entry: stats.awards.mostGenerous, valueFmt: v => fmtScale(v, stats.scaleMax) },
    { key: "groupWhisperer", entry: stats.awards.groupWhisperer, valueFmt: v => (Math.round(v * 100) / 100).toFixed(2) },
  ];
  for (const a of awardsCfg) {
    if (!a.entry) continue;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...ACCENT);
    doc.text(t(`resultsUi.awards.${a.key}`), MARGIN_X, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    doc.text(`${truncate(a.entry.name, 36)}  (${a.valueFmt(a.entry.value)})`, MARGIN_X + 50, y);
    y += 4.5;
  }
  y += 2;

  return y;
}

function renderHeatmapBlock(
  doc: jsPDF,
  stats: FullStats,
  pageW: number,
  pageH: number,
  helpers: ReturnType<typeof makePageHelpers>,
  t: (key: string, opts?: any) => string,
): void {
  helpers.drawFooter();
  const useLandscape = stats.matrix.participantHeaders.length > 10;
  const lw = useLandscape ? 297 : 210;
  const lh = useLandscape ? 210 : 297;

  const m = stats.matrix;
  const nP = m.participantHeaders.length;
  const nW = m.whiskyNames.length;

  if (nP === 0 || nW === 0) {
    doc.addPage("a4", useLandscape ? "landscape" : "portrait");
    const lpHelpers = makePageHelpers(doc, lw, lh, t);
    lpHelpers.drawPageBg();
    lpHelpers.drawHeader();
    let y = 18;
    y = drawSectionTitle(doc, t("resultsUi.section.heatmap"), y, lw);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(t("resultsUi.heatmap.empty"), MARGIN_X, y + 6);
    lpHelpers.drawFooter();
    return;
  }

  const labelColW = 50;
  const groupAvgColW = 14;
  const cellWFixed = 9;
  const cellH = 6;
  const headerH = 14;
  const availW = lw - MARGIN_X * 2 - labelColW - groupAvgColW;
  const maxColsPerPage = Math.max(1, Math.floor(availW / cellWFixed));

  const chunks: number[] = [];
  for (let i = 0; i < nP; i += maxColsPerPage) {
    chunks.push(i);
  }
  const totalChunks = chunks.length;

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    const startCol = chunks[chunkIdx];
    const endCol = Math.min(nP, startCol + maxColsPerPage);
    const chunkSize = endCol - startCol;

    doc.addPage("a4", useLandscape ? "landscape" : "portrait");
    const lpHelpers = makePageHelpers(doc, lw, lh, t);
    lpHelpers.drawPageBg();
    lpHelpers.drawHeader();

    let cy = 18;
    const titleSuffix = totalChunks > 1
      ? ` (${chunkIdx + 1}/${totalChunks})`
      : "";
    cy = drawSectionTitle(doc, t("resultsUi.section.heatmap") + titleSuffix, cy, lw);

    const tableX = MARGIN_X;

    const drawColHeaders = (yPos: number): number => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...ACCENT);
      for (let i = 0; i < chunkSize; i++) {
        const cx = tableX + labelColW + i * cellWFixed + cellWFixed / 2;
        const label = truncate(m.participantHeaders[startCol + i], 10);
        doc.text(label, cx, yPos + headerH - 2, { align: "center" });
      }
      doc.text(
        t("resultsUi.heatmap.groupAvg"),
        tableX + labelColW + chunkSize * cellWFixed + groupAvgColW / 2,
        yPos + headerH - 2,
        { align: "center" },
      );
      return yPos + headerH;
    };

    cy = drawColHeaders(cy);

    for (let r = 0; r < nW; r++) {
      if (cy + cellH > lh - 30) {
        lpHelpers.drawFooter();
        doc.addPage("a4", useLandscape ? "landscape" : "portrait");
        lpHelpers.drawPageBg();
        lpHelpers.drawHeader();
        cy = 18;
        cy = drawSectionTitle(doc, `${t("resultsUi.section.heatmap")}${titleSuffix} (${t("resultsUi.heatmap.continued")})`, cy, lw);
        cy = drawColHeaders(cy);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...TEXT);
      doc.text(truncate(m.whiskyNames[r] || "—", 28), tableX + 1, cy + cellH - 1.8);

      for (let c = 0; c < chunkSize; c++) {
        const actualCol = startCol + c;
        const v = m.cells[r][actualCol];
        const color = heatmapColor(v, m.cellMin, m.cellMax, BG_SOFT, ACCENT, 0.9);
        doc.setFillColor(...color);
        doc.rect(tableX + labelColW + c * cellWFixed, cy, cellWFixed - 0.4, cellH, "F");
        doc.setFontSize(6);
        doc.setTextColor(...TEXT);
        doc.text(
          v != null ? fmtScale(v, stats.scaleMax) : "—",
          tableX + labelColW + c * cellWFixed + cellWFixed / 2,
          cy + cellH - 1.8,
          { align: "center" },
        );
      }
      doc.setFillColor(...HIGHLIGHT_BG);
      doc.rect(tableX + labelColW + chunkSize * cellWFixed, cy, groupAvgColW, cellH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...ACCENT);
      doc.text(
        fmtScale(m.rowAvg[r], stats.scaleMax),
        tableX + labelColW + chunkSize * cellWFixed + groupAvgColW / 2,
        cy + cellH - 1.8,
        { align: "center" },
      );

      cy += cellH;
    }

    cy += 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...ACCENT);
    doc.text(t("resultsUi.heatmap.participantAvg"), tableX + 1, cy + cellH - 1.8);
    for (let c = 0; c < chunkSize; c++) {
      const actualCol = startCol + c;
      doc.setFillColor(...HIGHLIGHT_BG);
      doc.rect(tableX + labelColW + c * cellWFixed, cy, cellWFixed - 0.4, cellH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...ACCENT);
      doc.text(
        fmtScale(m.colAvg[actualCol], stats.scaleMax),
        tableX + labelColW + c * cellWFixed + cellWFixed / 2,
        cy + cellH - 1.8,
        { align: "center" },
      );
    }
    cy += cellH + 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(`${t("resultsUi.heatmap.legendLow")} \u2192 ${t("resultsUi.heatmap.legendHigh")}`, tableX, cy + 3);
    const legendW = 40;
    const legendY = cy;
    for (let i = 0; i < legendW; i++) {
      const cl = heatmapColor(
        m.cellMin + (i / legendW) * (m.cellMax - m.cellMin),
        m.cellMin,
        m.cellMax,
        BG_SOFT,
        ACCENT,
        0.9,
      );
      doc.setFillColor(...cl);
      doc.rect(tableX + 30 + i, legendY, 1, 3, "F");
    }

    lpHelpers.drawFooter();
  }
}

export async function labsExportPdf(
  tasting: any,
  whiskyResults: any[],
  t: (key: string, opts?: any) => string,
  fullStats?: FullStats,
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = PAGE_W_PORTRAIT;
  const pageH = PAGE_H_PORTRAIT;
  const helpers = makePageHelpers(doc, pageW, pageH, t);

  helpers.drawPageBg();
  helpers.drawHeader();

  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...ACCENT);
  doc.text(t("resultsUi.generatedBy"), pageW / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...TEXT);
  doc.text(tasting.title || t("resultsUi.tastingResults"), pageW / 2, y, { align: "center" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const totalRatings = fullStats ? fullStats.overview.nRatings : whiskyResults.reduce((s, w) => s + (w.ratingCount || 0), 0);
  const nW = fullStats ? fullStats.overview.nWhiskies : whiskyResults.length;
  const metaParts = [
    `${nW} ${nW === 1 ? t("resultsUi.whisky") : t("resultsUi.whiskies")}`,
    `${totalRatings} ${totalRatings === 1 ? t("resultsUi.rating") : t("resultsUi.ratings")}`,
  ];
  if (fullStats) {
    const nP = fullStats.overview.nParticipants;
    metaParts.splice(1, 0, t("resultsUi.metaParticipants", { count: nP, defaultValue: `${nP} participants` }));
  }
  doc.text(metaParts.join(" \u00B7 "), pageW / 2, y, { align: "center" });
  y += 5;

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_X, y, pageW - MARGIN_X, y);
  y += 7;

  if (fullStats) {
    y = renderOverviewBlock(doc, fullStats, y, pageW, t);
    y = renderWhiskyTableBlock(doc, fullStats, y + 2, pageW, pageH, helpers, t);
    y = renderParticipantTableBlock(doc, fullStats, y + 2, pageW, pageH, helpers, t);
    renderHeatmapBlock(doc, fullStats, pageW, pageH, helpers, t);
  } else {
    const sorted = [...whiskyResults].sort((a, b) => (b.avgOverall || 0) - (a.avgOverall || 0));
    const contentW = pageW - MARGIN_X * 2;
    const resultsScaleMax = (tasting?.ratingScale as number) ?? 100;
    sorted.forEach((r, i) => {
      const blockH = 28;
      y = ensureSpace(doc, y, blockH, pageH, helpers);
      if (i < 3) {
        doc.setFillColor(...HIGHLIGHT_BG);
        doc.roundedRect(MARGIN_X, y - 4, contentW, blockH - 2, 2, 2, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...(i < 3 ? ACCENT : TEXT));
      doc.text(`#${i + 1}`, MARGIN_X + 2, y + 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...TEXT);
      const nameText = (r.name || t("resultsUi.unknown")).length > 35 ? (r.name || t("resultsUi.unknown")).slice(0, 33) + "\u2026" : (r.name || t("resultsUi.unknown"));
      doc.text(nameText, MARGIN_X + 16, y + 2);
      if (r.distillery) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(r.distillery, MARGIN_X + 16, y + 7);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...ACCENT);
      doc.text(formatScore(r.avgOverall ?? 0), pageW - MARGIN_X, y + 3, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(`${r.ratingCount} ${r.ratingCount === 1 ? t("resultsUi.rating") : t("resultsUi.ratings")}`, pageW - MARGIN_X, y + 8, { align: "right" });
      const barY = y + 12;
      const barLabels = [t("resultsUi.nose"), t("resultsUi.taste"), t("resultsUi.finish")];
      const barVals = [r.avgNose, r.avgTaste, r.avgFinish];
      const barMaxW = contentW - 50;
      barLabels.forEach((lbl, bi) => {
        const bx = MARGIN_X + 16;
        const by = barY + bi * 5;
        doc.setFontSize(6);
        doc.setTextColor(...MUTED);
        doc.text(lbl, bx, by + 1);
        doc.setFillColor(60, 55, 45);
        doc.roundedRect(bx + 24, by - 1.5, barMaxW * 0.25, 3, 1, 1, "F");
        if (barVals[bi] != null) {
          const userVal = barVals[bi]!;
          const pct = resultsScaleMax > 0 ? Math.min(userVal, resultsScaleMax) / resultsScaleMax : 0;
          doc.setFillColor(...ACCENT);
          doc.roundedRect(bx + 24, by - 1.5, barMaxW * 0.25 * pct, 3, 1, 1, "F");
          doc.setFontSize(6);
          doc.setTextColor(...TEXT);
          doc.text(formatScore(userVal), bx + 26 + barMaxW * 0.25, by + 1);
        }
      });
      y += blockH + 4;
    });
    helpers.drawFooter();
  }

  const safeName = (tasting.title || "results").replace(/[^a-zA-Z0-9]/g, "_");
  await saveJsPdf(doc, `${safeName}_results.pdf`);
}

export async function labsExportStoryPdfForTasting(
  tastingId: string,
  t?: (key: string, opts?: any) => string,
): Promise<void> {
  const [storyRes, photosRes] = await Promise.all([
    fetch(`/api/tastings/${tastingId}/story`, { headers: pidHeaders() }),
    fetch(`/api/tastings/${tastingId}/event-photos`, { headers: pidHeaders() }),
  ]);
  if (!storyRes.ok) {
    throw new Error(t ? t("downloads.exportErrorStoryData", { defaultValue: "Story data could not be loaded." }) : "Story data could not be loaded.");
  }
  const storyData = await storyRes.json();
  if (!storyData?.tasting) {
    throw new Error(t ? t("downloads.exportErrorNoTasting", { defaultValue: "No tasting data available." }) : "No tasting data available.");
  }
  const eventPhotos = photosRes.ok ? await photosRes.json() : [];
  await exportStoryPdf({ ...storyData, eventPhotos });
}

export async function labsExportPdfForTasting(
  tastingId: string,
  t: (key: string, opts?: any) => string,
): Promise<void> {
  const [tastingRes, whiskiesRes, ratingsRes, participantsRes] = await Promise.all([
    fetch(`/api/tastings/${tastingId}`, { headers: pidHeaders() }),
    fetch(`/api/tastings/${tastingId}/whiskies`, { headers: pidHeaders() }),
    fetch(`/api/tastings/${tastingId}/ratings`, { headers: pidHeaders() }),
    fetch(`/api/tastings/${tastingId}/participants`, { headers: pidHeaders() }),
  ]);
  if (!tastingRes.ok || !whiskiesRes.ok || !ratingsRes.ok) {
    throw new Error(t("downloads.exportErrorTastingData", { defaultValue: "Tasting data could not be loaded." }));
  }
  const tasting = await tastingRes.json();
  const whiskies: any[] = await whiskiesRes.json();
  const allRatings: any[] = await ratingsRes.json();
  const participants: any[] = participantsRes.ok ? await participantsRes.json() : [];

  const fullStats = computeFullStats(tasting, whiskies, allRatings, participants);

  const whiskyResults = fullStats.whiskies.map(w => ({
    id: w.id,
    name: w.name,
    distillery: w.distillery,
    avgOverall: w.avgOverall,
    avgNose: w.avgNose,
    avgTaste: w.avgTaste,
    avgFinish: w.avgFinish,
    ratingCount: w.n,
  }));

  await labsExportPdf(tasting, whiskyResults, t, fullStats);
}
