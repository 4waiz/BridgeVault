import * as XLSX from "xlsx";
import type {
  AdminActivityRow,
  AdminLeadRow,
  AdminOverview,
  AdminProfileStats,
  DailyScan,
  Lead,
} from "@/types";

const COLUMNS = [
  { key: "full_name", header: "Full Name" },
  { key: "first_name", header: "First Name" },
  { key: "last_name", header: "Last Name" },
  { key: "job_title", header: "Job Title" },
  { key: "company", header: "Company" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "website", header: "Website" },
  { key: "domain", header: "Domain" },
  { key: "address", header: "Address" },
  { key: "city", header: "City" },
  { key: "country", header: "Country" },
  { key: "status", header: "Status" },
  { key: "summary", header: "Summary" },
  { key: "notes", header: "Notes" },
  { key: "created_at", header: "Created At" },
  { key: "updated_at", header: "Updated At" },
] as const;

const CARD_IMAGE_HEADER = "Card Image";

/** Convert a value-only cell at (r,c) into a hyperlink cell pointing at `url`. */
function setHyperlinkCell(ws: XLSX.WorkSheet, r: number, c: number, url: string) {
  const addr = XLSX.utils.encode_cell({ r, c });
  ws[addr] = { t: "s", v: "View image", l: { Target: url, Tooltip: "Open business card" } };
}

/** Neutralize CSV/XLSX formula injection. A cell that begins with
 *  = + - @ \t or \r is interpreted as a formula when opened in Excel /
 *  Google Sheets / LibreOffice, so prefix it with a leading apostrophe. */
function safeCell(value: string | null): string | null {
  if (!value) return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function generateExcelBuffer(
  leads: Lead[],
  imageUrls?: Map<string, string>
): Buffer {
  const rows = leads.map((lead) => {
    const row: Record<string, string | null> = {};
    COLUMNS.forEach((col) => {
      const value = lead[col.key as keyof Lead];
      if (col.key === "created_at" || col.key === "updated_at") {
        row[col.header] = value
          ? new Date(value as string).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : null;
      } else {
        row[col.header] = safeCell((value as string) || null);
      }
    });
    // Placeholder so json_to_sheet allocates the column. Real hyperlink
    // cell is written below.
    row[CARD_IMAGE_HEADER] = imageUrls?.has(lead.id) ? "View image" : null;
    return row;
  });

  const headers = [...COLUMNS.map((c) => c.header), CARD_IMAGE_HEADER];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Replace plain "View image" strings with proper hyperlink cells.
  if (imageUrls && imageUrls.size > 0) {
    const cardCol = headers.indexOf(CARD_IMAGE_HEADER);
    leads.forEach((lead, i) => {
      const url = imageUrls.get(lead.id);
      if (url) setHyperlinkCell(ws, i + 1, cardCol, url); // +1 skips header row
    });
  }

  // Auto-size columns (Card Image column gets a fixed reasonable width)
  const colWidths = headers.map((header) => {
    if (header === CARD_IMAGE_HEADER) return { wch: 14 };
    const maxDataLen = Math.max(
      header.length,
      ...rows.map((r) => (r[header] || "").length)
    );
    return { wch: Math.min(Math.max(maxDataLen + 2, 10), 50) };
  });
  ws["!cols"] = colWidths;

  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, "Leads");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildSheet(
  rows: Record<string, string | number | null>[],
  headers: string[]
): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws["!cols"] = headers.map((h) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[h] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
  });
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  return ws;
}

export function generateAdminWorkbook(input: {
  overview: AdminOverview;
  profiles: AdminProfileStats[];
  leads: AdminLeadRow[];
  dailyScans: DailyScan[];
  activity: AdminActivityRow[];
  imageUrls?: Map<string, string>;
}): Buffer {
  const wb = XLSX.utils.book_new();

  // 1. Overview
  const overviewRows = [
    { Metric: "Total users", Value: input.overview.total_users },
    { Metric: "Total leads (non-draft)", Value: input.overview.total_leads },
    { Metric: "Total scans", Value: input.overview.total_scans },
    { Metric: "Qualified leads", Value: input.overview.total_qualified },
    { Metric: "Contacted leads", Value: input.overview.total_contacted },
    { Metric: "Average leads / user", Value: input.overview.avg_leads_per_user },
    { Metric: "Generated at", Value: new Date().toISOString() },
  ];
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(overviewRows, ["Metric", "Value"]),
    "Overview"
  );

  // 2. Per-user stats
  const perUserHeaders = [
    "Full Name",
    "Email",
    "Joined",
    "Is Admin",
    "Leads",
    "Qualified",
    "Contacted",
    "Drafts",
    "Last Scan",
  ];
  const perUserRows = input.profiles.map((p) => ({
    "Full Name": safeCell(p.full_name),
    Email: safeCell(p.email),
    Joined: formatDateTime(p.joined_at),
    "Is Admin": p.is_admin ? "Yes" : "No",
    Leads: p.leads_count,
    Qualified: p.qualified_count,
    Contacted: p.contacted_count,
    Drafts: p.drafts_count,
    "Last Scan": formatDateTime(p.last_scan_at),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(perUserRows, perUserHeaders),
    "Per-User-Stats"
  );

  // 3. All leads with scanner info
  const leadHeaders = [
    "Full Name",
    "Job Title",
    "Company",
    "Email",
    "Phone",
    "Website",
    "City",
    "Country",
    "Status",
    "Notes",
    "Scanned By Name",
    "Scanned By Email",
    "Created",
    "Updated",
    CARD_IMAGE_HEADER,
  ];
  const leadRows = input.leads.map((l) => ({
    "Full Name": safeCell(l.full_name),
    "Job Title": safeCell(l.job_title),
    Company: safeCell(l.company),
    Email: safeCell(l.email),
    Phone: safeCell(l.phone),
    Website: safeCell(l.website),
    City: safeCell(l.city),
    Country: safeCell(l.country),
    Status: l.status,
    Notes: safeCell(l.notes),
    "Scanned By Name": safeCell(l.scanned_by_name),
    "Scanned By Email": safeCell(l.scanned_by_email),
    Created: formatDateTime(l.created_at),
    Updated: formatDateTime(l.updated_at),
    [CARD_IMAGE_HEADER]: input.imageUrls?.has(l.id) ? "View image" : null,
  }));
  const leadsSheet = buildSheet(leadRows, leadHeaders);
  if (input.imageUrls && input.imageUrls.size > 0) {
    const cardCol = leadHeaders.indexOf(CARD_IMAGE_HEADER);
    input.leads.forEach((l, i) => {
      const url = input.imageUrls!.get(l.id);
      if (url) setHyperlinkCell(leadsSheet, i + 1, cardCol, url);
    });
  }
  XLSX.utils.book_append_sheet(wb, leadsSheet, "All-Leads");

  // 4. Daily scans
  const dailyHeaders = ["Day", "Scans"];
  const dailyRows = input.dailyScans.map((d) => ({ Day: d.day, Scans: d.scans }));
  XLSX.utils.book_append_sheet(wb, buildSheet(dailyRows, dailyHeaders), "Daily-Scans");

  // 5. Activity log
  const actHeaders = ["When", "Scanner Name", "Scanner Email", "Action", "Lead", "Lead Company"];
  const actRows = input.activity.map((a) => ({
    When: formatDateTime(a.created_at),
    "Scanner Name": safeCell(a.scanner_name),
    "Scanner Email": safeCell(a.scanner_email),
    Action: a.action,
    Lead: safeCell(a.lead_name),
    "Lead Company": safeCell(a.lead_company),
  }));
  XLSX.utils.book_append_sheet(wb, buildSheet(actRows, actHeaders), "Activity-Log");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf);
}
