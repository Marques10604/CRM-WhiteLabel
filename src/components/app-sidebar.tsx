"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Follow-ups" },
  { href: "/leads", label: "Leads" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/templates", label: "Templates" },
  { href: "/subnichos", label: "Sub-nichos" },
  { href: "/lixeira", label: "Lixeira" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full w-[240px] shrink-0 flex-col gap-1 bg-[#F4F4F5] px-4 py-8"
      aria-label="Navegação principal"
    >
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-[#0D9488]"
                  : "text-zinc-700 hover:text-[#0D9488]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
