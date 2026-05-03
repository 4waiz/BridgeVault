"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/providers/notifications";
import { adminUpdateProfile } from "@/actions/admin";

interface Props {
  userId: string;
  initialFullName: string | null;
  initialIsAdmin: boolean;
  isSelf: boolean;
}

export function ProfileEditForm({ userId, initialFullName, initialIsAdmin, isSelf }: Props) {
  const [fullName, setFullName] = useState(initialFullName || "");
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [isPending, startTransition] = useTransition();
  const { push } = useNotifications();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await adminUpdateProfile(userId, {
        full_name: fullName.trim() || undefined,
        is_admin: isAdmin,
      });
      if (result?.error) {
        push({ title: "Update failed", body: result.error, variant: "error" });
        return;
      }
      push({ title: "Saved", body: "Profile updated.", variant: "success" });
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
          Full name
        </label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>

      <label className="flex items-center gap-2.5 rounded-xl border border-border bg-bg-elevated p-3 cursor-pointer hover:border-brand/40">
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={(e) => setIsAdmin(e.target.checked)}
          disabled={isSelf}
          className="h-4 w-4 accent-brand"
        />
        <div>
          <p className="text-sm font-medium">Grant admin privileges</p>
          <p className="text-xs text-text-muted">
            {isSelf
              ? "You cannot change your own admin status."
              : "Admins can view, edit and delete every user's data."}
          </p>
        </div>
      </label>

      <Button type="submit" loading={isPending}>
        Save changes
      </Button>
    </form>
  );
}
