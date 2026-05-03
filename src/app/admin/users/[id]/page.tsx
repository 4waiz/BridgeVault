import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Calendar, ScanLine, Shield } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/badge";
import { KpiCard } from "@/components/admin/kpi-card";
import { DeleteButton } from "@/components/admin/delete-button";
import { ProfileEditForm } from "@/components/admin/profile-edit-form";
import { requireAdmin } from "@/lib/admin";
import { adminDeleteProfile, getProfileWithLeads } from "@/actions/admin";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireAdmin();
  const { id } = await params;
  const { profile, stats, leads, activity } = await getProfileWithLeads(id);
  if (!profile) notFound();

  const isSelf = user.id === id;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 lg:p-8">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All users
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-lg font-bold text-brand">
              {(profile.full_name || profile.email || "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold md:text-3xl">
                  {profile.full_name || "(no name)"}
                </h1>
                {profile.is_admin && (
                  <Badge variant="brand" className="gap-1">
                    <Shield className="h-3 w-3" /> Admin
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {profile.email}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(profile.created_at)}
                </span>
                {stats?.last_scan_at && (
                  <span className="inline-flex items-center gap-1">
                    <ScanLine className="h-3.5 w-3.5" /> Last scan {formatDate(stats.last_scan_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Total Leads" value={stats?.leads_count ?? 0} variant="brand" />
          <KpiCard label="Qualified" value={stats?.qualified_count ?? 0} variant="success" />
          <KpiCard label="Contacted" value={stats?.contacted_count ?? 0} variant="warning" />
          <KpiCard label="Drafts" value={stats?.drafts_count ?? 0} variant="info" />
        </div>

        <div className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="mb-4 text-sm font-semibold">Edit profile</h2>
          <ProfileEditForm
            userId={profile.id}
            initialFullName={profile.full_name}
            initialIsAdmin={profile.is_admin}
            isSelf={isSelf}
          />
        </div>

        <div className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="mb-4 text-sm font-semibold">
            Leads scanned by this user ({leads.length})
          </h2>
          {leads.length === 0 ? (
            <p className="text-sm text-text-muted">No leads yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-bg-elevated">
                  <tr className="text-left text-xs text-text-muted">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leads.slice(0, 50).map((l) => (
                    <tr key={l.id} className="hover:bg-panel-2">
                      <td className="px-3 py-2">
                        <Link href={`/admin/leads/${l.id}`} className="font-medium hover:underline">
                          {l.full_name || "—"}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-text-muted">{l.company || "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="px-3 py-2 text-xs text-text-muted">
                        {formatDate(l.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="mb-4 text-sm font-semibold">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-text-muted">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {activity.slice(0, 30).map((a) => {
                type Joined = typeof a & { leads: { full_name: string | null; company: string | null } | null };
                const j = a as Joined;
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-bg-elevated px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{a.action.replaceAll("_", " ")}</span>
                      {j.leads?.full_name && (
                        <span className="text-text-muted"> · {j.leads.full_name}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-text-muted">
                      {formatDateTime(a.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!isSelf && (
          <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
            <h2 className="mb-1 text-sm font-semibold text-danger">Danger zone</h2>
            <p className="mb-4 text-xs text-text-muted">
              Permanently delete this user, their leads, attachments and activity log.
            </p>
            <DeleteButton
              label="Delete this user"
              size="md"
              message={`Delete ${profile.email || "this user"}? This will permanently remove their auth account, all leads, attachments, tags and activity. This cannot be undone.`}
              successText="User deleted."
              redirectTo="/admin/users"
              action={async () => {
                "use server";
                return adminDeleteProfile(profile.id);
              }}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
