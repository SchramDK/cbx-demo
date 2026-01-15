

import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Product updates, activity and helpful tips.
        </p>
      </header>

      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">
          Recent updates
        </div>

        <ul className="divide-y">
          {/* If there are no notifications, show a friendly empty state */}
          {/* <li className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</li> */}
          <li className="px-4 py-4 transition hover:bg-muted/30 focus-within:bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">New demo assets added</div>
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              We updated the stock demo set (s-014 → s-018).
            </div>
          </li>
          <li className="px-4 py-4 transition hover:bg-muted/30 focus-within:bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Search improvements</div>
              <span className="text-xs text-muted-foreground">Yesterday</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Sticky menu is smoother and respects the left nav.
            </div>
          </li>
          <li className="px-4 py-4 transition hover:bg-muted/30 focus-within:bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Welcome back</div>
              <span className="text-xs text-muted-foreground">Earlier</span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Your personal dashboard is ready.
            </div>
          </li>
        </ul>
      </div>
    </main>
  );
}