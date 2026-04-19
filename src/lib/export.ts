import * as XLSX from "xlsx";
import type { Lead } from "@/types";

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

/** Neutralize CSV/XLSX formula injection. A cell that begins with
 *  = + - @ \t or \r is interpreted as a formula when opened in Excel /
 *  Google Sheets / LibreOffice, so prefix it with a leading apostrophe. */
function safeCell(value: string | null): string | null {
  if (!value) return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function generateExcelBuffer(leads: Lead[]): Buffer {
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
    return row;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = COLUMNS.map((col) => {
    const maxDataLen = Math.max(
      col.header.length,
      ...rows.map((r) => (r[col.header] || "").length)
    );
    return { wch: Math.min(Math.max(maxDataLen + 2, 10), 50) };
  });
  ws["!cols"] = colWidths;

  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, "Leads");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return Buffer.from(buf);
}
