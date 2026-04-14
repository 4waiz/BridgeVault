"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { scanAndSaveLead } from "@/actions/ocr";

type Step = "capture" | "saving" | "saved";

export default function ScanPage() {
  const [step, setStep] = useState<Step>("capture");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleFile = useCallback(
    async (file: File) => {
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Immediately start saving
      setStep("saving");

      const formData = new FormData();
      formData.append("image", file);

      const result = await scanAndSaveLead(formData);

      if (result.error || !result.leadId) {
        toast(result.error || "Failed to save lead", "error");
        setStep("capture");
        setImagePreview(null);
        return;
      }

      setSavedLeadId(result.leadId);
      setStep("saved");
    },
    [toast]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFile(file);
    }
  }

  function scanAnother() {
    setStep("capture");
    setImagePreview(null);
    setSavedLeadId(null);
    // Reset file inputs so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Scan Business Card</h1>

        {/* Step: Capture */}
        {step === "capture" && (
          <div
            className="border-2 border-dashed border-border rounded-2xl p-8 md:p-12 text-center hover:border-brand/40 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
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
            <p className="text-text-muted mb-4">
              Take a photo or drop an image here
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
        )}

        {/* Step: Saving */}
        {step === "saving" && (
          <div className="space-y-4">
            {imagePreview && (
              <div className="relative rounded-2xl overflow-hidden border border-border bg-panel">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Business card"
                  className="w-full max-h-64 object-contain opacity-60"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                  <Loader2 className="h-10 w-10 text-white animate-spin" />
                  <p className="text-white font-medium mt-3">Saving...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Saved */}
        {step === "saved" && (
          <div className="space-y-4">
            {imagePreview && (
              <div className="relative rounded-2xl overflow-hidden border border-brand/30 bg-panel">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Business card"
                  className="w-full max-h-64 object-contain"
                />
                <div className="absolute top-3 right-3 p-2 rounded-full bg-brand text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-brand/10 border border-brand/20">
              <CheckCircle2 className="h-5 w-5 text-brand shrink-0" />
              <p className="text-brand font-medium">Lead saved</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={scanAnother} className="flex-1 gap-2">
                <Camera className="h-4 w-4" />
                Scan Another
              </Button>
              <Button
                variant="secondary"
                onClick={() => router.push(`/leads/${savedLeadId}`)}
              >
                View Lead
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
