"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, X, Loader2, AlertTriangle, Check, QrCode } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { processBusinessCard, checkCardDuplicates, uploadCardImage } from "@/actions/ocr";
import { createLead } from "@/actions/leads";
import type { ParsedBusinessCard, DuplicateWarning } from "@/types";

type Step = "capture" | "processing" | "review";

export default function ScanPage() {
  const [step, setStep] = useState<Step>("capture");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedBusinessCard | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<{
    domain: string | null;
    summary: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    full_name: "",
    first_name: "",
    last_name: "",
    job_title: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    country: "",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleFile = useCallback((file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFile(file);
    }
  }

  async function handleProcess() {
    if (!imageFile) return;
    setStep("processing");

    const formData = new FormData();
    formData.append("image", imageFile);

    const result = await processBusinessCard(formData);

    if (result.error || !result.parsed) {
      toast(result.error || "Processing failed", "error");
      setStep("capture");
      return;
    }

    setParsed(result.parsed);
    setEnrichmentData(
      result.enrichment
        ? { domain: result.enrichment.domain, summary: result.enrichment.summary }
        : null
    );

    // Populate form fields
    const extractedFields = {
      full_name: result.parsed.full_name.value,
      first_name: result.parsed.first_name.value,
      last_name: result.parsed.last_name.value,
      job_title: result.parsed.job_title.value,
      company: result.parsed.company.value,
      email: result.parsed.email.value,
      phone: result.parsed.phone.value,
      website: result.parsed.website.value,
      address: result.parsed.address.value,
      city: result.parsed.city.value,
      country: result.parsed.country.value,
      notes: result.parsed.notes.value,
    };
    setFields(extractedFields);

    // Show review immediately
    setStep("review");

    // Check duplicates in background
    setCheckingDuplicates(true);
    checkCardDuplicates({
      email: extractedFields.email,
      phone: extractedFields.phone,
      full_name: extractedFields.full_name,
      company: extractedFields.company,
    })
      .then((res) => setDuplicates(res.duplicates))
      .finally(() => setCheckingDuplicates(false));
  }

  async function handleSave() {
    if (!fields.full_name.trim()) {
      toast("Name is required", "error");
      return;
    }

    setSaving(true);

    // Upload image to storage
    let imagePath: string | undefined;
    if (imageFile) {
      const uploadForm = new FormData();
      uploadForm.append("image", imageFile);
      const upload = await uploadCardImage(uploadForm);
      if (upload.error) {
        toast(upload.error, "error");
        setSaving(false);
        return;
      }
      imagePath = upload.imagePath || undefined;
    }

    const result = await createLead({
      ...fields,
      domain: enrichmentData?.domain || undefined,
      summary: enrichmentData?.summary || undefined,
      ocr_raw_text: parsed?.raw_text,
      ocr_json: parsed as unknown as Record<string, unknown>,
      enrichment_json: enrichmentData as unknown as Record<string, unknown>,
      qr_raw: parsed?.qr_raw,
      qr_json: parsed?.qr_source as Record<string, unknown> | undefined,
      image_path: imagePath,
      image_name: imageFile?.name,
      image_mime: imageFile?.type,
    });

    setSaving(false);

    if (result.error) {
      toast(result.error, "error");
      return;
    }

    toast("Lead saved successfully!", "success");
    router.push(`/leads/${result.data?.id}`);
  }

  function resetScan() {
    setStep("capture");
    setImageFile(null);
    setImagePreview(null);
    setParsed(null);
    setDuplicates([]);
    setCheckingDuplicates(false);
    setEnrichmentData(null);
  }

  function updateField(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  /** Badge showing if a field came from QR */
  function qrBadge(fieldKey: string) {
    if (!parsed?.qr_source?.[fieldKey as keyof typeof parsed.qr_source]) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-brand/10 text-brand ml-1">
        <QrCode className="h-3 w-3" />
        QR
      </span>
    );
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Scan Business Card</h1>

        {/* Step: Capture */}
        {step === "capture" && (
          <div className="space-y-4">
            {!imagePreview ? (
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
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-border bg-panel">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Business card preview"
                    className="w-full max-h-80 object-contain"
                  />
                  <button
                    onClick={resetScan}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleProcess} className="flex-1 gap-2">
                    <Check className="h-4 w-4" />
                    Process Card
                  </Button>
                  <Button variant="secondary" onClick={resetScan}>
                    Retake
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 text-brand animate-spin" />
            <p className="text-text-muted">Extracting card information...</p>
            <p className="text-xs text-text-muted/60">
              Running OCR + QR detection
            </p>
          </div>
        )}

        {/* Step: Review — single-page compact layout */}
        {step === "review" && parsed && (
          <div className="space-y-4">
            {/* Alerts row: duplicates + QR detection notice */}
            <div className="space-y-2">
              {checkingDuplicates && (
                <div className="p-2.5 rounded-xl border border-border bg-panel flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking for duplicates...
                </div>
              )}
              {duplicates.length > 0 && (
                <div className="p-3 rounded-xl border border-warning/30 bg-warning/5 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-warning">
                      Possible duplicate{duplicates.length > 1 ? "s" : ""}
                    </span>
                    {duplicates.map((d) => (
                      <p key={d.lead_id} className="text-text-muted mt-0.5">
                        {d.similarity_reason} — {d.full_name || "Unknown"}{" "}
                        {d.company ? `at ${d.company}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {parsed.qr_raw && (
                <div className="p-2.5 rounded-xl border border-brand/20 bg-brand/5 flex items-center gap-2 text-sm">
                  <QrCode className="h-4 w-4 text-brand shrink-0" />
                  <span className="text-brand">QR code detected and merged with OCR data</span>
                </div>
              )}
            </div>

            {/* Main content: image + fields in a tight grid */}
            <div className="grid lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-4">
              {/* Left column: Card preview + enrichment */}
              <div className="space-y-3">
                {imagePreview && (
                  <div className="rounded-xl overflow-hidden border border-border bg-panel">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Business card"
                      className="w-full max-h-48 lg:max-h-56 object-contain"
                    />
                  </div>
                )}
                {enrichmentData?.summary && (
                  <div className="p-2.5 rounded-lg bg-brand-soft border border-brand/10">
                    <p className="text-xs text-brand leading-relaxed">
                      {enrichmentData.summary}
                    </p>
                  </div>
                )}
              </div>

              {/* Right column: Compact form fields */}
              <div className="space-y-2.5">
                {/* Row 1: Full name */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label={<>Full Name{qrBadge("full_name")}</>}
                      id="full_name"
                      value={fields.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      confidence={parsed.full_name.confidence}
                    />
                  </div>
                </div>
                {/* Row 2: First + Last name */}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label={<>First Name{qrBadge("first_name")}</>}
                    id="first_name"
                    value={fields.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    confidence={parsed.first_name.confidence}
                  />
                  <Input
                    label={<>Last Name{qrBadge("last_name")}</>}
                    id="last_name"
                    value={fields.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    confidence={parsed.last_name.confidence}
                  />
                </div>
                {/* Row 3: Title + Company */}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label={<>Job Title{qrBadge("job_title")}</>}
                    id="job_title"
                    value={fields.job_title}
                    onChange={(e) => updateField("job_title", e.target.value)}
                    confidence={parsed.job_title.confidence}
                  />
                  <Input
                    label={<>Company{qrBadge("company")}</>}
                    id="company"
                    value={fields.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    confidence={parsed.company.confidence}
                  />
                </div>
                {/* Row 4: Email + Phone */}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label={<>Email{qrBadge("email")}</>}
                    id="email"
                    type="email"
                    value={fields.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    confidence={parsed.email.confidence}
                  />
                  <Input
                    label={<>Phone{qrBadge("phone")}</>}
                    id="phone"
                    type="tel"
                    value={fields.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    confidence={parsed.phone.confidence}
                  />
                </div>
                {/* Row 5: Website + Address */}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label={<>Website{qrBadge("website")}</>}
                    id="website"
                    value={fields.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    confidence={parsed.website.confidence}
                  />
                  <Input
                    label="Address"
                    id="address"
                    value={fields.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>
                {/* Row 6: City + Country */}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="City"
                    id="city"
                    value={fields.city}
                    onChange={(e) => updateField("city", e.target.value)}
                  />
                  <Input
                    label="Country"
                    id="country"
                    value={fields.country}
                    onChange={(e) => updateField("country", e.target.value)}
                  />
                </div>
                {/* Row 7: Notes - compact */}
                <Textarea
                  label="Notes"
                  id="notes"
                  value={fields.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Sticky action bar */}
            <div className="sticky bottom-0 -mx-4 px-4 py-3 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 bg-bg/90 backdrop-blur-md border-t border-border flex gap-3">
              <Button onClick={handleSave} loading={saving} className="flex-1">
                Save Lead
              </Button>
              <Button variant="secondary" onClick={resetScan}>
                Scan Another
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
