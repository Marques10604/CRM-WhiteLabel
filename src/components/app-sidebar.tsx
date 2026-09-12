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
  Target,
  Map as MapIcon,
  BarChart3,
  MessageSquare,
  Tag,
  ListX,
  Trash2,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * `tourId` é opcional de propósito: só os 5 itens tourados (Fase 25,
 * TUTORIAL-01) ganham um valor real, resolvido pelo seletor
 * `[data-tour="nav-*"]` em `src/lib/tour-steps.ts`. Sem `as const` porque um
 * array com apenas alguns literais carregando o campo `tourId` quebra a
 * inferência de tupla do TypeScript ao mapear (`item.tourId` deixaria de
 * existir em parte da união de tipos) — tipagem explícita preserva o mesmo
 * comportamento em runtime sem esse erro de compilação.
 */
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tourId?: string;
};

/**
 * Um único rótulo de seção com os itens reais que caem sob ele — a sidebar
 * tem exatamente 4 grupos (Quick 260912-nmw), sem nenhuma tela nova: só os
 * 12 itens que já existiam, redistribuídos por intenção (usar o funil /
 * prospectar / operar / configurar).
 */
type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { href: "/", label: "Follow-ups", icon: Clock, tourId: "nav-dashboard" },
      { href: "/leads", label: "Leads", icon: Users, tourId: "nav-leads" },
      { href: "/pipeline", label: "Pipeline", icon: Kanban, tourId: "nav-pipeline" },
    ],
  },
  {
    label: "Prospecção",
    items: [
      { href: "/campanhas", label: "Campanhas", icon: Target, tourId: "nav-campanhas" },
      { href: "/mapa-de-nichos", label: "Mapa de Nichos", icon: MapIcon },
      { href: "/importar", label: "Importar", icon: Upload },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/relatorios", label: "Relatórios", icon: BarChart3, tourId: "nav-relatorios" },
      { href: "/templates", label: "Templates", icon: MessageSquare },
    ],
  },
  {
    label: "Configuração",
    items: [
      { href: "/nichos", label: "Nichos", icon: Tag },
      { href: "/motivos-perda", label: "Motivos de Perda", icon: ListX },
      { href: "/configuracoes", label: "Configurações", icon: Settings },
      { href: "/lixeira", label: "Lixeira", icon: Trash2 },
    ],
  },
];

// Deriva um id estável e legível a partir do rótulo do grupo (acentos
// removidos, minúsculo) — só usado para o par id/aria-labelledby do container
// de cada grupo, nunca exibido.
function slugifyGroupLabel(label: string) {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-[240px] shrink-0 flex-col overflow-y-auto bg-sidebar">
      <div className="flex items-center gap-3 px-4 pt-5 pb-6">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground"
          aria-hidden="true"
        >
          S
        </div>
        <span className="text-xl font-bold text-sidebar-foreground">SOLO</span>
      </div>
      <nav className="flex flex-col gap-[3px] px-[14px]" aria-label="Navegação principal">
        {NAV_GROUPS.map((group) => {
          const groupId = `nav-group-${slugifyGroupLabel(group.label)}`;

          return (
            <div key={group.label} aria-labelledby={groupId} className="flex flex-col gap-[3px]">
              <p
                id={groupId}
                className="pt-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
              >
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    data-tour={item.tourId}
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
            </div>
          );
        })}
      </nav>
      <div className="mt-auto px-[14px] pt-3 pb-5">
        <ThemeToggle />
      </div>
    </aside>
  );
}
