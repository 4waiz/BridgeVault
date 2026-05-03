"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useNotifications } from "@/providers/notifications";

interface Props {
  label: string;
  message: string;
  successText: string;
  action: () => Promise<{ success?: boolean; error?: string }>;
  redirectTo?: string;
  size?: "sm" | "md";
  variant?: "danger" | "ghost";
  iconOnly?: boolean;
}

export function DeleteButton({
  label,
  message,
  successText,
  action,
  redirectTo,
  size = "sm",
  variant = "danger",
  iconOnly,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { push } = useNotifications();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        push({ title: "Delete failed", body: result.error, variant: "error" });
        return;
      }
      push({ title: "Deleted", body: successText, variant: "success" });
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="gap-1.5"
        aria-label={label}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {!iconOnly && label}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={label}>
        <p className="text-sm text-text-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={isPending}>
            Yes, delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
