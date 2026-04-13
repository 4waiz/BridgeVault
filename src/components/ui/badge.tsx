import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "brand" | "success" | "warning" | "danger" | "muted";
  className?: string;
}

const variantStyles = {
  default: "bg-panel-2 text-text-muted border-border",
  brand: "bg-brand-soft text-brand border-brand/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  muted: "bg-panel text-text-muted border-border",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

const statusVariantMap: Record<LeadStatus, BadgeProps["variant"]> = {
  new: "brand",
  reviewed: "default",
  contacted: "warning",
  qualified: "success",
  archived: "muted",
  draft: "muted",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant={statusVariantMap[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
