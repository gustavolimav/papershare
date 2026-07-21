"use client";

import { SWRConfig } from "swr";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SWRConfig value={{ revalidateOnFocus: true, dedupingInterval: 5000 }}>
        <AuthProvider>{children}</AuthProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}
