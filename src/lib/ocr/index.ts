import type { OCRProvider } from "./types";
import { TesseractProvider } from "./tesseract-provider";
import { VisionProvider } from "./vision-provider";
import { HybridProvider } from "./hybrid-provider";

export function getOCRProvider(): OCRProvider {
  const provider = process.env.OCR_PROVIDER || "auto";

  // Explicit overrides
  if (provider === "tesseract") return new TesseractProvider();
  if (provider === "vision") return new VisionProvider();
  if (provider === "hybrid") return new HybridProvider();

  // Auto: prefer hybrid (Tesseract OCR -> OpenAI text structuring) when an
  // OpenAI key is available. This avoids sending images to OpenAI Vision,
  // which is blocked from some regions, while still getting LLM-quality
  // field extraction.
  if (process.env.OPENAI_API_KEY) {
    try {
      return new HybridProvider();
    } catch {
      console.warn("Hybrid provider not available, trying vision");
    }
  }

  // Anthropic users keep the direct vision path.
  if (process.env.ANTHROPIC_API_KEY) {
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
