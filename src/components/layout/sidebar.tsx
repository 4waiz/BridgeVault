"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Camera,
  Users,
  UserCircle,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const baseItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan Card", icon: Camera },
  { href: "/leads", label: "All Leads", icon: Users },
  { href: "/account", label: "Account", icon: UserCircle },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const sidebarItems = isAdmin
    ? [...baseItems, { href: "/admin", label: "Admin", icon: Shield }]
    : baseItems;

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-bg-elevated shrink-0">
      <nav className="flex-1 p-3 space-y-1">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                ? "bg-brand-soft text-brand"
                : "text-text-muted hover:text-text hover:bg-panel-2"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
