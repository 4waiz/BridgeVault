import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateExcelBuffer } from "@/lib/export";
import type { Lead, LeadStatus } from "@/types";

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
  let query = db.from("leads").select("*").eq("is_draft", false);

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

  const buffer = generateExcelBuffer((data || []) as Lead[]);
  const uint8 = new Uint8Array(buffer);

  return new NextResponse(uint8, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bridge-vault-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
