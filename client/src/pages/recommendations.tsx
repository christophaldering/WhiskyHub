import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { flavorProfileApi, communityApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Sparkles, ExternalLink, Users } from "lucide-react";
import { GuestPreview } from "@/components/guest-preview";

interface Whisky {
  id: string;
  name: string;
  distillery: string | null;
  age: string | null;
  abv: number | null;
  region: string | null;
  category: string | null;
  caskInfluence: string | null;
  peatLevel: string | null;
  imageUrl: string | null;
  whiskybaseId: string | null;
}

interface CommunityScore {
  whiskyKey: string;
  avgOverall: number;
  totalRaters: number;
}

function computeRecommendations(
  ratedWhiskies: Array<{ whisky: Whisky; rating: { overall: number } }>,
  allWhiskies: Whisky[],
  regionBreakdown: Record<string, { count: number; avgScore: number }>,
  caskBreakdown: Record<string, { count: number; avgScore: number }>,
  peatBreakdown: Record<string, { count: number; avgScore: number }>,
  communityScores?: CommunityScore[]
) {
  const ratedIds = new Set(ratedWhiskies.map(r => r.whisky.id));
  const unrated = allWhiskies.filter(w => !ratedIds.has(w.id));
  if (unrated.length === 0) return [];

  const communityMap = new Map<string, CommunityScore>();
  if (communityScores) {
    for (const cs of communityScores) {
      communityMap.set(cs.whiskyKey, cs);
    }
  }

  const topRegions = Object.entries(regionBreakdown)
    .sort((a, b) => b[1].avgScore - a[1].avgScore)
    .slice(0, 3)
    .map(([r]) => r);
  const topCasks = Object.entries(caskBreakdown)
    .sort((a, b) => b[1].avgScore - a[1].avgScore)
    .slice(0, 3)
    .map(([c]) => c);
  const topPeat = Object.entries(peatBreakdown)
    .sort((a, b) => b[1].avgScore - a[1].avgScore)
    .slice(0, 2)
    .map(([p]) => p);

  const scored = unrated.map(w => {
    let score = 0;
    let reasons: string[] = [];
    if (w.region && topRegions.includes(w.region)) {
      const regionScore = regionBreakdown[w.region]?.avgScore || 0;
      score += regionScore * 0.35;
      reasons.push(w.region);
    }
    if (w.caskInfluence && topCasks.includes(w.caskInfluence)) {
      const caskScore = caskBreakdown[w.caskInfluence]?.avgScore || 0;
      score += caskScore * 0.25;
      reasons.push(w.caskInfluence);
    }
    if (w.peatLevel && topPeat.includes(w.peatLevel)) {
      const peatScore = peatBreakdown[w.peatLevel]?.avgScore || 0;
      score += peatScore * 0.25;
      reasons.push(w.peatLevel);
    }

    const key = w.whiskybaseId
      ? `wb:${w.whiskybaseId}`
      : `name:${(w.name || "").toLowerCase().trim()}|${(w.distillery || "").toLowerCase().trim()}`;
    const cs = communityMap.get(key);
    if (cs && cs.totalRaters >= 2) {
      score += cs.avgOverall * 0.15;
      reasons.push(`★ ${cs.avgOverall}`);
    }

    return { whisky: w, score, reasons, communityScore: cs?.avgOverall, communityRaters: cs?.totalRaters };
  });

  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 10);
}

export default function Recommendations() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";

  const { data: profile, isLoading } = useQuery({
    queryKey: ["flavor-profile", currentParticipant?.id],
    queryFn: () => flavorProfileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: communityScores } = useQuery<CommunityScore[]>({
    queryKey: ["community-scores"],
    queryFn: () => communityApi.getScores(),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <GuestPreview featureTitle={t("recommendations.title")} featureDescription={t("guestPreview.recommendations")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("recommendations.title")}</h1>
          <div className="grid gap-3">
            {[{name: "Ardbeg Corryvreckan", reason: "Based on your love for peated whiskies", score: "94%"}, {name: "Clynelish 14", reason: "Similar to your top-rated Highland malts", score: "89%"}, {name: "Bunnahabhain 18", reason: "Matches your preference for maritime notes", score: "87%"}].map(r => (
              <div key={r.name} className="bg-card rounded-xl border p-4 flex items-center justify-between">
                <div><div className="font-serif font-semibold">{r.name}</div><div className="text-sm text-muted-foreground">{r.reason}</div></div>
                <div className="text-primary font-serif font-bold">{r.score}</div>
              </div>
            ))}
          </div>
        </div>
      </GuestPreview>
    );
  }

  const recommendations = profile
    ? computeRecommendations(
        profile.ratedWhiskies || [],
        profile.allWhiskies || [],
        profile.regionBreakdown || {},
        profile.caskBreakdown || {},
        profile.peatBreakdown || {},
        communityScores
      )
    : [];

  const hasRatings = (profile?.ratedWhiskies?.length || 0) > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="recommendations-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-rec-title">
            {t("recommendations.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("recommendations.subtitle")}</p>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-card/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !hasRatings ? (
          <div className="text-center py-16 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{t("recommendations.empty")}</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{t("recommendations.noMatches")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <motion.div
                key={rec.whisky.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-card rounded-lg border border-border/40 p-5 flex items-center gap-4 hover:border-primary/30 transition-colors"
                data-testid={`card-recommendation-${rec.whisky.id}`}
              >
                <span className="text-xl font-serif font-bold text-primary/40 w-8 shrink-0">{index + 1}</span>
                {rec.whisky.imageUrl && (
                  <img src={rec.whisky.imageUrl} alt={rec.whisky.name} className="w-12 h-12 rounded object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-serif font-semibold truncate">{rec.whisky.name}</h3>
                    {rec.whisky.whiskybaseId && (
                      <a
                        href={`https://www.whiskybase.com/whiskies/whisky/${rec.whisky.whiskybaseId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary/50 hover:text-primary shrink-0"
                        title="Whiskybase"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {[rec.whisky.distillery, rec.whisky.region, rec.whisky.age ? `${rec.whisky.age}y` : null, rec.whisky.abv ? `${rec.whisky.abv}%` : null].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {rec.reasons.map((reason) => (
                      <span key={reason} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 font-medium">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground">{isDE ? "Match" : "Match"}</div>
                  <div className="text-lg font-serif font-bold text-primary">{Math.round(rec.score)}</div>
                  {rec.communityScore && rec.communityRaters && rec.communityRaters >= 2 && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5 justify-end">
                      <Users className="w-3 h-3" />
                      {rec.communityScore}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            <p className="text-xs text-muted-foreground text-center mt-6 italic">
              {t("recommendations.basedOn")}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
