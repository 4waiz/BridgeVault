import type { OCRProvider } from "./types";
import type { ParsedBusinessCard, ParsedField } from "@/types";
import { TesseractProvider } from "./tesseract-provider";
import { parseBusinessCardText } from "./parser";

function field(value: string, confidence: number): ParsedField {
  return { value: value?.trim() || "", confidence };
}

const STRUCTURE_PROMPT = `You are a business card data extractor. The OCR text below was extracted from a business card. It will be noisy: characters may be misread, lines may be out of order, and some fields may be missing. Use context clues, common business-card layouts and your own judgement to clean up obvious OCR errors (e.g. "rn" → "m", "0" vs "O", missing dots in domains).

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

/**
 * Hybrid OCR provider.
 *
 * Step 1: run Tesseract (or any text-OCR engine) on the image to get raw text.
 * Step 2: ask OpenAI gpt-4o-mini to structure the messy OCR text into business-card fields.
 *
 * No image is ever sent to OpenAI — only text. This avoids the OpenAI Vision
 * region restrictions (which block image uploads from some territories) while
 * still giving us LLM-quality field extraction.
 */
export class HybridProvider implements OCRProvider {
  name = "hybrid";
  private apiKey: string;
  private model: string;
  private tesseract: TesseractProvider;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for the hybrid provider");
    }
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
    this.tesseract = new TesseractProvider();
  }

  async extractBusinessCard(imageBuffer: Buffer, mimeType: string): Promise<ParsedBusinessCard> {
    // 1. OCR the image to raw text (Tesseract — no network call, no region issues).
    const tesseractResult = await this.tesseract.extractBusinessCard(imageBuffer, mimeType);
    const rawText = (tesseractResult.raw_text || "").trim();

    // If Tesseract found nothing usable, fall back to its own heuristic parse.
    if (rawText.length < 4) {
      return tesseractResult;
    }

    // 2. Send the text (not the image) to OpenAI to structure it.
    let structured: StructuredFields | null = null;
    try {
      structured = await this.structureWithOpenAI(rawText);
    } catch (err) {
      console.warn("Hybrid: OpenAI structuring failed, using regex parser", err);
    }

    // 3. If structuring failed, fall back to the regex parser already used by Tesseract.
    if (!structured) {
      return parseBusinessCardText(rawText);
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

  private async structureWithOpenAI(rawText: string): Promise<StructuredFields> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
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
