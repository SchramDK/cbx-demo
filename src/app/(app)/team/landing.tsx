import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * First-start landing / empty state for Team.
 * Render this when the user has no team members yet.
 */
export default function TeamLanding() {
  return <TeamEmptyState />;
}

export function TeamEmptyState() {
  return (
    <main className="mx-auto w-full max-w-6xl bg-background px-4 pb-10 pt-[calc(var(--cbx-topbar,64px)+40px)] text-foreground sm:pt-[calc(var(--cbx-topbar-sm,56px)+40px)]">
      <div className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-b from-primary/10 via-transparent to-transparent p-6 sm:p-10">
        {/* subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          {/* Left hero */}
          <header>
            <p className="text-xs font-medium text-muted-foreground">Team</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              Align your team and manage access
            </h1>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              Invite colleagues to collaborate on files, rights and purchases. Keep ownership, roles and access in one place.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button asChild>
                <Link href="/team?demo=1">Invite your first team member</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/drive">Go to Files</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">✅ Roles & access</span>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">🔒 Rights stay attached</span>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">⚡ Invite in seconds</span>
            </div>

            <div className="mt-7 rounded-2xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-semibold text-foreground">First start</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You don’t have any team members yet. Invite one person now — you can change roles or remove access anytime.
              </p>
            </div>
          </header>

          {/* Right feature cards */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <FeatureCard
              title="Teams overview"
              description="A simple hub that shows members, roles and activity — without hunting across tools."
            />
            <FeatureCard
              title="Member management"
              description="Invite, remove, or update roles. Keep access under control as your organisation grows."
            />
            <FeatureCard
              title="Rights & governance"
              description="Keep context attached to files so usage stays clear across files and purchases."
            />
          </section>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <div className="text-sm text-muted-foreground">
          Tip: Invite just one colleague to get started — you can add more members later.
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 overflow-hidden rounded-xl border border-border bg-muted/30">
        <div className="h-28 w-full bg-gradient-to-b from-primary/10 to-transparent" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}