"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Clock,
  Users,
  Upload,
  Kanban,
  BarChart3,
  MessageSquare,
  Tag,
  ListX,
  Trash2,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Follow-ups", icon: Clock },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: MessageSquare },
  { href: "/nichos", label: "Nichos", icon: Tag },
  { href: "/motivos-perda", label: "Motivos de Perda", icon: ListX },
  { href: "/lixeira", label: "Lixeira", icon: Trash2 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col bg-sidebar">
      <div className="flex items-center gap-2.5 px-[18px] pt-5 pb-[22px]">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground"
          aria-hidden="true"
        >
          S
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          SOLO
        </span>
      </div>
      <p className="px-[14px] pt-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        Principal
      </p>
      <nav className="flex flex-col gap-[3px] px-[14px]" aria-label="Navegação principal">
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
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-[14px] pt-3 pb-5">
        <ThemeToggle />
      </div>
    </aside>
  );
}
