"use server";

import { createClient } from "@/lib/supabase/server";
import { getOCRProvider } from "@/lib/ocr";
import { enrichLead } from "@/lib/enrichment";
import { findDuplicates } from "@/lib/duplicates";
import type { ParsedBusinessCard, DuplicateWarning } from "@/types";

/** Step 1: Extract card data via OCR only — fast path to show results */
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

    // Run OCR
    const provider = getOCRProvider();
    const parsed = await provider.extractBusinessCard(buffer, mimeType);

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
