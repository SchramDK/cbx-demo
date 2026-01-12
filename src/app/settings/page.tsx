"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const LS = {
    reduceMotion: "CBX_SETTINGS_REDUCE_MOTION_V1",
    denseMode: "CBX_SETTINGS_DENSE_MODE_V1",
  } as const;

  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [denseMode, setDenseMode] = React.useState(false);

  React.useEffect(() => {
    try {
      const rm = window.localStorage.getItem(LS.reduceMotion);
      const dm = window.localStorage.getItem(LS.denseMode);
      setReduceMotion(rm === "1");
      setDenseMode(dm === "1");
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(LS.reduceMotion, reduceMotion ? "1" : "0");
    } catch {
      // ignore
    }
  }, [reduceMotion]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(LS.denseMode, denseMode ? "1" : "0");
    } catch {
      // ignore
    }
  }, [denseMode]);

  const clearLocalPreferences = () => {
    try {
      // Keep only demo essentials if needed; here we clear common UI prefs
      window.localStorage.removeItem("CBX_ASSET_FAVORITES_V1");
      window.localStorage.removeItem("CBX_META_V1");
      window.localStorage.removeItem(LS.reduceMotion);
      window.localStorage.removeItem(LS.denseMode);
      window.localStorage.removeItem("CBX_SMART_FOLDERS_V1");
      window.location.reload();
    } catch {
      // ignore
    }
  };

  const resetDemoData = () => {
    const ok = window.confirm("Reset demo data? This will clear local demo storage.");
    if (!ok) return;
    try {
      window.localStorage.clear();
      window.location.reload();
    } catch {
      // ignore
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-8">
        <div className="mb-6 flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={() => router.back()}
            className="mt-0.5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage preferences for this demo workspace.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="theme">Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose how the interface looks.
                  </p>
                </div>

                <Select value={theme ?? "system"} onValueChange={setTheme}>
                  <SelectTrigger id="theme" className="w-[180px]">
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="reduce-motion">Reduce motion</Label>
                  <p className="text-sm text-muted-foreground">
                    Prefer fewer animations (useful for demos).
                  </p>
                </div>
                <Switch
                  id="reduce-motion"
                  checked={reduceMotion}
                  onCheckedChange={setReduceMotion}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="dense-mode">Dense mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Show more items per screen.
                  </p>
                </div>
                <Switch
                  id="dense-mode"
                  checked={denseMode}
                  onCheckedChange={setDenseMode}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Demo-only actions.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={clearLocalPreferences}
                >
                  Clear local preferences
                </Button>
                <Button
                  variant="destructive"
                  type="button"
                  onClick={resetDemoData}
                >
                  Reset demo data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}