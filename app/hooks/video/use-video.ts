"use client";

import { useQuery } from "@tanstack/react-query";
import { getVideoById } from "@/lib/apis/video";

/** Single video by id — the watch page's data source. */
export function useVideo(videoId: string) {
  return useQuery({
    queryKey: ["video", videoId],
    queryFn: () => getVideoById(videoId),
    staleTime: 60_000,
    retry: false,
  });
}
