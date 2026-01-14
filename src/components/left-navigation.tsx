'use client';

import * as React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Folder, Image } from 'lucide-react';
import ImageNext from 'next/image';

export function LeftNavigation() {
  const pathname = usePathname();

  const [meLoaded, setMeLoaded] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/demo-auth/me', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        setIsLoggedIn(Boolean(json?.user));
      } catch {
        if (!cancelled) setIsLoggedIn(false);
      } finally {
        if (!cancelled) setMeLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Avoid flicker before auth is ready
  if (!meLoaded || !isLoggedIn) return null;

  const productItems = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/stock', label: 'Stock', icon: Image },
    { href: '/drive', label: 'Share', icon: Folder },
  ];

  return (
    <aside className="relative hidden h-full w-full border-r bg-background md:block">
      <nav className="flex h-full flex-col items-center gap-4 px-2 pt-6 pb-4 overflow-hidden">
        {/* Box logo */}
        <Link href="/home" className="mb-2 flex items-center justify-center rounded-md hover:bg-muted/60">
          {/* Light theme */}
          <ImageNext
            src="/logo_box_dark.svg"
            alt="Colourbox"
            width={28}
            height={28}
            className="dark:hidden"
            priority
          />

          {/* Dark theme */}
          <ImageNext
            src="/logo_box.svg"
            alt="Colourbox"
            width={28}
            height={28}
            className="hidden dark:block"
            priority
          />
        </Link>
        {/* Product switch */}
        <div className="mt-1 space-y-1">
          {productItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={
                  'flex w-full flex-col items-center gap-1 rounded-lg px-2 py-3 text-[11px] transition-colors ' +
                  (active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')
                }
              >
                <Icon className="h-5 w-5" />
                <span className="leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
