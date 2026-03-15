import { useQuery } from "@tanstack/react-query";
import { getParticipantId } from "@/lib/api";

interface AIStatus {
  masterDisabled: boolean;
  disabledFeatures: string[];
  isAdmin?: boolean;
}

export function useAIStatus() {
  const { data } = useQuery<AIStatus>({
    queryKey: ["ai-status"],
    queryFn: async () => {
      const pid = getParticipantId();
      const headers: Record<string, string> = {};
      if (pid) headers["x-participant-id"] = pid;
      const res = await fetch("/api/ai-status", { headers });
      if (!res.ok) return { masterDisabled: false, disabledFeatures: [] };
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const isFeatureDisabled = (featureId: string): boolean => {
    if (!data) return false;
    if (data.isAdmin) return false;
    if (data.masterDisabled) return true;
    return data.disabledFeatures.includes(featureId);
  };

  const isAnyAIDisabled = data?.masterDisabled || (data?.disabledFeatures?.length ?? 0) > 0;

  return {
    isFeatureDisabled,
    isAnyAIDisabled: data?.isAdmin ? false : !!isAnyAIDisabled,
    masterDisabled: data?.isAdmin ? false : (data?.masterDisabled ?? false),
  };
}
