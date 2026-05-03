"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, Upload, CheckCircle2, CreditCard, QrCode } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useScanQueue, type ScanMode } from "@/providers/scan-queue";
import { cn } from "@/lib/utils";

/** Compress image on client before sending — drops 10MB photos to ~150KB */
function compressImage(file: File, maxWidth = 1280, quality = 0.8): Promise<File> {
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

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flash, setFlash] = useState(false);
  const [mode, setMode] = useState<ScanMode>("card");
  const { enqueueScan } = useScanQueue();

  const handleFile = useCallback(
    async (file: File) => {
      // For QR mode we hand off the original file: the decoder runs in the
      // browser at full quality (recompression destroys QR detail), and the
      // queue then compresses it before upload if needed.
      let toEnqueue: File = file;
      if (mode === "card") {
        // Safari/iOS deliver HEIC by default. Canvas can't decode HEIC reliably,
        // so skip client compression and let the server take the original — the
        // server-side OCR pipeline handles HEIC fine.
        const isHeic =
          /\.(heic|heif)$/i.test(file.name) ||
          /image\/(heic|heif)/i.test(file.type);
        if (!isHeic) {
          try {
            toEnqueue = await compressImage(file);
          } catch {
            toEnqueue = file;
          }
        }
      }

      enqueueScan(toEnqueue, mode);

      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";

      setFlash(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlash(false), 1500);
    },
    [enqueueScan, mode]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFile(file);
    }
  }

  const isQR = mode === "qr";

  return (
    <AppShell>
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">
          {isQR ? "Scan QR Code" : "Scan Business Card"}
        </h1>

        <div
          role="tablist"
          aria-label="Scan mode"
          className="mb-4 inline-flex p-1 rounded-xl bg-panel-2 border border-border"
        >
          <button
            role="tab"
            aria-selected={!isQR}
            onClick={() => setMode("card")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              !isQR
                ? "bg-bg-elevated text-text shadow-sm"
                : "text-text-muted hover:text-text"
            )}
          >
            <CreditCard className="h-4 w-4" />
            Business Card
          </button>
          <button
            role="tab"
            aria-selected={isQR}
            onClick={() => setMode("qr")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isQR
                ? "bg-bg-elevated text-text shadow-sm"
                : "text-text-muted hover:text-text"
            )}
          >
            <QrCode className="h-4 w-4" />
            QR Code
          </button>
        </div>

        {flash && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-brand/10 border border-brand/20 animate-fade-in">
            <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
            <p className="text-brand font-medium">
              {isQR
                ? "QR captured — scanning for contact info"
                : "Lead saved — scan the next card"}
            </p>
          </div>
        )}

        <div
          className="border-2 border-dashed border-border rounded-2xl p-8 md:p-12 text-center hover:border-brand/40 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {isQR ? (
            <QrCode
              className="w-12 h-12 text-brand/30 mx-auto mb-4"
              strokeWidth={1.5}
            />
          ) : (
            <svg
              className="w-12 h-12 text-brand/30 mx-auto mb-4"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="6" y="10" width="36" height="28" rx="4" />
              <circle cx="24" cy="24" r="6" />
              <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.3" />
            </svg>
          )}
          <p className="text-text-muted mb-4">
            {isQR
              ? "Point at a QR code or drop an image here"
              : "Take a photo or drop an image here"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </Button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        <p className="mt-3 text-xs text-text-muted text-center">
          {isQR
            ? "We decode the QR (vCard, MECARD, URL, or plain text) and save the contact in the background."
            : "Extraction runs in the background. You'll get a notification when the lead is ready to review."}
        </p>
      </div>
    </AppShell>
  );
}
