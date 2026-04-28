import jsQR from "jsqr";
import type sharpNs from "sharp";

type SharpPipeline = ReturnType<typeof sharpNs>;

/**
 * Decode QR code from an image buffer.
 * Returns the raw QR string payload, or null if no QR found.
 *
 * Real-world phone photos are noisy: blurred, low-contrast, rotated, or only
 * occupy a small portion of the frame. jsQR is single-pass and brittle, so we
 * run several preprocessing variants in order from cheap+likely to expensive.
 */
export async function decodeQRFromImage(
  imageBuffer: Buffer,
  _mimeType: string
): Promise<string | null> {
  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default;
  } catch (error) {
    console.warn("sharp unavailable, QR decode skipped:", error);
    return null;
  }

  const base = () =>
    sharp(imageBuffer, { limitInputPixels: 20_000_000 }).rotate(); // honor EXIF

  // Strategy 1: stock resize at a few sizes — most photos decode here.
  for (const size of [1600, 1200, 800, 2400]) {
    const hit = await tryDecode(base().resize(size, size, { fit: "inside", withoutEnlargement: true }));
    if (hit) return hit;
  }

  // Strategy 2: greyscale + contrast boost — helps low-contrast / glare photos.
  for (const size of [1200, 1600]) {
    const hit = await tryDecode(
      base()
        .resize(size, size, { fit: "inside", withoutEnlargement: true })
        .greyscale()
        .normalise()
    );
    if (hit) return hit;
  }

  // Strategy 3: sharpen pass — helps slightly out-of-focus shots.
  for (const size of [1200, 1600]) {
    const hit = await tryDecode(
      base()
        .resize(size, size, { fit: "inside", withoutEnlargement: true })
        .greyscale()
        .sharpen()
    );
    if (hit) return hit;
  }

  return null;
}

async function tryDecode(pipeline: SharpPipeline): Promise<string | null> {
  try {
    const { data, info } = await pipeline
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const result = jsQR(
      new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
      info.width,
      info.height,
      { inversionAttempts: "attemptBoth" }
    );

    return result?.data || null;
  } catch (error) {
    console.warn("QR decode attempt failed:", error);
    return null;
  }
}
