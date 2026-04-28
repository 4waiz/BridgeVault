"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { scanAndSaveLead, scanQRAndSaveLead } from "@/actions/ocr";
import { decodeQRClient } from "@/lib/qr/client-decoder";
import { useNotifications } from "./notifications";

/** Recompress a phone-camera photo down to a size that fits under the
 *  server's 4MB upload cap. We only run this *after* QR decode so the
 *  decoder gets the original full-quality pixels. */
function compressForUpload(file: File, maxWidth = 1600, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export type ScanMode = "card" | "qr";

interface ScanQueueContextValue {
  enqueueScan: (file: File, mode?: ScanMode) => void;
}

const ScanQueueContext = createContext<ScanQueueContextValue>({
  enqueueScan: () => {},
});

export function useScanQueue() {
  return useContext(ScanQueueContext);
}

export function ScanQueueProvider({ children }: { children: ReactNode }) {
  const { push } = useNotifications();

  const enqueueScan = useCallback<ScanQueueContextValue["enqueueScan"]>(
    (file, mode = "card") => {
      void (async () => {
        if (mode === "qr") {
          // Decode in the browser — the server runtime is Cloudflare Workers,
          // which can't run sharp. Canvas + jsQR works in any modern browser.
          let qrRaw: string | null = null;
          try {
            qrRaw = await decodeQRClient(file);
          } catch (err) {
            console.error("QR decode failed:", err);
          }
          if (!qrRaw) {
            push({
              variant: "error",
              title: "QR scan failed",
              body: "No QR code detected. Hold the camera closer and steadier.",
            });
            return;
          }
          // Compress for storage now that we have the payload — the original
          // can be 5+ MB from a phone camera, over the server upload limit.
          const compressed = await compressForUpload(file).catch(() => file);
          const formData = new FormData();
          formData.append("qr_raw", qrRaw);
          formData.append("image", compressed);
          const result = await scanQRAndSaveLead(formData);
          if (result.error || !result.leadId) {
            push({
              variant: "error",
              title: "QR scan failed",
              body: result.error ?? "Could not save lead",
            });
            return;
          }
          push({
            variant: "success",
            title: "Lead successfully saved to database",
            body: "Tap to review the scanned lead",
            leadId: result.leadId,
          });
          return;
        }

        const formData = new FormData();
        formData.append("image", file);
        const result = await scanAndSaveLead(formData);
        if (result.error || !result.leadId) {
          push({
            variant: "error",
            title: "Scan failed",
            body: result.error ?? "Could not save lead",
          });
          return;
        }
        push({
          variant: "success",
          title: "Lead successfully saved to database",
          body: "Tap to review the scanned lead",
          leadId: result.leadId,
        });
      })();
    },
    [push]
  );

  return (
    <ScanQueueContext.Provider value={{ enqueueScan }}>
      {children}
    </ScanQueueContext.Provider>
  );
}
