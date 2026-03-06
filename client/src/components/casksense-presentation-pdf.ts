import jsPDF from "jspdf";

const BG = "#1a1714";
const CARD = "#242018";
const ACCENT = "#c8a97e";
const ACCENT_DIM = "#a8834a";
const TEXT = "#f5f0e8";
const MUTED = "#8a7e6d";

const FONT_BODY = "helvetica";

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function drawPageBg(doc: jsPDF) {
  doc.setFillColor(...hexToRgb(BG));
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");
}

function drawAccentLine(doc: jsPDF, y: number, w: number) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...hexToRgb(ACCENT));
  doc.setLineWidth(0.3);
  doc.line((pw - w) / 2, y, (pw + w) / 2, y);
}

function drawHeader(doc: jsPDF, title: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFont(FONT_BODY, "bold");
  doc.setFontSize(28);
  doc.setTextColor(...hexToRgb(TEXT));
  doc.text(title, pw / 2, y, { align: "center" });
  drawAccentLine(doc, y + 8, 40);
  return y + 20;
}

function drawSubheader(doc: jsPDF, text: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(MUTED));
  doc.text(text, pw / 2, y, { align: "center", maxWidth: pw - 60 });
  return y + 10;
}

interface FeatureItem {
  title: string;
  desc: string;
}

function drawFeatureList(doc: jsPDF, features: FeatureItem[], startY: number, columns: 1 | 2 = 1): number {
  const pw = doc.internal.pageSize.getWidth();
  const margin = 24;
  let y = startY;

  if (columns === 2) {
    const colWidth = (pw - margin * 2 - 16) / 2;
    const half = Math.ceil(features.length / 2);
    const col1 = features.slice(0, half);
    const col2 = features.slice(half);

    let maxY = y;
    [col1, col2].forEach((col, ci) => {
      let cy = y;
      const x = margin + ci * (colWidth + 16);
      for (const f of col) {
        if (cy > doc.internal.pageSize.getHeight() - 30) {
          doc.addPage();
          drawPageBg(doc);
          cy = 30;
        }
        doc.setFont(FONT_BODY, "bold");
        doc.setFontSize(10);
        doc.setTextColor(...hexToRgb(ACCENT));
        doc.text("•", x, cy);
        doc.setTextColor(...hexToRgb(TEXT));
        doc.text(f.title, x + 6, cy);

        doc.setFont(FONT_BODY, "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...hexToRgb(MUTED));
        const lines = doc.splitTextToSize(f.desc, colWidth - 10);
        doc.text(lines, x + 6, cy + 5);
        cy += 5 + lines.length * 4 + 6;
      }
      if (cy > maxY) maxY = cy;
    });
    return maxY;
  }

  for (const f of features) {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      drawPageBg(doc);
      y = 30;
    }
    doc.setFont(FONT_BODY, "bold");
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(ACCENT));
    doc.text("•", margin, y);
    doc.setTextColor(...hexToRgb(TEXT));
    doc.text(f.title, margin + 6, y);

    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...hexToRgb(MUTED));
    const lines = doc.splitTextToSize(f.desc, pw - margin * 2 - 10);
    doc.text(lines, margin + 6, y + 5);
    y += 5 + lines.length * 4 + 6;
  }
  return y;
}

function drawCategoryHeader(doc: jsPDF, category: string, count: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...hexToRgb(CARD));
  doc.roundedRect(20, y - 5, pw - 40, 14, 4, 4, "F");
  doc.setFont(FONT_BODY, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...hexToRgb(TEXT));
  doc.text(category, 28, y + 4);
  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(ACCENT_DIM));
  doc.text(count, pw - 28, y + 4, { align: "right" });
  return y + 18;
}

export async function generateCaskSensePresentation() {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // ── Page 1: Cover ──
  drawPageBg(doc);

  doc.setFont(FONT_BODY, "bold");
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(ACCENT_DIM));
  doc.text("WHISKY TASTING PLATFORM", pw / 2, ph / 2 - 32, { align: "center" });

  doc.setFont(FONT_BODY, "bold");
  doc.setFontSize(52);
  doc.setTextColor(...hexToRgb(TEXT));
  doc.text("CaskSense", pw / 2, ph / 2 - 8, { align: "center" });

  drawAccentLine(doc, ph / 2 + 2, 60);

  doc.setFont(FONT_BODY, "italic");
  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(MUTED));
  doc.text("Where tasting becomes reflection.", pw / 2, ph / 2 + 18, { align: "center" });

  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(ACCENT_DIM));
  doc.text("Complete Feature Overview · 44+ Features", pw / 2, ph / 2 + 34, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(MUTED));
  doc.text("casksense.com", pw / 2, ph - 16, { align: "center" });

  // ── Page 2: What is CaskSense + The Flow ──
  doc.addPage();
  drawPageBg(doc);
  let y = drawHeader(doc, "What is CaskSense?", 30);

  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(12);
  doc.setTextColor(...hexToRgb(MUTED));
  const introText = "CaskSense is a platform for structured whisky tastings. It guides groups through blind flights, captures every rating in real time, and reveals the winner with a multi-act show. Over time, it builds your personal taste profile and connects you with a global whisky community.";
  const introLines = doc.splitTextToSize(introText, pw - 80);
  doc.text(introLines, pw / 2, y + 4, { align: "center", maxWidth: pw - 80 });
  y += introLines.length * 6 + 20;

  const steps = [
    { num: "01", title: "Gather", desc: "Invite friends via QR code or session code" },
    { num: "02", title: "Pour", desc: "Host serves the dram — blind, without labels" },
    { num: "03", title: "Reflect", desc: "Everyone rates nose, taste, finish, balance" },
    { num: "04", title: "Reveal", desc: "The host unveils the bottle step by step" },
    { num: "05", title: "Discover", desc: "Ranking appears — with surprising winners" },
  ];

  const stepWidth = (pw - 60) / 5;
  steps.forEach((step, i) => {
    const cx = 30 + i * stepWidth + stepWidth / 2;
    doc.setFillColor(...hexToRgb(CARD));
    doc.roundedRect(cx - stepWidth / 2 + 4, y, stepWidth - 8, 50, 4, 4, "F");

    doc.setFont(FONT_BODY, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(ACCENT_DIM));
    doc.text(step.num, cx, y + 12, { align: "center" });

    doc.setFont(FONT_BODY, "bold");
    doc.setFontSize(14);
    doc.setTextColor(...hexToRgb(TEXT));
    doc.text(step.title, cx, y + 24, { align: "center" });

    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...hexToRgb(MUTED));
    const dLines = doc.splitTextToSize(step.desc, stepWidth - 16);
    doc.text(dLines, cx, y + 32, { align: "center" });

    if (i < steps.length - 1) {
      doc.setDrawColor(...hexToRgb(ACCENT));
      doc.setLineWidth(0.2);
      doc.line(cx + stepWidth / 2 - 4, y + 22, cx + stepWidth / 2 + 4, y + 22);
    }
  });

  // ── Page 3: Tasting Engine (16 features) ──
  doc.addPage();
  drawPageBg(doc);
  y = drawHeader(doc, "The Tasting Engine", 28);
  y = drawSubheader(doc, "Everything you need to run a structured whisky tasting.", y);
  y += 4;
  y = drawCategoryHeader(doc, "A. Tasting Engine", "16 features", y);

  const tastingFeatures: FeatureItem[] = [
    { title: "Tasting Setup", desc: "Create a tasting with title, date, location, and description. Configure everything before inviting guests." },
    { title: "Rating Scales", desc: "Choose from 5, 10, 20, or 100-point professional scales to match your group's preference." },
    { title: "Guided Mode", desc: "The host controls the pace — everyone moves to the next dram together, synchronized in real time." },
    { title: "Session Modes", desc: "Three UI modes: Flow (free navigation), Focus (one dram at a time), Journal (step-by-step note-taking)." },
    { title: "QR Code & Join Code", desc: "Guests join instantly via 6-digit code or by scanning a QR code. No account required with Guest Mode." },
    { title: "Blind Mode", desc: "Four-stage reveal: only the dram number is shown initially. Name, metadata, and bottle image are revealed step by step." },
    { title: "Live Rating System", desc: "Rate nose, taste, finish, balance, and overall — plus select flavor chips and dictate notes via voice input." },
    { title: "Voice-to-Text Notes", desc: "Dictate your tasting impressions hands-free. Speech recognition captures your thoughts in real time." },
    { title: "Discussion Panel", desc: "Live chat during the session — share thoughts, debate flavors, and react to the reveal together." },
    { title: "Multi-Act Reveal Show", desc: "The reveal is a show: participation stats → group consensus → technical details → final ranking with medals." },
    { title: "Results & Export", desc: "Full results with medals (gold, silver, bronze). Export as PDF, Excel, or CSV for your records." },
    { title: "Flight Board", desc: "Visual overview of the entire lineup with blind state indicators and quick navigation." },
    { title: "Ambient Sound", desc: "Toggle a fireplace soundscape to create the perfect tasting atmosphere." },
    { title: "Printable Templates", desc: "Generate tasting sheets, tasting mats, and AI-designed menu cards with custom cover images." },
    { title: "Solo Dram Logger", desc: "Rate whiskies outside of group sessions — for those quiet evenings with a single dram." },
    { title: "Guest Mode", desc: "Standard Naked (persisted identity) or Ultra Naked (ephemeral) — guests join without registration." },
  ];
  y = drawFeatureList(doc, tastingFeatures, y, 2);

  // ── Page 4: Personal Analysis (10 features) ──
  doc.addPage();
  drawPageBg(doc);
  y = drawHeader(doc, "Personal Taste Analysis", 28);
  y = drawSubheader(doc, "CaskSense learns your palate and shows you what you love.", y);
  y += 4;
  y = drawCategoryHeader(doc, "B. Personal Analysis", "10 features", y);

  const personalFeatures: FeatureItem[] = [
    { title: "Flavor Profile Radar", desc: "Interactive radar chart mapping your average scores across nose, taste, finish, balance, and overall." },
    { title: "Profile Comparison", desc: "Compare your radar profile against friends' averages or the global community to see where you differ." },
    { title: "Taste Evolution", desc: "A trend chart showing how your average ratings develop over months — with rising, stable, or dropping indicators." },
    { title: "Consistency Score", desc: "Measures your scoring stability: standard deviation, range, and a label from 'Very Consistent' to 'Highly Variable'." },
    { title: "Palate DNA", desc: "Identifies your style (e.g., 'Peated & Islay') and sweet spot (your favorite region/cask combination) from high scores." },
    { title: "Personal Whisky Journal", desc: "Every dram you taste — solo or in a group — is automatically logged with notes, scores, and metadata." },
    { title: "Whisky Recommendations", desc: "Factor-based engine: region preference (35%), cask affinity (25%), peat matching (25%), community ratings (15%)." },
    { title: "Side-by-Side Comparison", desc: "Overlay up to 3 whiskies on a single radar chart. Compare your scores vs. the platform median for every bottle." },
    { title: "Badges & Achievements", desc: "Gamified milestones: Basic (First Sip), Regional (Islay Pilgrim), Expert (Living Legend for 1,000+ ratings)." },
    { title: "Collection Analysis", desc: "Portfolio value calculation, region distribution, age buckets, ABV spectrum, vintage timeline, and hidden gems." },
  ];
  y = drawFeatureList(doc, personalFeatures, y, 2);

  // ── Page 5: AI Features (7 features) ──
  doc.addPage();
  drawPageBg(doc);
  y = drawHeader(doc, "AI-Powered Features", 28);
  y = drawSubheader(doc, "Artificial intelligence that makes your whisky experience smarter.", y);
  y += 4;
  y = drawCategoryHeader(doc, "C. AI Features", "7 features", y);

  const aiFeatures: FeatureItem[] = [
    { title: "Bottle Recognition", desc: "Point your camera at any bottle label. GPT-4o Vision identifies the whisky and fills in distillery, age, ABV, cask type, and region." },
    { title: "Label OCR", desc: "Reads text from bottle labels, menu cards, and even handwritten tasting sheets. Multi-bottle detection from shelf photos." },
    { title: "AI Tasting Notes", desc: "Generate professional tasting notes from your keywords. Multilingual support (German/English) with categorized flavor library." },
    { title: "AI Enrichment", desc: "Automatic 'Did you know?' facts, food pairing suggestions, and serving recommendations for every whisky." },
    { title: "Market Price Estimation", desc: "AI estimates the current market value of bottles in your collection based on distillery, age, and rarity." },
    { title: "AI Menu Card Cover", desc: "DALL-E generates context-aware cover images for tasting menu cards — based on region, season, cask types, and mood." },
    { title: "AI Tasting Import", desc: "Parse unstructured documents (PDFs, Excel files, photos) into structured tasting events with complete whisky data." },
  ];
  y = drawFeatureList(doc, aiFeatures, y, 2);

  // ── Page 6: Community & Circle (6 features) ──
  doc.addPage();
  drawPageBg(doc);
  y = drawHeader(doc, "Community & Circle", 28);
  y = drawSubheader(doc, "Taste together. Compare. Discover who shares your palate.", y);
  y += 4;
  y = drawCategoryHeader(doc, "D. Community & Circle", "6 features", y);

  const communityFeatures: FeatureItem[] = [
    { title: "Taste Twins", desc: "Correlation engine that matches your ratings with others. Categories: Twin (≥80%), Similar (≥50%), Related (≥30%), Different." },
    { title: "Leaderboards", desc: "Multi-category rankings: Most Active (ratings count), Most Detailed (note length), Highest Rated, and Explorer (variety)." },
    { title: "Activity Feed", desc: "Real-time stream of what friends are tasting — solo drams and group sessions, with relative timestamps." },
    { title: "Friend Management", desc: "Search and add friends by name or email. Pending requests, online status notifications, and connection management." },
    { title: "Community Rankings", desc: "Aggregated whisky scores across the community. Filter by region and category. Compare your score vs. the group average." },
    { title: "Historical Tastings", desc: "Searchable archive of past events with cross-tasting analytics: top whiskies, region breakdowns, and smokiness insights." },
  ];
  y = drawFeatureList(doc, communityFeatures, y, 2);

  // ── Page 7: Whisky Database & Collection (5 features) ──
  doc.addPage();
  drawPageBg(doc);
  y = drawHeader(doc, "Whisky Database & Collection", 28);
  y = drawSubheader(doc, "Manage your bottles, explore the world of whisky.", y);
  y += 4;
  y = drawCategoryHeader(doc, "E. Whisky Database & Collection", "5 features", y);

  const dbFeatures: FeatureItem[] = [
    { title: "Whiskybase Integration", desc: "Lookup by ID, CSV/Excel import of your collection, deep links to Whiskybase pages, and automatic image fetching." },
    { title: "Barcode Scanner", desc: "Camera-based barcode scanning for instant bottle lookup. Rate-limited and cached for reliable performance." },
    { title: "Collection Sync", desc: "Smart synchronization via CSV re-upload. Detects new items, removed bottles, and changed ratings automatically." },
    { title: "Knowledge Hub", desc: "Built-in whisky lexicon, interactive distillery map, bottler database, and a structured tasting guide." },
    { title: "Wishlist", desc: "Track bottles you want to find. Integrated with collection and journal for a complete whisky inventory." },
  ];
  y = drawFeatureList(doc, dbFeatures, y, 2);

  // ── Page 8: CTA ──
  doc.addPage();
  drawPageBg(doc);

  doc.setFont(FONT_BODY, "bold");
  doc.setFontSize(36);
  doc.setTextColor(...hexToRgb(TEXT));
  doc.text("Start your next tasting.", pw / 2, ph / 2 - 16, { align: "center" });

  drawAccentLine(doc, ph / 2 - 6, 50);

  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(MUTED));
  doc.text("Open CaskSense and create your first session in under a minute.", pw / 2, ph / 2 + 10, { align: "center" });

  doc.setFont(FONT_BODY, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...hexToRgb(ACCENT));
  doc.text("casksense.com", pw / 2, ph / 2 + 30, { align: "center" });

  doc.setFont(FONT_BODY, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(MUTED));
  doc.text("44+ features · Blind tastings · AI-powered · Free to use", pw / 2, ph / 2 + 42, { align: "center" });

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont(FONT_BODY, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(MUTED));
    if (i > 1) {
      doc.text(`CaskSense Feature Presentation`, 16, ph - 8);
    }
    doc.text(`${i} / ${totalPages}`, pw - 16, ph - 8, { align: "right" });
  }

  doc.save("CaskSense-Feature-Presentation.pdf");
}
