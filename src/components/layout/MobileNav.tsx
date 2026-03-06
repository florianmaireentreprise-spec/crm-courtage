"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
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
  { name: "Compagnies", href: "/compagnies", icon: Building2 },
  { name: "Parametres", href: "/parametres", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
          <div className="flex h-16 items-center px-4 border-b border-sidebar-border">
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Cabinet JDHM</span>
              <span className="text-[10px] text-sidebar-foreground/60">Protection sociale & patrimoine</span>
            </div>
          </div>
          <nav className="px-3 py-4 space-y-0.5 overflow-y-auto max-h-[calc(100vh-4rem)]">
            {navigation.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
