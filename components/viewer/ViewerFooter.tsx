import Link from "next/link";

// Light product-attribution branding shown on every public viewer page and
// gate — new in Phase 11 (US-47), not present before this restyle. Links to
// the marketing homepage so a document recipient (usually not a Papershare
// customer themselves) can find out what sent them the document.
export function ViewerFooter() {
  return (
    <p className="shrink-0 px-4 py-4 text-center text-xs text-muted-foreground">
      Desenvolvido com{" "}
      <Link
        href="/"
        className="font-medium text-foreground/80 transition-colors hover:text-primary"
      >
        Papershare
      </Link>
    </p>
  );
}
