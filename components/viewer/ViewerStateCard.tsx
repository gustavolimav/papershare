import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ViewerStateCardCta =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

interface ViewerStateCardProps {
  icon: LucideIcon;
  title: string;
  description?: string | undefined;
  cta?: ViewerStateCardCta | undefined;
}

// Centered icon-circle / serif-heading / muted-description / single-CTA
// pattern used for every error and empty state reachable from a public
// share link (revoked, expired, not found, preview unavailable, ...).
export function ViewerStateCard({
  icon: Icon,
  title,
  description,
  cta,
}: ViewerStateCardProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <div className="space-y-1.5">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {cta &&
        (cta.href ? (
          <Button asChild>
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ) : (
          <Button type="button" onClick={cta.onClick}>
            {cta.label}
          </Button>
        ))}
    </div>
  );
}
