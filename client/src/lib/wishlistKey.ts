import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { wishlistApi } from "./api";
import type { WishlistEntry } from "@shared/schema";

export function wishlistKey(name: string | null | undefined, distillery: string | null | undefined): string {
  return `${(name || "").trim().toLowerCase()}|${(distillery || "").trim().toLowerCase()}`;
}

export function useWishlistKeys(participantId: string | null | undefined) {
  const { data } = useQuery<WishlistEntry[]>({
    queryKey: ["wishlist", participantId],
    queryFn: () => wishlistApi.getAll(participantId!),
    enabled: !!participantId,
    staleTime: 60 * 1000,
  });

  return useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((e) => set.add(wishlistKey(e.name, e.distillery)));
    return set;
  }, [data]);
}
