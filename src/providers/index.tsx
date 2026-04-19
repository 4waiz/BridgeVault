"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/providers/theme";
import { NotificationsProvider } from "@/providers/notifications";
import { ScanQueueProvider } from "@/providers/scan-queue";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NotificationsProvider>
          <ScanQueueProvider>{children}</ScanQueueProvider>
        </NotificationsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
