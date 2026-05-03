"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { createClient } from "@/lib/supabase/client";

export function AppShell({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (active) setIsAdmin(Boolean(data?.is_admin));
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-dvh flex flex-col">
      <Header isAdmin={isAdmin} />
      <div className="flex flex-1">
        <Sidebar isAdmin={isAdmin} />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
