

import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-4 flex items-center gap-2">
        <Bell className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Notifications</h1>
      </header>

      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">
          Recent
        </div>

        <ul className="divide-y">
          <li className="px-4 py-4">
            <div className="text-sm font-medium">New demo assets added</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              We updated the stock demo set (s-014 → s-018).
            </div>
          </li>
          <li className="px-4 py-4">
            <div className="text-sm font-medium">Search improvements</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Sticky menu is smoother and respects the left nav.
            </div>
          </li>
          <li className="px-4 py-4">
            <div className="text-sm font-medium">Welcome back</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Your personal dashboard is ready.
            </div>
          </li>
        </ul>
      </div>
    </main>
  );
}