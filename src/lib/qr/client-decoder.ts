import jsQR from "jsqr";

/**
 * Decode a QR code from a File on the client (browser canvas → jsQR).
 *
 * We decode here because the production deploy runs on Cloudflare Workers,
 * which can't load `sharp`'s native binary. The browser already has a fast,
 * native image decoder via canvas, so this is both more portable and faster
 * (no upload-then-decode round trip).
 *
 * Returns the raw QR payload, or null if no QR could be detected after all
 * preprocessing passes.
 */
export async function decodeQRClient(file: File): Promise<string | null> {
  const bitmap = await loadBitmap(file);

  // Try a few sizes — too small loses detail, too big wastes work.
  // Order from "most likely to hit" down to fallbacks.
  const sizes = [1600, 1200, 2000, 800];

  for (const size of sizes) {
    const result = scanBitmap(bitmap, size, "none");
    if (result) return result;
  }

  // Contrast boost — helps glare / dim photos.
  for (const size of [1200, 1600]) {
    const result = scanBitmap(bitmap, size, "contrast");
    if (result) return result;
  }

  return null;
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  // createImageBitmap honors EXIF orientation when imageOrientation is "from-image".
  // It's faster than <img> + canvas and avoids object URLs. The orientation flag
  // isn't supported on every Safari version, so retry without it on rejection.
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}

type Mode = "none" | "contrast";

function scanBitmap(bitmap: ImageBitmap, maxDim: number, mode: Mode): string | null {
  const { width: srcW, height: srcH } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(bitmap, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);

  if (mode === "contrast") {
    boostContrast(imageData.data);
  }

  const result = jsQR(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
  return result?.data || null;
}

/** In-place greyscale + linear contrast stretch. Cheap, helps low-light photos. */
function boostContrast(data: Uint8ClampedArray): void {
  // Pass 1: collect luma min/max to know the range we're stretching.
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    if (luma < min) min = luma;
    if (luma > max) max = luma;
  }
  const range = max - min || 1;

  // Pass 2: rewrite pixels as stretched greyscale.
  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    const stretched = ((luma - min) / range) * 255;
    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }
}
