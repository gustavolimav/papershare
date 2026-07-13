"use client";

import { createContext, useContext, useMemo } from "react";
import useSWR, { type KeyedMutator } from "swr";
import { fetcher } from "@/lib/fetcher";
import type { UserPublic } from "@/types/index";

interface AuthContextValue {
  user: UserPublic | null;
  isLoading: boolean;
  mutateUser: KeyedMutator<UserPublic>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, mutate } = useSWR<UserPublic>(
    "/api/v1/sessions",
    fetcher,
    { shouldRetryOnError: false },
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data ?? null,
      isLoading,
      mutateUser: mutate,
    }),
    [data, isLoading, mutate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
