import { useQuery } from "@tanstack/react-query";
import { participantApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export type CooperPhase = "voice" | "input";

/**
 * Loest den Cooper-Einstieg auf: kontogebundene Praeferenz (cooperEntryMode)
 * ueberschreibt den situativen Default.
 *   "voice" -> immer Stimme
 *   "type"  -> immer Tippen
 *   "auto"/null/unbekannt -> contextDefault (Solo/Dram = "voice", Gruppe = "input")
 * Gaeste ohne Konto bekommen immer den contextDefault.
 */
export function useCooperStartPhase(contextDefault: CooperPhase): CooperPhase {
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;
  const { data: participant } = useQuery({
    queryKey: ["participant", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });
  const pref = (participant as any)?.cooperEntryMode;
  if (pref === "voice") return "voice";
  if (pref === "type") return "input";
  return contextDefault;
}
