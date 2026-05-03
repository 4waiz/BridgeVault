import type { OCRProvider } from "./types";
import type { ParsedBusinessCard, ParsedField } from "@/types";
import { parseBusinessCardText } from "./parser";

function field(value: string, confidence: number): ParsedField {
  return { value: value?.trim() || "", confidence };
}

const STRUCTURE_PROMPT = `You are a business card data extractor. The OCR text below was extracted from a business card. It will be noisy: characters may be misread, lines may be out of order, and some fields may be missing. Use context clues, common business-card layouts and your own judgement to clean up obvious OCR errors (e.g. "rn" -> "m", "0" vs "O", missing dots in domains).

Return ONLY a JSON object with these exact keys, no markdown, no commentary:
{
  "full_name": "",
  "first_name": "",
  "last_name": "",
  "job_title": "",
  "company": "",
  "email": "",
  "phone": "",
  "website": "",
  "address": "",
  "city": "",
  "country": "",
  "notes": ""
}

Rules:
- Leave a field as "" if the text doesn't contain it.
- Normalize phone to international format if a country code is visible.
- Lowercase the email.
- Strip "https://" and "www." from website.
- Put anything that doesn't fit other fields in notes.
- If the same person appears with their name in two scripts (e.g. English + Arabic), prefer the English version for full_name and put the other in notes.

OCR TEXT:
`;

interface StructuredFields {
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

interface OCRSpaceResponse {
  ParsedResults?: { ParsedText?: string; ErrorMessage?: string }[];
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  OCRExitCode?: number;
}

/**
 * Hybrid OCR provider.
 *
 * Step 1: send the image to OCR.space (free OCR API, no region restrictions,
 *         works on Windows + Cloudflare Workers).
 * Step 2: send the resulting text (not the image) to OpenAI gpt-4o-mini to
 *         clean up OCR errors and structure it into business-card fields.
 *
 * No image is ever sent to OpenAI - only text. This avoids the OpenAI Vision
 * region restriction (which blocks image uploads from some territories) while
 * still giving us LLM-quality field extraction.
 *
 * Set OCR_SPACE_API_KEY in env. Sandbox key "helloworld" works for testing.
 */
export class HybridProvider implements OCRProvider {
  name = "hybrid";
  private openaiKey: string;
  private model: string;
  private ocrSpaceKey: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for the hybrid provider");
    }
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
    // Free public sandbox key - rate limited but works without signup.
    this.ocrSpaceKey = process.env.OCR_SPACE_API_KEY || "helloworld";
  }

  async extractBusinessCard(imageBuffer: Buffer, mimeType: string): Promise<ParsedBusinessCard> {
    // 1. OCR the image to raw text via OCR.space.
    const rawText = (await this.ocrWithOcrSpace(imageBuffer, mimeType)).trim();

    if (rawText.length < 4) {
      throw new Error("OCR returned no text. Try a clearer photo with good lighting.");
    }

    // 2. Send the text (not the image) to OpenAI to structure it.
    let structured: StructuredFields | null = null;
    try {
      structured = await this.structureWithOpenAI(rawText);
    } catch (err) {
      console.warn("Hybrid: OpenAI structuring failed, using regex parser", err);
    }

    // 3. If structuring failed, fall back to the regex parser.
    if (!structured) {
      const parsed = parseBusinessCardText(rawText);
      // Only return the regex result if it actually got something useful.
      if (parsed.full_name.value || parsed.email.value || parsed.phone.value) {
        return parsed;
      }
      throw new Error(
        "OCR text could not be structured. Raw text: " + rawText.slice(0, 200)
      );
    }

    return {
      full_name: field(structured.full_name || "", structured.full_name ? 0.9 : 0),
      first_name: field(structured.first_name || "", structured.first_name ? 0.85 : 0),
      last_name: field(structured.last_name || "", structured.last_name ? 0.85 : 0),
      job_title: field(structured.job_title || "", structured.job_title ? 0.85 : 0),
      company: field(structured.company || "", structured.company ? 0.85 : 0),
      email: field(structured.email || "", structured.email ? 0.95 : 0),
      phone: field(structured.phone || "", structured.phone ? 0.9 : 0),
      website: field(structured.website || "", structured.website ? 0.85 : 0),
      address: field(structured.address || "", structured.address ? 0.8 : 0),
      city: field(structured.city || "", structured.city ? 0.8 : 0),
      country: field(structured.country || "", structured.country ? 0.8 : 0),
      notes: field(structured.notes || "", structured.notes ? 0.5 : 0),
      raw_text: rawText,
    };
  }

  private async ocrWithOcrSpace(imageBuffer: Buffer, mimeType: string): Promise<string> {
    // OCR.space accepts multipart form-data. Use the Web FormData API for
    // Cloudflare Workers compatibility (Node FormData also implements this).
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: mimeType || "image/jpeg" });
    const ext = (mimeType || "image/jpeg").split("/")[1] || "jpg";

    const form = new FormData();
    form.append("file", blob, `card.${ext}`);
    form.append("language", "eng");
    form.append("isOverlayRequired", "false");
    form.append("scale", "true");
    form.append("OCREngine", "2"); // engine 2 handles small/skewed text better
    form.append("detectOrientation", "true");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: this.ocrSpaceKey },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`OCR.space HTTP ${response.status}`);
    }

    const data = (await response.json()) as OCRSpaceResponse;
    if (data.IsErroredOnProcessing) {
      const msg = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join("; ")
        : data.ErrorMessage || "OCR.space processing error";
      throw new Error(msg);
    }

    const text = data.ParsedResults?.map((p) => p.ParsedText || "").join("\n") || "";
    return text;
  }

  private async structureWithOpenAI(rawText: string): Promise<StructuredFields> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: STRUCTURE_PROMPT + rawText,
          },
        ],
        temperature: 0,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI text API error");
    }

    const text: string = data.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse OpenAI structuring response");
    }
    return JSON.parse(jsonMatch[0]) as StructuredFields;
  }
}
