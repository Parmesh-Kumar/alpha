import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md border border-primary/30 bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
    >
      α
    </span>
  );
}

export function Brand({ to = "/", compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <BrandMark />
      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-foreground">Alpha Foundry</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Quant research
          </span>
        </span>
      ) : null}
    </Link>
  );
}
