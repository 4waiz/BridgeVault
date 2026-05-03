import Link from "next/link";
import { Eye, Shield, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/admin/delete-button";
import { requireAdmin } from "@/lib/admin";
import { adminDeleteProfile, getAllProfiles } from "@/actions/admin";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  const { user } = await requireAdmin();
  const profiles = await getAllProfiles();

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
            </Link>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">All Users</h1>
            <p className="text-text-muted">{profiles.length} accounts in the system.</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Leads</th>
                  <th className="px-4 py-3 text-right">Qualified</th>
                  <th className="px-4 py-3 text-right">Drafts</th>
                  <th className="px-4 py-3">Last Scan</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-panel-2">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">
                          {p.full_name || "(no name)"}
                        </span>
                        {p.is_admin && (
                          <Badge variant="brand" className="gap-1">
                            <Shield className="h-3 w-3" /> Admin
                          </Badge>
                        )}
                        {p.id === user.id && (
                          <Badge variant="muted">You</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {formatDate(p.joined_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-text">
                      {p.leads_count}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-success">
                      {p.qualified_count}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                      {p.drafts_count}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {p.last_scan_at ? formatDate(p.last_scan_at) : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/users/${p.id}`}>
                          <Button size="sm" variant="secondary" className="gap-1.5">
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                        </Link>
                        {p.id !== user.id && (
                          <DeleteButton
                            label="Delete"
                            message={`Delete ${p.email || p.full_name || "this user"}? Their auth account, leads, attachments, tags and activity will all be permanently removed. This cannot be undone.`}
                            successText={`User ${p.email || ""} removed.`}
                            action={async () => {
                              "use server";
                              return adminDeleteProfile(p.id);
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
