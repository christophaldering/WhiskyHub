import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { journalApi, tastingHistoryApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import DramTimeTravel from "@/labs/components/DramTimeTravel";

export default function LabsTasteTimetravel() {
  const { i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const pid = currentParticipant?.id;

  const { data: journal = [], isLoading } = useQuery<any[]>({
    queryKey: ["journal", pid],
    queryFn: async () => {
      const result = await journalApi.getAll(pid!);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!pid,
    retry: 2,
  });

  const { data: tastingHistory } = useQuery({
    queryKey: ["tasting-history", pid],
    queryFn: () => tastingHistoryApi.get(pid!),
    enabled: !!pid,
    retry: 2,
  });

  const tastingWhiskies = useMemo(() => {
    if (!tastingHistory?.tastings || !Array.isArray(tastingHistory.tastings)) return [];
    return tastingHistory.tastings.flatMap((tasting: any) => {
      if (!tasting) return [];
      return (Array.isArray(tasting.whiskies) ? tasting.whiskies : []).filter((w: any) => w?.myRating).map((w: any) => ({
        id: `tw-${tasting.id}-${w.id}`,
        title: w.name || w.whiskyName || "—",
        name: w.name || w.whiskyName || null,
        distillery: w.distillery || null,
        region: w.region || null,
        caskType: w.caskType || null,
        personalScore: w.myRating.overall ?? null,
        noseScore: w.myRating.nose ?? null,
        tasteScore: w.myRating.taste ?? null,
        finishScore: w.myRating.finish ?? null,
        createdAt: tasting.date || tasting.createdAt,
        tastingNarrative: w.myRating.tastingNarrative ?? null,
        imageUrl: w.imageUrl || null,
      }));
    });
  }, [tastingHistory]);

  const allItems = useMemo(() => [
    ...journal.map((e: any) => ({ ...e, source: e.source || "solo" })),
    ...tastingWhiskies,
  ], [journal, tastingWhiskies]);

  if (isLoading) {
    return (
      <div style={{ padding: 24, color: "var(--labs-text-muted)" }}>
        {i18n.language?.toLowerCase().startsWith("de") ? "Lade …" : "Loading …"}
      </div>
    );
  }

  return (
    <DramTimeTravel allItems={allItems as any} onBack={() => navigate("/labs/taste?tab=ai")} />
  );
}
