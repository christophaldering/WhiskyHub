import { useState, useCallback } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import type { RatingData, WhiskyData } from "../../types/rating";
import RatingModeSelect from "./RatingModeSelect";
import GuidedRating from "./GuidedRating";
import CompactRating from "./CompactRating";
import RatingSummary from "./RatingSummary";

interface RatingFlowProps {
  th: ThemeTokens;
  t: Translations;
  whisky: WhiskyData;
  tastingId: string;
  dramIdx: number;
  total: number;
  tastingStatus: string;
  participantId: string;
  onDone: (data: RatingData) => void;
  onBack: () => void;
}

type Step = "mode" | "rating" | "summary";

export function RatingFlow({
  th, t, whisky, tastingId, dramIdx, total, tastingStatus, participantId, onDone, onBack,
}: RatingFlowProps) {
  const [mode, setMode] = useState<"guided" | "compact" | null>(null);
  const [step, setStep] = useState<Step>("mode");
  const [result, setResult] = useState<RatingData | null>(null);

  const handleModeSelect = useCallback((m: "guided" | "compact") => {
    setMode(m);
    setStep("rating");
  }, []);

  const handleRatingDone = useCallback((data: RatingData) => {
    setResult(data);
    setStep("summary");
  }, []);

  const handleSummaryNext = useCallback(() => {
    if (result) onDone(result);
  }, [result, onDone]);

  const handleSummaryEdit = useCallback(() => {
    setStep("rating");
  }, []);

  if (step === "mode") {
    return (
      <RatingModeSelect
        th={th}
        t={t}
        whisky={whisky}
        dramIdx={dramIdx}
        total={total}
        onSelect={handleModeSelect}
        onBack={onBack}
      />
    );
  }

  if (step === "rating" && mode === "guided") {
    return (
      <GuidedRating
        th={th}
        t={t}
        whisky={whisky}
        tastingId={tastingId}
        dramIdx={dramIdx}
        total={total}
        tastingStatus={tastingStatus}
        participantId={participantId}
        onDone={handleRatingDone}
        onBack={() => setStep("mode")}
      />
    );
  }

  if (step === "rating" && mode === "compact") {
    return (
      <CompactRating
        th={th}
        t={t}
        whisky={whisky}
        tastingId={tastingId}
        dramIdx={dramIdx}
        total={total}
        tastingStatus={tastingStatus}
        participantId={participantId}
        onDone={handleRatingDone}
        onBack={() => setStep("mode")}
      />
    );
  }

  if (step === "summary" && result) {
    return (
      <RatingSummary
        th={th}
        t={t}
        data={result}
        whisky={whisky}
        dramIdx={dramIdx}
        onNext={handleSummaryNext}
        onEdit={handleSummaryEdit}
      />
    );
  }

  return null;
}
