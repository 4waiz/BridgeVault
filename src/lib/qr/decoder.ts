import jsQR from "jsqr";
import sharp from "sharp";

/**
 * Decode QR code from an image buffer.
 * Returns the raw QR string payload, or null if no QR found.
 */
export async function decodeQRFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string | null> {
  try {
    // Use sharp to convert any image format to raw RGBA pixel data
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const result = jsQR(
      new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
      info.width,
      info.height
    );

    if (result && result.data) {
      return result.data;
    }

    return null;
  } catch (error) {
    console.warn("QR decode failed:", error);
    return null;
  }
}
