import type { Metadata } from "next";
import "./globals.css";
import { Manrope, Source_Serif_4 } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Papershare",
  description: "Upload, compartilhamento e análise de documentos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={cn("font-sans", manrope.variable, sourceSerif4.variable)}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
