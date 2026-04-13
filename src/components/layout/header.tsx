"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Camera, LayoutDashboard, Settings, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan Card", icon: Camera },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
  }

  return (
    <>
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-bg-elevated/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/svg.svg"
              alt="BridgeLeads"
              width={160}
              height={52}
              className="h-10 sm:h-11 w-auto"
              unoptimized
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-brand-soft text-brand"
                    : "text-text-muted hover:text-text hover:bg-panel-2"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-panel-2 transition-colors ml-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-panel-2 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute top-14 left-0 right-0 bg-bg-elevated border-b border-border p-4 space-y-1 animate-fade-in">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-brand-soft text-brand"
                    : "text-text-muted hover:text-text hover:bg-panel-2"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => {
                setMobileOpen(false);
                handleSignOut();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-panel-2 transition-colors w-full cursor-pointer"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
