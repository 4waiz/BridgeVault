"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  Plus,
  X,
  Save,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LeadCardSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getLeads, createLead, saveDraft, getCurrentDraft, discardDraft } from "@/actions/leads";
import { formatDate, truncate } from "@/lib/utils";
import type { LeadWithTags, LeadStatus, Lead } from "@/types";

const STATUS_TABS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reviewed", label: "Reviewed" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name" },
  { value: "company", label: "Company" },
  { value: "status", label: "Status" },
];

const EMPTY_FIELDS = {
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
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [sort, setSort] = useState("newest");
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Manual add panel state
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addFields, setAddFields] = useState({ ...EMPTY_FIELDS });
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [savingLead, setSavingLead] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const result = await getLeads({ search, status, sort });
    if (result.error) {
      toast(result.error, "error");
    } else {
      setLeads(result.data as LeadWithTags[]);
    }
    setLoading(false);
  }, [search, status, sort, toast]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  // Auto-save draft when fields change
  useEffect(() => {
    if (!showAddPanel) return;
    // Only auto-save if there's some data entered
    const hasData = Object.values(addFields).some((v) => v.trim() !== "");
    if (!hasData) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setDraftStatus("saving");
      const result = await saveDraft({ id: draftId || undefined, ...addFields });
      if (result.data?.id && !draftId) {
        setDraftId(result.data.id);
      }
      setDraftStatus("saved");
    }, 2000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addFields, showAddPanel]);

  async function handleOpenAddPanel() {
    setShowAddPanel(true);
    setLoadingDraft(true);
    // Check for existing draft
    const result = await getCurrentDraft();
    if (result.data) {
      const d = result.data as Lead;
      setDraftId(d.id);
      setAddFields({
        full_name: d.full_name || "",
        first_name: d.first_name || "",
        last_name: d.last_name || "",
        job_title: d.job_title || "",
        company: d.company || "",
        email: d.email || "",
        phone: d.phone || "",
        website: d.website || "",
        address: d.address || "",
        city: d.city || "",
        country: d.country || "",
        notes: d.notes || "",
      });
      setDraftStatus("saved");
    }
    setLoadingDraft(false);
  }

  function handleCloseAddPanel() {
    setShowAddPanel(false);
    // Don't clear — draft is persisted
  }

  function updateAddField(key: keyof typeof addFields, value: string) {
    setAddFields((prev) => ({ ...prev, [key]: value }));
    setDraftStatus("idle");
  }

  async function handleSaveDraftExplicit() {
    setDraftStatus("saving");
    const result = await saveDraft({ id: draftId || undefined, ...addFields });
    if (result.error) {
      toast(result.error, "error");
      setDraftStatus("idle");
      return;
    }
    if (result.data?.id && !draftId) {
      setDraftId(result.data.id);
    }
    setDraftStatus("saved");
    toast("Draft saved", "success");
  }

  async function handleSaveAsLead() {
    if (!addFields.full_name.trim()) {
      toast("Name is required", "error");
      return;
    }

    setSavingLead(true);

    // If we have a draft, promote it; otherwise create new
    if (draftId) {
      const { updateLead } = await import("@/actions/leads");
      const result = await updateLead(draftId, {
        ...addFields,
        is_draft: false,
        status: "reviewed",
      });
      if (result.error) {
        toast(result.error, "error");
        setSavingLead(false);
        return;
      }
    } else {
      const result = await createLead({
        ...addFields,
        is_draft: false,
      });
      if (result.error) {
        toast(result.error, "error");
        setSavingLead(false);
        return;
      }
    }

    toast("Lead saved!", "success");
    setSavingLead(false);
    setShowAddPanel(false);
    setAddFields({ ...EMPTY_FIELDS });
    setDraftId(null);
    setDraftStatus("idle");
    fetchLeads();
  }

  async function handleDiscardDraft() {
    if (draftId) {
      await discardDraft(draftId);
    }
    setShowAddPanel(false);
    setAddFields({ ...EMPTY_FIELDS });
    setDraftId(null);
    setDraftStatus("idle");
    toast("Draft discarded", "info");
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (sort) params.set("sort", sort);

      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bridge-vault-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Export downloaded!", "success");
    } catch {
      toast("Export failed", "error");
    }
    setExporting(false);
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold">Leads</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenAddPanel}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              loading={exporting}
              className="gap-2 w-fit"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Inline Add Lead Panel */}
        {showAddPanel && (
          <div className="rounded-2xl border border-brand/20 bg-panel overflow-hidden animate-fade-in">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel-2">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-brand" />
                <span className="font-semibold text-sm">New Lead</span>
                {/* Draft status indicator */}
                <span className="text-xs text-text-muted">
                  {draftStatus === "saving" && (
                    <span className="flex items-center gap-1 text-text-muted">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {draftStatus === "saved" && (
                    <span className="text-success">Draft saved</span>
                  )}
                  {draftStatus === "idle" && draftId && (
                    <span className="text-warning">Unsaved changes</span>
                  )}
                </span>
              </div>
              <button
                onClick={handleCloseAddPanel}
                className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-panel transition-colors cursor-pointer"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingDraft ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-brand animate-spin" />
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Compact form grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Input
                    label="Full Name"
                    id="add_full_name"
                    value={addFields.full_name}
                    onChange={(e) => updateAddField("full_name", e.target.value)}
                    placeholder="Jane Smith"
                  />
                  <Input
                    label="Email"
                    id="add_email"
                    type="email"
                    value={addFields.email}
                    onChange={(e) => updateAddField("email", e.target.value)}
                    placeholder="jane@company.com"
                  />
                  <Input
                    label="Phone"
                    id="add_phone"
                    type="tel"
                    value={addFields.phone}
                    onChange={(e) => updateAddField("phone", e.target.value)}
                    placeholder="+1 555-1234"
                  />
                  <Input
                    label="Job Title"
                    id="add_job_title"
                    value={addFields.job_title}
                    onChange={(e) => updateAddField("job_title", e.target.value)}
                    placeholder="VP of Sales"
                  />
                  <Input
                    label="Company"
                    id="add_company"
                    value={addFields.company}
                    onChange={(e) => updateAddField("company", e.target.value)}
                    placeholder="Acme Corp"
                  />
                  <Input
                    label="Website"
                    id="add_website"
                    value={addFields.website}
                    onChange={(e) => updateAddField("website", e.target.value)}
                    placeholder="acme.com"
                  />
                  <Input
                    label="First Name"
                    id="add_first_name"
                    value={addFields.first_name}
                    onChange={(e) => updateAddField("first_name", e.target.value)}
                  />
                  <Input
                    label="Last Name"
                    id="add_last_name"
                    value={addFields.last_name}
                    onChange={(e) => updateAddField("last_name", e.target.value)}
                  />
                  <Input
                    label="Address"
                    id="add_address"
                    value={addFields.address}
                    onChange={(e) => updateAddField("address", e.target.value)}
                  />
                  <Input
                    label="City"
                    id="add_city"
                    value={addFields.city}
                    onChange={(e) => updateAddField("city", e.target.value)}
                  />
                  <Input
                    label="Country"
                    id="add_country"
                    value={addFields.country}
                    onChange={(e) => updateAddField("country", e.target.value)}
                  />
                </div>
                <Textarea
                  label="Notes"
                  id="add_notes"
                  value={addFields.notes}
                  onChange={(e) => updateAddField("notes", e.target.value)}
                  rows={2}
                  placeholder="Additional notes..."
                />

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    onClick={handleSaveAsLead}
                    loading={savingLead}
                    className="gap-1.5"
                    size="sm"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Lead
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleSaveDraftExplicit}
                    size="sm"
                    className="gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Save as Draft
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDiscardDraft}
                    size="sm"
                    className="gap-1.5 text-danger hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Discard
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[42px] rounded-lg border border-border bg-panel pl-10 pr-3 text-sm text-text placeholder:text-text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-[42px] rounded-lg border border-border bg-panel px-3 text-sm text-text appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  status === tab.value
                    ? "bg-brand-soft text-brand"
                    : "text-text-muted hover:text-text hover:bg-panel-2"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <>
            {/* Mobile skeletons */}
            <div className="space-y-2 md:hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <LeadCardSkeleton key={i} />
              ))}
            </div>
            {/* Desktop skeleton */}
            <table className="hidden md:table w-full">
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Empty state */}
        {!loading && leads.length === 0 && (
          <EmptyState
            title={search ? "No matching leads" : "No leads yet"}
            description={
              search
                ? "Try adjusting your search or filters"
                : "Scan a business card or add a lead manually"
            }
            action={
              !search ? (
                <div className="flex gap-2">
                  <Link href="/scan">
                    <Button>Scan Card</Button>
                  </Link>
                  <Button variant="secondary" onClick={handleOpenAddPanel} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Add Lead
                  </Button>
                </div>
              ) : undefined
            }
          />
        )}

        {/* Mobile cards */}
        {!loading && leads.length > 0 && (
          <div className="space-y-2 md:hidden">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="block p-4 rounded-2xl border border-border bg-panel hover:bg-panel-2 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {lead.full_name || "Unknown"}
                    </p>
                    {lead.job_title && (
                      <p className="text-xs text-text-muted truncate">
                        {lead.job_title}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  {lead.company && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {lead.company}
                    </span>
                  )}
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {truncate(lead.email, 24)}
                    </span>
                  )}
                  {lead.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </span>
                  )}
                </div>
                {lead.lead_tags?.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {lead.lead_tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="text-xs px-1.5 py-0.5 rounded bg-panel-2 text-text-muted border border-border"
                      >
                        {tag.tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Desktop table */}
        {!loading && leads.length > 0 && (
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-panel">
                  <th className="text-left p-3 font-medium text-text-muted">Name</th>
                  <th className="text-left p-3 font-medium text-text-muted">Company</th>
                  <th className="text-left p-3 font-medium text-text-muted">Email</th>
                  <th className="text-left p-3 font-medium text-text-muted">Phone</th>
                  <th className="text-left p-3 font-medium text-text-muted">Status</th>
                  <th className="text-left p-3 font-medium text-text-muted">Date</th>
                  <th className="p-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border hover:bg-panel-2/50 transition-colors"
                  >
                    <td className="p-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium hover:text-brand transition-colors"
                      >
                        {lead.full_name || "Unknown"}
                      </Link>
                      {lead.job_title && (
                        <p className="text-xs text-text-muted">{lead.job_title}</p>
                      )}
                    </td>
                    <td className="p-3 text-text-muted">{lead.company || "—"}</td>
                    <td className="p-3 text-text-muted">
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="hover:text-brand transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {truncate(lead.email, 28)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-text-muted">{lead.phone || "—"}</td>
                    <td className="p-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="p-3 text-text-muted text-xs">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="p-3">
                      <Link href={`/leads/${lead.id}`}>
                        <ChevronRight className="h-4 w-4 text-text-muted" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
