"use server";

import { createClient } from "@/lib/supabase/server";
import { getOCRProvider } from "@/lib/ocr";
import { enrichLead } from "@/lib/enrichment";
import { findDuplicates } from "@/lib/duplicates";
import { decodeQRFromImage, parseQRPayload, mergeOCRAndQR } from "@/lib/qr";
import type { ParsedBusinessCard, DuplicateWarning } from "@/types";

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
    if (!file || file.size === 0) {
      return { parsed: null, enrichment: null, error: "No image provided" };
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";

    // Run OCR and QR detection in parallel
    const provider = getOCRProvider();
    const [ocrResult, qrRaw] = await Promise.all([
      provider.extractBusinessCard(buffer, mimeType),
      decodeQRFromImage(buffer, mimeType),
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
    if (!file || file.size === 0) return { leadId: null, error: "No image provided" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";

    // Upload image to storage
    const tempId = crypto.randomUUID();
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `${user.id}/${tempId}/card.${ext}`;

    const [uploadResult, ocrResult, qrRaw] = await Promise.all([
      supabase.storage
        .from("business-cards")
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true }),
      getOCRProvider().extractBusinessCard(buffer, mimeType).catch(() => null),
      decodeQRFromImage(buffer, mimeType).catch(() => null),
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
    if (!file || file.size === 0) return { imagePath: null, error: "No image provided" };

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "image/jpeg";

    const tempId = crypto.randomUUID();
    const ext = file.name.split(".").pop() || "jpg";
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
