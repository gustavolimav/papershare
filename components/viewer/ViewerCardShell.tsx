import { cn } from "@/lib/utils";
import { ViewerFooter } from "@/components/viewer/ViewerFooter";

interface ViewerCardShellProps {
  children: React.ReactNode;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}

// Shared centered-card layout for every gate and error/empty state on the
// public viewer: full-height warm background, content vertically centered,
// attribution footer pinned to the bottom.
export function ViewerCardShell({
  children,
  className,
  style,
}: ViewerCardShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background" style={style}>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className={cn("w-full max-w-sm", className)}>{children}</div>
      </div>
      <ViewerFooter />
    </div>
  );
}
