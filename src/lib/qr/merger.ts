import type { ParsedBusinessCard, ParsedField } from "@/types";
import type { QRContactData } from "./parser";

type FieldKey = keyof Omit<ParsedBusinessCard, "raw_text" | "qr_raw" | "qr_source">;

const FIELD_KEYS: FieldKey[] = [
  "full_name", "first_name", "last_name", "job_title", "company",
  "email", "phone", "website", "address", "city", "country", "notes",
];

/**
 * Merge OCR-extracted data with QR-decoded contact data.
 *
 * Rules:
 * - If OCR has a high-confidence value (>= 0.7), keep it unless QR has structured data
 *   and OCR is missing or low confidence.
 * - If OCR is empty/missing and QR has a value, use QR data.
 * - If both have values: prefer more structured (QR from vCard) over OCR for
 *   fields where OCR confidence is below 0.7.
 * - Track which fields came from QR for UI display.
 */
export function mergeOCRAndQR(
  ocr: ParsedBusinessCard,
  qrData: QRContactData,
  qrRaw: string
): ParsedBusinessCard {
  const result: ParsedBusinessCard = { ...ocr, qr_raw: qrRaw };
  const qrSource: Partial<Record<FieldKey, boolean>> = {};

  for (const key of FIELD_KEYS) {
    const ocrField = ocr[key] as ParsedField;
    const qrValue = qrData[key as keyof QRContactData];

    if (!qrValue) continue;

    const ocrEmpty = !ocrField.value || ocrField.value.trim() === "";
    const ocrWeak = ocrField.confidence < 0.7;

    if (ocrEmpty || ocrWeak) {
      // OCR has nothing or is uncertain — use QR's structured data
      (result as unknown as Record<string, ParsedField>)[key] = {
        value: qrValue,
        confidence: 0.9,
      };
      qrSource[key] = true;
    }
    // else: OCR is strong — keep it
  }

  result.qr_source = qrSource;
  return result;
}
