import { useQuery } from "@tanstack/react-query";

interface AIStatus {
  masterDisabled: boolean;
  disabledFeatures: string[];
}

export function useAIStatus() {
  const { data } = useQuery<AIStatus>({
    queryKey: ["ai-status"],
    queryFn: async () => {
      const res = await fetch("/api/ai-status");
      if (!res.ok) return { masterDisabled: false, disabledFeatures: [] };
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const isFeatureDisabled = (featureId: string): boolean => {
    if (!data) return false;
    if (data.masterDisabled) return true;
    return data.disabledFeatures.includes(featureId);
  };

  const isAnyAIDisabled = data?.masterDisabled || (data?.disabledFeatures?.length ?? 0) > 0;

  return {
    isFeatureDisabled,
    isAnyAIDisabled: !!isAnyAIDisabled,
    masterDisabled: data?.masterDisabled ?? false,
  };
}
