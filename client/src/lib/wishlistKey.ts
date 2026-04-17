import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { wishlistApi, collectionApi } from "./api";
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

export interface CollectionMatcher {
  has: (name: string | null | undefined, distillery?: string | null, whiskybaseId?: string | null) => boolean;
}

export function useCollectionKeys(participantId: string | null | undefined): CollectionMatcher {
  const { data } = useQuery({
    queryKey: ["collection-check", participantId],
    queryFn: () => collectionApi.check(participantId!),
    enabled: !!participantId,
    staleTime: 30 * 1000,
  });

  return useMemo<CollectionMatcher>(() => {
    const items = data?.items || {};
    return {
      has: (name, distillery, whiskybaseId) => {
        if (whiskybaseId && items[`wb:${whiskybaseId}`]) return true;
        const namePart = (name || "").trim().toLowerCase();
        if (!namePart) return false;
        const distPart = (distillery || "").trim().toLowerCase();
        const compositeKey = distPart ? `${namePart}|||${distPart}` : namePart;
        return !!(items[compositeKey] || items[namePart]);
      },
    };
  }, [data]);
}
