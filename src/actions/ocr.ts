"use server";

import { createClient } from "@/lib/supabase/server";
import { getOCRProvider } from "@/lib/ocr";
import { enrichLead } from "@/lib/enrichment";
import { findDuplicates } from "@/lib/duplicates";
import {
  decodeQRFromImage,
  parseQRPayload,
  mergeOCRAndQR,
  type QRContactData,
} from "@/lib/qr";
import { extractDomain, generateLeadSummary } from "@/lib/utils";
import type { ParsedBusinessCard, DuplicateWarning } from "@/types";

/** Cap attacker-controlled uploads well below the body-size limit so one
 *  request can't burn large amounts of LLM tokens, bandwidth, or memory. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB — plenty for a compressed card image
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function validateUpload(file: File | null): string | null {
  if (!file || file.size === 0) return "No image provided";
  if (file.size > MAX_UPLOAD_BYTES) return "Image too large (max 4 MB)";
  const declared = (file.type || "").toLowerCase();
  if (declared && !ALLOWED_MIME.has(declared)) return "Unsupported image type";
  return null;
}

/** Step 1: Extract card data via OCR + QR — fast path to show results */
export async function processBusinessCard(formData: FormData): Promise<{
  parsed: ParsedBusinessCard | null;
  enrichment: { domain: string | null; summary: string; contact_methods: string[] } | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { parsed: null, enrichment: null, error: "Not authenticated" };
    }

    const file = formData.get("image") as File;
    const uploadError = validateUpload(file);
    if (uploadError) {
      return { parsed: null, enrichment: null, error: uploadError };
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";

    // Run OCR and QR detection in parallel (QR has 2s timeout for serverless)
    const provider = getOCRProvider();
    const [ocrResult, qrRaw] = await Promise.all([
      provider.extractBusinessCard(buffer, mimeType),
      Promise.race([
        decodeQRFromImage(buffer, mimeType).catch(() => null),
        new Promise<null>((r) => setTimeout(() => r(null), 2000)),
      ]),
    ]);

    // Merge OCR + QR results if QR found
    let parsed: ParsedBusinessCard = ocrResult;
    if (qrRaw) {
      const qrData = parseQRPayload(qrRaw);
      parsed = mergeOCRAndQR(ocrResult, qrData, qrRaw);
    }

    // Enrich (instant — pure computation)
    const enrichment = enrichLead(parsed);

    return {
      parsed,
      enrichment: {
        domain: enrichment.domain,
        summary: enrichment.summary,
        contact_methods: enrichment.contact_methods,
      },
    };
  } catch (error) {
    console.error("OCR processing error:", error);
    return {
      parsed: null,
      enrichment: null,
      error: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

/** Step 2: Check for duplicate leads (runs in background after review is shown) */
export async function checkCardDuplicates(fields: {
  email?: string;
  phone?: string;
  full_name?: string;
  company?: string;
}): Promise<{ duplicates: DuplicateWarning[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { duplicates: [], error: "Not authenticated" };

    const duplicates = await findDuplicates(user.id, fields);
    return { duplicates };
  } catch (error) {
    console.error("Duplicate check error:", error);
    return { duplicates: [] };
  }
}

/** Scan a business card: upload image + OCR + save lead in one shot */
export async function scanAndSaveLead(formData: FormData): Promise<{
  leadId: string | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { leadId: null, error: "Not authenticated" };

    const file = formData.get("image") as File;
    const uploadError = validateUpload(file);
    if (uploadError) return { leadId: null, error: uploadError };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";

    // Upload image to storage
    const tempId = crypto.randomUUID();
    // Sanitize extension — attacker controls file.name, so strip anything that
    // could traverse the storage path (`/`, `..`, nulls, etc).
    const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase();
    const ext = /^[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : "jpg";
    const storagePath = `${user.id}/${tempId}/card.${ext}`;

    // QR decode with 2s timeout — sharp can be slow on serverless
    const qrWithTimeout = Promise.race([
      decodeQRFromImage(buffer, mimeType).catch(() => null),
      new Promise<null>((r) => setTimeout(() => r(null), 2000)),
    ]);

    let ocrError: string | null = null;
    const [uploadResult, ocrResult, qrRaw] = await Promise.all([
      supabase.storage
        .from("business-cards")
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true }),
      getOCRProvider().extractBusinessCard(buffer, mimeType).catch((e) => {
        console.error("OCR failed:", e);
        ocrError = e instanceof Error ? e.message : "OCR failed";
        return null;
      }),
      qrWithTimeout,
    ]);

    if (uploadResult.error) {
      console.error("Upload error:", uploadResult.error);
      return { leadId: null, error: "Failed to upload image" };
    }

    // Merge OCR + QR
    let parsed: ParsedBusinessCard | null = ocrResult;
    if (ocrResult && qrRaw) {
      const qrData = parseQRPayload(qrRaw);
      parsed = mergeOCRAndQR(ocrResult, qrData, qrRaw);
    } else if (!ocrResult && qrRaw) {
      // Only QR available
      const qrData = parseQRPayload(qrRaw);
      parsed = mergeOCRAndQR(null as unknown as ParsedBusinessCard, qrData, qrRaw);
    }

    // Treat an OCR result with no recognizable contact fields as "no result".
    // Otherwise we'd save an empty "Scanned Card" lead with nothing useful.
    const hasUsefulData =
      !!parsed &&
      (parsed.full_name?.value ||
        parsed.email?.value ||
        parsed.phone?.value ||
        parsed.company?.value ||
        parsed.website?.value);

    if (!parsed || !hasUsefulData) {
      const reason = ocrError
        ? `Couldn't read the card: ${ocrError}`
        : !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY
          ? "No vision API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."
          : "Couldn't read the card. Try a clearer, well-lit photo.";

      // Clean up the orphan image we already uploaded so storage doesn't fill
      // up with failed-scan junk.
      if (uploadResult.data) {
        await supabase.storage.from("business-cards").remove([storagePath]);
      }
      return { leadId: null, error: reason };
    }

    // Enrich
    const enrichment = parsed ? enrichLead(parsed) : null;

    // Build lead data from parsed result
    const full_name = parsed?.full_name?.value || "Scanned Card";
    const leadData = {
      full_name,
      first_name: parsed?.first_name?.value || "",
      last_name: parsed?.last_name?.value || "",
      job_title: parsed?.job_title?.value || "",
      company: parsed?.company?.value || "",
      email: parsed?.email?.value || "",
      phone: parsed?.phone?.value || "",
      website: parsed?.website?.value || "",
      address: parsed?.address?.value || "",
      city: parsed?.city?.value || "",
      country: parsed?.country?.value || "",
      notes: parsed?.notes?.value || "",
      domain: enrichment?.domain || undefined,
      summary: enrichment?.summary || undefined,
      ocr_raw_text: parsed?.raw_text,
      ocr_json: parsed as unknown as Record<string, unknown>,
      enrichment_json: enrichment as unknown as Record<string, unknown>,
      qr_raw: parsed?.qr_raw,
      qr_json: parsed?.qr_source as Record<string, unknown> | undefined,
      image_path: storagePath,
      image_name: file.name,
      image_mime: file.type,
    };

    // Create lead
    const { createLead } = await import("@/actions/leads");
    const result = await createLead(leadData);

    if (result.error) return { leadId: null, error: result.error };

    return { leadId: result.data?.id || null };
  } catch (error) {
    console.error("Scan and save error:", error);
    return {
      leadId: null,
      error: error instanceof Error ? error.message : "Failed to save lead",
    };
  }
}

/** Step 3: Upload card image to storage (called at save time) */
export async function uploadCardImage(formData: FormData): Promise<{
  imagePath: string | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { imagePath: null, error: "Not authenticated" };

    const file = formData.get("image") as File;
    const validationError = validateUpload(file);
    if (validationError) return { imagePath: null, error: validationError };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";

    const tempId = crypto.randomUUID();
    // Sanitize extension — attacker controls file.name, so strip anything that
    // could traverse the storage path (`/`, `..`, nulls, etc).
    const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase();
    const ext = /^[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : "jpg";
    const storagePath = `${user.id}/${tempId}/card.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("business-cards")
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { imagePath: null, error: "Failed to upload image" };
    }

    return { imagePath: storagePath };
  } catch (error) {
    console.error("Image upload error:", error);
    return { imagePath: null, error: "Upload failed" };
  }
}

/**
 * Save a QR-only lead.
 *
 * The QR is decoded on the client (sharp + jsQR can't run on Cloudflare Workers,
 * which is the production runtime). The client sends the raw payload string +
 * the original image so we can attach it to the lead record.
 */
export async function scanQRAndSaveLead(formData: FormData): Promise<{
  leadId: string | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { leadId: null, error: "Not authenticated" };

    const qrRaw = (formData.get("qr_raw") as string | null)?.trim();
    if (!qrRaw) {
      return { leadId: null, error: "Missing QR payload" };
    }
    // Bound payload to keep DB rows reasonable. QR codes max out around 3KB
    // for a Version 40 alphanumeric, so 4KB is plenty of headroom.
    if (qrRaw.length > 4096) {
      return { leadId: null, error: "QR payload too large" };
    }

    const file = formData.get("image") as File | null;
    // Image is optional for QR — we still want a lead if all we have is the payload.
    let storagePath: string | undefined;
    if (file && file.size > 0) {
      const uploadError = validateUpload(file);
      if (uploadError) return { leadId: null, error: uploadError };

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || "image/jpeg";

      const tempId = crypto.randomUUID();
      const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const ext = /^[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : "jpg";
      storagePath = `${user.id}/${tempId}/qr.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("business-cards")
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        // Image upload failing shouldn't block the lead — drop the image and continue.
        storagePath = undefined;
      }
    }

    const qrData: QRContactData = parseQRPayload(qrRaw);

    const fullName =
      qrData.full_name ||
      [qrData.first_name, qrData.last_name].filter(Boolean).join(" ") ||
      "QR Contact";

    const domain =
      (qrData.website && extractDomain(qrData.website)) ||
      (qrData.email && extractDomain(qrData.email)) ||
      null;

    const summary = generateLeadSummary({
      full_name: fullName,
      job_title: qrData.job_title || "",
      company: qrData.company || "",
      email: qrData.email || "",
      phone: qrData.phone || "",
      domain,
    });

    const enrichment_json: Record<string, unknown> = {
      domain,
      contact_methods: [
        qrData.email && "email",
        qrData.phone && "phone",
        qrData.website && "website",
      ].filter(Boolean),
      has_email: !!qrData.email,
      has_phone: !!qrData.phone,
      has_website: !!qrData.website,
      domain_source: qrData.website ? "website" : qrData.email ? "email" : null,
      source: "qr_only",
    };

    const leadData = {
      full_name: fullName,
      first_name: qrData.first_name || "",
      last_name: qrData.last_name || "",
      job_title: qrData.job_title || "",
      company: qrData.company || "",
      email: qrData.email || "",
      phone: qrData.phone || "",
      website: qrData.website || "",
      address: qrData.address || "",
      city: qrData.city || "",
      country: qrData.country || "",
      notes: qrData.notes || "",
      domain: domain || undefined,
      summary,
      enrichment_json,
      qr_raw: qrRaw,
      qr_json: qrData as unknown as Record<string, unknown>,
      image_path: storagePath,
      image_name: file?.name,
      image_mime: file?.type,
    };

    const { createLead } = await import("@/actions/leads");
    const result = await createLead(leadData);

    if (result.error) return { leadId: null, error: result.error };

    return { leadId: result.data?.id || null };
  } catch (error) {
    console.error("QR scan error:", error);
    return {
      leadId: null,
      error: error instanceof Error ? error.message : "Failed to save lead",
    };
  }
}
