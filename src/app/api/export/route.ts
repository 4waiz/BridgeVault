import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateExcelBuffer } from "@/lib/export";
import type { Lead, LeadStatus } from "@/types";

// 7 days — long enough that a downloaded export remains useful for a week
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") as LeadStatus | "all" | null;
  const sort = searchParams.get("sort") || "newest";

  const db = createServiceClient();
  let query = db
    .from("leads")
    .select("*, lead_attachments(storage_path)")
    .eq("is_draft", false);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    const safe = search
      .slice(0, 80)
      .replace(/[,()%*\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (safe) {
      query = query.or(
        `full_name.ilike.%${safe}%,company.ilike.%${safe}%,email.ilike.%${safe}%`
      );
    }
  }

  switch (sort) {
    case "name":
      query = query.order("full_name", { ascending: true });
      break;
    case "company":
      query = query.order("company", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type LeadWithAttachments = Lead & {
    lead_attachments?: { storage_path: string }[];
  };
  const leads = (data || []) as LeadWithAttachments[];

  // Mint one signed URL per lead, in parallel. A lead may have several
  // attachments — just use the first. Failed URLs become null and render as
  // an empty cell.
  const imageUrls = new Map<string, string>();
  await Promise.all(
    leads.map(async (l) => {
      const path = l.lead_attachments?.[0]?.storage_path;
      if (!path) return;
      const { data: signed } = await db.storage
        .from("business-cards")
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signed?.signedUrl) imageUrls.set(l.id, signed.signedUrl);
    })
  );

  const buffer = generateExcelBuffer(leads as Lead[], imageUrls);
  const uint8 = new Uint8Array(buffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bridge-vault-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
