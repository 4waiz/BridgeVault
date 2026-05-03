import jsQR from "jsqr";
import {
  BinaryBitmap,
  HybridBinarizer,
  NotFoundException,
  QRCodeReader,
  RGBLuminanceSource,
  DecodeHintType,
} from "@zxing/library";

/**
 * Decode a QR code from a File on the client.
 *
 * We use two decoders:
 *   - ZXing's QRCodeReader — handles logo overlays, perspective distortion,
 *     and partial damage well (it does proper Reed-Solomon error correction).
 *   - jsQR as a fallback for QRs ZXing misses (rare but happens with very
 *     small or low-contrast codes).
 *
 * Real-world phone photos are messy: QR off-center, small in frame, tilted,
 * partially obscured. Neither decoder localizes perfectly, so we brute-force
 * with multiple preprocessing passes (full-frame, tiled, rotated). We try
 * the cheap-and-likely passes first and early-exit on the first hit.
 *
 * The whole pipeline runs in the browser because the production runtime
 * (Cloudflare Workers) can't load native image libraries like sharp.
 */
export async function decodeQRClient(file: File): Promise<string | null> {
  const bitmap = await loadBitmap(file);

  // Pass 1: full frame at a few sizes. Catches well-framed shots.
  for (const size of [1600, 1200, 2000, 800]) {
    const hit = scanFull(bitmap, size, "none");
    if (hit) return hit;
  }

  // Pass 2: full frame, contrast-boosted. Catches dim/glare shots.
  for (const size of [1200, 1600, 800]) {
    const hit = scanFull(bitmap, size, "contrast");
    if (hit) return hit;
  }

  // Pass 3: full frame, sharpened binarization. Catches blurry/soft photos
  // where finder patterns lose contrast at module edges.
  for (const size of [1400, 1000]) {
    const hit = scanFull(bitmap, size, "binarize");
    if (hit) return hit;
  }

  // Pass 4: 3x3 tiled crops at 50%. QR off-center or small in frame.
  for (const tile of tileRegions(bitmap, 3, 0.5)) {
    const hit = scanRegion(bitmap, tile, 1000, "none");
    if (hit) return hit;
  }

  // Pass 5: tighter 4x4 grid at 35% — for QRs that occupy only a corner
  // of the photo. The 3x3 50% pass misses these because each tile is too
  // wide and the QR's modules get downscaled below the decoder threshold.
  for (const tile of tileRegions(bitmap, 4, 0.35)) {
    const hit = scanRegion(bitmap, tile, 900, "none");
    if (hit) return hit;
  }

  // Pass 6: 3x3 tiles with contrast boost.
  for (const tile of tileRegions(bitmap, 3, 0.5)) {
    const hit = scanRegion(bitmap, tile, 1000, "contrast");
    if (hit) return hit;
  }

  // Pass 7: 4x4 tiles with contrast boost.
  for (const tile of tileRegions(bitmap, 4, 0.35)) {
    const hit = scanRegion(bitmap, tile, 900, "contrast");
    if (hit) return hit;
  }

  // Pass 8: small rotations on the full frame. jsQR breaks down past ~5° tilt;
  // for photos taken at an angle, nudging by ±15° / ±30° often unlocks decode.
  for (const angle of [10, -10, 20, -20, 35, -35, 45, -45]) {
    const hit = scanRotated(bitmap, 1400, angle);
    if (hit) return hit;
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

type Mode = "none" | "contrast" | "binarize";

interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

function scanFull(bitmap: ImageBitmap, maxDim: number, mode: Mode): string | null {
  return scanRegion(
    bitmap,
    { x: 0, y: 0, w: bitmap.width, h: bitmap.height },
    maxDim,
    mode
  );
}

function scanRegion(
  bitmap: ImageBitmap,
  region: Region,
  maxDim: number,
  mode: Mode
): string | null {
  const scale = Math.min(1, maxDim / Math.max(region.w, region.h));
  const w = Math.max(1, Math.round(region.w * scale));
  const h = Math.max(1, Math.round(region.h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(bitmap, region.x, region.y, region.w, region.h, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);

  if (mode === "contrast") boostContrast(imageData.data);
  else if (mode === "binarize") binarize(imageData.data);

  return decodePixels(imageData.data, w, h);
}

function scanRotated(bitmap: ImageBitmap, maxDim: number, angleDeg: number): string | null {
  const { width: srcW, height: srcH } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  // Bounding box of the rotated image so we don't crop corners.
  const angle = (angleDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const cw = Math.round(w * cos + h * sin);
  const ch = Math.round(w * sin + h * cos);

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(angle);
  ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);

  const imageData = ctx.getImageData(0, 0, cw, ch);
  return decodePixels(imageData.data, cw, ch);
}

/**
 * Run both decoders against a single rendered canvas. jsQR first because it's
 * an order of magnitude faster than ZXing's TRY_HARDER pass and handles most
 * clean photos. ZXing follows for logo overlays, perspective distortion, and
 * partial damage where jsQR gives up. jsQR's `attemptBoth` covers polarity
 * inversion (printed light-on-dark QRs) which ZXing doesn't try by default.
 */
function decodePixels(data: Uint8ClampedArray, w: number, h: number): string | null {
  const js = jsQR(data, w, h, { inversionAttempts: "attemptBoth" });
  if (js?.data) return js.data;
  return decodeWithZXing(data, w, h);
}

function decodeWithZXing(rgba: Uint8ClampedArray, w: number, h: number): string | null {
  const pixelCount = w * h;
  // Despite the name, RGBLuminanceSource expects pre-computed single-channel
  // luminance bytes (one per pixel). Allocate exactly pixelCount bytes —
  // RGBLuminanceSource.getMatrix() returns the buffer directly without bounds,
  // so trailing slack from a reused buffer would be read as image data.
  const lum = new Uint8ClampedArray(pixelCount);
  // Standard luma weights (Rec. 601).
  for (let i = 0, j = 0; j < pixelCount; i += 4, j++) {
    lum[j] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
  }

  try {
    const luminance = new RGBLuminanceSource(lum, w, h);
    const binary = new BinaryBitmap(new HybridBinarizer(luminance));
    const reader = new QRCodeReader();
    // TRY_HARDER trades speed for accuracy (extra binarization passes,
    // rotated attempts). Worth it for our few-tries-per-image flow.
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.TRY_HARDER, true);
    const result = reader.decode(binary, hints);
    return result.getText() || null;
  } catch (err) {
    // NotFoundException is the expected "no QR here" — anything else is
    // worth surfacing in dev so we know if a binarization edge case fires.
    if (!(err instanceof NotFoundException)) {
      console.warn("ZXing decode error:", err);
    }
    return null;
  }
}

/** Generate an N×N grid of overlapping crops sized at `tileFraction` of the image. */
function tileRegions(bitmap: ImageBitmap, grid: number, tileFraction: number): Region[] {
  const { width, height } = bitmap;
  const tileW = Math.round(width * tileFraction);
  const tileH = Math.round(height * tileFraction);
  const strideX = grid > 1 ? Math.round((width - tileW) / (grid - 1)) : 0;
  const strideY = grid > 1 ? Math.round((height - tileH) / (grid - 1)) : 0;

  const regions: Region[] = [];
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      regions.push({
        x: col * strideX,
        y: row * strideY,
        w: tileW,
        h: tileH,
      });
    }
  }
  return regions;
}

/** Otsu's method: pick a threshold that maximises between-class variance,
 *  then push every pixel to pure black or white. Helps blurry/JPEG-soft photos
 *  where module edges have lost contrast — the decoders prefer hard edges. */
function binarize(data: Uint8ClampedArray): void {
  const histogram = new Uint32Array(256);
  const total = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    histogram[luma | 0]++;
  }
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * histogram[t];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) {
      maxVar = v;
      threshold = t;
    }
  }
  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    const v = luma > threshold ? 255 : 0;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
}

/** In-place greyscale + linear contrast stretch. Cheap, helps low-light photos. */
function boostContrast(data: Uint8ClampedArray): void {
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    if (luma < min) min = luma;
    if (luma > max) max = luma;
  }
  const range = max - min || 1;

  for (let i = 0; i < data.length; i += 4) {
    const luma = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    const stretched = ((luma - min) / range) * 255;
    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }
}
