"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface UserOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  users: UserOption[];
}

export function LeadsFilterBar({ users }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    });
    startTransition(() => router.push(`/admin/leads?${next.toString()}`));
  }

  function reset() {
    startTransition(() => router.push("/admin/leads"));
  }

  return (
    <div className="rounded-2xl border border-border bg-panel p-3 md:p-4">
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              defaultValue={params.get("search") || ""}
              placeholder="Search name, company, email, phone…"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  update({ search: (e.target as HTMLInputElement).value });
                }
              }}
            />
          </div>
        </div>
        <div className="md:col-span-3">
          <Select
            defaultValue={params.get("userId") || "all"}
            onChange={(e) => update({ userId: e.target.value })}
            options={[
              { value: "all", label: "All users" },
              ...users.map((u) => ({
                value: u.id,
                label: u.full_name || u.email || "(no name)",
              })),
            ]}
          />
        </div>
        <div className="md:col-span-2">
          <Select
            defaultValue={params.get("status") || "all"}
            onChange={(e) => update({ status: e.target.value })}
            options={[
              { value: "all", label: "All statuses" },
              { value: "reviewed", label: "Reviewed" },
              { value: "contacted", label: "Contacted" },
              { value: "qualified", label: "Qualified" },
              { value: "rejected", label: "Rejected" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </div>
        <div className="md:col-span-2">
          <Select
            defaultValue={params.get("sort") || "newest"}
            onChange={(e) => update({ sort: e.target.value })}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "name", label: "Name A-Z" },
              { value: "company", label: "Company A-Z" },
              { value: "status", label: "Status" },
            ]}
          />
        </div>
        <div className="md:col-span-1">
          <Button
            variant="ghost"
            onClick={reset}
            className="w-full gap-1.5"
            loading={isPending}
            aria-label="Reset filters"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
