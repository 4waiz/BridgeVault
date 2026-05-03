"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNotifications } from "@/providers/notifications";
import { adminUpdateLead } from "@/actions/admin";
import type { LeadStatus, Lead } from "@/types";

interface Props {
  lead: Lead;
}

const statusOptions = [
  { value: "reviewed", label: "Reviewed" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

export function LeadEditForm({ lead }: Props) {
  const [form, setForm] = useState({
    full_name: lead.full_name || "",
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
  const [isPending, startTransition] = useTransition();
  const { push } = useNotifications();
  const router = useRouter();

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await adminUpdateLead(lead.id, {
        ...form,
        status: form.status as LeadStatus,
      });
      if (result?.error) {
        push({ title: "Update failed", body: result.error, variant: "error" });
        return;
      }
      push({ title: "Saved", body: "Lead updated.", variant: "success" });
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <Input label="Full name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
      <Input label="Job title" value={form.job_title} onChange={(e) => set("job_title", e.target.value)} />
      <Input label="Company" value={form.company} onChange={(e) => set("company", e.target.value)} />
      <Select
        label="Status"
        value={form.status}
        onChange={(e) => set("status", e.target.value as LeadStatus)}
        options={statusOptions}
      />
      <Input label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
      <Input label="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      <Input label="Website" value={form.website} onChange={(e) => set("website", e.target.value)} />
      <Input label="Address" value={form.address} onChange={(e) => set("address", e.target.value)} />
      <Input label="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
      <Input label="Country" value={form.country} onChange={(e) => set("country", e.target.value)} />
      <div className="md:col-span-2">
        <Textarea
          label="Notes"
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" loading={isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
