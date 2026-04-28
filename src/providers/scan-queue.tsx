"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { scanAndSaveLead, scanQRAndSaveLead } from "@/actions/ocr";
import { useNotifications } from "./notifications";

export type ScanMode = "card" | "qr";

interface ScanQueueContextValue {
  enqueueScan: (file: File, mode?: ScanMode) => void;
}

const ScanQueueContext = createContext<ScanQueueContextValue>({
  enqueueScan: () => {},
});

export function useScanQueue() {
  return useContext(ScanQueueContext);
}

export function ScanQueueProvider({ children }: { children: ReactNode }) {
  const { push } = useNotifications();

  const enqueueScan = useCallback<ScanQueueContextValue["enqueueScan"]>(
    (file, mode = "card") => {
      void (async () => {
        const formData = new FormData();
        formData.append("image", file);
        const result =
          mode === "qr"
            ? await scanQRAndSaveLead(formData)
            : await scanAndSaveLead(formData);
        if (result.error || !result.leadId) {
          push({
            variant: "error",
            title: mode === "qr" ? "QR scan failed" : "Scan failed",
            body: result.error ?? "Could not save lead",
          });
          return;
        }
        push({
          variant: "success",
          title: "Lead successfully saved to database",
          body: "Tap to review the scanned lead",
          leadId: result.leadId,
        });
      })();
    },
    [push]
  );

  return (
    <ScanQueueContext.Provider value={{ enqueueScan }}>
      {children}
    </ScanQueueContext.Provider>
  );
}
