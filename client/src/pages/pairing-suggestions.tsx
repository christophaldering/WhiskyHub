import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { pairingsApi, tastingApi } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wine, Sparkles, MapPin, Flame, Package } from "lucide-react";

interface Suggestion {
  name: string;
  distillery: string;
  region: string;
  caskInfluence: string;
  peatLevel: string;
  score: number;
  reason: string;
}

interface PairingData {
  lineup: {
    regions: string[];
    caskTypes: string[];
    peatLevels: string[];
  };
  suggestions: Suggestion[];
}

function ScoreRing({ score }: { score: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-orange-400";

  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-border/30" />
        <circle
          cx="22" cy="22" r={radius} fill="none" strokeWidth="3"
          stroke="currentColor"
          className={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-serif">{score}</span>
    </div>
  );
}

export default function PairingSuggestions() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [selectedTastingId, setSelectedTastingId] = useState<string>("");

  const { data: tastings, isLoading: tastingsLoading } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const { data: pairingData, isLoading: pairingsLoading } = useQuery<PairingData>({
    queryKey: ["pairings", selectedTastingId],
    queryFn: () => pairingsApi.get(selectedTastingId),
    enabled: !!selectedTastingId,
  });

  if (!currentParticipant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="pairings-login-required">
        <p className="text-muted-foreground font-serif">{t("pairings.loginRequired")}</p>
      </div>
    );
  }

  const lineup = pairingData?.lineup;
  const suggestions = pairingData?.suggestions || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="pairings-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <Wine className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-pairings-title">
            {t("pairings.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("pairings.subtitle")}</p>

        <div className="mb-8" data-testid="select-tasting">
          <label className="block text-sm font-medium mb-2">{t("pairings.selectTasting")}</label>
          <Select value={selectedTastingId} onValueChange={setSelectedTastingId}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-tasting-trigger">
              <SelectValue placeholder={t("pairings.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {tastingsLoading ? (
                <SelectItem value="__loading" disabled>{t("pairings.loading")}</SelectItem>
              ) : !tastings || tastings.length === 0 ? (
                <SelectItem value="__empty" disabled>{t("pairings.noTastings")}</SelectItem>
              ) : (
                tastings.map((tasting: any) => (
                  <SelectItem key={tasting.id} value={tasting.id} data-testid={`select-tasting-${tasting.id}`}>
                    {tasting.title || tasting.name || tasting.id}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedTastingId && pairingsLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-card/50 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {selectedTastingId && !pairingsLoading && lineup && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card rounded-lg border border-border/40 p-5 mb-8"
            data-testid="lineup-summary"
          >
            <h2 className="text-sm font-serif font-semibold text-primary mb-3">{t("pairings.lineupSummary")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {lineup.regions.length > 0 && (
                <div data-testid="lineup-regions">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{t("pairings.regions")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {lineup.regions.map((r) => (
                      <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 font-medium">{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {lineup.caskTypes.length > 0 && (
                <div data-testid="lineup-casks">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Package className="w-3.5 h-3.5" />
                    <span>{t("pairings.caskTypes")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {lineup.caskTypes.map((c) => (
                      <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500/80 font-medium">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {lineup.peatLevels.length > 0 && (
                <div data-testid="lineup-peat">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{t("pairings.peatLevels")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {lineup.peatLevels.map((p) => (
                      <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500/80 font-medium">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {selectedTastingId && !pairingsLoading && suggestions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground" data-testid="pairings-empty">
            <Wine className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{t("pairings.empty")}</p>
          </div>
        )}

        {!selectedTastingId && !tastingsLoading && (!tastings || tastings.length === 0) && (
          <div className="text-center py-16 text-muted-foreground" data-testid="pairings-no-tastings">
            <Wine className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{t("pairings.noTastings")}</p>
          </div>
        )}

        {suggestions.length > 0 && (
          <div>
            <h2 className="text-sm font-serif font-semibold text-primary mb-4" data-testid="text-suggestions-heading">
              {t("pairings.suggestions")}
            </h2>
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={`${suggestion.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.07 }}
                  className="bg-card rounded-lg border border-border/40 p-5 hover:border-primary/30 transition-colors"
                  data-testid={`card-suggestion-${index}`}
                >
                  <div className="flex items-start gap-4">
                    <ScoreRing score={suggestion.score} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-serif font-semibold" data-testid={`text-suggestion-name-${index}`}>
                        {suggestion.name}
                      </h3>
                      <p className="text-xs text-muted-foreground" data-testid={`text-suggestion-distillery-${index}`}>
                        {suggestion.distillery}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {suggestion.region && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 font-medium flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />{suggestion.region}
                          </span>
                        )}
                        {suggestion.caskInfluence && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500/80 font-medium flex items-center gap-1">
                            <Package className="w-2.5 h-2.5" />{suggestion.caskInfluence}
                          </span>
                        )}
                        {suggestion.peatLevel && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500/80 font-medium flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5" />{suggestion.peatLevel}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground border-l-2 border-primary/20 pl-3" data-testid={`text-suggestion-reason-${index}`}>
                        <span className="font-medium text-foreground/70">{t("pairings.reason")}:</span> {suggestion.reason}
                      </div>
                      <div className="mt-2 w-full bg-border/20 rounded-full h-1.5" data-testid={`bar-suggestion-score-${index}`}>
                        <motion.div
                          className={`h-1.5 rounded-full ${suggestion.score >= 80 ? "bg-emerald-400" : suggestion.score >= 60 ? "bg-amber-400" : "bg-orange-400"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${suggestion.score}%` }}
                          transition={{ duration: 0.6, delay: index * 0.07 + 0.2 }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-6 italic">
              {t("pairings.disclaimer")}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
