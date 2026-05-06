"use server";

import { requireAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

// All reads/writes in this file go through `db` (service-role client returned
// by requireAdmin), which bypasses RLS so admins can see and modify rows
// belonging to any user. The is_admin gate runs inside requireAdmin first.
import type {
  AdminActivityRow,
  AdminLeadRow,
  AdminOverview,
  AdminProfileStats,
  DailyScan,
  LeadStatus,
} from "@/types";

function escapeSearchTerm(raw: string): string {
  return raw
    .slice(0, 80)
    .replace(/[,()%*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { db } = await requireAdmin();

  const [{ count: total_users }, { count: total_leads }, { count: total_scans }, { count: total_qualified }, { count: total_contacted }] =
    await Promise.all([
      db.from("profiles").select("*", { count: "exact", head: true }),
      db
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("is_draft", false),
      db
        .from("lead_activity")
        .select("*", { count: "exact", head: true })
        .in("action", ["created", "draft_promoted"]),
      db
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "qualified"),
      db
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "contacted"),
    ]);

  const users = total_users || 0;
  const leads = total_leads || 0;
  const avg = users > 0 ? leads / users : 0;

  return {
    total_users: users,
    total_leads: leads,
    total_scans: total_scans || 0,
    total_qualified: total_qualified || 0,
    total_contacted: total_contacted || 0,
    avg_leads_per_user: Math.round(avg * 10) / 10,
  };
}

export async function getDailyScans(): Promise<DailyScan[]> {
  const { db } = await requireAdmin();
  const { data } = await db.from("admin_daily_scans").select("*");

  const map = new Map<string, number>();
  (data || []).forEach((row: { day: string; scans: number }) => {
    map.set(row.day, Number(row.scans));
  });

  const out: DailyScan[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, scans: map.get(key) || 0 });
  }
  return out;
}

export async function getTopUsers(limit = 10): Promise<AdminProfileStats[]> {
  const { db } = await requireAdmin();
  const { data } = await db
    .from("admin_user_stats")
    .select("*")
    .order("leads_count", { ascending: false })
    .limit(limit);
  return (data as AdminProfileStats[]) || [];
}

export async function getRecentActivity(limit = 20): Promise<AdminActivityRow[]> {
  const { db } = await requireAdmin();
  const { data } = await db
    .from("lead_activity")
    .select(
      "id, action, created_at, metadata, user_id, lead_id, profiles!lead_activity_user_id_fkey(full_name, email), leads(full_name, company)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  type Row = {
    id: string;
    action: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
    user_id: string;
    lead_id: string | null;
    profiles: { full_name: string | null; email: string | null } | null;
    leads: { full_name: string | null; company: string | null } | null;
  };

  return ((data as unknown as Row[]) || []).map((r) => ({
    id: r.id,
    action: r.action,
    created_at: r.created_at,
    metadata: r.metadata,
    scanner_id: r.user_id,
    scanner_name: r.profiles?.full_name ?? null,
    scanner_email: r.profiles?.email ?? null,
    lead_id: r.lead_id,
    lead_name: r.leads?.full_name ?? null,
    lead_company: r.leads?.company ?? null,
  }));
}

export async function getAllProfiles(): Promise<AdminProfileStats[]> {
  const { db } = await requireAdmin();
  const { data } = await db
    .from("admin_user_stats")
    .select("*")
    .order("leads_count", { ascending: false });
  return (data as AdminProfileStats[]) || [];
}

export async function getProfileWithLeads(userId: string) {
  const { db } = await requireAdmin();

  const [{ data: profile }, { data: stats }, { data: leads }, { data: activity }] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).single(),
    db.from("admin_user_stats").select("*").eq("id", userId).single(),
    db
      .from("leads")
      .select("*")
      .eq("user_id", userId)
      .eq("is_draft", false)
      .order("created_at", { ascending: false }),
    db
      .from("lead_activity")
      .select("*, leads(full_name, company)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return { profile, stats, leads: leads || [], activity: activity || [] };
}

export async function getAllLeadsAdmin(params?: {
  search?: string;
  status?: LeadStatus | "all";
  userId?: string;
  from?: string;
  to?: string;
  sort?: string;
}): Promise<AdminLeadRow[]> {
  const { db } = await requireAdmin();

  let query = db
    .from("leads")
    .select(
      "*, profiles!leads_user_id_fkey(full_name, email)"
    )
    .eq("is_draft", false);

  if (params?.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params?.userId && params.userId !== "all") {
    query = query.eq("user_id", params.userId);
  }
  if (params?.from) {
    query = query.gte("created_at", params.from);
  }
  if (params?.to) {
    query = query.lte("created_at", params.to);
  }
  if (params?.search) {
    const safe = escapeSearchTerm(params.search);
    if (safe) {
      query = query.or(
        `full_name.ilike.%${safe}%,company.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`
      );
    }
  }

  switch (params?.sort) {
    case "name":
      query = query.order("full_name", { ascending: true });
      break;
    case "company":
      query = query.order("company", { ascending: true });
      break;
    case "status":
      query = query.order("status", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data } = await query;
  type Row = AdminLeadRow & {
    profiles: { full_name: string | null; email: string | null } | null;
  };
  return ((data as unknown as Row[]) || []).map((r) => ({
    ...r,
    scanned_by_name: r.profiles?.full_name ?? null,
    scanned_by_email: r.profiles?.email ?? null,
  }));
}

export async function getAdminLead(leadId: string) {
  const { db } = await requireAdmin();
  const { data, error } = await db
    .from("leads")
    .select(
      "*, lead_tags(*), lead_attachments(*), profiles!leads_user_id_fkey(full_name, email)"
    )
    .eq("id", leadId)
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function adminUpdateLead(
  leadId: string,
  data: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    job_title?: string;
    company?: string;
    email?: string;
    phone?: string;
    website?: string;
    domain?: string;
    address?: string;
    city?: string;
    country?: string;
    notes?: string;
    status?: LeadStatus;
    summary?: string;
  }
) {
  const { db, user } = await requireAdmin();

  const { error } = await db.from("leads").update(data).eq("id", leadId);
  if (error) return { error: error.message };

  await db.from("lead_activity").insert({
    lead_id: leadId,
    user_id: user.id,
    action: "admin_updated",
    metadata: { fields: Object.keys(data) },
  });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true };
}

export async function adminDeleteLead(leadId: string) {
  const { db } = await requireAdmin();

  const { data: attachments } = await db
    .from("lead_attachments")
    .select("storage_path")
    .eq("lead_id", leadId);

  if (attachments?.length) {
    await db.storage
      .from("business-cards")
      .remove(attachments.map((a) => a.storage_path));
  }

  const { error } = await db.from("leads").delete().eq("id", leadId);
  if (error) return { error: error.message };

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { success: true };
}

export async function adminUpdateProfile(
  userId: string,
  data: { full_name?: string; is_admin?: boolean }
) {
  const { db } = await requireAdmin();
  const { error } = await db
    .from("profiles")
    .update(data)
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function adminDeleteProfile(userId: string) {
  const { user, db } = await requireAdmin();
  if (user.id === userId) {
    return { error: "You cannot delete your own admin account." };
  }

  const { data: attachments } = await db
    .from("lead_attachments")
    .select("storage_path")
    .eq("user_id", userId);

  if (attachments?.length) {
    await db.storage
      .from("business-cards")
      .remove(attachments.map((a) => a.storage_path));
  }

  await db.from("lead_attachments").delete().eq("user_id", userId);
  await db.from("lead_tags").delete().eq("user_id", userId);
  await db.from("lead_activity").delete().eq("user_id", userId);
  await db.from("leads").delete().eq("user_id", userId);

  let serviceError: string | null = null;
  try {
    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) serviceError = error.message;
  } catch (err) {
    serviceError = err instanceof Error ? err.message : "Service client unavailable";
  }

  if (serviceError) {
    return {
      error: `Lead data deleted, but auth user removal failed: ${serviceError}. Add SUPABASE_SERVICE_ROLE_KEY to .env.local and retry.`,
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true };
}
