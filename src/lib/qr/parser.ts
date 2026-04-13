import type { ParsedField } from "@/types";

export interface QRContactData {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
}

function field(value: string, confidence: number): ParsedField {
  return { value: value.trim(), confidence };
}

/**
 * Parse a raw QR payload into structured contact data.
 * Supports: vCard, MECARD, plain text with contact patterns.
 */
export function parseQRPayload(raw: string): QRContactData {
  const trimmed = raw.trim();

  // vCard format
  if (/^BEGIN:VCARD/i.test(trimmed)) {
    return parseVCard(trimmed);
  }

  // MECARD format
  if (/^MECARD:/i.test(trimmed)) {
    return parseMECARD(trimmed);
  }

  // URL — extract domain as website, note the URL
  if (/^https?:\/\//i.test(trimmed)) {
    return parseURL(trimmed);
  }

  // Plain text — try to extract contact patterns
  return parsePlainText(trimmed);
}

function parseVCard(text: string): QRContactData {
  const data: QRContactData = {};
  const lines = unfoldVCard(text);

  for (const line of lines) {
    const [keyPart, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    if (!value) continue;

    const key = keyPart.split(";")[0].toUpperCase();

    switch (key) {
      case "FN":
        data.full_name = value;
        break;
      case "N": {
        // N:Last;First;Middle;Prefix;Suffix
        const parts = value.split(";");
        data.last_name = parts[0] || undefined;
        data.first_name = parts[1] || undefined;
        if (!data.full_name && (data.first_name || data.last_name)) {
          data.full_name = [data.first_name, data.last_name].filter(Boolean).join(" ");
        }
        break;
      }
      case "ORG":
        data.company = value.split(";")[0];
        break;
      case "TITLE":
        data.job_title = value;
        break;
      case "EMAIL":
        if (!data.email) data.email = value;
        break;
      case "TEL":
        if (!data.phone) data.phone = value;
        break;
      case "URL":
        if (!data.website) data.website = value;
        break;
      case "ADR": {
        // ADR:;;Street;City;State;Zip;Country
        const addrParts = value.split(";");
        const street = addrParts[2] || "";
        const addrCity = addrParts[3] || "";
        const state = addrParts[4] || "";
        const zip = addrParts[5] || "";
        const addrCountry = addrParts[6] || "";
        data.address = [street, zip].filter(Boolean).join(", ");
        data.city = [addrCity, state].filter(Boolean).join(", ");
        data.country = addrCountry || undefined;
        break;
      }
      case "NOTE":
        data.notes = value;
        break;
    }
  }

  return data;
}

/** Unfold vCard continuation lines (lines starting with space/tab are continuations) */
function unfoldVCard(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter((l) => l && !/^(BEGIN|END):VCARD/i.test(l) && !/^VERSION:/i.test(l));
}

function parseMECARD(text: string): QRContactData {
  const data: QRContactData = {};
  // MECARD:N:Last,First;TEL:123;EMAIL:a@b.c;ORG:Company;URL:...;ADR:...;NOTE:...;;
  const body = text.replace(/^MECARD:/i, "").replace(/;;\s*$/, "");
  const fields = body.split(";");

  for (const f of fields) {
    const colonIdx = f.indexOf(":");
    if (colonIdx < 0) continue;
    const key = f.slice(0, colonIdx).toUpperCase();
    const value = f.slice(colonIdx + 1).trim();
    if (!value) continue;

    switch (key) {
      case "N": {
        const parts = value.split(",");
        data.last_name = parts[0] || undefined;
        data.first_name = parts[1] || undefined;
        data.full_name = [data.first_name, data.last_name].filter(Boolean).join(" ");
        break;
      }
      case "TEL":
        data.phone = value;
        break;
      case "EMAIL":
        data.email = value;
        break;
      case "ORG":
        data.company = value;
        break;
      case "URL":
        data.website = value;
        break;
      case "ADR":
        data.address = value.replace(/,/g, ", ");
        break;
      case "NOTE":
        data.notes = value;
        break;
      case "TITLE":
        data.job_title = value;
        break;
    }
  }

  return data;
}

function parseURL(text: string): QRContactData {
  return { website: text };
}

function parsePlainText(text: string): QRContactData {
  const data: QRContactData = {};

  // Extract email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) data.email = emailMatch[0];

  // Extract phone
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/);
  if (phoneMatch) data.phone = phoneMatch[0];

  // Extract URL
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch) data.website = urlMatch[0];

  // Remaining text as notes if we found some structured data
  if (data.email || data.phone || data.website) {
    const remaining = text
      .replace(data.email || "", "")
      .replace(data.phone || "", "")
      .replace(data.website || "", "")
      .trim();
    if (remaining) data.notes = remaining;
  }

  return data;
}
