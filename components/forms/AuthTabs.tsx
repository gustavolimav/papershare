import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthTabsProps {
  active: "login" | "register";
}

// Each tab is a real navigation (next/link to /login or /register), not a
// client-side swap — both routes keep working exactly as before (deep
// links, redirect-if-authenticated, etc.), this only adds a way to cross
// over without hunting for the small text link at the bottom of the form.
export function AuthTabs({ active }: AuthTabsProps) {
  return (
    <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
      <Link
        href="/login"
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors",
          active === "login"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Entrar
      </Link>
      <Link
        href="/register"
        className={cn(
          "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors",
          active === "register"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Criar conta
      </Link>
    </div>
  );
}
