import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { FeatureFlagsResponse } from "@/types/index";

export const FEATURE_FLAGS_KEY = "/api/v1/feature-flags";

export function useFeatureFlags(): {
  flags: FeatureFlagsResponse | undefined;
  isLoading: boolean;
} {
  const { data, isLoading } = useSWR<FeatureFlagsResponse>(
    FEATURE_FLAGS_KEY,
    fetcher,
  );

  return { flags: data, isLoading };
}
