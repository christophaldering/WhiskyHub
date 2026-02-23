import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Info, Rocket, BarChart3, Wrench, Bug, Shield, Palette, Filter, Users, Wine, BookOpen, Code2, Glasses, Brain, Globe, Camera, FileSpreadsheet, ClipboardPaste, FileUp, LayoutGrid, Calendar, Eye, Sliders, MessageCircle, TrendingUp } from "lucide-react";
import aboutNose from "@/assets/images/about-nose.png";
import aboutTaste from "@/assets/images/about-taste.png";
import aboutReflect from "@/assets/images/about-reflect.png";
import aboutJournal from "@/assets/images/about-journal.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import authorPhoto from "@assets/22A3ABF8-0085-4C82-97DF-EAA0ACD46B4E_1771448218726.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

type Block = {
  heading?: string;
  lines: string[];
  italic?: boolean;
  accent?: boolean;
};

export default function About() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("about");

  return (
    <div className="min-h-screen bg-background min-w-0 overflow-x-hidden" data-testid="about-page">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative py-12 md:py-20 text-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-4"
          >
            CaskSense
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="text-3xl md:text-5xl font-serif font-bold text-primary tracking-tight mb-4"
            data-testid="text-about-title"
          >
            {t("about.title")}
          </motion.h1>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-4 h-px w-24 mx-auto bg-primary/30"
          />
        </div>
      </motion.div>

      <div className="max-w-3xl mx-auto px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="about" className="gap-1.5" data-testid="tab-about-story">
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("about.tabStory")}</span>
              <span className="sm:hidden">{t("about.tabStoryShort")}</span>
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-1.5" data-testid="tab-about-overview">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("about.tabOverview")}</span>
              <span className="sm:hidden">{t("about.tabOverviewShort")}</span>
            </TabsTrigger>
            <TabsTrigger value="changelog" className="gap-1.5" data-testid="tab-about-changelog">
              <Rocket className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("about.tabChangelog")}</span>
              <span className="sm:hidden">{t("about.tabChangelogShort")}</span>
            </TabsTrigger>
            <TabsTrigger value="platform" className="gap-1.5" data-testid="tab-about-platform">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("about.tabPlatform")}</span>
              <span className="sm:hidden">{t("about.tabPlatformShort")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewSection />
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <AboutStorySection />
          </TabsContent>

          <TabsContent value="changelog" className="mt-6">
            <ChangelogSection />
          </TabsContent>

          <TabsContent value="platform" className="mt-6">
            <PlatformSection />
          </TabsContent>
        </Tabs>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="py-12 text-center border-t border-border/30"
        >
          <button
            onClick={() => navigate("/app")}
            className="inline-flex items-center gap-2 px-8 py-3 border border-primary/40 text-primary rounded-sm font-serif text-sm tracking-wide hover:bg-primary/5 transition-colors"
            data-testid="button-about-back"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("about.backToApp")}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function OverviewSection() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const features = [
    { icon: Glasses, titleKey: "landing.features.blindTasting", descKey: "landing.features.blindTastingDesc", color: "text-amber-600 bg-amber-600/10" },
    { icon: Brain, titleKey: "landing.features.aiImport", descKey: "landing.features.aiImportDesc", color: "text-orange-500 bg-orange-500/10" },
    { icon: BookOpen, titleKey: "landing.features.journal", descKey: "landing.features.journalDesc", color: "text-amber-700 bg-amber-700/10" },
    { icon: BarChart3, titleKey: "landing.features.analytics", descKey: "landing.features.analyticsDesc", color: "text-yellow-600 bg-yellow-600/10" },
    { icon: Users, titleKey: "landing.features.community", descKey: "landing.features.communityDesc", color: "text-orange-600 bg-orange-600/10" },
    { icon: Globe, titleKey: "landing.features.encyclopedia", descKey: "landing.features.encyclopediaDesc", color: "text-amber-500 bg-amber-500/10" },
  ];

  const steps = [
    { icon: FileUp, titleKey: "landing.steps.create", descKey: "landing.steps.createDesc", num: "01" },
    { icon: Users, titleKey: "landing.steps.invite", descKey: "landing.steps.inviteDesc", num: "02" },
    { icon: Wine, titleKey: "landing.steps.taste", descKey: "landing.steps.tasteDesc", num: "03" },
  ];

  const importCards = [
    { icon: Camera, title: t("landing.ai.card1Title"), desc: t("landing.ai.card1Desc"), color: "text-amber-500 bg-amber-500/15" },
    { icon: FileSpreadsheet, title: t("landing.ai.card2Title"), desc: t("landing.ai.card2Desc"), color: "text-orange-500 bg-orange-500/15" },
    { icon: ClipboardPaste, title: t("landing.ai.card3Title"), desc: t("landing.ai.card3Desc"), color: "text-yellow-600 bg-yellow-600/15" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-lg font-serif font-bold text-primary mb-2">{t("landing.features.title")}</h3>
        <p className="text-sm text-muted-foreground mb-5">{t("landing.features.subtitle")}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.div
              key={f.titleKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full" data-testid={`about-feature-${i}`}>
                <CardContent className="p-4 flex gap-3">
                  <div className={`w-10 h-10 rounded-lg ${f.color} flex items-center justify-center shrink-0`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-serif font-semibold text-sm text-primary">{t(f.titleKey)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(f.descKey)}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-serif font-bold text-primary mb-5">{t("landing.howItWorks.title")}</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.titleKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full text-center" data-testid={`about-step-${i}`}>
                <CardContent className="p-4">
                  <div className="text-2xl font-serif font-black text-primary/20 mb-2">{step.num}</div>
                  <step.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-serif font-semibold text-sm text-primary">{t(step.titleKey)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t(step.descKey)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-serif font-bold text-primary mb-2">{t("landing.ai.title")}</h3>
        <p className="text-sm text-muted-foreground mb-5">{t("landing.ai.subtitle")}</p>
        <div className="space-y-3">
          {importCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card data-testid={`about-import-${i}`}>
                <CardContent className="p-4 flex gap-3 items-start">
                  <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center shrink-0`}>
                    <card.icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="font-serif font-semibold text-sm text-primary">{card.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="border-t border-border/20 pt-8">
        <h3 className="text-lg font-serif font-bold text-primary mb-2">{t("about.methodTitle")}</h3>
        <p className="text-sm text-muted-foreground mb-5">{t("about.methodSubtitle")}</p>
        <div className="space-y-3">
          {([
            { image: aboutNose, key: "section1", icon: Eye, color: "text-amber-600 bg-amber-600/10" },
            { image: aboutTaste, key: "section2", icon: Sliders, color: "text-orange-500 bg-orange-500/10" },
            { image: aboutReflect, key: "section3", icon: MessageCircle, color: "text-yellow-600 bg-yellow-600/10" },
            { image: aboutJournal, key: "section4", icon: TrendingUp, color: "text-amber-700 bg-amber-700/10" },
          ] as const).map((item, i) => {
            const paragraphs = t(`aboutMethod.${item.key}Paragraphs`, { returnObjects: true }) as string[];
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card data-testid={`about-method-${i}`}>
                  <CardContent className="p-4 flex gap-4 items-start">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0">
                      <img src={item.image} alt={t(`aboutMethod.${item.key}Title`)} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 rounded ${item.color} flex items-center justify-center shrink-0`}>
                          <item.icon className="w-3.5 h-3.5" />
                        </div>
                        <p className="font-serif font-semibold text-sm text-primary">{t(`aboutMethod.${item.key}Title`)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{paragraphs[0]}</p>
                      {paragraphs[1] && (
                        <p className="text-xs text-muted-foreground/70 leading-relaxed mt-1">{paragraphs[1]}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="text-center pt-2">
        <button
          onClick={() => {
            if (window.confirm(t("nav.landingPageConfirm"))) {
              navigate("/");
            }
          }}
          className="inline-flex items-center gap-2 px-6 py-2.5 border border-primary/30 text-primary rounded-sm font-serif text-sm tracking-wide hover:bg-primary/5 transition-colors"
          data-testid="button-about-homepage"
        >
          <Globe className="w-4 h-4" />
          {t("nav.landingPage")}
        </button>
      </div>
    </div>
  );
}

function AboutStorySection() {
  const { t } = useTranslation();
  const blocks = t("about.blocks", { returnObjects: true }) as Block[];

  return (
    <>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.7 }}
        className="mb-12 flex justify-center"
      >
        <div className="relative rounded-lg overflow-hidden shadow-2xl max-w-sm w-full">
          <img
            src={authorPhoto}
            alt="Christoph Aldering & Sammy"
            className="w-full h-auto object-cover"
            data-testid="img-about-author"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      </motion.div>

      <div className="space-y-8 pb-6">
        {blocks.map((block, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.6, delay: 0.05 * i }}
            data-testid={`about-block-${i}`}
          >
            {block.heading ? (
              <h2 className="text-xl md:text-2xl font-serif font-bold text-primary tracking-tight mb-3">
                {block.heading}
              </h2>
            ) : null}
            {block.lines.map((line, j) => (
              <p
                key={j}
                className={`font-serif leading-relaxed text-base md:text-lg ${
                  block.italic ? "italic text-muted-foreground/80" : "text-muted-foreground"
                } ${block.accent ? "text-primary font-semibold text-lg md:text-xl" : ""} ${j > 0 ? "mt-3" : ""}`}
              >
                {line}
              </p>
            ))}
          </motion.div>
        ))}

        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-right font-serif text-primary font-semibold text-lg pt-4"
          data-testid="text-about-signature"
        >
          — Christoph Aldering
        </motion.p>
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="mt-10 pt-8 border-t border-border/30"
        data-testid="about-contact-section"
      >
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-primary">{t("about.contactTitle")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("about.contactNotice")}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("about.contactFeedback")}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={`mailto:${t("about.contactEmail")}`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                data-testid="link-about-email"
              >
                <Code2 className="w-4 h-4" />
                {t("about.contactEmail")}
              </a>
              <a
                href={t("about.contactLinkedInUrl")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                data-testid="link-about-linkedin"
              >
                <Globe className="w-4 h-4" />
                {t("about.contactLinkedIn")}
              </a>
            </div>
            <p className="text-xs text-muted-foreground/60 italic pt-1">{t("about.donationHint")}</p>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

const CHANGELOG_CAT_CONFIG: Record<string, { icon: typeof Rocket; label: string; color: string }> = {
  feature: { icon: Rocket, label: "Neues Feature", color: "text-blue-600 bg-blue-600/10" },
  improvement: { icon: Wrench, label: "Verbesserung", color: "text-green-600 bg-green-600/10" },
  bugfix: { icon: Bug, label: "Bugfix", color: "text-orange-600 bg-orange-600/10" },
  security: { icon: Shield, label: "Sicherheit", color: "text-red-600 bg-red-600/10" },
  design: { icon: Palette, label: "Design/UX", color: "text-purple-600 bg-purple-600/10" },
};

const TIME_PRESETS = [
  { value: "7d", label: "Letzte 7 Tage" },
  { value: "30d", label: "Letzter Monat" },
  { value: "90d", label: "Letzte 3 Monate" },
  { value: "365d", label: "Dieses Jahr" },
  { value: "all", label: "Alles" },
  { value: "custom", label: "Benutzerdefiniert..." },
];

function ChangelogSection() {
  const { currentParticipant } = useAppStore();
  const isAdmin = currentParticipant?.role === "admin";
  const [category, setCategory] = useState("all");
  const [timePreset, setTimePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const getDateRange = () => {
    if (timePreset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    if (timePreset === "all") return {};
    const days = parseInt(timePreset);
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: from.toISOString().split("T")[0] };
  };

  const dateRange = getDateRange();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["/api/changelog", category, timePreset, customFrom, customTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (dateRange.from) params.set("from", dateRange.from);
      if (dateRange.to) params.set("to", dateRange.to);
      const res = await fetch(`/api/changelog?${params}`);
      if (!res.ok) throw new Error("Failed to load changelog");
      return res.json();
    },
  });

  const publicCategories = ["feature", "improvement", "design"];
  const visibleEntries = isAdmin ? entries : entries.filter((e: any) => publicCategories.includes(e.category));
  const visibleCatConfig = isAdmin
    ? CHANGELOG_CAT_CONFIG
    : Object.fromEntries(Object.entries(CHANGELOG_CAT_CONFIG).filter(([key]) => publicCategories.includes(key)));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44" data-testid="changelog-filter-category">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {Object.entries(visibleCatConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timePreset} onValueChange={setTimePreset}>
          <SelectTrigger className="w-48" data-testid="changelog-filter-time">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_PRESETS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {timePreset === "custom" && (
          <div className="flex gap-2 items-center">
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-40" data-testid="changelog-from" />
            <span className="text-sm text-muted-foreground">bis</span>
            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-40" data-testid="changelog-to" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-3 bg-card border rounded-lg animate-pulse">
              <div className="h-4 bg-secondary rounded w-2/3 mb-2" />
              <div className="h-3 bg-secondary/60 rounded w-full" />
            </div>
          ))}
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="text-center py-8">
          <Rocket className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Keine Einträge für diesen Zeitraum.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleEntries.map((entry: any, i: number) => {
            const catConfig = CHANGELOG_CAT_CONFIG[entry.category] || CHANGELOG_CAT_CONFIG.feature;
            const CatIcon = catConfig.icon;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card data-testid={`changelog-entry-${entry.id}`}>
                  <CardContent className="p-3 sm:p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${catConfig.color}`}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-serif font-semibold">{entry.title}</p>
                        <Badge variant="outline" className="text-[10px]">{catConfig.label}</Badge>
                        {entry.version && (
                          <Badge variant="secondary" className="text-[10px] font-mono">v{entry.version}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                        {new Date(entry.date).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
                        {entry.date.includes("T") && `, ${new Date(entry.date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlatformSection() {
  const { t } = useTranslation();

  const { data: stats } = useQuery({
    queryKey: ["/api/platform-stats"],
    queryFn: async () => {
      const res = await fetch("/api/platform-stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
  });

  const { data: versionInfo } = useQuery({
    queryKey: ["/version"],
    queryFn: async () => {
      const res = await fetch("/version");
      if (!res.ok) throw new Error("Failed to load version");
      return res.json();
    },
  });

  const statItems = [
    { icon: Users, label: t("about.statParticipants"), value: stats?.totalParticipants ?? "–" },
    { icon: Wine, label: t("about.statTastings"), value: stats?.totalTastings ?? "–" },
    { icon: BookOpen, label: t("about.statWhiskies"), value: stats?.totalWhiskies ?? "–" },
    { icon: BarChart3, label: t("about.statRatings"), value: stats?.totalRatings ?? "–" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif font-bold text-primary mb-4">{t("about.liveStats")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardContent className="p-4 text-center">
                  <item.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-serif font-bold text-primary">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {versionInfo && (
        <div>
          <h3 className="text-lg font-serif font-bold text-primary mb-4">{t("about.versionInfo")}</h3>
          <Card className="overflow-hidden" data-testid="card-version-info">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-serif font-bold text-primary">v{versionInfo.version?.split(".")[0]}</span>
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-primary tracking-tight" data-testid="text-version-number">
                  v{versionInfo.version}
                </p>
                {versionInfo.releaseDate && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(versionInfo.releaseDate + "T00:00:00").toLocaleDateString(t("about.locale") || "de-DE", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
            <CardContent className="p-4 space-y-2 border-t border-border/30">
              {versionInfo.gitSha && (
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Build:</span>
                  <span className="text-sm font-mono">{versionInfo.gitSha}</span>
                </div>
              )}
              {versionInfo.buildTime && (
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("about.buildTime")}:</span>
                  <span className="text-sm font-mono text-muted-foreground">{new Date(versionInfo.buildTime).toLocaleString(t("about.locale") || "de-DE")}</span>
                </div>
              )}
              {versionInfo.env && (
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("about.environment")}:</span>
                  <Badge variant="outline" className="text-xs">{versionInfo.env}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
