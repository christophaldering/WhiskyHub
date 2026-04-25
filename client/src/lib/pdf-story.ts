import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";
import { stripGuestSuffix, formatScore } from "@/lib/utils";

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type PdfProgressCallback = (current: number, total: number, label: string) => void;

export async function exportStoryPdf(storyData: any, returnBase64 = false, onProgress?: PdfProgressCallback): Promise<string | void> {
  const {
    tasting, sortedRanking, participants, eventPhotos, winner,
    winnerNarration, aiComments, blindReveal, participantFunFacts,
    openingNarration, discoveryTexts, blindNarration, closingReflection,
    whiskyPortraits, winnerStory,
  } = storyData;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210, pageH = 297, marginX = 18, contentW = pageW - marginX * 2;
  const accent: [number, number, number] = [212, 162, 86];
  const muted: [number, number, number] = [192, 186, 178];
  const bg: [number, number, number] = [26, 23, 20];
  const textColor: [number, number, number] = [245, 240, 232];
  const surface: [number, number, number] = [58, 53, 46];

  const drawBg = () => { doc.setFillColor(...bg); doc.rect(0, 0, pageW, pageH, "F"); };

  const drawHeader = () => {
    doc.setFillColor(...accent); doc.rect(0, 0, pageW, 2.5, "F");
  };

  const drawFooter = (pageLabel?: string) => {
    const fy = pageH - 11;
    doc.setDrawColor(...accent); doc.setLineWidth(0.25); doc.line(marginX, fy - 3, pageW - marginX, fy - 3);
    doc.setFontSize(6.5); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
    doc.text("CaskSense Story", marginX, fy);
    doc.text(pageLabel || tasting.title || "Tasting", pageW - marginX, fy, { align: "right" });
  };

  const drawActLabel = (number: string, title: string, yPos: number) => {
    const badgeW = doc.getTextWidth(number) + 8;
    doc.setFillColor(212, 162, 86); doc.roundedRect(marginX, yPos - 4, badgeW, 6.5, 1, 1, "F");
    doc.setFontSize(6.5); doc.setTextColor(...bg); doc.setFont("helvetica", "bold");
    doc.text(number, marginX + 4, yPos + 0.5);
    doc.setFontSize(7); doc.setTextColor(...muted); doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), marginX + badgeW + 5, yPos + 0.5);
    return yPos + 10;
  };

  const addTextWrapped = (text: string, x: number, yRef: number, maxWidth: number, fontSize: number, color: [number,number,number], style: "normal"|"bold"|"italic" = "normal"): number => {
    doc.setFontSize(fontSize); doc.setTextColor(...color); doc.setFont("helvetica", style);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => { doc.text(line, x, yRef); yRef += fontSize * 0.45; });
    return yRef;
  };

  const drawSurface = (x: number, y: number, w: number, h: number) => {
    doc.setFillColor(...surface); doc.roundedRect(x, y, w, h, 2, 2, "F");
    doc.setDrawColor(212, 162, 86); doc.setLineWidth(0.2); doc.roundedRect(x, y, w, h, 2, 2, "S");
  };

  const drawNarrativeBlock = (text: string, yStart: number, boxH: number, indentX = marginX, boxW = contentW): number => {
    doc.setFillColor(...surface);
    doc.roundedRect(indentX, yStart, boxW, boxH, 2, 2, "F");
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.5);
    doc.line(indentX, yStart, indentX, yStart + boxH);
    doc.setLineWidth(0.2);
    doc.roundedRect(indentX, yStart, boxW, boxH, 2, 2, "S");
    const textY = yStart + 5;
    return addTextWrapped(`"${text}"`, indentX + 6, textY, boxW - 12, 8, muted, "italic");
  };

  const eventPhotoB64s: (string | null)[] = await Promise.all(
    (eventPhotos || []).map((ep: any) => fetchImageAsBase64(ep.photoUrl))
  );

  const whiskyImgB64s: Map<string, string | null> = new Map();
  for (const w of (sortedRanking || []).slice(0, 12)) {
    if (w.coverImageUrl || w.imageUrl) {
      whiskyImgB64s.set(w.id, await fetchImageAsBase64(w.coverImageUrl || w.imageUrl));
    }
  }

  const tasters = (participants || []).filter((p: any) => !p.excludedFromResults);

  const blindData = (blindReveal || []).filter((w: any) => w.guesses && w.guesses.length > 0);
  const photoEntries = (eventPhotos || []).filter((_: any, i: number) => eventPhotoB64s[i]);

  // Pre-simulate photo layout to get an accurate page count
  const photoPageCount = (() => {
    if (photoEntries.length === 0) return 0;
    const simPhotoW = (contentW - 6) / 2;
    const simPhotoH = simPhotoW * 0.65;
    let pages = 1, col = 0, yy = 28;
    for (let pi = 0; pi < photoEntries.length; pi++) {
      if (yy + simPhotoH > pageH - 22) { pages++; yy = 28; col = 0; }
      col++;
      if (col >= 2) { col = 0; yy += simPhotoH + 14; }
    }
    return pages;
  })();

  const totalPages =
    1 +
    (tasters.length > 0 ? 1 : 0) +
    (sortedRanking || []).length +
    (blindData.length > 0 ? 1 : 0) +
    (winner ? 1 : 0) +
    photoPageCount +
    1;
  let currentPage = 0;
  const progress = async (label: string) => {
    currentPage++;
    onProgress?.(currentPage, totalPages, label);
    if (onProgress) await new Promise<void>(r => setTimeout(r, 0));
  };

  // ===== PAGE 1: ACT I · COVER / OPENING =====
  await progress("Akt I · Eröffnung");
  drawBg(); drawHeader();
  let y = 18;

  const firstPhoto = eventPhotoB64s[0];
  if (firstPhoto) {
    try {
      doc.addImage(firstPhoto, "JPEG", 0, 0, pageW, 110, undefined, "FAST");
      doc.setFillColor(...bg);
      for (let i = 0; i < 6; i++) {
        doc.setGState(doc.GState({ opacity: 0.15 + i * 0.15 }));
        doc.rect(0, 80 + i * 5, pageW, 6, "F");
      }
      doc.setGState(doc.GState({ opacity: 1 }));
      doc.setFillColor(...bg); doc.rect(0, 108, pageW, 4, "F");
      y = 118;
    } catch { /* skip */ }
  }

  y = drawActLabel("AKT I", "Eröffnung", y);

  doc.setFontSize(24); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(tasting.title || "Tasting Story", contentW);
  titleLines.slice(0, 3).forEach((l: string) => { doc.text(l, pageW / 2, y, { align: "center" }); y += 11; });
  y += 2;

  doc.setFontSize(9); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
  const metaParts = [tasting.date, tasting.location].filter(Boolean).join("  ·  ");
  if (metaParts) { doc.text(metaParts, pageW / 2, y, { align: "center" }); y += 10; }

  doc.setDrawColor(...accent); doc.setLineWidth(0.4); doc.line(marginX + 20, y, pageW - marginX - 20, y); y += 10;

  const openingQuote = openingNarration || tasting.hostReflection;
  if (openingQuote) {
    y = drawNarrativeBlock(openingQuote.slice(0, 220), y, 24) + 8;
  }

  if (tasters.length > 0) {
    doc.setFontSize(7); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
    doc.text(`${tasters.length} VERKOSTER`, pageW / 2, y, { align: "center" }); y += 5;
    doc.setFontSize(8.5); doc.setTextColor(...textColor); doc.setFont("helvetica", "normal");
    const names = tasters.map((t: any) => stripGuestSuffix(t.participant?.name || "?")).join("  ·  ");
    const nlines = doc.splitTextToSize(names, contentW);
    nlines.slice(0, 2).forEach((l: string) => { doc.text(l, pageW / 2, y, { align: "center" }); y += 5; });
    y += 6;
  }

  if ((sortedRanking || []).length > 0) {
    doc.setFontSize(7); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
    doc.text("TOP RANKING", marginX, y); y += 5;
    (sortedRanking || []).slice(0, 5).forEach((w: any, i: number) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setFontSize(8.5); doc.setTextColor(...(i < 3 ? accent : textColor));
      const medal = `#${i + 1}`;
      doc.text(`${medal}  ${(w.name || "?").slice(0, 44)}`, marginX, y);
      if (w.avgOverall != null) {
        doc.setFont("helvetica", "bold");
        doc.text(formatScore(w.avgOverall), pageW - marginX, y, { align: "right" });
      }
      y += 6.5;
    });
  }

  drawFooter("Eröffnung");

  // ===== PAGE: ACT III · DIE VERKOSTER =====
  if (tasters.length > 0) {
    await progress("Akt III · Die Verkoster");
    doc.addPage(); drawBg(); drawHeader();
    y = 18;
    y = drawActLabel("AKT III", "Die Verkoster", y);

    doc.setFontSize(18); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
    doc.text(`${tasters.length} Verkoster · Eine Mission`, pageW / 2, y, { align: "center" }); y += 18;

    const cardCols = 3;
    const cardW = (contentW - (cardCols - 1) * 6) / cardCols;
    const cardH = 26;
    let cardCol = 0;
    const cardStartY = y;

    tasters.forEach((tp: any, idx: number) => {
      const name = stripGuestSuffix(tp.participant?.name || tp.participant?.email || "?");
      const funFact = participantFunFacts?.[name] ?? "";
      const initial = name.charAt(0).toUpperCase();
      const cx = marginX + cardCol * (cardW + 6);
      const cy = cardStartY + Math.floor(idx / cardCols) * (cardH + 6);

      if (cy + cardH > pageH - 22) return;

      drawSurface(cx, cy, cardW, cardH);

      const avatarR = 7;
      const avatarX = cx + avatarR + 4;
      const avatarY = cy + cardH / 2;
      doc.setFillColor(...accent); doc.circle(avatarX, avatarY, avatarR, "F");
      doc.setFontSize(8); doc.setTextColor(...bg); doc.setFont("helvetica", "bold");
      doc.text(initial, avatarX, avatarY + 2.5, { align: "center" });

      const textX = cx + avatarR * 2 + 8;
      const textMaxW = cardW - avatarR * 2 - 12;
      doc.setFontSize(8); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
      doc.text(name.slice(0, 18), textX, cy + cardH / 2 - (funFact ? 2 : -2));
      if (funFact) {
        doc.setFontSize(6); doc.setTextColor(...muted); doc.setFont("helvetica", "italic");
        const ffLines = doc.splitTextToSize(funFact.slice(0, 60), textMaxW);
        ffLines.slice(0, 2).forEach((l: string, li: number) => {
          doc.text(l, textX, cy + cardH / 2 + 4 + li * 4);
        });
      }

      cardCol++;
      if (cardCol >= cardCols) cardCol = 0;
    });

    y = cardStartY + Math.ceil(tasters.length / cardCols) * (cardH + 6) + 4;
    drawFooter("Die Verkoster");
  }

  // ===== PAGES: ACT IV · ENTDECKUNGEN =====
  for (let i = 0; i < (sortedRanking || []).length; i++) {
    const w = sortedRanking[i];
    await progress(`Akt IV · ${w.name ? w.name.slice(0, 24) : `Platz ${i + 1}`}`);
    doc.addPage(); drawBg(); drawHeader();
    y = 18;

    y = drawActLabel("AKT IV", `Entdeckungen · Platz ${i + 1}`, y);

    const rankText = `#${i + 1}`;
    const rankFontSize = 36;
    doc.setFontSize(rankFontSize); doc.setTextColor(...(i < 3 ? accent : muted)); doc.setFont("helvetica", "bold");
    doc.text(rankText, marginX, y + rankFontSize * 0.35);

    const imgB64 = whiskyImgB64s.get(w.id);
    const hasImg = !!imgB64;
    const imgX = pageW - marginX - 58;
    const imgH = 80;
    if (hasImg) {
      try {
        doc.addImage(imgB64!, "JPEG", imgX, y - 2, 58, imgH, undefined, "FAST");
        doc.setDrawColor(...accent); doc.setLineWidth(0.3);
        doc.rect(imgX, y - 2, 58, imgH, "S");
      } catch { /* skip */ }
    }

    const textAreaW = hasImg ? contentW - 66 : contentW;
    const nameStartY = y + rankFontSize * 0.4;

    doc.setFontSize(17); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
    const wNameLines = doc.splitTextToSize(w.name || "Unknown", textAreaW);
    let ny = nameStartY;
    wNameLines.slice(0, 2).forEach((l: string) => { doc.text(l, marginX, ny); ny += 9; });

    if (w.distillery) {
      doc.setFontSize(8.5); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
      doc.text(w.distillery + (w.region ? ` · ${w.region}` : ""), marginX, ny); ny += 6;
    }
    const badges: string[] = [];
    if (w.age) badges.push(`${w.age}y`);
    if (w.abv) badges.push(`${w.abv}% ABV`);
    if (w.caskType) badges.push(w.caskType);
    if (badges.length > 0) {
      let bx = marginX;
      badges.forEach((b) => {
        const bw = doc.getTextWidth(b) + 8;
        if (bx + bw < marginX + textAreaW) {
          drawSurface(bx, ny - 4, bw, 7);
          doc.setFontSize(6.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
          doc.text(b, bx + 4, ny + 0.5);
          bx += bw + 4;
        }
      });
      ny += 10;
    }

    y = Math.max(ny, hasImg ? y + imgH + 6 : ny) + 4;

    if (w.avgOverall != null) {
      doc.setFillColor(...accent); doc.rect(marginX, y, contentW, 0.5, "F"); y += 6;

      doc.setFontSize(32); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
      doc.text(formatScore(w.avgOverall), marginX, y + 10);
      doc.setFontSize(8); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
      doc.text("Ø GESAMTSCORE", marginX + doc.getTextWidth(formatScore(w.avgOverall)) + 4, y + 10);
      y += 18;

      const scores: [string, number|null][] = [["Nose", w.avgNose], ["Taste", w.avgTaste], ["Finish", w.avgFinish]];
      const validScores = scores.filter(([, v]) => v != null);
      if (validScores.length > 0) {
        const boxW = 38, boxH = 18, gap = 6;
        validScores.forEach(([label, val], si) => {
          const bx = marginX + si * (boxW + gap);
          drawSurface(bx, y, boxW, boxH);
          doc.setFontSize(11); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
          doc.text(formatScore(val!), bx + boxW / 2, y + 8, { align: "center" });
          doc.setFontSize(6); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
          doc.text(label.toUpperCase(), bx + boxW / 2, y + 14, { align: "center" });
        });
        y += boxH + 8;
      }
    }

    doc.setDrawColor(...muted); doc.setLineWidth(0.15); doc.line(marginX, y, pageW - marginX, y); y += 8;

    const portraitText = whiskyPortraits?.[w.name];
    if (portraitText) {
      doc.setFontSize(7.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
      doc.text("WHISKY PORTRAIT", marginX, y); y += 5;
      y = drawNarrativeBlock(portraitText.slice(0, 200), y, 20) + 8;
    }

    const discoveryComment = discoveryTexts?.[w.name] || aiComments?.[w.name];
    if (discoveryComment) {
      doc.setFontSize(7.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
      doc.text("STORY", marginX, y); y += 5;
      y = drawNarrativeBlock(discoveryComment.slice(0, 220), y, 22) + 6;
    }

    if (w.ratings && w.ratings.length > 0) {
      const notesArr = w.ratings.filter((r: any) => r.notes?.trim()).slice(0, 3);
      if (notesArr.length > 0 && y < pageH - 40) {
        doc.setFontSize(7.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
        doc.text("TASTING NOTES", marginX, y); y += 5;
        for (const r of notesArr) {
          if (y > pageH - 28) break;
          const tasterName = tasters.find((t: any) => t.participantId === r.participantId)?.participant?.name || "";
          if (tasterName) {
            doc.setFontSize(6.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
            doc.text(stripGuestSuffix(tasterName).toUpperCase(), marginX, y); y += 4;
          }
          y = addTextWrapped(r.notes.slice(0, 180), marginX + 3, y, contentW - 6, 7.5, textColor) + 3;
        }
      }
    }

    drawFooter(`Platz ${i + 1} · ${(w.name || "?").slice(0, 30)}`);
  }

  // ===== PAGE: ACT V · BLIND-TASTING AUFLÖSUNG =====
  if (blindData.length > 0) {
    await progress("Akt V · Die Überraschung");
    doc.addPage(); drawBg(); drawHeader();
    y = 18;
    y = drawActLabel("AKT V", "Die Überraschung", y);

    doc.setFontSize(20); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
    doc.text("Blind-Tasting-Auflösung", pageW / 2, y, { align: "center" }); y += 10;

    if (blindNarration) {
      y = drawNarrativeBlock(blindNarration.slice(0, 220), y, 22) + 10;
    } else {
      doc.setFontSize(9); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
      doc.text("Wer hatte Recht? Wer lag daneben?", pageW / 2, y, { align: "center" }); y += 14;
    }

    for (const w of blindData.slice(0, 6)) {
      if (y > pageH - 40) break;
      const sorted = [...w.guesses].sort((a: any, b: any) => (a.delta ?? 99) - (b.delta ?? 99));
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      const rowH = worst && worst !== best ? 26 : 20;
      drawSurface(marginX, y, contentW, rowH);

      doc.setFontSize(8.5); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
      const abvLabel = w.guesses[0]?.actualAbv != null ? `  ·  ${w.guesses[0].actualAbv}% ABV` : "";
      doc.text((w.whiskyName || "Whisky").slice(0, 40) + abvLabel, marginX + 5, y + 7);

      if (best) {
        doc.setFontSize(7); doc.setTextColor(106, 176, 76); doc.setFont("helvetica", "normal");
        const bestTasterName = tasters.find((t: any) => t.participantId === best.participantId)?.participant?.name || "";
        const bestLabel = bestTasterName ? `${stripGuestSuffix(bestTasterName)}: ` : "";
        doc.text(`✓ Nächste Schätzung: ${bestLabel}${best.guessAbv}% (Δ ${best.delta?.toFixed(1)}%)`, marginX + 5, y + 13);
      }
      if (worst && worst !== best) {
        doc.setFontSize(7); doc.setTextColor(220, 80, 80); doc.setFont("helvetica", "normal");
        const worstTasterName = tasters.find((t: any) => t.participantId === worst.participantId)?.participant?.name || "";
        const worstLabel = worstTasterName ? `${stripGuestSuffix(worstTasterName)}: ` : "";
        doc.text(`✗ Weiteste Schätzung: ${worstLabel}${worst.guessAbv}% (Δ ${worst.delta?.toFixed(1)}%)`, marginX + 5, y + 19);
      }

      y += rowH + 5;
    }
    drawFooter("Die Überraschung");
  }

  // ===== PAGE: ACT VI · DER SIEGER =====
  if (winner) {
    await progress("Akt VI · Der Sieger");
    doc.addPage(); drawBg(); drawHeader();
    y = 18;
    y = drawActLabel("AKT VI", "Der Sieger", y);

    const winnerImg = whiskyImgB64s.get(winner.id);
    if (winnerImg) {
      try {
        const wImgW = 72, wImgH = 96;
        const wImgX = (pageW - wImgW) / 2;
        doc.addImage(winnerImg, "JPEG", wImgX, y, wImgW, wImgH, undefined, "FAST");
        doc.setDrawColor(...accent); doc.setLineWidth(0.5);
        doc.rect(wImgX, y, wImgW, wImgH, "S");
        y += wImgH + 10;
      } catch { /* skip */ }
    }

    const labelTxt = "DER SIEGER DES ABENDS";
    const labelW = doc.getTextWidth(labelTxt) + 14;
    doc.setFontSize(8); doc.setTextColor(...bg); doc.setFont("helvetica", "bold");
    doc.setFillColor(...accent); doc.roundedRect((pageW - labelW) / 2, y - 4, labelW, 8, 2, 2, "F");
    doc.text(labelTxt, pageW / 2, y + 1, { align: "center" }); y += 12;

    doc.setFontSize(24); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
    const winLines = doc.splitTextToSize(winner.name || "", contentW - 20);
    winLines.slice(0, 2).forEach((l: string) => { doc.text(l, pageW / 2, y, { align: "center" }); y += 11; });

    if (winner.distillery) {
      doc.setFontSize(10); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
      doc.text(winner.distillery, pageW / 2, y, { align: "center" }); y += 8;
    }

    if (winner.avgOverall != null) {
      doc.setFontSize(38); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
      doc.text(formatScore(winner.avgOverall), pageW / 2, y + 14, { align: "center" });
      doc.setFontSize(9); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
      doc.text("/ 100", pageW / 2 + doc.getTextWidth(formatScore(winner.avgOverall)) / 2 + 3, y + 14);
      y += 24;
    }

    const finalWinnerNarration = winnerStory || winnerNarration;
    if (finalWinnerNarration) {
      y += 4;
      doc.setDrawColor(...accent); doc.setLineWidth(0.3);
      doc.line(marginX + 15, y, pageW - marginX - 15, y); y += 8;
      y = drawNarrativeBlock(finalWinnerNarration.slice(0, 260), y, 32, marginX + 8, contentW - 16) + 6;
    }

    drawFooter("Der Sieger");
  }

  // ===== EVENT PHOTOS PAGES =====
  if (photoEntries.length > 0) {
    await progress("Event Fotos");
    doc.addPage(); drawBg(); drawHeader();
    y = 18;
    doc.setFontSize(7.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
    doc.text("EVENT FOTOS", pageW / 2, y, { align: "center" }); y += 10;

    const cols = 2, photoW = (contentW - 6) / cols, photoH = photoW * 0.65;
    let col = 0;
    for (let pi = 0; pi < photoEntries.length; pi++) {
      const b64 = eventPhotoB64s[pi];
      if (!b64) continue;
      const px = marginX + col * (photoW + 6);
      if (y + photoH > pageH - 22) {
        drawFooter("Event Fotos");
        await progress("Event Fotos");
        doc.addPage(); drawBg(); drawHeader(); y = 18;
        doc.setFontSize(7.5); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
        doc.text("EVENT FOTOS", pageW / 2, y, { align: "center" }); y += 10;
        col = 0;
      }
      try {
        doc.addImage(b64, "JPEG", px, y, photoW, photoH, undefined, "FAST");
        doc.setDrawColor(...accent); doc.setLineWidth(0.2); doc.rect(px, y, photoW, photoH, "S");
        const caption = photoEntries[pi].caption;
        if (caption) {
          doc.setFontSize(6.5); doc.setTextColor(...muted); doc.setFont("helvetica", "italic");
          doc.text(caption.slice(0, 38), px, y + photoH + 4);
        }
      } catch { /* skip broken image */ }
      col++;
      if (col >= cols) { col = 0; y += photoH + 14; }
    }
    if (col > 0) y += photoH + 14;
    drawFooter("Event Fotos");
  }

  // ===== PAGE: ACT VII · FINALE =====
  await progress("Akt VII · Finale");
  doc.addPage(); drawBg(); drawHeader();
  y = 18;

  const lastPhotoB64 = eventPhotoB64s.length > 0 ? eventPhotoB64s[eventPhotoB64s.length - 1] : null;
  if (lastPhotoB64) {
    try {
      doc.addImage(lastPhotoB64, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      doc.setFillColor(...bg);
      doc.setGState(doc.GState({ opacity: 0.78 }));
      doc.rect(0, 0, pageW, pageH, "F");
      doc.setGState(doc.GState({ opacity: 1 }));
      drawHeader();
    } catch { /* skip */ }
  }

  y = drawActLabel("AKT VII", "Das Bild des Abends", y);

  const collageWhiskies = (sortedRanking || []).slice(0, 6).filter((w: any) => whiskyImgB64s.get(w.id));
  if (collageWhiskies.length > 0) {
    const thumbW = 22, thumbH = 30;
    const totalThumbW = collageWhiskies.length * (thumbW + 4) - 4;
    const thumbStartX = (pageW - totalThumbW) / 2;
    collageWhiskies.forEach((w: any, idx: number) => {
      const b64 = whiskyImgB64s.get(w.id);
      if (!b64) return;
      const tx = thumbStartX + idx * (thumbW + 4);
      const opacity = 1 - idx * 0.1;
      try {
        if (opacity < 1) {
          doc.setGState(doc.GState({ opacity }));
        }
        doc.addImage(b64, "JPEG", tx, y, thumbW, thumbH, undefined, "FAST");
        doc.setGState(doc.GState({ opacity: 1 }));
        doc.setDrawColor(...accent); doc.setLineWidth(0.2); doc.rect(tx, y, thumbW, thumbH, "S");
      } catch { /* skip */ }
    });
    y += thumbH + 16;
  } else {
    y += 10;
  }

  doc.setFontSize(28); doc.setTextColor(...textColor); doc.setFont("helvetica", "bold");
  doc.text("Ein Abend.", pageW / 2, y, { align: "center" }); y += 13;
  doc.setFontSize(20); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
  doc.text("Unvergesslich.", pageW / 2, y, { align: "center" }); y += 16;

  doc.setFontSize(9.5); doc.setTextColor(...muted); doc.setFont("helvetica", "normal");
  const closingMeta = [tasting.date, tasting.location].filter(Boolean).join("  ·  ");
  if (closingMeta) { doc.text(closingMeta, pageW / 2, y, { align: "center" }); y += 12; }

  if (closingReflection) {
    y = drawNarrativeBlock(closingReflection.slice(0, 220), y, 24) + 8;
  }

  doc.setDrawColor(...accent); doc.setLineWidth(0.4); doc.line(marginX + 30, y, pageW - marginX - 30, y); y += 14;

  doc.setFontSize(7); doc.setTextColor(...accent); doc.setFont("helvetica", "bold");
  doc.text("VOLLSTÄNDIGES RANKING", pageW / 2, y, { align: "center" }); y += 7;
  (sortedRanking || []).forEach((w: any, i: number) => {
    if (y > pageH - 40) return;
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.setFontSize(8); doc.setTextColor(...(i < 3 ? accent : textColor));
    doc.text(`#${i + 1}  ${(w.name || "?").slice(0, 40)}`, marginX + 10, y);
    if (w.avgOverall != null) {
      doc.setFont("helvetica", "bold");
      doc.text(formatScore(w.avgOverall), pageW - marginX - 10, y, { align: "right" });
    }
    y += 5.5;
  });

  y += 10;
  const brandLabel = "CaskSense";
  const brandW = doc.getTextWidth(brandLabel) + 18;
  doc.setFillColor(...accent); doc.roundedRect((pageW - brandW) / 2, y, brandW, 9, 2, 2, "F");
  doc.setFontSize(8); doc.setTextColor(...bg); doc.setFont("helvetica", "bold");
  doc.text(brandLabel, pageW / 2, y + 6, { align: "center" });

  drawFooter("Finale");

  const safeName = (tasting.title || "story").replace(/[^a-zA-Z0-9]/g, "_");
  if (returnBase64) {
    const dataUri = doc.output("datauristring");
    return dataUri.split(",")[1];
  }
  await saveJsPdf(doc, `${safeName}_story.pdf`);
}
