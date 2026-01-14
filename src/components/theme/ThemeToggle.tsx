"use client";

import * as React from "react";
import { Laptop2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "cbx_theme";

function getSystemPrefersDark() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function applyTheme(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;

  const dark = mode === "dark" || (mode === "system" && getSystemPrefersDark());
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export default function ThemeToggle() {
  const [mode, setMode] = React.useState<ThemeMode>("system");

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === "light" || saved === "dark" || saved === "system") {
        setMode(saved);
        applyTheme(saved);
      } else {
        setMode("system");
        applyTheme("system");
      }
    } catch {
      setMode("system");
      applyTheme("system");
    }

    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;

    const onChange = () => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
        const current =
          saved === "light" || saved === "dark" || saved === "system"
            ? saved
            : "system";
        if (current === "system") applyTheme("system");
      } catch {
        applyTheme("system");
      }
    };

    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const Icon = mode === "dark" ? Moon : mode === "light" ? Sun : Laptop2;

  const setAndPersist = (next: ThemeMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    applyTheme(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0"
          aria-label="Theme"
        >
          <Icon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setAndPersist("system");
          }}
        >
          <Laptop2 className="mr-2 h-4 w-4" /> System
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setAndPersist("light");
          }}
        >
          <Sun className="mr-2 h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setAndPersist("dark");
          }}
        >
          <Moon className="mr-2 h-4 w-4" /> Dark
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}