import { useState, useCallback } from "react";
import { useV2Theme, useV2Lang } from "../../LabsV2Layout";
import MeineWeltHub from "./MeineWeltHub";
import TasteProfile from "./TasteProfile";
import TasteAnalytics from "./TasteAnalytics";
import FlavourWheel from "./FlavourWheel";
import WhiskyCompare from "./WhiskyCompare";
import Recommendations from "./Recommendations";
import JournalList from "./JournalList";
import TastingCalendar from "./TastingCalendar";
import ProfileEdit from "./ProfileEdit";
import CollectionAnalysis from "./CollectionAnalysis";

export type MeineWeltSub =
  | null
  | "profile"
  | "analytics"
  | "connoisseur"
  | "journal"
  | "compare"
  | "calendar"
  | "tasteprofile"
  | "recommendations"
  | "collection";

function getParticipantId(): string {
  try {
    return (
      sessionStorage.getItem("session_pid") ||
      localStorage.getItem("casksense_participant_id") ||
      "demo"
    );
  } catch {
    return "demo";
  }
}

export default function MeineWeltScreen() {
  const { th } = useV2Theme();
  const { t } = useV2Lang();
  const [sub, setSub] = useState<MeineWeltSub>(null);
  const participantId = getParticipantId();

  const goBack = useCallback(() => setSub(null), []);

  if (sub === "profile") return <ProfileEdit th={th} t={t} participantId={participantId} onBack={goBack} />;
  if (sub === "analytics") return <TasteAnalytics th={th} t={t} participantId={participantId} onBack={goBack} />;
  if (sub === "connoisseur") return <FlavourWheel th={th} t={t} participantId={participantId} onBack={goBack} />;
  if (sub === "journal") return <JournalList th={th} t={t} participantId={participantId} onBack={goBack} />;
  if (sub === "compare") return <WhiskyCompare th={th} t={t} participantId={participantId} onBack={goBack} />;
  if (sub === "calendar") return <TastingCalendar th={th} t={t} participantId={participantId} onBack={goBack} />;
  if (sub === "tasteprofile") return <TasteProfile th={th} t={t} participantId={participantId} onBack={goBack} />;
  if (sub === "recommendations") return <Recommendations th={th} t={t} participantId={participantId} onBack={goBack} />;
  if (sub === "collection") return <CollectionAnalysis th={th} t={t} participantId={participantId} onBack={goBack} />;

  return (
    <MeineWeltHub
      th={th}
      t={t}
      participantId={participantId}
      onNavigate={setSub}
    />
  );
}
