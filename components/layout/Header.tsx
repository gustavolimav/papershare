import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

// Only ever renders the public/pre-auth nav now — every authenticated
// page lives under app/(app)/ and uses AppShell's sidebar instead (see
// components/layout/AppShell.tsx, which also owns the WorkspaceSwitcher
// this component used to render).
export function Header() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight"
        >
          Papershare
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Cadastrar</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
