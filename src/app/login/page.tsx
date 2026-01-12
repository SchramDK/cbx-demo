"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProtoAuth } from "@/lib/proto-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M21.35 11.1H12v2.9h5.35c-.23 1.3-1.4 3.8-5.35 3.8-3.22 0-5.85-2.66-5.85-5.94S8.78 5.92 12 5.92c1.84 0 3.07.78 3.77 1.46l2.57-2.48C16.98 3.56 14.78 2.5 12 2.5 6.98 2.5 2.9 6.58 2.9 11.86S6.98 21.22 12 21.22c5.52 0 9.17-3.87 9.17-9.32 0-.63-.07-1.11-.17-1.8Z"
        fill="currentColor"
        opacity=".25"
      />
      <path
        d="M12 21.22c3.36 0 6.18-1.11 8.24-3.02l-2.96-2.29c-.79.53-1.96 1.15-4.28 1.15-2.93 0-5.41-1.98-6.29-4.7l-3.1 2.41C5.3 18.6 8.37 21.22 12 21.22Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M16.69 13.02c.03 3.08 2.7 4.1 2.73 4.11-.02.07-.43 1.47-1.43 2.92-.86 1.26-1.76 2.52-3.17 2.55-1.38.03-1.82-.82-3.4-.82-1.58 0-2.08.79-3.38.85-1.36.05-2.4-1.36-3.27-2.6-1.78-2.59-3.14-7.31-1.31-10.51.91-1.59 2.53-2.6 4.3-2.63 1.34-.03 2.6.9 3.4.9.79 0 2.3-1.11 3.87-.95.66.03 2.52.27 3.72 2.03-.1.06-2.22 1.3-2.2 3.85ZM14.14 4.57c.72-.87 1.2-2.08 1.06-3.29-1.03.04-2.27.69-3 1.56-.66.76-1.25 1.99-1.09 3.17 1.15.09 2.31-.58 3.03-1.44Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useProtoAuth();

  const rawReturnTo = searchParams.get("returnTo") || "/home";
  const returnTo = rawReturnTo.startsWith("/") ? rawReturnTo : "/home";

  const images = useMemo(
    () => [
      "https://images.unsplash.com/photo-1706702511694-35246e0e47d0?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1765716789917-18236e0e86a2?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1720065609422-f069dd4664c6?q=80&w=1625&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
    []
  );

  const [activeImage, setActiveImage] = useState(0);
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    const clear = () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const next = (activeRef.current + 1) % images.length;
      activeRef.current = next;
      setActiveImage(next);

      // Preload the next image to keep the crossfade smooth
      const preloadIdx = (next + 1) % images.length;
      const img = new window.Image();
      img.src = images[preloadIdx];
    };

    // Keep ref in sync
    activeRef.current = 0;

    // Initial preload for the second image
    if (images.length > 1) {
      const img = new window.Image();
      img.src = images[1];
    }

    clear();
    timerRef.current = window.setInterval(tick, 5000);

    const onVis = () => {
      // When coming back to the tab, ensure we don't immediately jump twice
      if (document.visibilityState === "visible") {
        clear();
        timerRef.current = window.setInterval(tick, 5000);
      }
    };

    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clear();
    };
  }, [images]);

  useEffect(() => {
    activeRef.current = activeImage;
  }, [activeImage]);


  const handleLogin = () => {
    login({ name: "Nicki Larsen", email: "nicki@colourbox.com" });

    // Demo auth flag used by gated pages (e.g. /drive)
    try {
      window.localStorage.setItem("CBX_AUTH_V1", "1");
      window.sessionStorage.setItem("CBX_AUTH_V1", "1");
    } catch {
      // ignore
    }

    router.replace(returnTo);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-2">
        {/* Left: form */}
        <div className="flex items-center justify-center px-6 py-10">
          <div className="flex w-full max-w-md flex-col items-center gap-8">
            <div className="flex w-full items-center justify-between">
              <Link href="/stock" aria-label="Go to Stock" className="inline-flex items-center">
                {/* Light theme */}
                <img
                  src="/logo_dark.svg"
                  alt="Colourbox"
                  className="h-10 dark:hidden"
                />
                {/* Dark theme */}
                <img
                  src="/logo.svg"
                  alt="Colourbox"
                  className="h-10 hidden dark:block"
                />
              </Link>
              <Link
                href={returnTo}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Back
              </Link>
            </div>

            <Card className="w-full border-border/60 shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-8 space-y-2 text-left">
                  <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
                  <p className="text-sm text-muted-foreground">
                    Use your workspace credentials to continue.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-center gap-2"
                    onClick={handleLogin}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </Button>

                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-center gap-2"
                    onClick={handleLogin}
                  >
                    <AppleIcon />
                    Continue with Apple
                  </Button>
                </div>

                <div className="my-6 flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin();
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="#"
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Use at least 6 characters"
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <Button type="submit" className="w-full">
                      Continue with email
                    </Button>

                    <Button
                      variant="secondary"
                      type="button"
                      className="w-full"
                      onClick={handleLogin}
                    >
                      Continue as guest
                    </Button>
                  </div>

                  <div className="pt-1 text-center text-xs text-muted-foreground">
                    No account?{" "}
                    <Link
                      href="#"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Create one now.
                    </Link>
                  </div>

                  <div className="text-center text-xs text-muted-foreground">
                    By continuing you agree to our{" "}
                    <Link
                      href="#"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Privacy Policy
                    </Link>
                    {" "}and{" "}
                    <Link
                      href="#"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Terms of Service
                    </Link>
                    .
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: image */}
        <div className="relative hidden h-full w-full p-5 md:block">
          <div className="relative h-full w-full overflow-hidden rounded-2xl">
            {images.map((src, index) => (
              <img
                key={src}
                src={src}
                alt="Login visual"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                  index === activeImage ? "opacity-100" : "opacity-0"
                }`}
                loading={index === activeImage ? "eager" : "lazy"}
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginInner />
    </Suspense>
  );
}