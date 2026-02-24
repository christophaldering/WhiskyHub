import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { communityApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { HeartHandshake, Wine } from "lucide-react";
import { GuestPreview } from "@/components/guest-preview";

interface TasteTwin {
  participantId: string;
  participantName: string;
  correlation: number;
  sharedWhiskies: number;
}

export default function TasteTwins() {
  const { i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";

  const { data: twins, isLoading } = useQuery<TasteTwin[]>({
    queryKey: ["taste-twins", currentParticipant?.id],
    queryFn: () => communityApi.getTasteTwins(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <GuestPreview
        featureTitle={isDE ? "Geschmackszwillinge" : "Taste Twins"}
        featureDescription={isDE ? "Finde Verkoster mit ähnlichem Geschmack." : "Find tasters who share your palate."}
      >
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{isDE ? "Geschmackszwillinge" : "Taste Twins"}</h1>
          <div className="grid gap-3">
            {[{ name: "Rudi M.", match: "94%", shared: 12 }, { name: "Anna K.", match: "87%", shared: 8 }, { name: "Thomas B.", match: "82%", shared: 6 }].map(t => (
              <div key={t.name} className="bg-card rounded-xl border p-4 flex items-center justify-between">
                <div>
                  <div className="font-serif font-semibold">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.shared} {isDE ? "gemeinsame Whiskys" : "shared whiskies"}</div>
                </div>
                <div className="text-primary font-serif font-bold">{t.match}</div>
              </div>
            ))}
          </div>
        </div>
      </GuestPreview>
    );
  }

  const getMatchColor = (correlation: number) => {
    if (correlation >= 0.8) return "text-green-600";
    if (correlation >= 0.5) return "text-amber-600";
    if (correlation >= 0.3) return "text-primary";
    return "text-muted-foreground";
  };

  const getMatchLabel = (correlation: number) => {
    if (correlation >= 0.8) return isDE ? "Zwilling" : "Twin";
    if (correlation >= 0.5) return isDE ? "Ähnlich" : "Similar";
    if (correlation >= 0.3) return isDE ? "Verwandt" : "Related";
    return isDE ? "Verschieden" : "Different";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="taste-twins-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <HeartHandshake className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-twins-title">
            {isDE ? "Geschmackszwillinge" : "Taste Twins"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          {isDE
            ? "Wer bewertet Whiskys ähnlich wie du? Basierend auf gemeinsam verkosteten Abfüllungen."
            : "Who rates whiskies like you do? Based on shared tasting experiences."}
        </p>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-card/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !twins || twins.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <HeartHandshake className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif">{isDE ? "Noch keine Geschmackszwillinge gefunden." : "No taste twins found yet."}</p>
            <p className="text-xs mt-2">
              {isDE
                ? "Du brauchst mindestens 3 gemeinsam bewertete Whiskys mit anderen Teilnehmern."
                : "You need at least 3 commonly rated whiskies with other participants."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {twins.map((twin, index) => (
              <motion.div
                key={twin.participantId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-card rounded-lg border border-border/40 p-5 hover:border-primary/30 transition-colors"
                data-testid={`card-twin-${twin.participantId}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-serif font-bold text-primary">
                      {twin.participantName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-serif font-semibold">{twin.participantName}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Wine className="w-3 h-3" />
                        {twin.sharedWhiskies} {isDE ? "gemeinsame Whiskys" : "shared whiskies"}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        twin.correlation >= 0.8 ? "bg-green-100 text-green-700" :
                        twin.correlation >= 0.5 ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {getMatchLabel(twin.correlation)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {isDE ? "Übereinstimmung" : "Match"}
                    </div>
                    <div className={`text-2xl font-serif font-bold ${getMatchColor(twin.correlation)}`}>
                      {Math.round(twin.correlation * 100)}%
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <p className="text-xs text-muted-foreground text-center mt-6 italic">
              {isDE
                ? "Die Übereinstimmung basiert auf der Korrelation eurer Bewertungen bei gemeinsam verkosteten Whiskys."
                : "Match is based on the correlation of your ratings for commonly tasted whiskies."}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
