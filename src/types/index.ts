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
  created_at: string;
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
