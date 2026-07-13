"use client";

import { SWRConfig } from "swr";
import { AuthProvider } from "@/context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ revalidateOnFocus: true, dedupingInterval: 5000 }}>
      <AuthProvider>{children}</AuthProvider>
    </SWRConfig>
  );
}
