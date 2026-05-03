export type LeadStatus = "reviewed" | "contacted" | "qualified" | "rejected" | "archived" | "draft";

export interface Lead {
  id: string;
  user_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  domain: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: LeadStatus;
  summary: string | null;
  notes: string | null;
  ocr_raw_text: string | null;
  ocr_json: Record<string, unknown> | null;
  enrichment_json: Record<string, unknown> | null;
  duplicate_of: string | null;
  is_draft: boolean;
  source: string;
  qr_raw: string | null;
  qr_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface LeadTag {
  id: string;
  lead_id: string;
  user_id: string;
  tag: string;
  created_at: string;
}

export interface LeadAttachment {
  id: string;
  lead_id: string;
  user_id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface AdminProfileStats {
  id: string;
  full_name: string | null;
  email: string | null;
  joined_at: string;
  is_admin: boolean;
  leads_count: number;
  qualified_count: number;
  contacted_count: number;
  drafts_count: number;
  last_scan_at: string | null;
}

export interface AdminActivityRow {
  id: string;
  action: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  scanner_id: string;
  scanner_name: string | null;
  scanner_email: string | null;
  lead_id: string | null;
  lead_name: string | null;
  lead_company: string | null;
}

export interface AdminLeadRow extends Lead {
  scanned_by_name: string | null;
  scanned_by_email: string | null;
}

export interface AdminOverview {
  total_users: number;
  total_leads: number;
  total_scans: number;
  total_qualified: number;
  total_contacted: number;
  avg_leads_per_user: number;
}

export interface DailyScan {
  day: string;
  scans: number;
}

export interface ParsedField {
  value: string;
  confidence: number;
}

export interface ParsedBusinessCard {
  full_name: ParsedField;
  first_name: ParsedField;
  last_name: ParsedField;
  job_title: ParsedField;
  company: ParsedField;
  email: ParsedField;
  phone: ParsedField;
  website: ParsedField;
  address: ParsedField;
  city: ParsedField;
  country: ParsedField;
  notes: ParsedField;
  raw_text: string;
  qr_raw?: string;
  qr_source?: Partial<Record<keyof Omit<ParsedBusinessCard, "raw_text" | "qr_raw" | "qr_source">, boolean>>;
}

export interface LeadWithTags extends Lead {
  lead_tags: LeadTag[];
  lead_attachments: LeadAttachment[];
}

export interface DuplicateWarning {
  lead_id: string;
  full_name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  similarity_reason: string;
}
