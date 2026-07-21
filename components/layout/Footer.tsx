import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <Link
          href="/"
          className="font-heading text-base font-semibold tracking-tight"
        >
          Papershare
        </Link>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Papershare. Todos os direitos
          reservados.
        </p>
      </div>
    </footer>
  );
}
