import Link from "next/link";
import { Users, FileSpreadsheet, ScanLine, Sparkles, Download, Shield } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/admin/kpi-card";
import { DailyScansChart } from "@/components/admin/daily-scans-chart";
import { TopUsersLeaderboard } from "@/components/admin/top-users-leaderboard";
import { RecentActivityFeed } from "@/components/admin/recent-activity-feed";
import { requireAdmin } from "@/lib/admin";
import {
  getAdminOverview,
  getDailyScans,
  getTopUsers,
  getRecentActivity,
} from "@/actions/admin";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [overview, daily, top, activity] = await Promise.all([
    getAdminOverview(),
    getDailyScans(),
    getTopUsers(10),
    getRecentActivity(20),
  ]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-6 lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                <Shield className="h-3.5 w-3.5" />
                Admin
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Analytics Overview</h1>
            <p className="mt-1 text-text-muted">Cross-user activity, performance and exports.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/users">
              <Button variant="secondary" className="gap-2">
                <Users className="h-4 w-4" /> Users
              </Button>
            </Link>
            <Link href="/admin/leads">
              <Button variant="secondary" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" /> All Leads
              </Button>
            </Link>
            <Link href="/admin/export">
              <Button className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            label="Total Users"
            value={overview.total_users}
            variant="info"
            icon={<Users className="h-5 w-5 text-sky-500" />}
          />
          <KpiCard
            label="Total Leads"
            value={overview.total_leads}
            variant="brand"
            icon={<FileSpreadsheet className="h-5 w-5 text-brand" />}
          />
          <KpiCard
            label="Total Scans"
            value={overview.total_scans}
            variant="success"
            icon={<ScanLine className="h-5 w-5 text-success" />}
          />
          <KpiCard
            label="Avg Leads / User"
            value={overview.avg_leads_per_user}
            variant="warning"
            icon={<Sparkles className="h-5 w-5 text-warning" />}
            hint={`${overview.total_qualified} qualified · ${overview.total_contacted} contacted`}
          />
        </div>

        <DailyScansChart data={daily} />

        <div className="grid gap-4 lg:grid-cols-2">
          <TopUsersLeaderboard users={top} />
          <RecentActivityFeed items={activity} />
        </div>
      </div>
    </AppShell>
  );
}
