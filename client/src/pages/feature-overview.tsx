import { useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  QrCode, Play, BookOpen, BarChart3, Camera, Heart,
  Users, Shield, Sparkles, Download, FileDown, Printer,
  Star, Trophy, Radar, Eye, EyeOff, Mic, Globe,
  Settings, Archive, Calendar, Mail, ChevronLeft,
  Palette, Layers, Brain, Search, Wine, ClipboardList,
  Share2, Lock, UserCheck, Gauge, PieChart, TrendingUp,
  Target, Zap, MessageSquare, Image as ImageIcon,
  Languages, ListFilter, FileText, Headphones, LayoutList,
} from "lucide-react";
import { v } from "@/lib/themeVars";
import jsPDF from "jspdf";
import { saveJsPdf } from "@/lib/pdf";

const ACCENT = "#c8a97e";

const font = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "0 24px",
};

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface Category {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  features: Feature[];
}

const categories: Category[] = [
  {
    id: "participation",
    title: "Participation & Rating",
    subtitle: "Join tastings and rate whiskies with precision.",
    icon: <Star style={{ width: 20, height: 20 }} />,
    features: [
      { icon: <QrCode style={{ width: 18, height: 18 }} />, title: "QR Code Join", description: "Scan a QR code or enter a session code to join any tasting instantly." },
      { icon: <Radar style={{ width: 18, height: 18 }} />, title: "Multi-Dimensional Rating", description: "Rate whiskies across nose, palate, finish, and overall with fine-grained sliders." },
      { icon: <Palette style={{ width: 18, height: 18 }} />, title: "Flavor Chip Selection", description: "Choose from curated flavor descriptors to capture your tasting notes precisely." },
      { icon: <Mic style={{ width: 18, height: 18 }} />, title: "Voice Memos", description: "Record short audio notes during a tasting — automatically transcribed by AI." },
      { icon: <EyeOff style={{ width: 18, height: 18 }} />, title: "Blind Mode", description: "Rate without knowing the bottle — pure palate, no bias." },
      { icon: <Eye style={{ width: 18, height: 18 }} />, title: "Context Levels", description: "Three-tier visibility control: Naked, Self, and Full — choose how much you see during a session." },
      { icon: <Shield style={{ width: 18, height: 18 }} />, title: "Guest Mode", description: "Participate as a guest with Standard Naked or Ultra Naked (ephemeral) identity." },
      { icon: <MessageSquare style={{ width: 18, height: 18 }} />, title: "Discussion Panel", description: "Share impressions in real time with other participants during a live tasting." },
      { icon: <Headphones style={{ width: 18, height: 18 }} />, title: "Voice Memo Playback", description: "Listen to recorded audio memos and read AI-generated transcripts directly in the dram detail view." },
    ],
  },
  {
    id: "hosting",
    title: "Hosting & Management",
    subtitle: "Create, manage, and run tastings with ease.",
    icon: <Play style={{ width: 20, height: 20 }} />,
    features: [
      { icon: <Zap style={{ width: 18, height: 18 }} />, title: "60-Second Setup", description: "Create a complete tasting session in under a minute with the guided host wizard." },
      { icon: <Layers style={{ width: 18, height: 18 }} />, title: "Flight Board", description: "Organize whiskies into flights and guide participants through each one." },
      { icon: <Users style={{ width: 18, height: 18 }} />, title: "Participant Management", description: "Invite participants via link, QR code, or email — track who has joined." },
      { icon: <ClipboardList style={{ width: 18, height: 18 }} />, title: "Host Dashboard", description: "Live control center with session status, whisky lineup, participant roster, and ratings." },
      { icon: <Play style={{ width: 18, height: 18 }} />, title: "Session State Machine", description: "Guide tastings through draft → open → closed → reveal → archived stages." },
      { icon: <Mail style={{ width: 18, height: 18 }} />, title: "Invite System", description: "Share personalized invite links with automatic session joining." },
      { icon: <Calendar style={{ width: 18, height: 18 }} />, title: "Tasting Calendar", description: "Plan and schedule upcoming tastings with calendar integration." },
      { icon: <Printer style={{ width: 18, height: 18 }} />, title: "Tasting Menu Card", description: "AI-generated cover image with multi-page PDF: cover, participants, and whisky lineup." },
      { icon: <BookOpen style={{ width: 18, height: 18 }} />, title: "Briefing Notes", description: "Prepare host notes for each whisky to guide the conversation." },
      { icon: <Sparkles style={{ width: 18, height: 18 }} />, title: "Curation Wizard", description: "Get AI suggestions for building the perfect whisky lineup." },
    ],
  },
  {
    id: "analytics",
    title: "Analytics & AI",
    subtitle: "Instant insights powered by intelligence.",
    icon: <BarChart3 style={{ width: 20, height: 20 }} />,
    features: [
      { icon: <BarChart3 style={{ width: 18, height: 18 }} />, title: "Instant Results", description: "See ranked results with average scores and breakdowns the moment a tasting closes." },
      { icon: <PieChart style={{ width: 18, height: 18 }} />, title: "Group Comparison", description: "Compare ratings across participants to discover consensus and outliers." },
      { icon: <Sparkles style={{ width: 18, height: 18 }} />, title: "AI Summaries", description: "GPT-4o generates narrative stories from session data, quotes, and voice memos." },
      { icon: <TrendingUp style={{ width: 18, height: 18 }} />, title: "Score Normalization", description: "All scores normalized to 0–100 for fair cross-source comparison." },
      { icon: <Gauge style={{ width: 18, height: 18 }} />, title: "Benchmark Analysis", description: "Compare your ratings against community baselines and growing benchmarks." },
      { icon: <FileDown style={{ width: 18, height: 18 }} />, title: "Print-Ready Reports", description: "Export tasting results as beautifully formatted PDFs." },
      { icon: <Camera style={{ width: 18, height: 18 }} />, title: "Bottle Identification", description: "Point your camera at a bottle — AI identifies name, distillery, age, ABV, and region." },
      { icon: <Brain style={{ width: 18, height: 18 }} />, title: "Connoisseur Report", description: "AI-generated personal whisky profile analyzing your ratings, collection, and flavor preferences." },
      { icon: <Target style={{ width: 18, height: 18 }} />, title: "Market Price Estimation", description: "AI estimates current market prices based on bottle details." },
      { icon: <Search style={{ width: 18, height: 18 }} />, title: "Whiskybase Lookup", description: "Auto-fill whisky details via Whiskybase ID or camera-based barcode scanning." },
      { icon: <Languages style={{ width: 18, height: 18 }} />, title: "AI Language Selection", description: "Choose between German and English for all AI-generated outputs including summaries, reports, and tasting notes." },
    ],
  },
  {
    id: "solo",
    title: "Solo & Diary",
    subtitle: "Your personal whisky companion.",
    icon: <BookOpen style={{ width: 20, height: 20 }} />,
    features: [
      { icon: <Wine style={{ width: 18, height: 18 }} />, title: "Log a Dram", description: "Capture any evening dram in three taps — photo, rate, done." },
      { icon: <BookOpen style={{ width: 18, height: 18 }} />, title: "Whisky Diary", description: "Build a personal tasting diary with notes, photos, and scores over time." },
      { icon: <Radar style={{ width: 18, height: 18 }} />, title: "Flavor Profile", description: "Watch your personal flavor preferences emerge with every sip you log." },
      { icon: <Star style={{ width: 18, height: 18 }} />, title: "Wishlist", description: "Keep track of bottles you want to try next." },
      { icon: <Archive style={{ width: 18, height: 18 }} />, title: "Collection Sync", description: "Import and sync your Whiskybase collection via CSV upload." },
      { icon: <TrendingUp style={{ width: 18, height: 18 }} />, title: "Personal Analytics", description: "Track your tasting patterns, preferred regions, and flavor evolution." },
      { icon: <ImageIcon style={{ width: 18, height: 18 }} />, title: "Photo Tasting", description: "Photograph a bottle for instant AI identification and logging." },
      { icon: <Mic style={{ width: 18, height: 18 }} />, title: "Solo Voice Memos", description: "Record voice notes for your diary entries — transcribed automatically." },
      { icon: <ListFilter style={{ width: 18, height: 18 }} />, title: "Dram Overview", description: "Browse all your logged drams with statistics, search, and filtered views by region, type, or rating." },
      { icon: <FileText style={{ width: 18, height: 18 }} />, title: "Parsed Tasting Notes", description: "AI-generated tasting notes are parsed into structured scores and flavor chips for quick visual reference." },
    ],
  },
  {
    id: "community",
    title: "Community & Circle",
    subtitle: "Not a social network. Something better.",
    icon: <Heart style={{ width: 20, height: 20 }} />,
    features: [
      { icon: <Heart style={{ width: 18, height: 18 }} />, title: "Taste Twins", description: "Discover who rates like you — find your palate match in the community." },
      { icon: <Users style={{ width: 18, height: 18 }} />, title: "Palate Comparison", description: "Compare your flavor profile side-by-side with friends." },
      { icon: <Trophy style={{ width: 18, height: 18 }} />, title: "Leaderboard", description: "See community rankings based on tasting activity and accuracy." },
      { icon: <Share2 style={{ width: 18, height: 18 }} />, title: "Activity Feed", description: "Stay connected with recent community tasting activity." },
      { icon: <Lock style={{ width: 18, height: 18 }} />, title: "Privacy First", description: "No public feed, no followers — your data stays private by default." },
      { icon: <Star style={{ width: 18, height: 18 }} />, title: "Recommendations", description: "Get personalized whisky suggestions based on your taste profile." },
      { icon: <UserCheck style={{ width: 18, height: 18 }} />, title: "Friend Management", description: "Connect with tasting partners and track shared sessions." },
    ],
  },
  {
    id: "discover",
    title: "Discover & Knowledge",
    subtitle: "Explore the world of whisky.",
    icon: <Globe style={{ width: 20, height: 20 }} />,
    features: [
      { icon: <Search style={{ width: 18, height: 18 }} />, title: "Whisky Lexicon", description: "Searchable encyclopedia of whisky terms, tasting vocabulary, and production methods." },
      { icon: <Globe style={{ width: 18, height: 18 }} />, title: "Distillery Explorer", description: "Browse distilleries by region, style, and history." },
      { icon: <Layers style={{ width: 18, height: 18 }} />, title: "Bottler Directory", description: "Discover independent bottlers and their offerings." },
      { icon: <BookOpen style={{ width: 18, height: 18 }} />, title: "Tasting Guide", description: "Structured approach to nosing, tasting, and evaluating whisky." },
      { icon: <Brain style={{ width: 18, height: 18 }} />, title: "Research & Method", description: "In-depth articles on tasting methodology and sensory science." },
      { icon: <Wine style={{ width: 18, height: 18 }} />, title: "Food Pairings", description: "Curated whisky and food pairing suggestions based on flavor profiles." },
    ],
  },
  {
    id: "admin",
    title: "Admin & Tools",
    subtitle: "Platform management and advanced features.",
    icon: <Settings style={{ width: 20, height: 20 }} />,
    features: [
      { icon: <Settings style={{ width: 18, height: 18 }} />, title: "Admin Panel", description: "Manage participants, test data, AI controls, and platform settings." },
      { icon: <Globe style={{ width: 18, height: 18 }} />, title: "Internationalization", description: "Full English and German language support across the entire platform." },
      { icon: <Download style={{ width: 18, height: 18 }} />, title: "Data Export", description: "Export your data in multiple formats including PDF and Excel." },
      { icon: <Archive style={{ width: 18, height: 18 }} />, title: "Historical Archive", description: "Import and browse archived tastings with detailed insights and reconciliation tools." },
      { icon: <Layers style={{ width: 18, height: 18 }} />, title: "Template Library", description: "Choose from curated tasting templates for different occasions." },
      { icon: <Palette style={{ width: 18, height: 18 }} />, title: "Theme System", description: "Switch between Dark Warm and Light Warm themes." },
      { icon: <Trophy style={{ width: 18, height: 18 }} />, title: "Achievement Badges", description: "Earn badges for tasting milestones and participation." },
      { icon: <Sparkles style={{ width: 18, height: 18 }} />, title: "Making-Of Timeline", description: "Interactive development story told through whisky metaphors." },
      { icon: <LayoutList style={{ width: 18, height: 18 }} />, title: "Feature Overview", description: "Comprehensive feature catalog with category navigation and one-click PDF export." },
    ],
  },
];

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function generateFeatureOverviewPDF() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const BG = "#1a1714";
  const TEXT = "#f5f0e8";
  const MUTED = "#8a7e6d";
  const ACC = "#c8a97e";

  function drawBg() {
    doc.setFillColor(...rgb(BG));
    doc.rect(0, 0, pw, ph, "F");
  }

  drawBg();

  doc.setFillColor(...rgb(ACC));
  doc.rect(0, 0, pw, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(...rgb(TEXT));
  doc.text("CaskSense", pw / 2, 45, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(14);
  doc.setTextColor(...rgb(ACC));
  doc.text("The Full Picture", pw / 2, 56, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...rgb(MUTED));
  doc.text("Complete Feature Overview", pw / 2, 66, { align: "center" });

  doc.setDrawColor(...rgb(ACC));
  doc.setLineWidth(0.3);
  doc.line(pw / 2 - 30, 72, pw / 2 + 30, 72);

  let y = 85;
  const marginLeft = 20;
  const contentWidth = pw - 40;

  categories.forEach((cat) => {
    if (y > ph - 40) {
      doc.addPage();
      drawBg();
      y = 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...rgb(ACC));
    doc.text(cat.title, marginLeft, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...rgb(MUTED));
    doc.text(cat.subtitle, marginLeft, y);
    y += 8;

    doc.setDrawColor(...rgb(ACC));
    doc.setLineWidth(0.15);
    doc.line(marginLeft, y, marginLeft + contentWidth, y);
    y += 6;

    cat.features.forEach((feat) => {
      if (y > ph - 20) {
        doc.addPage();
        drawBg();
        y = 25;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...rgb(TEXT));
      doc.text(feat.title, marginLeft + 4, y);
      y += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...rgb(MUTED));
      const lines = doc.splitTextToSize(feat.description, contentWidth - 8);
      doc.text(lines, marginLeft + 4, y);
      y += lines.length * 4 + 3;
    });

    y += 6;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...rgb(MUTED));
    doc.text(`CaskSense — The Full Picture`, marginLeft, ph - 8);
    doc.text(`${i} / ${totalPages}`, pw - marginLeft, ph - 8, { align: "right" });
  }

  saveJsPdf(doc, "CaskSense-Feature-Overview.pdf");
}

function CategorySection({ category, index }: { category: Category; index: number }) {
  return (
    <section style={{ padding: "80px 0", borderBottom: `1px solid ${v.border}` }} id={category.id}>
      <FadeUp>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `${ACCENT}10`, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: ACCENT,
          }}>
            {category.icon}
          </div>
          <div>
            <h2 style={{
              fontFamily: font.display, fontSize: "clamp(24px, 3vw, 32px)",
              fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
              lineHeight: 1.2, margin: 0,
            }} data-testid={`text-category-title-${category.id}`}>
              {category.title}
            </h2>
            <p style={{
              fontFamily: font.body, fontSize: 14, color: v.muted,
              margin: "4px 0 0",
            }}>
              {category.subtitle}
            </p>
          </div>
        </div>
      </FadeUp>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 16, marginTop: 32,
      }}>
        {category.features.map((feat, i) => (
          <FadeUp key={feat.title} delay={0.04 + i * 0.03}>
            <div style={{
              background: v.card, border: `1px solid ${v.border}`,
              borderRadius: 14, padding: "20px 20px",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }} data-testid={`card-feature-${feat.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${ACCENT}08`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: ACCENT, marginTop: 2,
                }}>
                  {feat.icon}
                </div>
                <div>
                  <h3 style={{
                    fontFamily: font.display, fontSize: 17, fontWeight: 500,
                    color: v.text, margin: "0 0 4px", letterSpacing: "-0.01em",
                  }}>
                    {feat.title}
                  </h3>
                  <p style={{
                    fontFamily: font.body, fontSize: 13, color: v.muted,
                    lineHeight: 1.6, margin: 0,
                  }}>
                    {feat.description}
                  </p>
                </div>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

function TableOfContents() {
  return (
    <FadeUp delay={0.2}>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10,
        justifyContent: "center", marginTop: 40,
      }}>
        {categories.map((cat) => (
          <a
            key={cat.id}
            href={`#${cat.id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(cat.id)?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 10,
              background: v.card, border: `1px solid ${v.border}`,
              fontFamily: font.body, fontSize: 13, fontWeight: 500,
              color: v.muted, textDecoration: "none",
              transition: "border-color 0.2s, color 0.2s",
            }}
            data-testid={`link-toc-${cat.id}`}
          >
            <span style={{ color: ACCENT }}>{cat.icon}</span>
            {cat.title}
          </a>
        ))}
      </div>
    </FadeUp>
  );
}

export default function FeatureOverview() {
  const [downloading, setDownloading] = useState(false);

  const totalFeatures = categories.reduce((sum, c) => sum + c.features.length, 0);

  const handleDownload = () => {
    setDownloading(true);
    try {
      generateFeatureOverviewPDF();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      background: v.bg, color: v.text,
      minHeight: "100dvh", overflowX: "hidden",
    }}>
      <div style={containerStyle}>
        <div style={{ padding: "24px 0" }}>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: font.body, fontSize: 14, fontWeight: 400,
            color: v.muted, textDecoration: "none",
          }} data-testid="link-back-landing">
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back
          </Link>
        </div>

        <section style={{ textAlign: "center", padding: "60px 0 40px" }}>
          <FadeUp>
            <p style={{
              fontFamily: font.body, fontSize: 13, fontWeight: 500,
              letterSpacing: "0.15em", textTransform: "uppercase",
              color: ACCENT, marginBottom: 20,
            }}>
              The Full Picture
            </p>
            <h1 style={{
              fontFamily: font.display, fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
              lineHeight: 1.1, marginBottom: 20,
            }} data-testid="text-page-title">
              Everything CaskSense
            </h1>
            <p style={{
              fontFamily: font.body, fontSize: "clamp(15px, 1.6vw, 18px)",
              color: v.muted, lineHeight: 1.6, maxWidth: 520,
              margin: "0 auto 12px",
            }}>
              {totalFeatures} features across {categories.length} categories — built for whisky lovers who care about the details.
            </p>
          </FadeUp>

          <FadeUp delay={0.15}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 28px", marginTop: 20,
                borderRadius: 12, border: `1px solid ${v.border}`,
                background: "transparent", color: v.muted,
                fontFamily: font.body, fontSize: 14, fontWeight: 500,
                cursor: downloading ? "not-allowed" : "pointer",
                opacity: downloading ? 0.5 : 1,
                transition: "all 0.2s",
              }}
              data-testid="button-download-feature-pdf"
            >
              <Download style={{ width: 16, height: 16 }} />
              {downloading ? "Creating PDF..." : "Download as PDF"}
            </button>
          </FadeUp>

          <TableOfContents />
        </section>

        {categories.map((cat, i) => (
          <CategorySection key={cat.id} category={cat} index={i} />
        ))}

        <section style={{ padding: "80px 0 40px", textAlign: "center" }}>
          <FadeUp>
            <h2 style={{
              fontFamily: font.display, fontSize: "clamp(24px, 3.5vw, 40px)",
              fontWeight: 400, color: v.text, letterSpacing: "-0.02em",
              lineHeight: 1.15, marginBottom: 24,
            }}>
              Ready to explore?
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <Link href="/m2" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "16px 40px", background: v.accent, color: v.bg,
                fontFamily: font.body, fontSize: 16, fontWeight: 600,
                borderRadius: 50, textDecoration: "none",
                transition: "transform 0.2s",
              }} data-testid="cta-open-casksense">
                Open CaskSense
              </Link>
              <Link href="/" style={{
                fontFamily: font.body, fontSize: 14, fontWeight: 400,
                color: v.muted, textDecoration: "none",
              }} data-testid="link-back-home">
                ← Back to home
              </Link>
            </div>
          </FadeUp>
        </section>

        <footer style={{ padding: "40px 0", textAlign: "center", borderTop: `1px solid ${v.border}` }}>
          <p style={{ fontFamily: font.body, fontSize: 13, color: v.mutedLight }}>
            CaskSense — Where tasting becomes reflection.
          </p>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 12 }}>
            <Link href="/impressum" data-testid="link-footer-impressum" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>Impressum</Link>
            <Link href="/privacy" data-testid="link-footer-privacy" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" data-testid="link-footer-terms" style={{ fontFamily: font.body, fontSize: 12, color: v.muted, textDecoration: "none" }}>Terms</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
