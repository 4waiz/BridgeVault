import Link from "next/link";
import { Activity } from "lucide-react";
import type { AdminActivityRow } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  items: AdminActivityRow[];
}

const actionStyles: Record<string, { label: string; color: string }> = {
  created: { label: "scanned", color: "bg-success/15 text-success border-success/30" },
  draft_created: { label: "started a draft", color: "bg-warning/15 text-warning border-warning/30" },
  draft_promoted: { label: "promoted draft", color: "bg-brand-soft text-brand border-brand/30" },
  updated: { label: "updated", color: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  admin_updated: { label: "admin-edited", color: "bg-fuchsia-500/15 text-fuchsia-500 border-fuchsia-500/30" },
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(s: string | null): string {
  if (!s) return "?";
  const parts = s.trim().split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

export function RecentActivityFeed({ items }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold">Recent Activity</h3>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const style = actionStyles[it.action] || {
              label: it.action.replaceAll("_", " "),
              color: "bg-panel-2 text-text-muted border-border",
            };
            return (
              <li key={it.id} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                  {initials(it.scanner_name || it.scanner_email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <Link
                      href={`/admin/users/${it.scanner_id}`}
                      className="font-medium text-text hover:underline"
                    >
                      {it.scanner_name || it.scanner_email || "Unknown"}
                    </Link>
                    <span className="text-text-muted"> {style.label} </span>
                    {it.lead_id ? (
                      <Link
                        href={`/admin/leads/${it.lead_id}`}
                        className="font-medium text-text hover:underline"
                      >
                        {it.lead_name || "a lead"}
                      </Link>
                    ) : (
                      <span className="font-medium text-text">{it.lead_name || "a lead"}</span>
                    )}
                    {it.lead_company && (
                      <span className="text-text-muted"> · {it.lead_company}</span>
                    )}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                        style.color
                      )}
                    >
                      {it.action}
                    </span>
                    <span className="text-xs text-text-muted">{relTime(it.created_at)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
