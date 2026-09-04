"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const BUTTON_CLASS = cn(
  "flex w-full items-center gap-3 rounded-lg px-[14px] py-2.5 text-sm font-medium transition-colors",
  "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
);

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Guard de hidratação documentado do next-themes: o servidor não conhece o
  // tema resolvido, então o botão só renderiza o estado real após montar no
  // cliente. Mesmo falso-positivo do React Compiler já aceito no projeto
  // (STATE.md decisão 07-02; lead-timeline-dialog.tsx, whatsapp-preview-dialog.tsx).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        className={BUTTON_CLASS}
        aria-hidden="true"
        disabled
      >
        <span className="h-[18px] w-[18px] shrink-0" />
        <span className="opacity-0">Tema claro</span>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Mudar para tema claro" : "Mudar para tema escuro";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={BUTTON_CLASS}
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Moon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      ) : (
        <Sun className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      )}
      {isDark ? "Tema escuro" : "Tema claro"}
    </button>
  );
}
