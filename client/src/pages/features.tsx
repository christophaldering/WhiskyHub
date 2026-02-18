import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Wine, NotebookPen, Trophy, Activity, CircleDot, Sparkles, GitCompareArrows,
  FileText, Download, Puzzle, Users, Rss, Medal, Calendar, LayoutDashboard,
  ClipboardList, Database, Brain, Library, Landmark, Map, BookOpen, Heart,
  ShieldAlert, Eye, EyeOff, MessageSquare, Lightbulb, QrCode, Volume2,
  Sun, Moon, Globe, Smartphone, X, Camera, Star, Archive
} from "lucide-react";

type Feature = {
  icon: any;
  titleKey: string;
  descKey: string;
  color: string;
};

const featureGroups: { groupKey: string; features: Feature[] }[] = [
  {
    groupKey: "tasting",
    features: [
      { icon: Wine, titleKey: "tastingSessions", descKey: "tastingSessionsDesc", color: "text-amber-600 dark:text-amber-400" },
      { icon: Eye, titleKey: "blindTasting", descKey: "blindTastingDesc", color: "text-violet-600 dark:text-violet-400" },
      { icon: EyeOff, titleKey: "revealPhase", descKey: "revealPhaseDesc", color: "text-purple-600 dark:text-purple-400" },
      { icon: MessageSquare, titleKey: "discussion", descKey: "discussionDesc", color: "text-sky-600 dark:text-sky-400" },
      { icon: Lightbulb, titleKey: "noteGenerator", descKey: "noteGeneratorDesc", color: "text-yellow-600 dark:text-yellow-400" },
      { icon: QrCode, titleKey: "qrInvites", descKey: "qrInvitesDesc", color: "text-teal-600 dark:text-teal-400" },
      { icon: Camera, titleKey: "photoTasting", descKey: "photoTastingDesc", color: "text-amber-600 dark:text-amber-400" },
    ],
  },
  {
    groupKey: "personal",
    features: [
      { icon: NotebookPen, titleKey: "journal", descKey: "journalDesc", color: "text-emerald-600 dark:text-emerald-400" },
      { icon: Activity, titleKey: "flavorProfile", descKey: "flavorProfileDesc", color: "text-rose-600 dark:text-rose-400" },
      { icon: CircleDot, titleKey: "flavorWheel", descKey: "flavorWheelDesc", color: "text-orange-600 dark:text-orange-400" },
      { icon: Trophy, titleKey: "badges", descKey: "badgesDesc", color: "text-amber-600 dark:text-amber-400" },
      { icon: FileText, titleKey: "templates", descKey: "templatesDesc", color: "text-slate-600 dark:text-slate-400" },
      { icon: Download, titleKey: "exportNotes", descKey: "exportNotesDesc", color: "text-blue-600 dark:text-blue-400" },
      { icon: Star, titleKey: "wishlist", descKey: "wishlistDesc", color: "text-yellow-600 dark:text-yellow-400" },
      { icon: Archive, titleKey: "collection", descKey: "collectionDesc", color: "text-teal-600 dark:text-teal-400" },
    ],
  },
  {
    groupKey: "discovery",
    features: [
      { icon: Sparkles, titleKey: "recommendations", descKey: "recommendationsDesc", color: "text-pink-600 dark:text-pink-400" },
      { icon: GitCompareArrows, titleKey: "comparison", descKey: "comparisonDesc", color: "text-indigo-600 dark:text-indigo-400" },
      { icon: Puzzle, titleKey: "pairings", descKey: "pairingsDesc", color: "text-lime-600 dark:text-lime-400" },
      { icon: Brain, titleKey: "benchmark", descKey: "benchmarkDesc", color: "text-cyan-600 dark:text-cyan-400" },
    ],
  },
  {
    groupKey: "community",
    features: [
      { icon: Users, titleKey: "friends", descKey: "friendsDesc", color: "text-blue-600 dark:text-blue-400" },
      { icon: Rss, titleKey: "activityFeed", descKey: "activityFeedDesc", color: "text-green-600 dark:text-green-400" },
      { icon: Medal, titleKey: "leaderboard", descKey: "leaderboardDesc", color: "text-yellow-600 dark:text-yellow-400" },
      { icon: Calendar, titleKey: "calendar", descKey: "calendarDesc", color: "text-red-600 dark:text-red-400" },
    ],
  },
  {
    groupKey: "hosting",
    features: [
      { icon: LayoutDashboard, titleKey: "hostDashboard", descKey: "hostDashboardDesc", color: "text-teal-600 dark:text-teal-400" },
      { icon: ClipboardList, titleKey: "recap", descKey: "recapDesc", color: "text-fuchsia-600 dark:text-fuchsia-400" },
      { icon: Database, titleKey: "whiskyDatabase", descKey: "whiskyDatabaseDesc", color: "text-stone-600 dark:text-stone-400" },
    ],
  },
  {
    groupKey: "reference",
    features: [
      { icon: Library, titleKey: "lexicon", descKey: "lexiconDesc", color: "text-amber-700 dark:text-amber-300" },
      { icon: Landmark, titleKey: "distilleries", descKey: "distilleriesDesc", color: "text-emerald-700 dark:text-emerald-300" },
      { icon: Map, titleKey: "distilleryMap", descKey: "distilleryMapDesc", color: "text-sky-700 dark:text-sky-300" },
      { icon: BookOpen, titleKey: "aboutMethod", descKey: "aboutMethodDesc", color: "text-violet-700 dark:text-violet-300" },
    ],
  },
  {
    groupKey: "extras",
    features: [
      { icon: Volume2, titleKey: "soundscapes", descKey: "soundscapesDesc", color: "text-teal-600 dark:text-teal-400" },
      { icon: Sun, titleKey: "themes", descKey: "themesDesc", color: "text-orange-600 dark:text-orange-400" },
      { icon: Globe, titleKey: "languages", descKey: "languagesDesc", color: "text-blue-600 dark:text-blue-400" },
      { icon: Smartphone, titleKey: "pwa", descKey: "pwaDesc", color: "text-green-600 dark:text-green-400" },
      { icon: Heart, titleKey: "donate", descKey: "donateDesc", color: "text-red-600 dark:text-red-400" },
    ],
  },
];

export default function Features() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="max-w-5xl mx-auto space-y-8 min-w-0 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-4xl font-serif font-black text-primary tracking-tight" data-testid="text-features-title">
          {t("features.title")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">{t("features.subtitle")}</p>
        <div className="w-12 h-1 bg-primary/50 mt-3" />
      </motion.div>

      {featureGroups.map((group, gi) => (
        <motion.div
          key={group.groupKey}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.07, duration: 0.5 }}
        >
          <h2 className="text-base sm:text-lg font-serif font-bold text-primary/80 mb-3">
            {t(`features.group.${group.groupKey}`)}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {group.features.map((feat) => {
              const key = feat.titleKey;
              const isOpen = expanded === key;
              return (
                <div key={key}>
                  <motion.button
                    onClick={() => setExpanded(isOpen ? null : key)}
                    className={`w-full text-left rounded-xl border transition-all duration-200 p-4 cursor-pointer ${
                      isOpen
                        ? "bg-secondary border-primary/30 shadow-md"
                        : "bg-card border-border/50 hover:border-primary/20 hover:shadow-sm"
                    }`}
                    whileTap={{ scale: 0.97 }}
                    data-testid={`feature-card-${key}`}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`p-2.5 rounded-lg bg-primary/5 ${feat.color}`}>
                        <feat.icon className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-foreground leading-tight">
                        {t(`features.item.${feat.titleKey}`)}
                      </span>
                    </div>
                  </motion.button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 p-3 rounded-lg bg-secondary/50 border border-border/30 relative">
                          <button
                            onClick={() => setExpanded(null)}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                            data-testid={`feature-close-${key}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <p className="text-xs text-muted-foreground leading-relaxed pr-4">
                            {t(`features.desc.${feat.descKey}`)}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
