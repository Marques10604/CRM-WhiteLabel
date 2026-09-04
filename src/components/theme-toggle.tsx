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
