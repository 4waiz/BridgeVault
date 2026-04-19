import type { OCRProvider } from "./types";
import { TesseractProvider } from "./tesseract-provider";
import { VisionProvider } from "./vision-provider";

export function getOCRProvider(): OCRProvider {
  const provider = process.env.OCR_PROVIDER || "auto";

  // Explicit tesseract only when specifically requested AND no API key available
  if (provider === "tesseract" && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return new TesseractProvider();
  }

  // Prefer vision API — it's faster and more accurate than Tesseract
  if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) {
    try {
      return new VisionProvider();
    } catch {
      console.warn("Vision provider not available, falling back to Tesseract");
    }
  }

  return new TesseractProvider();
}

export { parseBusinessCardText } from "./parser";
export type { OCRProvider } from "./types";
