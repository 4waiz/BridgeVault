import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { generateAdminWorkbook } from "@/lib/export";
import {
  getAdminOverview,
  getAllLeadsAdmin,
  getAllProfiles,
  getDailyScans,
  getRecentActivity,
} from "@/actions/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function GET() {
  const { db } = await requireAdmin();

  const [overview, profiles, leads, dailyScans, activity] = await Promise.all([
    getAdminOverview(),
    getAllProfiles(),
    getAllLeadsAdmin({ status: "all" }),
    getDailyScans(),
    getRecentActivity(500),
  ]);

  // Build lead_id → signed-image-URL map for the All-Leads sheet.
  const imageUrls = new Map<string, string>();
  if (leads.length > 0) {
    const { data: attachments } = await db
      .from("lead_attachments")
      .select("lead_id, storage_path")
      .in(
        "lead_id",
        leads.map((l) => l.id)
      );

    // First attachment wins per lead.
    const firstPath = new Map<string, string>();
    for (const a of (attachments || []) as { lead_id: string; storage_path: string }[]) {
      if (!firstPath.has(a.lead_id)) firstPath.set(a.lead_id, a.storage_path);
    }

    await Promise.all(
      Array.from(firstPath.entries()).map(async ([leadId, path]) => {
        const { data: signed } = await db.storage
          .from("business-cards")
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
        if (signed?.signedUrl) imageUrls.set(leadId, signed.signedUrl);
      })
    );
  }

  const buffer = generateAdminWorkbook({
    overview,
    profiles,
    leads,
    dailyScans,
    activity,
    imageUrls,
  });
  const uint8 = new Uint8Array(buffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bridge-vault-admin-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
