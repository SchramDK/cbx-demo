"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "../components/SearchBar";
import { ImageGrid } from "../components/image-grid";

export default function Page() {
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { theme, resolvedTheme, setTheme } = useTheme();
  const currentTheme = mounted ? (resolvedTheme ?? theme) : undefined;

  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Viewer</h1>
          <p className="text-muted-foreground">Image grid demo – klar til DAM / Stock / Consent</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
        >
          {mounted ? (
            currentTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4" />
          )}
        </Button>
      </header>

      <SearchBar value={query} onChange={setQuery} />

      <ImageGrid query={query} />
    </main>
  );
}