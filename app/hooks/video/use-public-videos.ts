"use client";

import { useQuery } from "@tanstack/react-query";
import { getPublicVideos } from "@/lib/apis/video";

/**
 * Shared query for the public video list — used by HeroSection, VideoGrid,
 * and RelatedVideos. All three read the same skip/limit page, so they share
 * one cache entry (and one network request) via this hook's query key,
 * rather than each firing its own fetch.
 */
export function usePublicVideos(skip = 0, limit = 20) {
  return useQuery({
    queryKey: ["publicVideos", skip, limit],
    queryFn: () => getPublicVideos(skip, limit),
    staleTime: 60_000,
  });
}
