'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Folder, Image } from 'lucide-react';
import { useProtoAuth } from '@/lib/proto-auth';
import ImageNext from 'next/image';

export function LeftNavigation() {
  const { isLoggedIn, isReady } = useProtoAuth();
  const pathname = usePathname();

  // Avoid flicker before auth is ready
  if (!isReady || !isLoggedIn) return null;

  const productItems = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/stock', label: 'Stock', icon: Image },
    { href: '/drive', label: 'Share', icon: Folder },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-20 border-r bg-background md:block">
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
