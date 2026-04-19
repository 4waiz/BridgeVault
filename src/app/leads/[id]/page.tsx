"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Mail,
  Phone as PhoneIcon,
  Globe,
  MapPin,
  Building2,
  Tag,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getLead, updateLead, deleteLead, getLeadActivity } from "@/actions/leads";
import { formatDateTime } from "@/lib/utils";
import type { LeadWithTags, LeadActivity, LeadStatus } from "@/types";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "reviewed", label: "Reviewed" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

/** Build a safe href for the website column. Only allows http/https — blocks
 *  javascript:, data:, and malformed schemes that could slip through a naive
 *  `startsWith("http")` check. OCR/QR output is attacker-controlled. */
function safeWebsiteHref(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [lead, setLead] = useState<LeadWithTags | null>(null);
  const [activity, setActivity] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    async function load() {
      const [leadResult, activityData] = await Promise.all([
        getLead(id),
        getLeadActivity(id),
      ]);
      if (leadResult.error || !leadResult.data) {
        toast("Lead not found", "error");
        router.push("/leads");
        return;
      }
      setLead(leadResult.data as LeadWithTags);
      setActivity(activityData);
      setLoading(false);
    }
    load();
  }, [id, router, toast]);

  function startEditing() {
    if (!lead) return;
    setEditFields({
      full_name: lead.full_name || "",
      first_name: lead.first_name || "",
      last_name: lead.last_name || "",
      job_title: lead.job_title || "",
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      website: lead.website || "",
      address: lead.address || "",
      city: lead.city || "",
      country: lead.country || "",
      notes: lead.notes || "",
      status: lead.status,
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    const tags = lead?.lead_tags?.map((t) => t.tag) || [];
    const result = await updateLead(id, {
      ...editFields,
      status: editFields.status as LeadStatus,
      tags,
    });
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Lead updated", "success");
      const updated = await getLead(id);
      if (updated.data) setLead(updated.data as LeadWithTags);
      setEditing(false);
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteLead(id);
    if (result.error) {
      toast(result.error, "error");
      setDeleting(false);
      return;
    }
    toast("Lead deleted", "success");
    router.push("/leads");
  }

  async function addTag() {
    if (!tagInput.trim() || !lead) return;
    const tags = [...(lead.lead_tags?.map((t) => t.tag) || []), tagInput.trim()];
    await updateLead(id, { tags });
    const updated = await getLead(id);
    if (updated.data) setLead(updated.data as LeadWithTags);
    setTagInput("");
  }

  async function removeTag(tag: string) {
    if (!lead) return;
    const tags = (lead.lead_tags || []).map((t) => t.tag).filter((t) => t !== tag);
    await updateLead(id, { tags });
    const updated = await getLead(id);
    if (updated.data) setLead(updated.data as LeadWithTags);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-60 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!lead) return null;

  const imageUrl = lead.lead_attachments?.[0]?.storage_path;

  return (
    <AppShell>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/leads"
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Link>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <Button variant="secondary" size="sm" onClick={startEditing} className="gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={handleSave} loading={saving}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-soft flex items-center justify-center shrink-0">
            <span className="text-brand text-xl font-bold">
              {(lead.full_name || "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {lead.full_name || "Unknown Contact"}
            </h1>
            <p className="text-text-muted">
              {lead.job_title}
              {lead.job_title && lead.company ? " at " : ""}
              {lead.company}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={lead.status} />
              <span className="text-xs text-text-muted">
                Added {formatDateTime(lead.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact info */}
            <div className="rounded-2xl border border-border bg-panel p-5 space-y-4">
              <h2 className="font-semibold text-lg">Contact Information</h2>

              {editing ? (
                <div className="space-y-3">
                  <Input
                    label="Full Name"
                    value={editFields.full_name}
                    onChange={(e) =>
                      setEditFields({ ...editFields, full_name: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="First Name"
                      value={editFields.first_name}
                      onChange={(e) =>
                        setEditFields({ ...editFields, first_name: e.target.value })
                      }
                    />
                    <Input
                      label="Last Name"
                      value={editFields.last_name}
                      onChange={(e) =>
                        setEditFields({ ...editFields, last_name: e.target.value })
                      }
                    />
                  </div>
                  <Input
                    label="Job Title"
                    value={editFields.job_title}
                    onChange={(e) =>
                      setEditFields({ ...editFields, job_title: e.target.value })
                    }
                  />
                  <Input
                    label="Company"
                    value={editFields.company}
                    onChange={(e) =>
                      setEditFields({ ...editFields, company: e.target.value })
                    }
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={editFields.email}
                    onChange={(e) =>
                      setEditFields({ ...editFields, email: e.target.value })
                    }
                  />
                  <Input
                    label="Phone"
                    value={editFields.phone}
                    onChange={(e) =>
                      setEditFields({ ...editFields, phone: e.target.value })
                    }
                  />
                  <Input
                    label="Website"
                    value={editFields.website}
                    onChange={(e) =>
                      setEditFields({ ...editFields, website: e.target.value })
                    }
                  />
                  <Input
                    label="Address"
                    value={editFields.address}
                    onChange={(e) =>
                      setEditFields({ ...editFields, address: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="City"
                      value={editFields.city}
                      onChange={(e) =>
                        setEditFields({ ...editFields, city: e.target.value })
                      }
                    />
                    <Input
                      label="Country"
                      value={editFields.country}
                      onChange={(e) =>
                        setEditFields({ ...editFields, country: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-muted">Status</label>
                    <select
                      value={editFields.status}
                      onChange={(e) =>
                        setEditFields({ ...editFields, status: e.target.value })
                      }
                      className="w-full h-[42px] rounded-lg border border-border bg-panel px-3 text-sm text-text appearance-none"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Textarea
                    label="Notes"
                    value={editFields.notes}
                    onChange={(e) =>
                      setEditFields({ ...editFields, notes: e.target.value })
                    }
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { icon: Mail, label: "Email", value: lead.email, href: lead.email ? `mailto:${lead.email}` : undefined },
                    { icon: PhoneIcon, label: "Phone", value: lead.phone, href: lead.phone ? `tel:${lead.phone}` : undefined },
                    { icon: Globe, label: "Website", value: lead.website || lead.domain, href: safeWebsiteHref(lead.website) },
                    { icon: Building2, label: "Company", value: lead.company },
                    { icon: MapPin, label: "Address", value: [lead.address, lead.city, lead.country].filter(Boolean).join(", ") },
                  ].map(
                    (item) =>
                      item.value && (
                        <div key={item.label} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 text-text-muted shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-text-muted">{item.label}</p>
                            {item.href ? (
                              <a
                                href={item.href}
                                target={item.label === "Website" ? "_blank" : undefined}
                                rel={item.label === "Website" ? "noopener noreferrer" : undefined}
                                className="text-sm text-brand hover:underline flex items-center gap-1"
                              >
                                {item.value}
                                {item.label === "Website" && (
                                  <ExternalLink className="h-3 w-3" />
                                )}
                              </a>
                            ) : (
                              <p className="text-sm">{item.value}</p>
                            )}
                          </div>
                        </div>
                      )
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            {lead.notes && !editing && (
              <div className="rounded-2xl border border-border bg-panel p-5">
                <h2 className="font-semibold text-lg mb-2">Notes</h2>
                <p className="text-sm text-text-muted whitespace-pre-wrap">
                  {lead.notes}
                </p>
              </div>
            )}

            {/* Summary */}
            {lead.summary && (
              <div className="rounded-2xl border border-brand/10 bg-brand-soft p-5">
                <p className="text-sm text-brand">{lead.summary}</p>
              </div>
            )}

            {/* OCR Data */}
            {lead.ocr_raw_text && (
              <div className="rounded-2xl border border-border bg-panel overflow-hidden">
                <button
                  onClick={() => setShowOCR(!showOCR)}
                  className="flex items-center justify-between w-full p-5 cursor-pointer"
                >
                  <h2 className="font-semibold">Raw OCR Data</h2>
                  {showOCR ? (
                    <ChevronUp className="h-4 w-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-muted" />
                  )}
                </button>
                {showOCR && (
                  <div className="px-5 pb-5">
                    <pre className="text-xs text-text-muted whitespace-pre-wrap bg-bg p-3 rounded-lg overflow-x-auto">
                      {lead.ocr_raw_text}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Business card image */}
            {imageUrl && (
              <div className="rounded-2xl border border-border bg-panel overflow-hidden">
                <p className="px-4 pt-4 text-sm font-medium text-text-muted">
                  Business Card
                </p>
                {/* The image would be loaded from Supabase storage */}
                <div className="p-4">
                  <div className="rounded-xl bg-panel-2 border border-border h-40 flex items-center justify-center text-text-muted text-xs">
                    Card image stored at:<br />
                    {imageUrl}
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="rounded-2xl border border-border bg-panel p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-text-muted" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {lead.lead_tags?.map((tag) => (
                  <Badge key={tag.id} variant="brand">
                    {tag.tag}
                    <button
                      onClick={() => removeTag(tag.tag)}
                      className="ml-1 hover:text-white cursor-pointer"
                      aria-label={`Remove tag ${tag.tag}`}
                    >
                      &times;
                    </button>
                  </Badge>
                ))}
                {(!lead.lead_tags || lead.lead_tags.length === 0) && (
                  <span className="text-xs text-text-muted">No tags</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tag..."
                  className="flex-1 h-8 rounded-lg border border-border bg-panel-2 px-2 text-xs text-text placeholder:text-text-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button size="sm" variant="ghost" onClick={addTag}>
                  Add
                </Button>
              </div>
            </div>

            {/* Activity */}
            <div className="rounded-2xl border border-border bg-panel p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-muted" />
                Activity
              </h3>
              <div className="space-y-2">
                {activity.length === 0 ? (
                  <p className="text-xs text-text-muted">No activity yet</p>
                ) : (
                  activity.slice(0, 10).map((a) => (
                    <div key={a.id} className="text-xs">
                      <span className="text-text-muted">
                        {formatDateTime(a.created_at)}
                      </span>
                      <span className="ml-2 capitalize">{a.action}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="rounded-2xl border border-border bg-panel p-4 text-xs text-text-muted space-y-1">
              <p>Created: {formatDateTime(lead.created_at)}</p>
              <p>Updated: {formatDateTime(lead.updated_at)}</p>
              {lead.domain && <p>Domain: {lead.domain}</p>}
              {lead.source && <p>Source: {lead.source}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Lead"
      >
        <p className="text-text-muted mb-4">
          Are you sure you want to delete{" "}
          <strong className="text-text">{lead.full_name || "this lead"}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
