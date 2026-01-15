'use client';

import { useState } from 'react';
import { Users, MailPlus, Shield, User } from 'lucide-react';

export default function TeamPage() {
  const [inviteOpen, setInviteOpen] = useState(false);

  const members = [
    {
      id: 'you',
      name: 'You',
      email: 'owner@company.com',
      role: 'Owner',
      status: 'Active',
    },
    {
      id: '1',
      name: 'Emma Larsen',
      email: 'emma@company.com',
      role: 'Admin',
      status: 'Active',
    },
    {
      id: '2',
      name: 'Jonas Mikkelsen',
      email: 'jonas@company.com',
      role: 'Member',
      status: 'Invited',
    },
  ];

  return (
    <main className="mx-4 sm:mx-6 lg:mx-10">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Team</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Invite members and manage access to your workspace
          </p>
        </div>

        <button
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90"
        >
          <MailPlus className="h-4 w-4" />
          Invite member
        </button>
      </header>

      {/* Members list */}
      <section className="rounded-2xl bg-background/95 ring-1 ring-border">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Members</span>
        </div>

        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {m.status === 'Invited' && (
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                    Invited
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-xs">
                  <Shield className="h-3 w-3" /> {m.role}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-3 text-xs text-muted-foreground">
        This is a demo view. In a real workspace, invitations, roles and permissions are managed here.
      </p>

      {/* Invite modal (simple placeholder) */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-background p-5 ring-1 ring-border">
            <h2 className="text-sm font-semibold">Invite member</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This is a demo. Invitations, roles and permissions would be handled here in a real workspace.
            </p>

            <div className="mt-4">
              <label className="text-xs font-medium">Email</label>
              <input
                type="email"
                placeholder="name@company.com"
                className="mt-1 h-10 w-full rounded-full bg-background px-4 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium">Role</label>
              <select
                disabled
                className="mt-1 h-10 w-full rounded-full bg-background px-4 text-sm ring-1 ring-border opacity-60"
              >
                <option>Member</option>
                <option>Admin</option>
              </select>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setInviteOpen(false)}
                className="rounded-full px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                disabled
                className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background opacity-60"
              >
                Send invite
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
