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

export async function GET() {
  await requireAdmin();

  const [overview, profiles, leads, dailyScans, activity] = await Promise.all([
    getAdminOverview(),
    getAllProfiles(),
    getAllLeadsAdmin({ status: "all" }),
    getDailyScans(),
    getRecentActivity(500),
  ]);

  const buffer = generateAdminWorkbook({
    overview,
    profiles,
    leads,
    dailyScans,
    activity,
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
