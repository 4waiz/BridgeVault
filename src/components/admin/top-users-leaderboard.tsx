import Link from "next/link";
import { Trophy } from "lucide-react";
import type { AdminProfileStats } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  users: AdminProfileStats[];
}

const rankColors = [
  "bg-yellow-400/20 text-yellow-500 border-yellow-400/40",
  "bg-zinc-300/20 text-zinc-400 border-zinc-300/40",
  "bg-amber-700/20 text-amber-600 border-amber-700/40",
];

function initials(name: string | null, email: string | null): string {
  const src = name || email || "?";
  const parts = src.trim().split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

export function TopUsersLeaderboard({ users }: Props) {
  const max = Math.max(1, ...users.map((u) => u.leads_count));

  return (
    <div className="rounded-2xl border border-border bg-panel p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold">Top Scanners</h3>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">No users yet.</p>
      ) : (
        <ul className="space-y-2">
          {users.map((u, i) => {
            const pct = (u.leads_count / max) * 100;
            const rankStyle =
              i < 3
                ? rankColors[i]
                : "bg-brand-soft text-brand border-brand/20";
            return (
              <li key={u.id}>
                <Link
                  href={`/admin/users/${u.id}`}
                  className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-panel-2"
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums",
                      rankStyle
                    )}
                  >
                    {i + 1}
                  </div>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                    {initials(u.full_name, u.email)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {u.full_name || u.email || "Unknown"}
                      </p>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-text">
                        {u.leads_count}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-strong"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
