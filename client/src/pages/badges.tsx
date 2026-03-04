import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Trophy, Lock } from "lucide-react";
import { GuestPreview } from "@/components/guest-preview";

interface ParticipantStats {
  totalRatings: number;
  totalTastings: number;
  totalJournalEntries: number;
  ratedRegions: Record<string, number>;
  ratedCaskTypes: Record<string, number>;
  ratedPeatLevels: Record<string, number>;
  highestOverall: number;
}

interface BadgeDef {
  id: string;
  icon: string;
  nameEN: string;
  nameDE: string;
  descEN: string;
  descDE: string;
  check: (s: ParticipantStats) => boolean;
  progress: (s: ParticipantStats) => { current: number; target: number };
}

const BADGES: BadgeDef[] = [
  {
    id: "first_sip",
    icon: "🥃",
    nameEN: "First Sip",
    nameDE: "Erster Schluck",
    descEN: "Completed first rating in any tasting",
    descDE: "Erste Bewertung in einem Tasting abgegeben",
    check: (s) => s.totalRatings >= 1,
    progress: (s) => ({ current: Math.min(s.totalRatings, 1), target: 1 }),
  },
  {
    id: "nose_knows",
    icon: "👃",
    nameEN: "Nose Knows",
    nameDE: "Feinnase",
    descEN: "Rated 5+ whiskies",
    descDE: "5+ Whiskys bewertet",
    check: (s) => s.totalRatings >= 5,
    progress: (s) => ({ current: Math.min(s.totalRatings, 5), target: 5 }),
  },
  {
    id: "palate_explorer",
    icon: "🗺️",
    nameEN: "Palate Explorer",
    nameDE: "Gaumenentdecker",
    descEN: "Rated 10+ whiskies",
    descDE: "10+ Whiskys bewertet",
    check: (s) => s.totalRatings >= 10,
    progress: (s) => ({ current: Math.min(s.totalRatings, 10), target: 10 }),
  },
  {
    id: "seasoned_sipper",
    icon: "🏆",
    nameEN: "Seasoned Sipper",
    nameDE: "Erfahrener Genießer",
    descEN: "Rated 25+ whiskies",
    descDE: "25+ Whiskys bewertet",
    check: (s) => s.totalRatings >= 25,
    progress: (s) => ({ current: Math.min(s.totalRatings, 25), target: 25 }),
  },
  {
    id: "century_club",
    icon: "💯",
    nameEN: "Century Club",
    nameDE: "Hundert-Club",
    descEN: "Rated 100+ whiskies",
    descDE: "100+ Whiskys bewertet",
    check: (s) => s.totalRatings >= 100,
    progress: (s) => ({ current: Math.min(s.totalRatings, 100), target: 100 }),
  },
  {
    id: "islay_pilgrim",
    icon: "🏴",
    nameEN: "Islay Pilgrim",
    nameDE: "Islay-Pilger",
    descEN: "Rated 3+ Islay whiskies",
    descDE: "3+ Islay-Whiskys bewertet",
    check: (s) => (s.ratedRegions["Islay"] || 0) >= 3,
    progress: (s) => ({ current: Math.min(s.ratedRegions["Islay"] || 0, 3), target: 3 }),
  },
  {
    id: "highland_wanderer",
    icon: "⛰️",
    nameEN: "Highland Wanderer",
    nameDE: "Highland-Wanderer",
    descEN: "Rated 3+ Highland whiskies",
    descDE: "3+ Highland-Whiskys bewertet",
    check: (s) => (s.ratedRegions["Highland"] || 0) >= 3,
    progress: (s) => ({ current: Math.min(s.ratedRegions["Highland"] || 0, 3), target: 3 }),
  },
  {
    id: "speyside_scholar",
    icon: "📚",
    nameEN: "Speyside Scholar",
    nameDE: "Speyside-Kenner",
    descEN: "Rated 3+ Speyside whiskies",
    descDE: "3+ Speyside-Whiskys bewertet",
    check: (s) => (s.ratedRegions["Speyside"] || 0) >= 3,
    progress: (s) => ({ current: Math.min(s.ratedRegions["Speyside"] || 0, 3), target: 3 }),
  },
  {
    id: "peat_seeker",
    icon: "🔥",
    nameEN: "Peat Seeker",
    nameDE: "Torfsucher",
    descEN: "Rated 3+ whiskies with Heavy peat",
    descDE: "3+ stark getorfte Whiskys bewertet",
    check: (s) => (s.ratedPeatLevels["Heavy"] || 0) >= 3,
    progress: (s) => ({ current: Math.min(s.ratedPeatLevels["Heavy"] || 0, 3), target: 3 }),
  },
  {
    id: "cask_explorer",
    icon: "🪵",
    nameEN: "Cask Explorer",
    nameDE: "Fass-Entdecker",
    descEN: "Rated whiskies from 3+ different cask types",
    descDE: "Whiskys aus 3+ verschiedenen Fasstypen bewertet",
    check: (s) => Object.keys(s.ratedCaskTypes).length >= 3,
    progress: (s) => ({ current: Math.min(Object.keys(s.ratedCaskTypes).length, 3), target: 3 }),
  },
  {
    id: "social_dram",
    icon: "👥",
    nameEN: "Social Dram",
    nameDE: "Geselliger Dram",
    descEN: "Participated in 3+ tastings",
    descDE: "An 3+ Tastings teilgenommen",
    check: (s) => s.totalTastings >= 3,
    progress: (s) => ({ current: Math.min(s.totalTastings, 3), target: 3 }),
  },
  {
    id: "journal_keeper",
    icon: "📓",
    nameEN: "Journal Keeper",
    nameDE: "Tagebuchführer",
    descEN: "Created 5+ journal entries",
    descDE: "5+ Tagebucheinträge erstellt",
    check: (s) => s.totalJournalEntries >= 5,
    progress: (s) => ({ current: Math.min(s.totalJournalEntries, 5), target: 5 }),
  },
  {
    id: "reflective_mind",
    icon: "🧘",
    nameEN: "Reflective Mind",
    nameDE: "Reflektierter Geist",
    descEN: "Created 10+ journal entries",
    descDE: "10+ Tagebucheinträge erstellt",
    check: (s) => s.totalJournalEntries >= 10,
    progress: (s) => ({ current: Math.min(s.totalJournalEntries, 10), target: 10 }),
  },
  {
    id: "high_scorer",
    icon: "⭐",
    nameEN: "High Scorer",
    nameDE: "Höchstbewerter",
    descEN: "Gave any whisky an overall score of 90+",
    descDE: "Einem Whisky eine Gesamtbewertung von 90+ gegeben",
    check: (s) => s.highestOverall >= 90,
    progress: (s) => ({ current: Math.min(Math.round(s.highestOverall), 90), target: 90 }),
  },
  {
    id: "generous_pour",
    icon: "🍾",
    nameEN: "Generous Pour",
    nameDE: "Großzügiger Einschenker",
    descEN: "Rated in 5+ different tastings",
    descDE: "In 5+ verschiedenen Tastings bewertet",
    check: (s) => s.totalTastings >= 5,
    progress: (s) => ({ current: Math.min(s.totalTastings, 5), target: 5 }),
  },

  // ── Expert Tier: Ratings ──
  {
    id: "connoisseur",
    icon: "🎩",
    nameEN: "Connoisseur",
    nameDE: "Kenner",
    descEN: "Rated 250+ whiskies",
    descDE: "250+ Whiskys bewertet",
    check: (s) => s.totalRatings >= 250,
    progress: (s) => ({ current: Math.min(s.totalRatings, 250), target: 250 }),
  },
  {
    id: "master_of_malt",
    icon: "👑",
    nameEN: "Master of Malt",
    nameDE: "Meister des Malts",
    descEN: "Rated 500+ whiskies",
    descDE: "500+ Whiskys bewertet",
    check: (s) => s.totalRatings >= 500,
    progress: (s) => ({ current: Math.min(s.totalRatings, 500), target: 500 }),
  },
  {
    id: "living_legend",
    icon: "🏛️",
    nameEN: "Living Legend",
    nameDE: "Lebende Legende",
    descEN: "Rated 1,000+ whiskies",
    descDE: "1.000+ Whiskys bewertet",
    check: (s) => s.totalRatings >= 1000,
    progress: (s) => ({ current: Math.min(s.totalRatings, 1000), target: 1000 }),
  },

  // ── Expert Tier: Tastings ──
  {
    id: "regular",
    icon: "🪑",
    nameEN: "The Regular",
    nameDE: "Der Stammgast",
    descEN: "Participated in 10+ tastings",
    descDE: "An 10+ Tastings teilgenommen",
    check: (s) => s.totalTastings >= 10,
    progress: (s) => ({ current: Math.min(s.totalTastings, 10), target: 10 }),
  },
  {
    id: "tasting_veteran",
    icon: "🎖️",
    nameEN: "Tasting Veteran",
    nameDE: "Tasting-Veteran",
    descEN: "Participated in 25+ tastings",
    descDE: "An 25+ Tastings teilgenommen",
    check: (s) => s.totalTastings >= 25,
    progress: (s) => ({ current: Math.min(s.totalTastings, 25), target: 25 }),
  },
  {
    id: "grand_circle",
    icon: "💎",
    nameEN: "Grand Circle",
    nameDE: "Großer Kreis",
    descEN: "Participated in 50+ tastings",
    descDE: "An 50+ Tastings teilgenommen",
    check: (s) => s.totalTastings >= 50,
    progress: (s) => ({ current: Math.min(s.totalTastings, 50), target: 50 }),
  },
  {
    id: "centurion_host",
    icon: "🏅",
    nameEN: "Centurion",
    nameDE: "Zenturio",
    descEN: "Participated in 100+ tastings",
    descDE: "An 100+ Tastings teilgenommen",
    check: (s) => s.totalTastings >= 100,
    progress: (s) => ({ current: Math.min(s.totalTastings, 100), target: 100 }),
  },

  // ── Expert Tier: Journal ──
  {
    id: "chronicler",
    icon: "📜",
    nameEN: "Chronicler",
    nameDE: "Chronist",
    descEN: "Created 25+ journal entries",
    descDE: "25+ Tagebucheinträge erstellt",
    check: (s) => s.totalJournalEntries >= 25,
    progress: (s) => ({ current: Math.min(s.totalJournalEntries, 25), target: 25 }),
  },
  {
    id: "archivist",
    icon: "🗄️",
    nameEN: "Archivist",
    nameDE: "Archivar",
    descEN: "Created 50+ journal entries",
    descDE: "50+ Tagebucheinträge erstellt",
    check: (s) => s.totalJournalEntries >= 50,
    progress: (s) => ({ current: Math.min(s.totalJournalEntries, 50), target: 50 }),
  },
  {
    id: "whisky_historian",
    icon: "🏰",
    nameEN: "Whisky Historian",
    nameDE: "Whisky-Historiker",
    descEN: "Created 100+ journal entries",
    descDE: "100+ Tagebucheinträge erstellt",
    check: (s) => s.totalJournalEntries >= 100,
    progress: (s) => ({ current: Math.min(s.totalJournalEntries, 100), target: 100 }),
  },
  {
    id: "grand_librarian",
    icon: "📖",
    nameEN: "Grand Librarian",
    nameDE: "Großer Bibliothekar",
    descEN: "Created 250+ journal entries",
    descDE: "250+ Tagebucheinträge erstellt",
    check: (s) => s.totalJournalEntries >= 250,
    progress: (s) => ({ current: Math.min(s.totalJournalEntries, 250), target: 250 }),
  },

  // ── Expert Tier: Regions ──
  {
    id: "world_traveler",
    icon: "🌍",
    nameEN: "World Traveller",
    nameDE: "Weltreisender",
    descEN: "Rated whiskies from 5+ different regions",
    descDE: "Whiskys aus 5+ verschiedenen Regionen bewertet",
    check: (s) => Object.keys(s.ratedRegions).length >= 5,
    progress: (s) => ({ current: Math.min(Object.keys(s.ratedRegions).length, 5), target: 5 }),
  },
  {
    id: "globe_trotter",
    icon: "✈️",
    nameEN: "Globe Trotter",
    nameDE: "Globetrotter",
    descEN: "Rated whiskies from 8+ different regions",
    descDE: "Whiskys aus 8+ verschiedenen Regionen bewertet",
    check: (s) => Object.keys(s.ratedRegions).length >= 8,
    progress: (s) => ({ current: Math.min(Object.keys(s.ratedRegions).length, 8), target: 8 }),
  },
  {
    id: "islay_devotee",
    icon: "🌊",
    nameEN: "Islay Devotee",
    nameDE: "Islay-Devoter",
    descEN: "Rated 15+ Islay whiskies",
    descDE: "15+ Islay-Whiskys bewertet",
    check: (s) => (s.ratedRegions["Islay"] || 0) >= 15,
    progress: (s) => ({ current: Math.min(s.ratedRegions["Islay"] || 0, 15), target: 15 }),
  },
  {
    id: "speyside_master",
    icon: "🏔️",
    nameEN: "Speyside Master",
    nameDE: "Speyside-Meister",
    descEN: "Rated 15+ Speyside whiskies",
    descDE: "15+ Speyside-Whiskys bewertet",
    check: (s) => (s.ratedRegions["Speyside"] || 0) >= 15,
    progress: (s) => ({ current: Math.min(s.ratedRegions["Speyside"] || 0, 15), target: 15 }),
  },
  {
    id: "highland_guardian",
    icon: "🦌",
    nameEN: "Highland Guardian",
    nameDE: "Highland-Wächter",
    descEN: "Rated 15+ Highland whiskies",
    descDE: "15+ Highland-Whiskys bewertet",
    check: (s) => (s.ratedRegions["Highland"] || 0) >= 15,
    progress: (s) => ({ current: Math.min(s.ratedRegions["Highland"] || 0, 15), target: 15 }),
  },
  {
    id: "regional_authority",
    icon: "🗝️",
    nameEN: "Regional Authority",
    nameDE: "Regionale Autorität",
    descEN: "Rated 50+ whiskies from a single region",
    descDE: "50+ Whiskys aus einer einzigen Region bewertet",
    check: (s) => Object.values(s.ratedRegions).some(v => v >= 50),
    progress: (s) => ({ current: Math.min(Math.max(...Object.values(s.ratedRegions), 0), 50), target: 50 }),
  },

  // ── Expert Tier: Cask & Peat ──
  {
    id: "cask_connoisseur",
    icon: "🛢️",
    nameEN: "Cask Connoisseur",
    nameDE: "Fass-Kenner",
    descEN: "Rated whiskies from 6+ different cask types",
    descDE: "Whiskys aus 6+ verschiedenen Fasstypen bewertet",
    check: (s) => Object.keys(s.ratedCaskTypes).length >= 6,
    progress: (s) => ({ current: Math.min(Object.keys(s.ratedCaskTypes).length, 6), target: 6 }),
  },
  {
    id: "cooperage_master",
    icon: "🔨",
    nameEN: "Cooperage Master",
    nameDE: "Küfer-Meister",
    descEN: "Rated whiskies from 10+ different cask types",
    descDE: "Whiskys aus 10+ verschiedenen Fasstypen bewertet",
    check: (s) => Object.keys(s.ratedCaskTypes).length >= 10,
    progress: (s) => ({ current: Math.min(Object.keys(s.ratedCaskTypes).length, 10), target: 10 }),
  },
  {
    id: "peat_monster",
    icon: "☠️",
    nameEN: "Peat Monster",
    nameDE: "Torfmonster",
    descEN: "Rated 15+ heavily peated whiskies",
    descDE: "15+ stark getorfte Whiskys bewertet",
    check: (s) => (s.ratedPeatLevels["Heavy"] || 0) >= 15,
    progress: (s) => ({ current: Math.min(s.ratedPeatLevels["Heavy"] || 0, 15), target: 15 }),
  },
  {
    id: "peat_lord",
    icon: "🌋",
    nameEN: "Peat Lord",
    nameDE: "Lord des Torfs",
    descEN: "Rated 50+ heavily peated whiskies",
    descDE: "50+ stark getorfte Whiskys bewertet",
    check: (s) => (s.ratedPeatLevels["Heavy"] || 0) >= 50,
    progress: (s) => ({ current: Math.min(s.ratedPeatLevels["Heavy"] || 0, 50), target: 50 }),
  },
  {
    id: "peat_spectrum",
    icon: "🌈",
    nameEN: "Peat Spectrum",
    nameDE: "Torf-Spektrum",
    descEN: "Rated whiskies across all 4 peat levels",
    descDE: "Whiskys aller 4 Torfstufen bewertet",
    check: (s) => Object.keys(s.ratedPeatLevels).length >= 4,
    progress: (s) => ({ current: Math.min(Object.keys(s.ratedPeatLevels).length, 4), target: 4 }),
  },

  // ── Expert Tier: Scoring ──
  {
    id: "perfectionist",
    icon: "💫",
    nameEN: "Perfectionist",
    nameDE: "Perfektionist",
    descEN: "Gave any whisky an overall score of 95+",
    descDE: "Einem Whisky eine Gesamtbewertung von 95+ gegeben",
    check: (s) => s.highestOverall >= 95,
    progress: (s) => ({ current: Math.min(Math.round(s.highestOverall), 95), target: 95 }),
  },
];

export default function Badges() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";

  const { data: stats, isLoading } = useQuery<ParticipantStats>({
    queryKey: ["participant-stats", currentParticipant?.id],
    queryFn: () => statsApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <GuestPreview featureTitle={t("badgesPage.title")} featureDescription={t("guestPreview.badges")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("badgesPage.title")}</h1>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[{emoji: "🥃", name: "First Dram", desc: "Rate your first whisky"}, {emoji: "🏆", name: "Connoisseur", desc: "Rate 50 whiskies"}, {emoji: "🌍", name: "Globe Trotter", desc: "Taste whiskies from 10 countries"}, {emoji: "🔥", name: "Peat Lover", desc: "Rate 10 peated whiskies"}, {emoji: "📝", name: "Wordsmith", desc: "Write 25 tasting notes"}, {emoji: "🎯", name: "Sharp Palate", desc: "Match the group average within 0.5"}].map(b => (
              <div key={b.name} className="bg-card rounded-xl border p-4 text-center space-y-2">
                <div className="text-3xl">{b.emoji}</div>
                <div className="font-serif font-semibold text-sm">{b.name}</div>
                <div className="text-xs text-muted-foreground">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </GuestPreview>
    );
  }

  const defaultStats: ParticipantStats = {
    totalRatings: 0,
    totalTastings: 0,
    totalJournalEntries: 0,
    ratedRegions: {},
    ratedCaskTypes: {},
    ratedPeatLevels: {},
    highestOverall: 0,
  };

  const s = stats || defaultStats;
  const earnedCount = BADGES.filter((b) => b.check(s)).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="badges-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-badges-title">
            {t("badgesPage.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{t("badgesPage.subtitle")}</p>
        <p className="text-sm font-medium text-primary/80 mb-8" data-testid="text-badges-count">
          {earnedCount} / {BADGES.length} {t("badgesPage.unlocked")}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-40 bg-card/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {BADGES.map((badge, index) => {
              const earned = badge.check(s);
              const prog = badge.progress(s);
              const name = lang === "de" ? badge.nameDE : badge.nameEN;
              const desc = lang === "de" ? badge.descDE : badge.descEN;

              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`relative rounded-lg border p-4 flex flex-col items-center text-center transition-all ${
                    earned
                      ? "bg-card border-primary/40 shadow-[0_0_12px_rgba(var(--primary-rgb,200,170,100),0.15)]"
                      : "bg-card/40 border-border/30 opacity-60"
                  }`}
                  data-testid={`card-badge-${badge.id}`}
                >
                  {!earned && (
                    <div className="absolute top-2 right-2">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div
                    className={`text-3xl mb-2 ${earned ? "" : "grayscale"}`}
                    role="img"
                    aria-label={name}
                  >
                    {badge.icon}
                  </div>
                  <h3 className={`text-sm font-serif font-semibold mb-1 ${earned ? "text-foreground" : "text-muted-foreground"}`}>
                    {name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-tight mb-2">
                    {desc}
                  </p>
                  {!earned && (
                    <div className="w-full mt-auto">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>{t("badgesPage.locked")}</span>
                        <span>{prog.current}/{prog.target}</span>
                      </div>
                      <div className="w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/40 rounded-full transition-all"
                          style={{ width: `${(prog.current / prog.target) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {earned && (
                    <span className="text-[10px] text-primary/70 font-medium uppercase tracking-wider mt-auto">
                      ✓ {t("badgesPage.unlocked")}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
