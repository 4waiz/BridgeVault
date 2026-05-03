import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { LeadEditForm } from "@/components/admin/lead-edit-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { requireAdmin } from "@/lib/admin";
import { adminDeleteLead, getAdminLead } from "@/actions/admin";
import { formatDateTime } from "@/lib/utils";
import type { Lead } from "@/types";

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const result = await getAdminLead(id);
  if ("error" in result || !result.data) notFound();

  type Joined = Lead & {
    profiles: { full_name: string | null; email: string | null } | null;
    lead_tags?: { tag: string }[];
  };
  const lead = result.data as Joined;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6 lg:p-8">
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All leads
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{lead.full_name || "(unnamed)"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
              <StatusBadge status={lead.status} />
              {lead.company && <span>· {lead.company}</span>}
              <span>· Created {formatDateTime(lead.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Scanned by
          </p>
          {lead.profiles ? (
            <Link
              href={`/admin/users/${lead.user_id}`}
              className="inline-flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-panel-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                <User className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-text">
                  {lead.profiles.full_name || "(no name)"}
                </span>
                <span className="block text-xs text-text-muted">{lead.profiles.email}</span>
              </span>
            </Link>
          ) : (
            <span className="text-sm text-text-muted">Unknown</span>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="mb-4 text-sm font-semibold">Edit lead</h2>
          <LeadEditForm lead={lead} />
        </div>

        {lead.lead_tags && lead.lead_tags.length > 0 && (
          <div className="rounded-2xl border border-border bg-panel p-5">
            <h2 className="mb-3 text-sm font-semibold">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {lead.lead_tags.map((t, i) => (
                <Badge key={i} variant="brand">
                  {t.tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
          <h2 className="mb-1 text-sm font-semibold text-danger">Danger zone</h2>
          <p className="mb-4 text-xs text-text-muted">
            Permanently delete this lead and any attachments.
          </p>
          <DeleteButton
            label="Delete this lead"
            size="md"
            message={`Delete "${lead.full_name || "this lead"}"? This cannot be undone.`}
            successText="Lead deleted."
            redirectTo="/admin/leads"
            action={async () => {
              "use server";
              return adminDeleteLead(lead.id);
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
