"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Clock,
  Users,
  Upload,
  Kanban,
  MessageSquare,
  Tag,
  Trash2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Follow-ups", icon: Clock },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/templates", label: "Templates", icon: MessageSquare },
  { href: "/subnichos", label: "Sub-nichos", icon: Tag },
  { href: "/lixeira", label: "Lixeira", icon: Trash2 },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full w-[240px] shrink-0 flex-col gap-1 bg-[#F4F4F5] px-4 py-8"
      aria-label="Navegação principal"
    >
      <nav className="flex flex-col gap-[3px] px-[14px]">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-[14px] py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#0D9488]/10 font-semibold text-[#0D9488]"
                  : "text-zinc-700 hover:bg-zinc-200/60 hover:text-[#0D9488]"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
