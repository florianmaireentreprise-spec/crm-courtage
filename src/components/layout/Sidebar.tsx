"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getPendingActionCount } from "@/app/(app)/emails/actions";
import {
  BarChart3,
  Users,
  FileText,
  Target,
  Coins,
  Clock,
  Building2,
  Settings,
  TrendingUp,
  Mail,
  UserCheck,
  Handshake,
  Network,
  Zap,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Pipeline", href: "/pipeline", icon: Target },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Dirigeants", href: "/dirigeants", icon: UserCheck },
  { name: "Prescripteurs", href: "/prescripteurs", icon: Handshake },
  { name: "Reseau", href: "/reseau", icon: Network },
  { name: "Contrats", href: "/contrats", icon: FileText },
  { name: "Commissions", href: "/commissions", icon: Coins },
  { name: "Relances", href: "/relances", icon: Clock },
  { name: "Objectifs", href: "/objectifs", icon: TrendingUp },
  { name: "Emails", href: "/emails", icon: Mail },
  { name: "Sequences", href: "/sequences", icon: Zap },
  { name: "Compagnies", href: "/compagnies", icon: Building2 },
  { name: "Parametres", href: "/parametres", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  const fetchCount = useCallback(() => {
    getPendingActionCount().then(setPendingCount).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    const timer = setInterval(fetchCount, 60_000);
    return () => clearInterval(timer);
  }, [fetchCount]);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary flex-shrink-0">
            <BarChart3 className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight">GargarineV1</span>
            <span className="text-[10px] text-sidebar-foreground/60 leading-tight">Protection sociale & patrimoine</span>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              {item.name === "Emails" && pendingCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
