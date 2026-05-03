import Link from "next/link";
import { ArrowLeft, Download, Printer, FileSpreadsheet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";

export default async function AdminExportPage() {
  await requireAdmin();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6 lg:p-8">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
          </Link>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Export</h1>
          <p className="text-text-muted">Download every dataset as a single Excel workbook.</p>
        </div>

        <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/15 to-brand/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Full admin workbook (.xlsx)</h2>
              <p className="mt-1 text-sm text-text-muted">
                Includes 5 sheets: Overview, Per-User-Stats, All-Leads (with scanner name and email),
                Daily-Scans, and Activity-Log. Bold headers and frozen header row on each sheet.
              </p>
              <a href="/api/admin/export" download className="mt-4 inline-block">
                <Button className="gap-2">
                  <Download className="h-4 w-4" /> Download Excel
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel-2">
              <Printer className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Need a colourful PDF?</h2>
              <p className="mt-1 text-sm text-text-muted">
                Open the{" "}
                <Link href="/admin" className="text-brand hover:underline">
                  Admin dashboard
                </Link>{" "}
                and use your browser&apos;s <strong>Print → Save as PDF</strong> for a polished,
                colour-rich report (the in-app dashboard is optimized for this).
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
