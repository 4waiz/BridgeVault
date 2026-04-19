import Link from "next/link";
import { Camera, Users, FileSpreadsheet, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getRecentLeads, getLeadStats } from "@/actions/leads";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const [recentLeads, stats] = await Promise.all([
    getRecentLeads(5),
    getLeadStats(),
  ]);

  return (
    <AppShell>
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-text-muted mt-1">
            Manage your business card leads
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/scan">
            <Button className="gap-2">
              <Camera className="h-4 w-4" />
              Scan Card
            </Button>
          </Link>
          <Link href="/leads">
            <Button variant="secondary" className="gap-2">
              <Users className="h-4 w-4" />
              All Leads
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-text" },
            { label: "Contacted", value: stats.contacted, color: "text-warning" },
            { label: "Qualified", value: stats.qualified, color: "text-success" },
            { label: "Rejected", value: stats.rejected, color: "text-danger" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-2xl border border-border bg-panel"
            >
              <p className="text-sm text-text-muted">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Recent leads */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Leads</h2>
            {recentLeads.length > 0 && (
              <Link
                href="/leads"
                className="text-sm text-brand hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {recentLeads.length === 0 ? (
            <EmptyState
              title="No leads yet"
              description="Scan your first business card to get started"
              action={
                <Link href="/scan">
                  <Button className="gap-2">
                    <Camera className="h-4 w-4" />
                    Scan Card
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between p-4 rounded-2xl border border-border bg-panel hover:bg-panel-2 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
                      <span className="text-brand text-sm font-bold">
                        {(lead.full_name || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {lead.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {lead.company || "No company"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={lead.status} />
                    <span className="text-xs text-text-muted hidden sm:block">
                      {formatDate(lead.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
