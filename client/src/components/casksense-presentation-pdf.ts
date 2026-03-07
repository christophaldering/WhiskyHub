import jsPDF from "jspdf";

const BG = "#1a1714";
const CARD = "#242018";
const ACCENT = "#c8a97e";
const ACCENT_DIM = "#a8834a";
const ACCENT_FAINT = "#3d3428";
const TEXT = "#f5f0e8";
const MUTED = "#8a7e6d";
const MUTED_DIM = "#5a5347";
const BRONZE = "#8B6914";
const SILVER = "#9ca3af";

const F = "helvetica";

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function drawPageBg(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(...rgb(BG));
  doc.rect(0, 0, pw, ph, "F");
}

function drawGlow(doc: jsPDF, cx: number, cy: number, r: number) {
  for (let i = 3; i >= 0; i--) {
    const alpha = 0.04 + i * 0.02;
    const cr = r + i * r * 0.5;
    const c = Math.round(200 * alpha + 26 * (1 - alpha));
    const cg = Math.round(162 * alpha + 23 * (1 - alpha));
    const cb = Math.round(126 * alpha + 20 * (1 - alpha));
    doc.setFillColor(c, cg, cb);
    doc.circle(cx, cy, cr, "F");
  }
}

function drawAccentLine(doc: jsPDF, y: number, w: number) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.3);
  doc.line((pw - w) / 2, y, (pw + w) / 2, y);
}

function drawDottedLine(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, gap = 2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(len / gap);
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.3);
  for (let i = 0; i < steps; i += 2) {
    const sx = x1 + (dx / steps) * i;
    const sy = y1 + (dy / steps) * i;
    const ex = x1 + (dx / steps) * Math.min(i + 1, steps);
    const ey = y1 + (dy / steps) * Math.min(i + 1, steps);
    doc.line(sx, sy, ex, ey);
  }
}

function drawMiniRadar(doc: jsPDF, cx: number, cy: number, r: number, values: number[], fillColor = ACCENT, strokeColor = ACCENT) {
  const n = values.length;
  const angle = (2 * Math.PI) / n;

  for (let ring = 1; ring <= 3; ring++) {
    const rr = (r * ring) / 3;
    doc.setDrawColor(...rgb(ACCENT_FAINT));
    doc.setLineWidth(0.15);
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      pts.push([cx + rr * Math.cos(i * angle - Math.PI / 2), cy + rr * Math.sin(i * angle - Math.PI / 2)]);
    }
    for (let i = 0; i < n; i++) {
      doc.line(pts[i][0], pts[i][1], pts[(i + 1) % n][0], pts[(i + 1) % n][1]);
    }
  }

  for (let i = 0; i < n; i++) {
    doc.setDrawColor(...rgb(ACCENT_FAINT));
    doc.setLineWidth(0.1);
    doc.line(cx, cy, cx + r * Math.cos(i * angle - Math.PI / 2), cy + r * Math.sin(i * angle - Math.PI / 2));
  }

  const dataPts: [number, number][] = values.map((v, i) => {
    const vr = (v / 100) * r;
    return [cx + vr * Math.cos(i * angle - Math.PI / 2), cy + vr * Math.sin(i * angle - Math.PI / 2)];
  });

  const [fr, fg, fb] = rgb(fillColor);

  doc.setFillColor(fr, fg, fb);
  doc.setDrawColor(...rgb(strokeColor));
  doc.setLineWidth(0.5);
  doc.setGState(doc.GState({ opacity: 0.15 }));
  const triPts = dataPts.map(p => p as [number, number]);
  for (let i = 1; i < triPts.length - 1; i++) {
    doc.triangle(triPts[0][0], triPts[0][1], triPts[i][0], triPts[i][1], triPts[i + 1][0], triPts[i + 1][1], "F");
  }
  doc.setGState(doc.GState({ opacity: 1 }));

  doc.setDrawColor(...rgb(strokeColor));
  doc.setLineWidth(0.5);
  for (let i = 0; i < dataPts.length; i++) {
    doc.line(dataPts[i][0], dataPts[i][1], dataPts[(i + 1) % dataPts.length][0], dataPts[(i + 1) % dataPts.length][1]);
  }
  dataPts.forEach(([x, y]) => {
    doc.setFillColor(...rgb(strokeColor));
    doc.circle(x, y, 0.8, "F");
  });
}

function drawHBar(doc: jsPDF, x: number, y: number, w: number, h: number, pct: number, label?: string) {
  doc.setFillColor(...rgb(ACCENT_FAINT));
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  if (pct > 0) {
    doc.setFillColor(...rgb(ACCENT));
    doc.roundedRect(x, y, w * pct, h, h / 2, h / 2, "F");
  }
  if (label) {
    doc.setFont(F, "bold");
    doc.setFontSize(6);
    doc.setTextColor(...rgb(TEXT));
    doc.text(label, x - 2, y + h / 2 + 1.5, { align: "right" });
  }
}

function drawCircleNode(doc: jsPDF, cx: number, cy: number, r: number, filled: boolean, color = ACCENT) {
  if (filled) {
    doc.setFillColor(...rgb(color));
    doc.circle(cx, cy, r, "F");
  } else {
    doc.setDrawColor(...rgb(color));
    doc.setLineWidth(0.4);
    doc.circle(cx, cy, r, "S");
  }
}

function drawText(doc: jsPDF, text: string, x: number, y: number, size: number, color: string, style: "normal" | "bold" | "italic" = "normal", align: "left" | "center" | "right" = "left") {
  doc.setFont(F, style);
  doc.setFontSize(size);
  doc.setTextColor(...rgb(color));
  doc.text(text, x, y, { align });
}

function drawFeatureRight(doc: jsPDF, x: number, y: number, title: string, desc: string, eyecatcher: string) {
  drawText(doc, title, x, y + 8, 14, TEXT, "bold");
  doc.setFont(F, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...rgb(MUTED));
  const lines = doc.splitTextToSize(desc, 125);
  doc.text(lines, x, y + 16, { lineHeightFactor: 1.5 });
  const descH = lines.length * 4.5;
  doc.setFont(F, "italic");
  doc.setFontSize(10);
  doc.setTextColor(...rgb(ACCENT));
  doc.text(`"${eyecatcher}"`, x, y + 18 + descH + 4);
}

function drawFeatureSeparator(doc: jsPDF, y: number) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...rgb(ACCENT_FAINT));
  doc.setLineWidth(0.15);
  doc.line(24, y, pw - 24, y);
}

function drawChapterDivider(doc: jsPDF, letter: string, title: string, subtitle: string, count: string) {
  doc.addPage();
  drawPageBg(doc);
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  drawGlow(doc, pw / 2, ph / 2 - 10, 30);

  drawText(doc, letter, pw / 2, ph / 2 - 28, 48, ACCENT_FAINT, "bold", "center");
  drawText(doc, title, pw / 2, ph / 2, 32, TEXT, "bold", "center");
  drawAccentLine(doc, ph / 2 + 8, 50);
  drawText(doc, subtitle, pw / 2, ph / 2 + 20, 12, MUTED, "italic", "center");
  drawText(doc, count, pw / 2, ph / 2 + 32, 10, ACCENT_DIM, "normal", "center");
}

function newFeaturePage(doc: jsPDF) {
  doc.addPage();
  drawPageBg(doc);
}

const VIS_X = 24;
const VIS_W = 108;
const TEXT_X = 148;
const ROW_H = 55;

function rowY(index: number): number {
  return 14 + index * ROW_H;
}


// ─────────────────────────────────────────────
// COVER
// ─────────────────────────────────────────────

function drawCover(doc: jsPDF) {
  drawPageBg(doc);
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  drawGlow(doc, pw / 2, ph / 2 - 8, 45);

  drawText(doc, "WHISKY TASTING PLATFORM", pw / 2, ph / 2 - 36, 11, ACCENT_DIM, "bold", "center");
  drawText(doc, "CaskSense", pw / 2, ph / 2 - 10, 52, TEXT, "bold", "center");
  drawAccentLine(doc, ph / 2, 60);
  drawText(doc, "Where tasting becomes reflection.", pw / 2, ph / 2 + 16, 16, MUTED, "italic", "center");
  drawText(doc, "Complete Feature Overview  ·  42+ Features  ·  5 Categories", pw / 2, ph / 2 + 32, 10, ACCENT_DIM, "normal", "center");
  drawText(doc, "casksense.com", pw / 2, ph - 16, 8, MUTED, "normal", "center");
}

// ─────────────────────────────────────────────
// INTRO PAGE
// ─────────────────────────────────────────────

function drawIntro(doc: jsPDF) {
  doc.addPage();
  drawPageBg(doc);
  const pw = doc.internal.pageSize.getWidth();

  drawText(doc, "What is CaskSense?", pw / 2, 30, 28, TEXT, "bold", "center");
  drawAccentLine(doc, 38, 40);

  doc.setFont(F, "normal");
  doc.setFontSize(11);
  doc.setTextColor(...rgb(MUTED));
  const intro = "A platform for structured whisky tastings. Blind flights, live ratings, a multi-act reveal show — and a personal taste profile that grows with every dram. All in one app.";
  const il = doc.splitTextToSize(intro, pw - 80);
  doc.text(il, pw / 2, 50, { align: "center", maxWidth: pw - 80 });

  const steps = [
    { num: "01", title: "Gather", icon: "QR" },
    { num: "02", title: "Pour", icon: "?" },
    { num: "03", title: "Reflect", icon: "*" },
    { num: "04", title: "Reveal", icon: "!" },
    { num: "05", title: "Discover", icon: "W" },
  ];

  const y = 90;
  const stepW = (pw - 60) / 5;

  steps.forEach((s, i) => {
    const cx = 30 + i * stepW + stepW / 2;

    drawGlow(doc, cx, y + 18, 14);

    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(cx - stepW / 2 + 6, y, stepW - 12, 60, 5, 5, "F");

    drawCircleNode(doc, cx, y + 18, 10, false, ACCENT);
    drawText(doc, s.icon, cx, y + 21, 12, ACCENT, "bold", "center");
    drawText(doc, s.num, cx, y + 36, 8, ACCENT_DIM, "bold", "center");
    drawText(doc, s.title, cx, y + 46, 16, TEXT, "bold", "center");

    if (i < steps.length - 1) {
      doc.setDrawColor(...rgb(ACCENT));
      doc.setLineWidth(0.3);
      const arrowX = cx + stepW / 2 - 6;
      doc.line(arrowX - 4, y + 18, arrowX + 4, y + 18);
      doc.line(arrowX + 2, y + 16, arrowX + 4, y + 18);
      doc.line(arrowX + 2, y + 20, arrowX + 4, y + 18);
    }
  });

  drawText(doc, "Every CaskSense tasting follows the same elegant flow.", pw / 2, y + 74, 10, MUTED, "italic", "center");
}


// ─────────────────────────────────────────────
// A. TASTING ENGINE (15 features)
// ─────────────────────────────────────────────

function drawTastingEngineFeatures(doc: jsPDF) {
  drawChapterDivider(doc, "A", "The Tasting Engine", "Everything you need to run a structured whisky tasting", "15 features");

  // ─── Page: Features 1–3 ───
  newFeaturePage(doc);

  // 1. Tasting Setup
  let y = rowY(0);
  let cx = VIS_X + VIS_W / 2;
  let cy = y + ROW_H / 2;
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx - 38, cy - 18, 76, 36, 4, 4, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.roundedRect(cx - 38, cy - 18, 76, 36, 4, 4, "S");
  const fields = [{ l: "Title", w: 50 }, { l: "Date", w: 30 }, { l: "Location", w: 40 }];
  fields.forEach((f, i) => {
    const fy = cy - 12 + i * 10;
    drawText(doc, f.l, cx - 32, fy + 3, 6, MUTED_DIM, "normal");
    doc.setFillColor(...rgb(ACCENT_FAINT));
    doc.roundedRect(cx - 32 + 20, fy - 1, f.w, 5, 1, 1, "F");
  });
  drawCircleNode(doc, cx + 30, cy - 12, 3, true, ACCENT);
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.3);
  doc.line(cx + 30, cy - 9, cx + 30, cy - 4);
  doc.line(cx + 28, cy - 4, cx + 32, cy - 4);
  doc.line(cx + 27, cy - 4, cx + 33, cy - 2);
  drawFeatureRight(doc, TEXT_X, y, "Tasting Setup", "Create a tasting with title, date, location, and description. Configure everything before inviting anyone.", "Set the stage.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 2. Rating Scales
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const scales = [
    { label: "5", ticks: 5, w: 20 },
    { label: "10", ticks: 10, w: 35 },
    { label: "20", ticks: 20, w: 55 },
    { label: "100", ticks: 10, w: 75 },
  ];
  scales.forEach((s, i) => {
    const sy = cy - 14 + i * 8;
    const sx = cx - 40;
    drawText(doc, s.label, sx - 2, sy + 2, 7, i === 3 ? ACCENT : MUTED_DIM, "bold", "right");
    doc.setFillColor(...rgb(ACCENT_FAINT));
    doc.roundedRect(sx, sy - 1.5, s.w, 3, 1.5, 1.5, "F");
    const fillW = s.w * (i === 3 ? 0.78 : 0.6 + i * 0.05);
    doc.setFillColor(...rgb(i === 3 ? ACCENT : ACCENT_DIM));
    doc.roundedRect(sx, sy - 1.5, fillW, 3, 1.5, 1.5, "F");
    doc.setFillColor(...rgb(TEXT));
    doc.circle(sx + fillW, sy, 2, "F");
  });
  drawFeatureRight(doc, TEXT_X, y, "Rating Scales", "Choose from 5, 10, 20, or 100-point professional scales. Every group rates at the precision they prefer.", "Precision, your way.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 3. Guided Mode
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const glassPositions = [-32, -16, 0, 16, 32];
  doc.setDrawColor(...rgb(ACCENT_FAINT));
  doc.setLineWidth(0.4);
  doc.line(cx - 36, cy, cx + 36, cy);
  glassPositions.forEach((gx, i) => {
    const isActive = i === 2;
    if (isActive) drawGlow(doc, cx + gx, cy, 6);
    drawCircleNode(doc, cx + gx, cy, 4, isActive, isActive ? ACCENT : ACCENT_FAINT);
    if (isActive) {
      doc.setDrawColor(...rgb(ACCENT));
      doc.setLineWidth(0.5);
      doc.line(cx + gx - 6, cy - 10, cx + gx, cy - 6);
      doc.line(cx + gx + 6, cy - 10, cx + gx, cy - 6);
    }
  });
  drawFeatureRight(doc, TEXT_X, y, "Guided Mode", "Everyone moves to the next dram together. The pace is synchronized in real time — no one falls behind.", "One pace. One moment.");

  // ─── Page: Features 4–6 ───
  newFeaturePage(doc);

  // 4. Session Modes
  y = rowY(0);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const laneY = [cy - 14, cy, cy + 14];
  const labels = ["Flow", "Focus", "Journal"];
  doc.setFillColor(...rgb(ACCENT));
  doc.circle(cx - 35, cy, 2, "F");
  laneY.forEach((ly, i) => {
    doc.setDrawColor(...rgb(ACCENT_FAINT));
    doc.setLineWidth(0.3);
    doc.line(cx - 30, ly, cx + 35, ly);
    drawText(doc, labels[i], cx + 38, ly + 2, 7, ACCENT, "bold");
    if (i === 0) {
      [0, 12, 24, 36, 48].forEach((dx, j) => {
        const zigY = ly + (j % 2 === 0 ? -2 : 2);
        doc.setDrawColor(...rgb(ACCENT));
        doc.setLineWidth(0.4);
        if (j > 0) doc.line(cx - 30 + dx - 12, ly + ((j - 1) % 2 === 0 ? -2 : 2), cx - 30 + dx, zigY);
      });
    } else if (i === 1) {
      drawGlow(doc, cx, ly, 6);
      doc.setFillColor(...rgb(ACCENT));
      doc.circle(cx, ly, 3, "F");
    } else {
      for (let ln = 0; ln < 4; ln++) {
        doc.setDrawColor(...rgb(ACCENT_DIM));
        doc.setLineWidth(0.2);
        doc.line(cx - 20 + ln * 14, ly - 1, cx - 14 + ln * 14, ly - 1);
      }
    }
  });
  drawFeatureRight(doc, TEXT_X, y, "Session Modes", "Three ways to experience a tasting: free Flow navigation, locked Focus on one dram, or guided Journal note-taking.", "Flow. Focus. Journal.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 5. QR Code & Join Code
  y = rowY(1);
  cx = VIS_X + VIS_W / 2 - 16;
  cy = y + ROW_H / 2;
  const qrSize = 24;
  const cellSize = qrSize / 7;
  const qrPattern = [
    [1, 1, 1, 0, 1, 1, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 1, 1, 0, 1, 1, 1],
    [0, 0, 0, 1, 0, 0, 0],
    [1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 1, 0, 1, 0],
    [1, 1, 1, 0, 1, 1, 1],
  ];
  qrPattern.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      doc.setFillColor(...rgb(cell ? ACCENT : ACCENT_FAINT));
      doc.rect(cx - qrSize / 2 + ci * cellSize, cy - qrSize / 2 + ri * cellSize, cellSize - 0.3, cellSize - 0.3, "F");
    });
  });
  const codeX = cx + 28;
  const code = "X7K2M9";
  code.split("").forEach((ch, i) => {
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(codeX + i * 9, cy - 6, 8, 12, 2, 2, "F");
    doc.setDrawColor(...rgb(ACCENT));
    doc.setLineWidth(0.3);
    doc.roundedRect(codeX + i * 9, cy - 6, 8, 12, 2, 2, "S");
    drawText(doc, ch, codeX + i * 9 + 4, cy + 2, 10, TEXT, "bold", "center");
  });
  drawFeatureRight(doc, TEXT_X, y, "QR Code & Join Code", "Guests join instantly via QR scan or 6-digit code. No app download. No account required.", "Scan or type. Instantly in.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 6. Blind Mode — 4 cards with progressive reveal
  y = rowY(2);
  cx = VIS_X + 12;
  cy = y + ROW_H / 2;
  const cardW = 22;
  const cardH = 28;
  const cardData = [
    { label: "?", sub: "", stage: "Blind" },
    { label: "45.8%", sub: "", stage: "ABV" },
    { label: "10 Yrs", sub: "", stage: "Age" },
    { label: "", sub: "", stage: "Name" },
  ];
  cardData.forEach((cd, i) => {
    const cardX = cx + i * (cardW + 5);
    const borderColor = i === 3 ? ACCENT : ACCENT_DIM;
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(cardX, cy - cardH / 2, cardW, cardH, 3, 3, "F");
    doc.setDrawColor(...rgb(borderColor));
    doc.setLineWidth(i === 3 ? 0.6 : 0.3);
    doc.roundedRect(cardX, cy - cardH / 2, cardW, cardH, 3, 3, "S");
    if (i === 3) {
      for (let ln = 0; ln < 4; ln++) {
        doc.setFillColor(...rgb(ACCENT));
        doc.roundedRect(cardX + 4, cy - 8 + ln * 5, cardW - 8 - (ln === 3 ? 4 : 0), 2, 1, 1, "F");
      }
    } else {
      drawText(doc, cd.label, cardX + cardW / 2, cy + (cd.sub ? -2 : 2), 8, TEXT, "bold", "center");
    }
    if (cd.sub) drawText(doc, cd.sub, cardX + cardW / 2, cy + 4, 6, MUTED, "normal", "center");
    drawText(doc, cd.stage, cardX + cardW / 2, cy + cardH / 2 + 5, 5, MUTED_DIM, "normal", "center");
    if (i < 3) {
      doc.setDrawColor(...rgb(ACCENT));
      doc.setLineWidth(0.3);
      const ax = cardX + cardW + 1.5;
      doc.line(ax, cy, ax + 2.5, cy);
      doc.line(ax + 1.5, cy - 1, ax + 2.5, cy);
      doc.line(ax + 1.5, cy + 1, ax + 2.5, cy);
    }
  });
  drawFeatureRight(doc, TEXT_X, y, "Blind Mode", "Four-stage reveal: only the dram number, then ABV, then age, then the full name. Bias eliminated.", "Mystery, unveiled in acts.");

  // ─── Page: Features 7–9 ───
  newFeaturePage(doc);

  // 7. Live Rating
  y = rowY(0);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2 - 4;
  const ratingBars = [
    { l: "N", pct: 0.82 }, { l: "T", pct: 0.88 },
    { l: "F", pct: 0.72 }, { l: "B", pct: 0.80 }, { l: "O", pct: 0.85 },
  ];
  ratingBars.forEach((b, i) => {
    drawHBar(doc, cx - 28, cy - 12 + i * 6, 56, 3.5, b.pct, b.l);
  });
  const chipLabels = ["Honey", "Peat", "Oak", "Citrus"];
  chipLabels.forEach((cl, i) => {
    const chipX = cx - 28 + i * 21;
    const chipY = cy + 22;
    doc.setFillColor(...rgb(ACCENT_FAINT));
    doc.roundedRect(chipX, chipY, 19, 6, 3, 3, "F");
    drawText(doc, cl, chipX + 9.5, chipY + 4.2, 5, ACCENT, "normal", "center");
  });
  drawFeatureRight(doc, TEXT_X, y, "Live Rating System", "Rate nose, taste, finish, balance, and overall. Select flavor chips. Dictate voice notes. All captured live.", "Every sense, captured live.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 8. Voice-to-Text
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  doc.setFillColor(...rgb(ACCENT));
  doc.circle(cx - 30, cy - 2, 4, "F");
  doc.setFillColor(...rgb(ACCENT));
  doc.roundedRect(cx - 33, cy + 2, 6, 6, 0, 0, "F");
  doc.roundedRect(cx - 35, cy + 8, 10, 2, 1, 1, "F");
  const waveAmps = [3, 6, 9, 7, 10, 6, 8, 5, 3, 7, 9, 4];
  waveAmps.forEach((a, i) => {
    const wx = cx - 18 + i * 4;
    doc.setDrawColor(...rgb(ACCENT));
    doc.setLineWidth(1.2);
    doc.line(wx, cy - a / 2, wx, cy + a / 2);
  });
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.3);
  doc.line(cx + 32, cy - 4, cx + 38, cy);
  doc.line(cx + 32, cy + 4, cx + 38, cy);
  for (let ln = 0; ln < 3; ln++) {
    doc.setFillColor(...rgb(ln === 0 ? TEXT : MUTED));
    doc.roundedRect(cx + 40, cy - 4 + ln * 5, 16 - ln * 3, 2, 1, 1, "F");
  }
  drawFeatureRight(doc, TEXT_X, y, "Voice-to-Text Notes", "Dictate your tasting impressions hands-free. Speech recognition transforms your words into written notes instantly.", "Speak. Notes appear.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 9. Discussion Panel
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  doc.setFillColor(...rgb(CARD));
  doc.circle(cx, cy, 8, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.circle(cx, cy, 8, "S");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.5);
  doc.line(cx - 3, cy - 2, cx - 2, cy + 4);
  doc.line(cx + 3, cy - 2, cx + 2, cy + 4);
  doc.line(cx - 2, cy + 4, cx + 2, cy + 4);
  doc.line(cx - 3, cy - 2, cx + 3, cy - 2);
  const bubbleData = [
    { bx: cx - 28, by: cy - 10, w: 22, h: 8, text: "Smoky!" },
    { bx: cx + 10, by: cy - 14, w: 18, h: 8, text: "Sweet?" },
    { bx: cx - 22, by: cy + 10, w: 24, h: 8, text: "Sherry!" },
    { bx: cx + 14, by: cy + 8, w: 16, h: 8, text: "Oak." },
  ];
  bubbleData.forEach((b) => {
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(b.bx, b.by, b.w, b.h, 3, 3, "F");
    doc.setDrawColor(...rgb(ACCENT_DIM));
    doc.setLineWidth(0.25);
    doc.roundedRect(b.bx, b.by, b.w, b.h, 3, 3, "S");
    drawText(doc, b.text, b.bx + b.w / 2, b.by + 5.5, 6, TEXT, "normal", "center");
    drawDottedLine(doc, b.bx + b.w / 2, b.by + (b.by < cy ? b.h : 0), cx + (b.bx < cx ? -8 : 8), cy + (b.by < cy ? -6 : 6));
  });
  drawFeatureRight(doc, TEXT_X, y, "Discussion Panel", "Live chat during the session. Share your impressions, debate flavors, and react to the reveal together.", "Debate in real time.");

  // ─── Page: Features 10–12 ───
  newFeaturePage(doc);

  // 10. Multi-Act Reveal
  y = rowY(0);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const acts = [
    { label: "I", icon: "S", sub: "Stats" },
    { label: "II", icon: "C", sub: "Consensus" },
    { label: "III", icon: "T", sub: "Technical" },
    { label: "IV", icon: "R", sub: "Ranking" },
  ];
  acts.forEach((act, i) => {
    const ax = cx - 36 + i * 22;
    const isLast = i === 3;
    if (isLast) drawGlow(doc, ax, cy - 4, 8);
    drawCircleNode(doc, ax, cy - 4, isLast ? 9 : 7, isLast, isLast ? ACCENT : ACCENT_FAINT);
    drawText(doc, act.icon, ax, cy - 1, isLast ? 9 : 7, isLast ? BG : ACCENT_DIM, "normal", "center");
    drawText(doc, `Act ${act.label}`, ax, cy + 10, 6, isLast ? ACCENT : MUTED_DIM, "bold", "center");
    drawText(doc, act.sub, ax, cy + 16, 5, MUTED_DIM, "normal", "center");
    if (i < 3) {
      doc.setDrawColor(...rgb(ACCENT_FAINT));
      doc.setLineWidth(0.2);
      doc.line(ax + 8, cy - 4, ax + 13, cy - 4);
    }
  });
  drawFeatureRight(doc, TEXT_X, y, "Multi-Act Reveal Show", "The reveal is a 4-act show: participation stats, group consensus, technical details, then the final ranking.", "A reveal like a finale.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 11. Results & Export
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const podiumData = [
    { h: 22, x: cx - 22, rank: "2", color: SILVER },
    { h: 30, x: cx - 8, rank: "1", color: ACCENT },
    { h: 16, x: cx + 6, rank: "3", color: BRONZE },
  ];
  podiumData.forEach((p) => {
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(p.x, cy + 10 - p.h, 12, p.h, 2, 2, "F");
    doc.setDrawColor(...rgb(p.color));
    doc.setLineWidth(0.5);
    doc.roundedRect(p.x, cy + 10 - p.h, 12, p.h, 2, 2, "S");
    doc.setFillColor(...rgb(p.color));
    doc.circle(p.x + 6, cy + 10 - p.h - 4, 3.5, "F");
    drawText(doc, p.rank, p.x + 6, cy + 10 - p.h - 2.5, 6, BG, "bold", "center");
  });
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.3);
  doc.line(cx + 24, cy, cx + 30, cy - 4);
  doc.line(cx + 24, cy, cx + 30, cy);
  doc.line(cx + 24, cy, cx + 30, cy + 4);
  const exports = ["PDF", "XLS", "CSV"];
  exports.forEach((e, i) => {
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(cx + 32, cy - 8 + i * 8, 14, 6, 1, 1, "F");
    drawText(doc, e, cx + 39, cy - 4 + i * 8, 5, ACCENT_DIM, "bold", "center");
  });
  drawFeatureRight(doc, TEXT_X, y, "Results & Export", "Full results with gold, silver, and bronze medals. Export everything as PDF, Excel, or CSV.", "Celebrate, then share.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 12. Flight Board
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const letters = ["A", "B", "C", "D", "E", "F"];
  const activeSlots = [0, 2, 5];
  letters.forEach((l, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const sx = cx - 32 + col * 22;
    const sy = cy - 14 + row * 18;
    const isActive = activeSlots.includes(i);
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(sx, sy, 18, 14, 3, 3, "F");
    if (isActive) {
      doc.setDrawColor(...rgb(ACCENT));
      doc.setLineWidth(0.5);
      doc.roundedRect(sx, sy, 18, 14, 3, 3, "S");
    }
    drawText(doc, isActive ? l : "?", sx + 9, sy + 9, 10, isActive ? ACCENT : MUTED_DIM, "bold", "center");
  });
  drawFeatureRight(doc, TEXT_X, y, "Flight Board", "Visual overview of the entire lineup. See which drams are blind, which are revealed, and navigate with a tap.", "See the whole flight.");

  // ─── Page: Features 13–15 ───
  newFeaturePage(doc);

  // 13. Printable Templates
  y = rowY(0);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const sheets = [
    { dx: -8, dy: -4, rot: -5 },
    { dx: 0, dy: 0, rot: 0 },
    { dx: 8, dy: 4, rot: 5 },
  ];
  sheets.forEach((sh, i) => {
    const sx = cx + sh.dx - 16;
    const sy = cy + sh.dy - 14;
    doc.setFillColor(...rgb(i === 1 ? CARD : BG));
    doc.roundedRect(sx, sy, 32, 28, 2, 2, "F");
    doc.setDrawColor(...rgb(i === 1 ? ACCENT : ACCENT_DIM));
    doc.setLineWidth(0.3);
    doc.roundedRect(sx, sy, 32, 28, 2, 2, "S");
    if (i === 0) {
      for (let g = 0; g < 3; g++) for (let gc = 0; gc < 3; gc++) {
        doc.setFillColor(...rgb(ACCENT_FAINT));
        doc.rect(sx + 3 + gc * 9, sy + 4 + g * 8, 7, 6, "F");
      }
    } else if (i === 1) {
      for (let ln = 0; ln < 5; ln++) {
        doc.setDrawColor(...rgb(ACCENT_FAINT));
        doc.setLineWidth(0.15);
        doc.line(sx + 4, sy + 6 + ln * 4.5, sx + 28, sy + 6 + ln * 4.5);
      }
    } else {
      doc.setDrawColor(...rgb(ACCENT_DIM));
      doc.setLineWidth(0.3);
      doc.roundedRect(sx + 4, sy + 3, 24, 14, 1, 1, "S");
      drawText(doc, "MENU", sx + 16, sy + 12, 6, ACCENT_DIM, "bold", "center");
    }
  });
  drawFeatureRight(doc, TEXT_X, y, "Printable Templates", "Generate tasting sheets, tasting mats, and AI-designed menu cards with custom cover images. Ready to print.", "Print the ritual.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 14. Solo Dram Logger
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  drawGlow(doc, cx, cy, 16);
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.5);
  const glassTop = cy - 6;
  const glassBot = cy + 10;
  doc.line(cx - 8, glassTop, cx - 5, glassBot);
  doc.line(cx + 8, glassTop, cx + 5, glassBot);
  doc.line(cx - 5, glassBot, cx + 5, glassBot);
  doc.line(cx - 8, glassTop, cx + 8, glassTop);
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.3);
  const moonCx = cx + 24;
  const moonCy = cy - 10;
  for (let a = 0; a < 180; a += 10) {
    const rad = a * Math.PI / 180;
    const rad2 = (a + 10) * Math.PI / 180;
    doc.line(moonCx + 6 * Math.cos(rad), moonCy - 6 * Math.sin(rad), moonCx + 6 * Math.cos(rad2), moonCy - 6 * Math.sin(rad2));
  }
  const stars = [[cx + 16, cy - 16], [cx + 30, cy - 14], [cx - 20, cy - 14], [cx + 20, cy - 8]];
  stars.forEach(([sx, sy]) => {
    doc.setFillColor(...rgb(ACCENT_DIM));
    doc.circle(sx, sy, 0.6, "F");
  });
  doc.setFillColor(...rgb(ACCENT));
  doc.circle(cx + 14, cy + 4, 2.5, "F");
  doc.setDrawColor(...rgb(BG));
  doc.setLineWidth(0.6);
  doc.line(cx + 12.5, cy + 4.5, cx + 14, cy + 6);
  doc.line(cx + 14, cy + 6, cx + 15.5, cy + 3.5);
  drawFeatureRight(doc, TEXT_X, y, "Solo Dram Logger", "Rate whiskies outside of group sessions. For quiet evenings with a single dram — every note captured.", "Your private dram diary.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 15. Guest Mode
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const badgeW = 34;
  const badgeH = 24;
  [{ x: cx - 20, name: "Chris", type: "Standard", filled: true }, { x: cx + 20, name: "?", type: "Ultra Naked", filled: false }].forEach((badge) => {
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(badge.x - badgeW / 2, cy - badgeH / 2, badgeW, badgeH, 3, 3, "F");
    doc.setDrawColor(...rgb(badge.filled ? ACCENT : ACCENT_FAINT));
    doc.setLineWidth(badge.filled ? 0.5 : 0.3);
    doc.roundedRect(badge.x - badgeW / 2, cy - badgeH / 2, badgeW, badgeH, 3, 3, "S");
    if (badge.filled) {
      doc.setFillColor(...rgb(ACCENT));
      doc.circle(badge.x, cy - 4, 4, "F");
    } else {
      drawDottedLine(doc, badge.x - 4, cy - 8, badge.x + 4, cy - 8);
      drawDottedLine(doc, badge.x, cy - 8, badge.x, cy);
      doc.setDrawColor(...rgb(ACCENT_FAINT));
      doc.setLineWidth(0.3);
      doc.circle(badge.x, cy - 4, 4, "S");
    }
    drawText(doc, badge.name, badge.x, cy + 6, badge.filled ? 8 : 10, badge.filled ? TEXT : MUTED_DIM, "bold", "center");
    drawText(doc, badge.type, badge.x, cy + badgeH / 2 + 5, 5, MUTED_DIM, "normal", "center");
  });
  drawFeatureRight(doc, TEXT_X, y, "Guest Mode", "Standard Naked keeps a persisted identity. Ultra Naked is fully ephemeral — zero trace after the session.", "Choose your visibility.");
}


// ─────────────────────────────────────────────
// B. PERSONAL ANALYSIS (9 features)
// ─────────────────────────────────────────────

function drawPersonalAnalysisFeatures(doc: jsPDF) {
  drawChapterDivider(doc, "B", "Personal Taste Analysis", "9 features that learn your palate", "9 features");

  // ─── Page: Features 16–18 ───
  newFeaturePage(doc);

  // 16. Flavor Radar
  let y = rowY(0);
  let cx = VIS_X + VIS_W / 2;
  let cy = y + ROW_H / 2;
  drawGlow(doc, cx, cy, 18);
  drawMiniRadar(doc, cx, cy, 18, [82, 88, 72, 80, 85]);
  const axes = ["N", "T", "F", "B", "O"];
  const angleStep = (2 * Math.PI) / 5;
  axes.forEach((a, i) => {
    const ax = cx + 22 * Math.cos(i * angleStep - Math.PI / 2);
    const ay = cy + 22 * Math.sin(i * angleStep - Math.PI / 2);
    drawText(doc, a, ax, ay + 2, 6, MUTED, "bold", "center");
  });
  drawFeatureRight(doc, TEXT_X, y, "Flavor Profile Radar", "Interactive radar chart mapping your averages across nose, taste, finish, balance, and overall. Your palate, visualized.", "Shape your palate.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 17. Profile Comparison
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  drawMiniRadar(doc, cx, cy, 16, [60, 70, 55, 65, 60], MUTED_DIM, MUTED_DIM);
  drawMiniRadar(doc, cx, cy, 16, [82, 88, 72, 80, 85]);
  doc.setFillColor(...rgb(ACCENT));
  doc.circle(cx + 26, cy - 6, 2, "F");
  drawText(doc, "You", cx + 32, cy - 4, 6, ACCENT, "normal");
  doc.setFillColor(...rgb(MUTED_DIM));
  doc.circle(cx + 26, cy + 2, 2, "F");
  drawText(doc, "Friends", cx + 32, cy + 4, 6, MUTED_DIM, "normal");
  drawFeatureRight(doc, TEXT_X, y, "Profile Comparison", "Overlay your radar against friends or the global community. See exactly where your palate diverges.", "You vs. everyone.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 18. Taste Evolution
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const trendPts = [
    { x: cx - 38, y: cy + 8 },
    { x: cx - 24, y: cy + 2 },
    { x: cx - 10, y: cy + 6 },
    { x: cx + 4, y: cy - 2 },
    { x: cx + 18, y: cy - 6 },
    { x: cx + 32, y: cy - 10 },
  ];
  doc.setDrawColor(...rgb(ACCENT_FAINT));
  doc.setLineWidth(0.15);
  doc.line(cx - 40, cy + 14, cx + 36, cy + 14);
  for (let g = 0; g < 4; g++) {
    doc.line(cx - 40, cy + 14 - g * 7, cx + 36, cy + 14 - g * 7);
  }
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.8);
  for (let i = 0; i < trendPts.length - 1; i++) {
    doc.line(trendPts[i].x, trendPts[i].y, trendPts[i + 1].x, trendPts[i + 1].y);
  }
  trendPts.forEach((p) => {
    doc.setFillColor(...rgb(ACCENT));
    doc.circle(p.x, p.y, 1.2, "F");
  });
  const months = ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
  months.forEach((m, i) => {
    drawText(doc, m, trendPts[i].x, cy + 18, 4, MUTED_DIM, "normal", "center");
  });
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.line(cx + 34, cy - 10, cx + 38, cy - 14);
  doc.line(cx + 36, cy - 10, cx + 38, cy - 14);
  doc.line(cx + 38, cy - 12, cx + 38, cy - 14);
  drawFeatureRight(doc, TEXT_X, y, "Taste Evolution", "A trend line showing how your average ratings develop over months. See if your palate is rising, stable, or shifting.", "Taste evolves over time.");

  // ─── Page: Features 19–21 ───
  newFeaturePage(doc);

  // 19. Consistency Score
  y = rowY(0);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  [18, 12, 6].forEach((r) => {
    doc.setDrawColor(...rgb(r === 6 ? ACCENT : ACCENT_FAINT));
    doc.setLineWidth(0.3);
    doc.circle(cx, cy, r, "S");
  });
  const dotOffsets = [
    [-1.5, -2], [0.5, -1], [-0.8, 0.8], [1.2, -0.5], [-0.3, 1.5],
    [0.8, 0.3], [-1, -0.3], [1.5, 1],
  ];
  dotOffsets.forEach(([dx, dy]) => {
    doc.setFillColor(...rgb(ACCENT));
    doc.circle(cx + dx * 1.8, cy + dy * 1.8, 0.8, "F");
  });
  drawText(doc, "92%", cx + 24, cy + 2, 14, ACCENT, "bold", "center");
  drawText(doc, "Stability", cx + 24, cy + 7, 6, MUTED, "normal", "center");
  drawFeatureRight(doc, TEXT_X, y, "Consistency Score", "Measures your scoring stability: standard deviation, range, spread. Are you a predictable or nuanced rater?", "How steady is your palate?");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 20. Palate DNA
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const helixNodes = 8;
  for (let i = 0; i < helixNodes; i++) {
    const ny = cy - 18 + i * 5;
    const offset = Math.sin(i * 0.8) * 10;
    const leftX = cx - offset;
    const rightX = cx + offset;
    doc.setFillColor(...rgb(i % 2 === 0 ? ACCENT : ACCENT_DIM));
    doc.circle(leftX, ny, 2, "F");
    doc.setFillColor(...rgb(i % 2 === 0 ? ACCENT_DIM : ACCENT));
    doc.circle(rightX, ny, 2, "F");
    doc.setDrawColor(...rgb(ACCENT_FAINT));
    doc.setLineWidth(0.2);
    doc.line(leftX, ny, rightX, ny);
    if (i > 0) {
      const prevY = cy - 18 + (i - 1) * 5;
      const prevOff = Math.sin((i - 1) * 0.8) * 10;
      doc.setDrawColor(...rgb(ACCENT_FAINT));
      doc.line(cx - prevOff, prevY, leftX, ny);
      doc.line(cx + prevOff, prevY, rightX, ny);
    }
  }
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx - 18, cy - 4, 36, 8, 3, 3, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.roundedRect(cx - 18, cy - 4, 36, 8, 3, 3, "S");
  drawText(doc, "Peated · Islay", cx, cy + 2.5, 6, ACCENT, "bold", "center");
  drawFeatureRight(doc, TEXT_X, y, "Palate DNA", "Identifies your style and sweet spot — your favorite region and cask combination, extracted from your highest scores.", "Your flavor fingerprint.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 21. Whisky Journal
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx - 22, cy - 16, 20, 32, 2, 2, "F");
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.3);
  doc.roundedRect(cx - 22, cy - 16, 20, 32, 2, 2, "S");
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx + 2, cy - 16, 20, 32, 2, 2, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.3);
  doc.roundedRect(cx + 2, cy - 16, 20, 32, 2, 2, "S");
  for (let ln = 0; ln < 6; ln++) {
    doc.setDrawColor(...rgb(ACCENT_FAINT));
    doc.setLineWidth(0.1);
    doc.line(cx - 18, cy - 10 + ln * 6, cx - 6, cy - 10 + ln * 6);
  }
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.line(cx + 10, cy - 7, cx + 11, cy - 1);
  doc.line(cx + 14, cy - 7, cx + 13, cy - 1);
  doc.line(cx + 11, cy - 1, cx + 13, cy - 1);
  doc.line(cx + 10, cy - 7, cx + 14, cy - 7);
  drawText(doc, "15.03", cx + 12, cy + 4, 6, ACCENT_DIM, "normal", "center");
  doc.setFillColor(...rgb(ACCENT));
  doc.roundedRect(cx + 18, cy - 16, 2, 10, 1, 1, "F");
  drawFeatureRight(doc, TEXT_X, y, "Personal Whisky Journal", "Every dram you taste — solo or in a group — is automatically logged with notes, scores, and metadata.", "Every dram remembered.");

  // ─── Page: Features 22–24 ───
  newFeaturePage(doc);

  // 22. Recommendations
  y = rowY(0);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const funnelInputs = [
    { label: "Region", pct: "35%", dx: -20 },
    { label: "Cask", pct: "25%", dx: -7 },
    { label: "Peat", pct: "25%", dx: 7 },
    { label: "Community", pct: "15%", dx: 20 },
  ];
  funnelInputs.forEach((fi) => {
    const fx = cx + fi.dx;
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(fx - 9, cy - 18, 18, 8, 2, 2, "F");
    drawText(doc, fi.label, fx, cy - 12, 5, TEXT, "bold", "center");
    drawText(doc, fi.pct, fx, cy - 7, 5, ACCENT_DIM, "normal", "center");
    doc.setDrawColor(...rgb(ACCENT_FAINT));
    doc.setLineWidth(0.2);
    doc.line(fx, cy - 10, cx, cy + 2);
  });
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.5);
  doc.line(cx - 18, cy - 6, cx - 4, cy + 6);
  doc.line(cx + 18, cy - 6, cx + 4, cy + 6);
  doc.line(cx - 4, cy + 6, cx + 4, cy + 6);
  drawGlow(doc, cx, cy + 14, 5);
  doc.setFillColor(...rgb(ACCENT));
  doc.roundedRect(cx - 3, cy + 10, 6, 10, 1, 1, "F");
  drawText(doc, "*", cx, cy + 17, 5, BG, "bold", "center");
  drawFeatureRight(doc, TEXT_X, y, "Whisky Recommendations", "Factor-based engine weighing region, cask, peat level, and community ratings. Every suggestion has a reason.", "Recommendations with reasons.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 23. Side-by-Side
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  drawMiniRadar(doc, cx, cy, 16, [65, 60, 70, 55, 62], MUTED_DIM, MUTED_DIM);
  drawMiniRadar(doc, cx - 3, cy + 2, 16, [75, 82, 60, 70, 78], ACCENT_DIM, ACCENT_DIM);
  drawMiniRadar(doc, cx + 3, cy - 2, 16, [88, 75, 85, 82, 80]);
  doc.setFillColor(...rgb(ACCENT));
  doc.circle(cx + 26, cy - 8, 1.5, "F");
  drawText(doc, "Dram A", cx + 30, cy - 6, 5, ACCENT, "normal");
  doc.setFillColor(...rgb(ACCENT_DIM));
  doc.circle(cx + 26, cy - 2, 1.5, "F");
  drawText(doc, "Dram B", cx + 30, cy, 5, ACCENT_DIM, "normal");
  doc.setFillColor(...rgb(MUTED_DIM));
  doc.circle(cx + 26, cy + 4, 1.5, "F");
  drawText(doc, "Dram C", cx + 30, cy + 6, 5, MUTED_DIM, "normal");
  drawFeatureRight(doc, TEXT_X, y, "Side-by-Side Comparison", "Overlay up to 3 whiskies on a single radar chart. See where they differ — and which one matches your palate.", "Three drams, one glance.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 24. Collection Analysis (moved from separate page)
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const skylineBars = [
    { label: "Islay", h: 28 }, { label: "", h: 18 }, { label: "Spey", h: 32 },
    { label: "", h: 14 }, { label: "High", h: 22 }, { label: "", h: 10 },
    { label: "Camp", h: 16 }, { label: "", h: 24 }, { label: "Low", h: 12 },
  ];
  skylineBars.forEach((b, i) => {
    const bx = cx - 36 + i * 8;
    doc.setFillColor(...rgb(b.h === 32 ? ACCENT : CARD));
    doc.roundedRect(bx, cy + 12 - b.h, 6, b.h, 1, 1, "F");
    if (b.label) {
      drawText(doc, b.label, bx + 3, cy + 17, 4, MUTED_DIM, "normal", "center");
    }
  });
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  const valuePts = skylineBars.map((b, i) => ({
    x: cx - 33 + i * 8,
    y: cy + 12 - b.h - 4 + Math.sin(i * 0.7) * 3,
  }));
  for (let i = 0; i < valuePts.length - 1; i++) {
    doc.line(valuePts[i].x, valuePts[i].y, valuePts[i + 1].x, valuePts[i + 1].y);
  }
  drawFeatureRight(doc, TEXT_X, y, "Collection Analysis", "Portfolio value, region distribution, age buckets, ABV spectrum, vintage timeline. Discover hidden gems in your cellar.", "Know your cellar's story.");
}


// ─────────────────────────────────────────────
// C. AI FEATURES (8 features)
// ─────────────────────────────────────────────

function drawAIFeatures(doc: jsPDF) {
  drawChapterDivider(doc, "C", "AI-Powered Features", "Artificial intelligence that makes your whisky experience smarter", "8 features");

  // ─── Page: Features 25–27 ───
  newFeaturePage(doc);

  // 25. Bottle Recognition
  let y = rowY(0);
  let cx = VIS_X + VIS_W / 2;
  let cy = y + ROW_H / 2;
  const frameSize = 28;
  const cornerLen = 6;
  const fx = cx - frameSize / 2;
  const fy = cy - frameSize / 2;
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.8);
  doc.line(fx, fy, fx + cornerLen, fy);
  doc.line(fx, fy, fx, fy + cornerLen);
  doc.line(fx + frameSize, fy, fx + frameSize - cornerLen, fy);
  doc.line(fx + frameSize, fy, fx + frameSize, fy + cornerLen);
  doc.line(fx, fy + frameSize, fx + cornerLen, fy + frameSize);
  doc.line(fx, fy + frameSize, fx, fy + frameSize - cornerLen);
  doc.line(fx + frameSize, fy + frameSize, fx + frameSize - cornerLen, fy + frameSize);
  doc.line(fx + frameSize, fy + frameSize, fx + frameSize, fy + frameSize - cornerLen);
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.2);
  doc.line(cx, fy + 4, cx, fy + frameSize - 4);
  doc.line(fx + 4, cy, fx + frameSize - 4, cy);
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.5);
  doc.roundedRect(cx - 4, cy - 10, 8, 20, 2, 2, "S");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.3);
  doc.line(cx + frameSize / 2 + 4, cy, cx + frameSize / 2 + 10, cy);
  doc.line(cx + frameSize / 2 + 8, cy - 2, cx + frameSize / 2 + 10, cy);
  doc.line(cx + frameSize / 2 + 8, cy + 2, cx + frameSize / 2 + 10, cy);
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx + frameSize / 2 + 12, cy - 8, 20, 16, 2, 2, "F");
  for (let ln = 0; ln < 3; ln++) {
    doc.setFillColor(...rgb(ln === 0 ? ACCENT : MUTED_DIM));
    doc.roundedRect(cx + frameSize / 2 + 14, cy - 5 + ln * 5, 12 - ln * 2, 2, 1, 1, "F");
  }
  drawFeatureRight(doc, TEXT_X, y, "Bottle Recognition", "Point your camera at any label. GPT-4o Vision identifies the whisky and fills in distillery, age, ABV, cask type.", "Point. Identify. Done.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 26. Label OCR
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx - 20, cy - 2, 28, 20, 2, 2, "F");
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.3);
  doc.roundedRect(cx - 20, cy - 2, 28, 20, 2, 2, "S");
  for (let ln = 0; ln < 4; ln++) {
    doc.setFillColor(...rgb(TEXT));
    doc.roundedRect(cx - 16, cy + 2 + ln * 4, 16 - ln * 2, 1.5, 0.5, 0.5, "F");
  }
  const extractedLines = [
    { text: "Lagavulin 16", ey: cy - 14 },
    { text: "43% ABV", ey: cy - 8 },
    { text: "Islay, Scotland", ey: cy - 2 },
  ];
  extractedLines.forEach((el, i) => {
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(cx + 14, el.ey - 2, 30, 5, 1, 1, "F");
    drawText(doc, el.text, cx + 16, el.ey + 1.5, 5, i === 0 ? ACCENT : TEXT, i === 0 ? "bold" : "normal");
    doc.setDrawColor(...rgb(ACCENT_FAINT));
    doc.setLineWidth(0.2);
    const startX = cx - 16 + (3 - i) * 3;
    doc.line(startX, cy + 2 + i * 4, cx + 14, el.ey);
  });
  drawFeatureRight(doc, TEXT_X, y, "Label OCR", "Reads text from bottle labels, menu cards, and even handwritten notes. Multi-bottle detection from shelf photos.", "Labels become data.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 27. AI Tasting Notes
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const chips = ["honey", "peat", "oak", "citrus", "vanilla"];
  chips.forEach((ch, i) => {
    const chipX = cx - 38 + (i % 3) * 22;
    const chipY = cy - 12 + Math.floor(i / 3) * 10;
    doc.setFillColor(...rgb(ACCENT_FAINT));
    doc.roundedRect(chipX, chipY, 20, 7, 3, 3, "F");
    drawText(doc, ch, chipX + 10, chipY + 5, 5, ACCENT, "normal", "center");
  });
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.line(cx + 8, cy, cx + 16, cy);
  doc.line(cx + 14, cy - 2, cx + 16, cy);
  doc.line(cx + 14, cy + 2, cx + 16, cy);
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx + 18, cy - 12, 30, 24, 3, 3, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.3);
  doc.roundedRect(cx + 18, cy - 12, 30, 24, 3, 3, "S");
  for (let ln = 0; ln < 5; ln++) {
    doc.setFillColor(...rgb(ln < 3 ? TEXT : MUTED_DIM));
    doc.roundedRect(cx + 22, cy - 8 + ln * 5, 22 - (ln === 4 ? 8 : 0), 1.5, 0.5, 0.5, "F");
  }
  drawText(doc, "AI", cx + 33, cy - 14, 6, ACCENT, "bold", "center");
  drawFeatureRight(doc, TEXT_X, y, "AI Tasting Notes", "Select flavor keywords, and AI generates professional tasting notes. Multilingual: German and English.", "From hints to prose.");

  // ─── Page: Features 28–30 ───
  newFeaturePage(doc);

  // 28. AI Enrichment
  y = rowY(0);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  drawGlow(doc, cx, cy - 4, 10);
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.6);
  doc.circle(cx, cy - 6, 7, "S");
  doc.setFillColor(...rgb(ACCENT));
  doc.roundedRect(cx - 2, cy + 1, 4, 5, 1, 1, "F");
  doc.setFillColor(...rgb(ACCENT));
  doc.circle(cx, cy - 6, 2, "F");
  const orbitItems = [
    { angle: -60, icon: "P", label: "Pairing" },
    { angle: 30, icon: "S", label: "Serving" },
    { angle: 150, icon: "i", label: "Facts" },
    { angle: -150, icon: "F", label: "Food" },
  ];
  orbitItems.forEach((item) => {
    const rad = item.angle * Math.PI / 180;
    const ox = cx + 22 * Math.cos(rad);
    const oy = (cy - 2) + 18 * Math.sin(rad);
    drawDottedLine(doc, cx + 8 * Math.cos(rad), (cy - 2) + 8 * Math.sin(rad), ox, oy);
    drawText(doc, item.icon, ox, oy + 2, 7, TEXT, "normal", "center");
    drawText(doc, item.label, ox, oy + 7, 4, MUTED_DIM, "normal", "center");
  });
  drawFeatureRight(doc, TEXT_X, y, "AI Enrichment", "'Did you know?' facts, food pairing suggestions, and serving recommendations — generated automatically for every whisky.", "Facts and pairings, instantly.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 29. Market Price
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx - 16, cy - 14, 32, 22, 4, 4, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.5);
  doc.roundedRect(cx - 16, cy - 14, 32, 22, 4, 4, "S");
  drawText(doc, "€87", cx, cy - 2, 18, ACCENT, "bold", "center");
  drawText(doc, "estimated", cx, cy + 5, 6, MUTED, "normal", "center");
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.3);
  const trendLine = [
    { x: cx - 30, y: cy + 8 },
    { x: cx - 22, y: cy + 4 },
    { x: cx - 14, y: cy + 10 },
    { x: cx + 2, y: cy + 2 },
    { x: cx + 18, y: cy - 6 },
    { x: cx + 30, y: cy - 10 },
  ];
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.4);
  for (let i = 0; i < trendLine.length - 1; i++) {
    doc.line(trendLine[i].x, trendLine[i].y, trendLine[i + 1].x, trendLine[i + 1].y);
  }
  drawDottedLine(doc, cx - 30, cy + 14, cx + 32, cy + 14);
  drawFeatureRight(doc, TEXT_X, y, "Market Price Estimation", "AI estimates the current market value of bottles based on distillery, age, and rarity. Track your collection's worth.", "Market value, estimated smartly.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 30. AI Menu Cover
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.6);
  doc.roundedRect(cx - 20, cy - 16, 40, 32, 3, 3, "S");
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.3);
  doc.roundedRect(cx - 17, cy - 13, 34, 26, 2, 2, "S");
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.4);
  const wavePts = [];
  for (let wx = cx - 15; wx <= cx + 15; wx += 2) {
    wavePts.push({ x: wx, y: cy - 2 + Math.sin((wx - cx) * 0.15) * 6 });
  }
  for (let i = 0; i < wavePts.length - 1; i++) {
    doc.setDrawColor(...rgb(i % 2 === 0 ? ACCENT : ACCENT_DIM));
    doc.line(wavePts[i].x, wavePts[i].y, wavePts[i + 1].x, wavePts[i + 1].y);
  }
  const sparkles = [[cx - 14, cy - 10], [cx + 14, cy - 10], [cx + 14, cy + 10], [cx - 14, cy + 10]];
  sparkles.forEach(([sx, sy]) => {
    doc.setFillColor(...rgb(ACCENT));
    doc.circle(sx, sy, 1, "F");
    doc.setDrawColor(...rgb(ACCENT));
    doc.setLineWidth(0.2);
    doc.line(sx - 2, sy, sx + 2, sy);
    doc.line(sx, sy - 2, sx, sy + 2);
  });
  drawFeatureRight(doc, TEXT_X, y, "AI Menu Card Cover", "DALL-E generates context-aware cover images for tasting menus — based on region, season, cask types, and mood.", "Menus with imagination.");

  // ─── Page: Features 31–32 ───
  newFeaturePage(doc);

  // 31. AI Import
  y = rowY(0);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const messyDocs = [
    { x: cx - 34, y: cy - 12, w: 14, h: 18, rot: -8 },
    { x: cx - 24, y: cy - 8, w: 14, h: 18, rot: 5 },
    { x: cx - 30, y: cy - 4, w: 12, h: 16, rot: -3 },
  ];
  messyDocs.forEach((d) => {
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(d.x, d.y, d.w, d.h, 1, 1, "F");
    doc.setDrawColor(...rgb(ACCENT_FAINT));
    doc.setLineWidth(0.2);
    doc.roundedRect(d.x, d.y, d.w, d.h, 1, 1, "S");
    for (let ln = 0; ln < 3; ln++) {
      doc.setFillColor(...rgb(MUTED_DIM));
      doc.roundedRect(d.x + 2, d.y + 3 + ln * 4, d.w - 4 - ln, 1, 0.5, 0.5, "F");
    }
  });
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.5);
  doc.line(cx - 8, cy - 10, cx - 2, cy - 2);
  doc.line(cx - 8, cy + 10, cx - 2, cy + 2);
  doc.line(cx - 2, cy - 2, cx + 2, cy - 2);
  doc.line(cx - 2, cy + 2, cx + 2, cy + 2);
  doc.line(cx + 2, cy - 2, cx + 8, cy);
  doc.line(cx + 2, cy + 2, cx + 8, cy);
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx + 14, cy - 12, 32, 24, 3, 3, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.roundedRect(cx + 14, cy - 12, 32, 24, 3, 3, "S");
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      doc.setFillColor(...rgb(row === 0 ? ACCENT_FAINT : (row + col) % 3 === 0 ? ACCENT_DIM : CARD));
      doc.rect(cx + 16 + col * 10, cy - 10 + row * 6, 9, 5, "F");
    }
  }
  drawFeatureRight(doc, TEXT_X, y, "AI Tasting Import", "Parse unstructured documents — PDFs, Excel files, photos — into structured tasting events with complete whisky data.", "Chaos in, structure out.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 32. Barcode Scanner (moved from Chapter E)
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const barWidths = [2, 1, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 2, 3, 1, 2, 1, 3, 1];
  drawGlow(doc, cx, cy, 14);
  let barX = cx - 30;
  barWidths.forEach((w) => {
    doc.setFillColor(...rgb(TEXT));
    doc.rect(barX, cy - 12, w, 24, "F");
    barX += w + 1;
  });
  doc.setDrawColor(220, 60, 60);
  doc.setLineWidth(0.6);
  doc.line(cx - 32, cy, cx + 32, cy);
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.3);
  doc.line(cx + 36, cy, cx + 42, cy);
  doc.line(cx + 40, cy - 2, cx + 42, cy);
  doc.line(cx + 40, cy + 2, cx + 42, cy);
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx + 44, cy - 8, 22, 16, 2, 2, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.3);
  doc.roundedRect(cx + 44, cy - 8, 22, 16, 2, 2, "S");
  drawText(doc, "WB#12345", cx + 55, cy + 1, 5, ACCENT, "bold", "center");
  drawText(doc, "Identified", cx + 55, cy + 6, 4, MUTED, "normal", "center");
  drawFeatureRight(doc, TEXT_X, y, "Barcode Scanner", "Camera-based barcode scanning for instant bottle lookup. Rate-limited and cached for reliable performance.", "Scan shelf to profile.");
}


// ─────────────────────────────────────────────
// D. COMMUNITY & CIRCLE (5 features)
// ─────────────────────────────────────────────

function drawCommunityFeatures(doc: jsPDF) {
  drawChapterDivider(doc, "D", "Community & Circle", "Taste together. Compare. Discover who shares your palate.", "5 features");

  // ─── Page: Features 33–35 ───
  newFeaturePage(doc);

  // 33. Taste Twins
  let y = rowY(0);
  let cx = VIS_X + VIS_W / 2;
  let cy = y + ROW_H / 2;
  const twinL = cx - 18;
  const twinR = cx + 18;
  drawGlow(doc, cx, cy, 10);
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.circle(twinL, cy, 12, "S");
  doc.circle(twinR, cy, 12, "S");
  drawMiniRadar(doc, twinL, cy, 8, [80, 85, 70, 75, 82], ACCENT, ACCENT);
  drawMiniRadar(doc, twinR, cy, 8, [78, 82, 72, 76, 80], ACCENT_DIM, ACCENT_DIM);
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx - 10, cy - 4, 20, 8, 3, 3, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.roundedRect(cx - 10, cy - 4, 20, 8, 3, 3, "S");
  drawText(doc, "82%", cx, cy + 2.5, 8, ACCENT, "bold", "center");
  drawFeatureRight(doc, TEXT_X, y, "Taste Twins", "Correlation engine matching your ratings with others. Twin (80%+), Similar (50%+), Related (30%+), or Different.", "Find your taste twin.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 34. Leaderboards
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const lbCategories = [
    { label: "Active", h: 28, icon: "A" },
    { label: "Detailed", h: 22, icon: "D" },
    { label: "Rated", h: 18, icon: "R" },
    { label: "Explorer", h: 25, icon: "E" },
  ];
  lbCategories.forEach((cat, i) => {
    const bx = cx - 32 + i * 18;
    doc.setFillColor(...rgb(i === 0 ? ACCENT : CARD));
    doc.roundedRect(bx, cy + 12 - cat.h, 14, cat.h, 2, 2, "F");
    doc.setDrawColor(...rgb(i === 0 ? ACCENT : ACCENT_DIM));
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, cy + 12 - cat.h, 14, cat.h, 2, 2, "S");
    drawText(doc, cat.icon, bx + 7, cy + 12 - cat.h - 3, 6, i === 0 ? ACCENT : MUTED, "normal", "center");
    drawText(doc, cat.label, bx + 7, cy + 17, 4, MUTED_DIM, "normal", "center");
    if (i === 0) {
      drawText(doc, "W", bx + 7, cy + 12 - cat.h - 9, 8, ACCENT, "bold", "center");
    }
  });
  drawFeatureRight(doc, TEXT_X, y, "Leaderboards", "Multi-category rankings: Most Active, Most Detailed, Highest Rated, and Explorer. Medals for the top three.", "Climb every leaderboard.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 35. Activity Feed
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  doc.setDrawColor(...rgb(ACCENT_FAINT));
  doc.setLineWidth(0.4);
  doc.line(cx - 10, cy - 20, cx - 10, cy + 20);
  const feedItems = [
    { text: "Solo dram logged", time: "2m", side: "left" },
    { text: "Joined tasting", time: "1h", side: "right" },
    { text: "New rating: 88", time: "3h", side: "left" },
    { text: "Badge earned!", time: "5h", side: "right" },
  ];
  feedItems.forEach((fi, i) => {
    const iy = cy - 16 + i * 10;
    doc.setFillColor(...rgb(ACCENT));
    doc.circle(cx - 10, iy, 1.5, "F");
    const cardX = fi.side === "left" ? cx - 44 : cx - 6;
    doc.setFillColor(...rgb(CARD));
    doc.roundedRect(cardX, iy - 3, 30, 7, 2, 2, "F");
    drawText(doc, fi.text, cardX + 2, iy + 1.5, 4.5, TEXT, "normal");
    drawText(doc, fi.time, fi.side === "left" ? cx - 14 : cx + 28, iy + 1, 4, MUTED_DIM, "normal", fi.side === "left" ? "right" : "left");
  });
  drawFeatureRight(doc, TEXT_X, y, "Activity Feed", "Real-time stream of what friends are tasting — solo drams, group sessions, badges. With relative timestamps.", "See what friends sip.");

  // ─── Page: Features 36–37 ───
  newFeaturePage(doc);

  // 36. Friend Management
  y = rowY(0);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const friendNodes = [
    { x: cx, y: cy, main: true },
    { x: cx - 22, y: cy - 14, main: false, online: true },
    { x: cx + 22, y: cy - 12, main: false, online: true },
    { x: cx - 20, y: cy + 14, main: false, online: false },
    { x: cx + 24, y: cy + 10, main: false, online: false },
    { x: cx + 6, y: cy - 20, main: false, online: true },
  ];
  friendNodes.forEach((node) => {
    if (!node.main) {
      doc.setDrawColor(...rgb(ACCENT_FAINT));
      doc.setLineWidth(0.3);
      doc.line(cx, cy, node.x, node.y);
    }
  });
  friendNodes.forEach((node) => {
    if (node.main) {
      drawGlow(doc, node.x, node.y, 6);
      drawCircleNode(doc, node.x, node.y, 5, true, ACCENT);
    } else {
      drawCircleNode(doc, node.x, node.y, 3.5, true, CARD);
      doc.setDrawColor(...rgb(ACCENT_DIM));
      doc.setLineWidth(0.3);
      doc.circle(node.x, node.y, 3.5, "S");
      if (node.online) {
        doc.setFillColor(76, 175, 80);
        doc.circle(node.x + 3, node.y - 3, 1.2, "F");
      } else {
        doc.setFillColor(...rgb(MUTED_DIM));
        doc.circle(node.x + 3, node.y - 3, 1.2, "F");
      }
    }
  });
  drawDottedLine(doc, cx + 24, cy + 10, cx + 36, cy + 16);
  drawText(doc, "pending", cx + 38, cy + 18, 4, MUTED_DIM, "italic");
  drawFeatureRight(doc, TEXT_X, y, "Friend Management", "Search and add friends by name or email. See who's online, manage pending requests, and build your tasting circle.", "Build your tasting circle.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 37. Community Rankings
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const rankBars = [
    { name: "Ardbeg Uigeadail", w: 65, score: "91" },
    { name: "Lagavulin 16", w: 58, score: "88" },
    { name: "Talisker 10", w: 52, score: "85" },
    { name: "Glenfiddich 18", w: 48, score: "82" },
    { name: "Macallan 12", w: 44, score: "80" },
  ];
  rankBars.forEach((rb, i) => {
    const by = cy - 14 + i * 7;
    const bx = cx - 34;
    doc.setFillColor(...rgb(ACCENT_FAINT));
    doc.roundedRect(bx, by, 68, 5, 2, 2, "F");
    doc.setFillColor(...rgb(i === 0 ? ACCENT : ACCENT_DIM));
    doc.roundedRect(bx, by, rb.w, 5, 2, 2, "F");
    drawText(doc, rb.score, bx + rb.w + 3, by + 4, 5, i === 0 ? ACCENT : MUTED, "bold");
    if (i === 0) {
      drawText(doc, "*", bx - 4, by + 4, 5, ACCENT, "normal", "center");
    }
  });
  drawFeatureRight(doc, TEXT_X, y, "Community Rankings", "Aggregated whisky scores across the community. Filter by region. Compare your score vs. the group average.", "The crowd's whisky verdict.");
}


// ─────────────────────────────────────────────
// E. WHISKY DATABASE & COLLECTION (5 features)
// ─────────────────────────────────────────────

function drawWhiskyDBFeatures(doc: jsPDF) {
  drawChapterDivider(doc, "E", "Whisky Database & Collection", "Manage your bottles, explore the world of whisky", "5 features");

  // ─── Page: Features 38–40 ───
  newFeaturePage(doc);

  // 38. Whiskybase Integration
  let y = rowY(0);
  let cx = VIS_X + VIS_W / 2;
  let cy = y + ROW_H / 2;
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx - 38, cy - 8, 28, 16, 3, 3, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.roundedRect(cx - 38, cy - 8, 28, 16, 3, 3, "S");
  drawText(doc, "CaskSense", cx - 24, cy + 2, 6, ACCENT, "bold", "center");
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx + 10, cy - 8, 28, 16, 3, 3, "F");
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.4);
  doc.roundedRect(cx + 10, cy - 8, 28, 16, 3, 3, "S");
  drawText(doc, "Whiskybase", cx + 24, cy + 2, 5, TEXT, "bold", "center");
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx - 8, cy - 4, 16, 8, 2, 2, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.5);
  doc.line(cx - 8, cy - 1, cx - 4, cy - 1);
  doc.line(cx - 6, cy - 3, cx - 4, cy - 1);
  doc.line(cx - 6, cy + 1, cx - 4, cy - 1);
  doc.line(cx + 8, cy + 1, cx + 4, cy + 1);
  doc.line(cx + 6, cy - 1, cx + 4, cy + 1);
  doc.line(cx + 6, cy + 3, cx + 4, cy + 1);
  const packets = [[cx - 3, cy - 2], [cx + 1, cy], [cx + 3, cy + 2]];
  packets.forEach(([px, py]) => {
    doc.setFillColor(...rgb(ACCENT));
    doc.circle(px, py, 0.8, "F");
  });
  drawFeatureRight(doc, TEXT_X, y, "Whiskybase Integration", "Lookup by ID, CSV/Excel import, deep links to Whiskybase pages, and automatic image fetching. Fully connected.", "Connected to whisky knowledge.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 39. Collection Sync
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx - 30, cy - 10, 22, 20, 2, 2, "F");
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.3);
  doc.roundedRect(cx - 30, cy - 10, 22, 20, 2, 2, "S");
  drawText(doc, "CSV v1", cx - 19, cy + 2, 6, TEXT, "normal", "center");
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx + 8, cy - 10, 22, 20, 2, 2, "F");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.4);
  doc.roundedRect(cx + 8, cy - 10, 22, 20, 2, 2, "S");
  drawText(doc, "CSV v2", cx + 19, cy + 2, 6, ACCENT, "normal", "center");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.5);
  const syncR = 8;
  for (let a = 30; a < 330; a += 10) {
    const rad1 = a * Math.PI / 180;
    const rad2 = (a + 10) * Math.PI / 180;
    doc.line(cx + syncR * Math.cos(rad1), cy + syncR * Math.sin(rad1), cx + syncR * Math.cos(rad2), cy + syncR * Math.sin(rad2));
  }
  doc.line(cx + syncR * Math.cos(30 * Math.PI / 180) + 1, cy + syncR * Math.sin(30 * Math.PI / 180) - 2, cx + syncR * Math.cos(30 * Math.PI / 180), cy + syncR * Math.sin(30 * Math.PI / 180));
  const diffMarkers = [
    { x: cx + 34, y: cy - 6, symbol: "+", color: "#4caf50" },
    { x: cx + 34, y: cy, symbol: "-", color: "#f44336" },
    { x: cx + 34, y: cy + 6, symbol: "~", color: ACCENT },
  ];
  diffMarkers.forEach((dm) => {
    drawText(doc, dm.symbol, dm.x, dm.y + 2, 8, dm.color, "bold");
    drawText(doc, dm.symbol === "+" ? "new" : dm.symbol === "-" ? "removed" : "changed", dm.x + 4, dm.y + 2, 4, MUTED_DIM, "normal");
  });
  drawFeatureRight(doc, TEXT_X, y, "Collection Sync", "Smart synchronization via CSV re-upload. Automatically detects new items, removed bottles, and changed ratings.", "Reupload. Auto-sync.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 40. Knowledge Hub
  y = rowY(2);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  const triadItems = [
    { x: cx, y: cy - 14, icon: "L", label: "Lexicon" },
    { x: cx - 20, y: cy + 10, icon: "D", label: "Distilleries" },
    { x: cx + 20, y: cy + 10, icon: "B", label: "Bottlers" },
  ];
  triadItems.forEach((ti, i) => {
    drawGlow(doc, ti.x, ti.y, 6);
    doc.setFillColor(...rgb(CARD));
    doc.circle(ti.x, ti.y, 7, "F");
    doc.setDrawColor(...rgb(ACCENT));
    doc.setLineWidth(0.4);
    doc.circle(ti.x, ti.y, 7, "S");
    drawText(doc, ti.icon, ti.x, ti.y + 2.5, 8, TEXT, "normal", "center");
    drawText(doc, ti.label, ti.x, ti.y + 12, 5, MUTED, "normal", "center");
  });
  drawDottedLine(doc, triadItems[0].x, triadItems[0].y + 7, triadItems[1].x, triadItems[1].y - 7);
  drawDottedLine(doc, triadItems[0].x, triadItems[0].y + 7, triadItems[2].x, triadItems[2].y - 7);
  drawDottedLine(doc, triadItems[1].x + 7, triadItems[1].y, triadItems[2].x - 7, triadItems[2].y);
  drawFeatureRight(doc, TEXT_X, y, "Knowledge Hub", "Built-in whisky lexicon, interactive distillery map, bottler database, and a structured tasting guide. All in one place.", "Learn the whole world.");

  // ─── Page: Features 41–42 ───
  newFeaturePage(doc);

  // 41. Wishlist
  y = rowY(0);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.5);
  doc.roundedRect(cx - 8, cy - 14, 16, 24, 3, 3, "S");
  doc.setFillColor(...rgb(ACCENT));
  doc.setGState(doc.GState({ opacity: 0.15 }));
  doc.roundedRect(cx - 8, cy - 14, 16, 24, 3, 3, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  const starPts: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * Math.PI / 180;
    starPts.push([cx + 5 * Math.cos(angle), cy - 18 + 5 * Math.sin(angle)]);
    const innerAngle = ((i * 72 + 36) - 90) * Math.PI / 180;
    starPts.push([cx + 2 * Math.cos(innerAngle), cy - 18 + 2 * Math.sin(innerAngle)]);
  }
  doc.setFillColor(...rgb(ACCENT));
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.3);
  for (let i = 0; i < starPts.length; i++) {
    const next = starPts[(i + 1) % starPts.length];
    doc.line(starPts[i][0], starPts[i][1], next[0], next[1]);
  }
  const orbitDots = [
    { angle: 40, r: 18 }, { angle: 130, r: 16 }, { angle: 220, r: 20 },
    { angle: 310, r: 17 }, { angle: 80, r: 22 },
  ];
  orbitDots.forEach((od) => {
    const rad = od.angle * Math.PI / 180;
    const ox = cx + od.r * Math.cos(rad);
    const oy = cy + od.r * Math.sin(rad);
    doc.setFillColor(...rgb(ACCENT_DIM));
    doc.circle(ox, oy, 1, "F");
  });
  const checkItems = [
    { text: "Ardbeg Corryvreckan", checked: true },
    { text: "Port Charlotte 10", checked: true },
    { text: "Springbank 15", checked: false },
  ];
  checkItems.forEach((ci, i) => {
    const iy = cy - 6 + i * 8;
    const ix = cx + 28;
    if (ci.checked) {
      doc.setFillColor(...rgb(ACCENT));
      doc.roundedRect(ix, iy, 5, 5, 1, 1, "F");
      doc.setDrawColor(...rgb(BG));
      doc.setLineWidth(0.6);
      doc.line(ix + 1, iy + 3, ix + 2.5, iy + 4.5);
      doc.line(ix + 2.5, iy + 4.5, ix + 4, iy + 1.5);
    } else {
      doc.setDrawColor(...rgb(ACCENT_DIM));
      doc.setLineWidth(0.3);
      doc.roundedRect(ix, iy, 5, 5, 1, 1, "S");
    }
    drawText(doc, ci.text, ix + 8, iy + 4, 5, ci.checked ? MUTED_DIM : TEXT, ci.checked ? "normal" : "normal");
  });
  drawFeatureRight(doc, TEXT_X, y, "Wishlist", "Track bottles you want to find. Integrated with your collection and journal for a complete whisky inventory.", "Track the next bottle.");

  drawFeatureSeparator(doc, y + ROW_H - 2);

  // 42. Historical Tastings
  y = rowY(1);
  cx = VIS_X + VIS_W / 2;
  cy = y + ROW_H / 2;
  doc.setFillColor(...rgb(CARD));
  doc.roundedRect(cx - 28, cy - 16, 22, 32, 2, 2, "F");
  doc.roundedRect(cx - 4, cy - 16, 22, 32, 2, 2, "F");
  doc.roundedRect(cx + 20, cy - 16, 22, 32, 2, 2, "F");
  doc.setDrawColor(...rgb(ACCENT_DIM));
  doc.setLineWidth(0.3);
  doc.roundedRect(cx - 28, cy - 16, 22, 32, 2, 2, "S");
  doc.roundedRect(cx - 4, cy - 16, 22, 32, 2, 2, "S");
  doc.setDrawColor(...rgb(ACCENT));
  doc.setLineWidth(0.5);
  doc.roundedRect(cx + 20, cy - 16, 22, 32, 2, 2, "S");
  for (let d = 0; d < 3; d++) {
    const dx = cx - 28 + d * 24;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const dotX = dx + 4 + c * 4.5;
      const dotY = cy - 8 + r * 5;
      const hasEvent = (d === 2 && (r * 4 + c) % 3 === 0) || (d === 1 && (r * 4 + c) % 5 === 0);
      doc.setFillColor(...rgb(hasEvent ? ACCENT : ACCENT_FAINT));
      doc.circle(dotX, dotY, hasEvent ? 1.2 : 0.6, "F");
    }
    drawText(doc, d === 0 ? "2023" : d === 1 ? "2024" : "2025", dx + 11, cy + 20, 5, d === 2 ? ACCENT : MUTED_DIM, "bold", "center");
  }
  drawFeatureRight(doc, TEXT_X, y, "Historical Tastings", "Searchable archive of past events. Cross-tasting analytics reveal top whiskies, region breakdowns, and trends.", "Past tastings, new insights.");
}


// ─────────────────────────────────────────────
// CTA PAGE
// ─────────────────────────────────────────────

function drawCTAPage(doc: jsPDF) {
  doc.addPage();
  drawPageBg(doc);
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  drawGlow(doc, pw / 2, ph / 2 - 10, 40);

  drawText(doc, "Start your next tasting.", pw / 2, ph / 2 - 12, 36, TEXT, "bold", "center");
  drawAccentLine(doc, ph / 2 - 2, 50);
  drawText(doc, "Open CaskSense and create your first session in under a minute.", pw / 2, ph / 2 + 14, 14, MUTED, "normal", "center");

  doc.setFillColor(...rgb(ACCENT));
  doc.roundedRect(pw / 2 - 40, ph / 2 + 24, 80, 14, 7, 7, "F");
  drawText(doc, "casksense.com", pw / 2, ph / 2 + 33, 14, BG, "bold", "center");

  drawText(doc, "42+ features  ·  Blind tastings  ·  AI-powered  ·  Free to use", pw / 2, ph / 2 + 50, 8, MUTED_DIM, "normal", "center");
}


// ─────────────────────────────────────────────
// PAGE NUMBERS
// ─────────────────────────────────────────────

function addPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const ph = doc.internal.pageSize.getHeight();
  const pw = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont(F, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...rgb(MUTED_DIM));
    if (i > 1) {
      doc.text("CaskSense Feature Presentation", 16, ph - 8);
    }
    doc.text(`${i} / ${totalPages}`, pw - 16, ph - 8, { align: "right" });
  }
}


// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

export async function generateCaskSensePresentation() {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  drawCover(doc);
  drawIntro(doc);
  drawTastingEngineFeatures(doc);
  drawPersonalAnalysisFeatures(doc);
  drawAIFeatures(doc);
  drawCommunityFeatures(doc);
  drawWhiskyDBFeatures(doc);
  drawCTAPage(doc);
  addPageNumbers(doc);

  doc.save("CaskSense-Feature-Presentation.pdf");
}
