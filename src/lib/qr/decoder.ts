import jsQR from "jsqr";

/**
 * Decode QR code from an image buffer.
 * Returns the raw QR string payload, or null if no QR found.
 * Uses dynamic import for sharp so the module doesn't crash on
 * platforms where native addons aren't available (e.g. Cloudflare).
 */
export async function decodeQRFromImage(
  imageBuffer: Buffer,
  _mimeType: string
): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;

    // Bound attacker-controlled input so a pathological image (e.g. a huge
    // PNG or pixel-bomb) can't exhaust memory. Also downscale before raw
    // decoding — jsQR works fine on images up to ~2048px.
    const { data, info } = await sharp(imageBuffer, { limitInputPixels: 20_000_000 })
      .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
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
    console.warn("QR decode skipped:", error);
    return null;
  }
}
