import type { OCRProvider } from "./types";
import type { ParsedBusinessCard, ParsedField } from "@/types";

function field(value: string, confidence: number): ParsedField {
  return { value: value?.trim() || "", confidence };
}

const EXTRACTION_PROMPT = `You are a business card OCR system. Extract the following fields from this business card image. Return ONLY a JSON object with these exact keys:
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
  "notes": "",
  "raw_text": ""
}

Put all visible text in raw_text. Put anything that doesn't fit other fields in notes. Return ONLY valid JSON, no markdown.`;

export class VisionProvider implements OCRProvider {
  name = "vision";
  private provider: "openai" | "anthropic";
  private apiKey: string;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.provider = "anthropic";
      this.apiKey = process.env.ANTHROPIC_API_KEY;
    } else if (process.env.OPENAI_API_KEY) {
      this.provider = "openai";
      this.apiKey = process.env.OPENAI_API_KEY;
    } else {
      throw new Error("No vision API key configured");
    }
  }

  async extractBusinessCard(imageBuffer: Buffer, mimeType: string): Promise<ParsedBusinessCard> {
    const base64 = imageBuffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64}`;

    let responseText: string;

    if (this.provider === "anthropic") {
      responseText = await this.callAnthropic(base64, mimeType);
    } else {
      responseText = await this.callOpenAI(dataUri);
    }

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse vision API response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      full_name: field(parsed.full_name || "", 0.9),
      first_name: field(parsed.first_name || "", 0.85),
      last_name: field(parsed.last_name || "", 0.85),
      job_title: field(parsed.job_title || "", 0.85),
      company: field(parsed.company || "", 0.85),
      email: field(parsed.email || "", 0.95),
      phone: field(parsed.phone || "", 0.9),
      website: field(parsed.website || "", 0.85),
      address: field(parsed.address || "", 0.8),
      city: field(parsed.city || "", 0.8),
      country: field(parsed.country || "", 0.8),
      notes: field(parsed.notes || "", 0.5),
      raw_text: parsed.raw_text || "",
    };
  }

  private async callAnthropic(base64: string, mimeType: string): Promise<string> {
    const mediaType = mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Anthropic API error");
    return data.content[0].text;
  }

  private async callOpenAI(dataUri: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUri } },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "OpenAI API error");
    return data.choices[0].message.content;
  }
}
