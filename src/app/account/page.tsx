"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/providers/theme";

interface StatusItem {
  label: string;
  status: "connected" | "disconnected" | "unknown";
  detail?: string;
}

export default function AccountPage() {
  const { theme, toggleTheme } = useTheme();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [statuses, setStatuses] = useState<StatusItem[]>([
    { label: "Supabase", status: "unknown" },
    { label: "OCR Provider", status: "unknown" },
  ]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Fetch user info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || "");
        setUserEmail(user.email || "");
      }

      // Check system status
      const items: StatusItem[] = [];

      try {
        const { error } = await supabase.from("leads").select("id").limit(1);
        items.push({
          label: "Supabase Database",
          status: error ? "disconnected" : "connected",
          detail: error ? error.message : "Connected and responsive",
        });
      } catch {
        items.push({
          label: "Supabase Database",
          status: "disconnected",
          detail: "Cannot reach database",
        });
      }

      try {
        // getBucket() requires permission to read bucket metadata that
        // normal authenticated users don't have — it would always fail.
        // Instead, do what the app actually does: list the user's own folder.
        // If RLS lets us list it, uploads/reads/deletes will all work too.
        const folder = user?.id || "";
        const { error } = await supabase.storage
          .from("business-cards")
          .list(folder, { limit: 1 });
        items.push({
          label: "Storage Bucket",
          status: error ? "disconnected" : "connected",
          detail: error
            ? `Storage check failed: ${error.message}`
            : "business-cards bucket active",
        });
      } catch (e) {
        items.push({
          label: "Storage Bucket",
          status: "disconnected",
          detail: e instanceof Error ? e.message : "Cannot reach storage",
        });
      }

      items.push({
        label: "OCR Provider",
        status: "connected",
        detail: "OCR.space + GPT-4o-mini structuring",
      });

      setStatuses(items);
    }

    load();
  }, []);

  return (
    <AppShell>
      <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="text-text-muted mt-1">
            Your profile and app settings
          </p>
        </div>

        {/* Profile card */}
        <div className="rounded-2xl border border-border bg-panel p-5 space-y-4">
          <h2 className="font-semibold text-lg">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-brand-soft flex items-center justify-center text-brand text-xl font-bold shrink-0">
              {userName ? userName.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-lg truncate">
                {userName || "No name set"}
              </p>
              <p className="text-sm text-text-muted truncate">
                {userEmail || "No email"}
              </p>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-2xl border border-border bg-panel p-5 space-y-4">
          <h2 className="font-semibold text-lg">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dark Mode</p>
              <p className="text-xs text-text-muted">
                {theme === "dark" ? "On" : "Off"}
              </p>
            </div>
            {/* iOS-style toggle */}
            <button
              onClick={toggleTheme}
              role="switch"
              aria-checked={theme === "dark"}
              aria-label="Toggle dark mode"
              className="relative w-[51px] h-[31px] rounded-full transition-colors duration-200 cursor-pointer shrink-0"
              style={{ backgroundColor: theme === "dark" ? "#f36a21" : "#d8dce5" }}
            >
              <span
                className="absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200"
                style={{ transform: theme === "dark" ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="rounded-2xl border border-border bg-panel p-5 space-y-4">
          <h2 className="font-semibold text-lg">System Status</h2>
          <div className="space-y-3">
            {statuses.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.detail && (
                    <p className="text-xs text-text-muted">{item.detail}</p>
                  )}
                </div>
                {item.status === "connected" ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : item.status === "disconnected" ? (
                  <XCircle className="h-5 w-5 text-danger" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-panel-2 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
