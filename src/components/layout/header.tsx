"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Camera, LayoutDashboard, Users, UserCircle, LogOut, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/providers/theme";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan Card", icon: Camera },
  { href: "/leads", label: "All Leads", icon: Users },
  { href: "/account", label: "Account", icon: UserCircle },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
  }

  const logoSrc = theme === "dark" ? "/svg.svg" : "/darksvg.png";

  return (
    <>
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-bg-elevated/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
          {/* Hamburger + Logo */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-text-muted hover:text-text hover:bg-panel-2 transition-colors cursor-pointer"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/dashboard" className="flex items-center">
              <Image
                src={logoSrc}
                alt="BRIDGE Vault"
                width={160}
                height={52}
                className="h-14 sm:h-16 w-auto"
                loading="eager"
                unoptimized
              />
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
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
        </div>
      </header>

      {/* Mobile slide-in sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <aside
            className="absolute top-14 left-0 bottom-0 w-[72%] max-w-[280px] bg-bg-elevated border-r border-border flex flex-col animate-slide-in-left"
          >
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                      ? "bg-brand-soft text-brand"
                      : "text-text-muted hover:text-text hover:bg-panel-2"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Sign out at bottom */}
            <div className="p-4 border-t border-border">
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  handleSignOut();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-panel-2 transition-colors w-full cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
