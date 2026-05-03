import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { LeadsFilterBar } from "@/components/admin/leads-filter-bar";
import { DeleteButton } from "@/components/admin/delete-button";
import { requireAdmin } from "@/lib/admin";
import { adminDeleteLead, getAllLeadsAdmin, getAllProfiles } from "@/actions/admin";
import { formatDate } from "@/lib/utils";
import type { LeadStatus } from "@/types";

interface SearchParams {
  search?: string;
  status?: string;
  userId?: string;
  sort?: string;
  from?: string;
  to?: string;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const [leads, profiles] = await Promise.all([
    getAllLeadsAdmin({
      search: sp.search,
      status: (sp.status as LeadStatus | "all" | undefined) || "all",
      userId: sp.userId,
      sort: sp.sort,
      from: sp.from,
      to: sp.to,
    }),
    getAllProfiles(),
  ]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
          </Link>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">All Leads</h1>
          <p className="text-text-muted">{leads.length} leads across all users.</p>
        </div>

        <LeadsFilterBar
          users={profiles.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            email: p.email,
          }))}
        />

        <div className="overflow-hidden rounded-2xl border border-border bg-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-elevated">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Scanned by</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-panel-2">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{l.full_name || "—"}</p>
                      <p className="text-xs text-text-muted">
                        {l.email || l.phone || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{l.company || "—"}</td>
                    <td className="px-4 py-3">
                      {l.scanned_by_name || l.scanned_by_email ? (
                        <Link
                          href={`/admin/users/${l.user_id}`}
                          className="inline-flex items-center gap-2 hover:underline"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                            {(l.scanned_by_name || l.scanned_by_email || "?")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                          <span>
                            <span className="block text-xs font-medium text-text">
                              {l.scanned_by_name || "—"}
                            </span>
                            <span className="block text-[11px] text-text-muted">
                              {l.scanned_by_email}
                            </span>
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-text-muted">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {formatDate(l.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/leads/${l.id}`}>
                          <Button size="sm" variant="secondary" className="gap-1.5">
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                        </Link>
                        <DeleteButton
                          label="Delete"
                          message={`Delete lead "${l.full_name || "(unnamed)"}" scanned by ${l.scanned_by_email || "this user"}? This cannot be undone.`}
                          successText="Lead deleted."
                          action={async () => {
                            "use server";
                            return adminDeleteLead(l.id);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-text-muted">
                      No leads match these filters.
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
