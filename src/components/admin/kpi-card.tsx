import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "brand" | "success" | "warning" | "info" | "danger";

const variantStyles: Record<Variant, string> = {
  brand: "from-brand/15 to-brand/5 border-brand/30 text-brand",
  success: "from-success/15 to-success/5 border-success/30 text-success",
  warning: "from-warning/15 to-warning/5 border-warning/30 text-warning",
  info: "from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-500",
  danger: "from-danger/15 to-danger/5 border-danger/30 text-danger",
};

interface KpiCardProps {
  label: string;
  value: number | string;
  variant?: Variant;
  icon?: ReactNode;
  hint?: string;
}

export function KpiCard({ label, value, variant = "brand", icon, hint }: KpiCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        "bg-gradient-to-br",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold text-text tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
        </div>
        {icon && (
          <div className={cn("shrink-0 rounded-xl p-2.5", "bg-bg-elevated/60 backdrop-blur")}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
