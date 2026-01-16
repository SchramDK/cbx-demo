'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  Info,
  MailPlus,
  MoreHorizontal,
  Plus,
  Shield,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { TeamEmptyState } from './landing';

type Member = {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Member' | 'Viewer';
  status: 'Active' | 'Invited';
};

type Group = {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
};

const EMPTY_MEMBERS: Member[] = [
  { id: 'you', name: 'You', email: 'owner@company.com', role: 'Owner', status: 'Active' },
];

const DEMO_MEMBERS: Member[] = [
  { id: 'you', name: 'You', email: 'owner@company.com', role: 'Owner', status: 'Active' },
  { id: '1', name: 'Emma Larsen', email: 'emma@company.com', role: 'Admin', status: 'Active' },
  { id: '2', name: 'Jonas Mikkelsen', email: 'jonas@company.com', role: 'Member', status: 'Invited' },
];

const DEFAULT_GROUPS: Group[] = [
  {
    id: 'g1',
    name: 'Marketing',
    description: 'Campaign planning and content production',
    memberIds: ['you'],
  },
  {
    id: 'g2',
    name: 'Legal & Compliance',
    description: 'Rights, consent and governance',
    memberIds: ['you'],
  },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function StatusPill({ status }: { status: Member['status'] }) {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" /> Invited
    </span>
  );
}

function RolePill({ role }: { role: Member['role'] }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-xs">
      <Shield className="h-3 w-3" /> {role}
    </span>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-5 ring-1 ring-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const router = useRouter();

  const [demoFilled, setDemoFilled] = useState(false);
  const [showInviteSent, setShowInviteSent] = useState(false);

  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const demo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
    setDemoMode(demo);

    try {
      const filledKey = 'cbx_team_demo_filled_v1';
      const inviteKey = 'cbx_team_invite_sent_v1';

      const alreadyFilled = sessionStorage.getItem(filledKey) === '1';

      if (demo) {
        sessionStorage.setItem(filledKey, '1');
        sessionStorage.setItem(inviteKey, '1');
        setDemoFilled(true);
        setShowInviteSent(true);
        router.replace('/team');
        return;
      }

      if (alreadyFilled) {
        setDemoFilled(true);
        return;
      }

      setDemoFilled(false);
    } catch {
      // If sessionStorage is unavailable, fall back to empty state.
      setDemoFilled(false);
    }
  }, [router]);

  useEffect(() => {
    if (!demoFilled) return;
    try {
      const inviteKey = 'cbx_team_invite_sent_v1';
      const shouldShow = sessionStorage.getItem(inviteKey) === '1';
      if (!shouldShow) return;
      // show once, then clear
      setShowInviteSent(true);
      sessionStorage.removeItem(inviteKey);
    } catch {
      // ignore
    }
  }, [demoFilled]);

  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const isFilled = demoMode || demoFilled;
  const members = useMemo(() => (isFilled ? DEMO_MEMBERS : EMPTY_MEMBERS), [isFilled]);

  const hasOtherMembers = useMemo(
    () => members.some((m) => m.id !== 'you'),
    [members]
  );

  const memberById = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const createGroup = () => {
    const name = groupName.trim();
    if (!name) return;
    const desc = groupDescription.trim();

    setGroups((prev) => [
      {
        id: `g-${Date.now()}`,
        name,
        description: desc,
        memberIds: ['you'],
      },
      ...prev,
    ]);

    setGroupName('');
    setGroupDescription('');
    setCreateGroupOpen(false);
  };

  const addMemberToGroup = (groupId: string, memberId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              memberIds: g.memberIds.includes(memberId) ? g.memberIds : [...g.memberIds, memberId],
            }
      )
    );
  };

  const removeMemberFromGroup = (groupId: string, memberId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              memberIds: g.memberIds.filter((id) => id !== memberId),
            }
      )
    );
  };

  if (!hasOtherMembers && !isFilled) {
    return <TeamEmptyState />;
  }

  return (
    <main className="mx-4 sm:mx-6 lg:mx-10">
      {showInviteSent ? (
        <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Invite sent</p>
              <p className="mt-1 text-sm text-foreground">
                Invitation sent. In this demo, a couple of members were added so you can explore the Team page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInviteSent(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Team</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Invite members and manage access to your workspace</p>
        </div>

        <button
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90"
        >
          <MailPlus className="h-4 w-4" />
          Invite member
        </button>
      </header>

      {/* Layout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        {/* Left: Members */}
        <section className="rounded-2xl bg-background/95 ring-1 ring-border">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Members</span>
            </div>
            <div className="text-xs text-muted-foreground">{members.length} total</div>
          </div>

          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted/10">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {initials(m.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{m.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusPill status={m.status} />
                  <RolePill role={m.role} />
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
                    aria-label="Member actions"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Right: Groups + Workspace */}
        <div className="space-y-4">
          {/* Groups */}
          <section className="rounded-2xl bg-background/95 ring-1 ring-border">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-semibold">Groups</div>
                  <div className="text-xs text-muted-foreground">Organize members for access and permissions</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateGroupOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-background/60 px-3 py-2 text-xs font-medium ring-1 ring-border/40 transition hover:bg-background/80"
              >
                <Plus className="h-4 w-4" />
                Create
              </button>
            </div>

            <div className="p-4 space-y-3">
              {groups.map((g) => {
                const groupMembers = g.memberIds
                  .map((id) => memberById.get(id))
                  .filter(Boolean) as Member[];
                const available = members.filter((m) => !g.memberIds.includes(m.id));

                return (
                  <div key={g.id} className="rounded-2xl bg-muted/10 p-4 ring-1 ring-border/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{g.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{g.description}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{g.memberIds.length}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {groupMembers.length ? (
                        groupMembers.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-2 rounded-full bg-background/70 px-2 py-1 text-xs ring-1 ring-border/40"
                          >
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                              {initials(m.name)}
                            </span>
                            <span className="max-w-[140px] truncate">{m.name}</span>
                            <button
                              type="button"
                              onClick={() => removeMemberFromGroup(g.id, m.id)}
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
                              aria-label="Remove member"
                              title="Remove from group"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground">No members yet — add someone below.</div>
                      )}
                    </div>

                    <div className="mt-3">
                      <label className="text-xs font-medium text-muted-foreground">Add member</label>
                      <div className="mt-1 flex items-center gap-2">
                        <select
                          className="h-10 w-full rounded-full bg-background px-4 text-sm ring-1 ring-border/60"
                          defaultValue=""
                          onChange={(e) => {
                            const id = e.target.value;
                            if (!id) return;
                            addMemberToGroup(g.id, id);
                            e.currentTarget.value = '';
                          }}
                        >
                          <option value="" disabled>
                            Select a member…
                          </option>
                          {available.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Workspace settings (demo) */}
          <aside className="rounded-2xl bg-muted/10 p-4 ring-1 ring-border/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Workspace</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Demo settings preview for seats, roles and access.</p>
              </div>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-background/70 p-3 ring-1 ring-border/40">
                <div className="text-xs font-semibold">Seats</div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span>{members.length} used</span>
                  <span className="text-muted-foreground">/ 10</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-foreground/30"
                    style={{ width: `${Math.min(100, (members.length / 10) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-background/70 p-3 ring-1 ring-border/40">
                <div className="text-xs font-semibold">Roles</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs">Owner</span>
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs">Admin</span>
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs">Member</span>
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs">Viewer</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Define who can invite, manage files, and access purchases.</p>
              </div>

              <div className="rounded-2xl bg-background/70 p-3 ring-1 ring-border/40">
                <div className="text-xs font-semibold">Access</div>
                <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Invite members</span>
                    <span className="font-medium text-foreground">Admins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Download purchases</span>
                    <span className="font-medium text-foreground">Members</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Manage billing</span>
                    <span className="font-medium text-foreground">Owner</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">This is a demo view. In a real workspace, roles and permissions are managed here.</p>
          </aside>
        </div>
      </div>

      {/* Create group modal */}
      {createGroupOpen && (
        <ModalShell
          title="Create group"
          description="Groups help you manage access and permissions for teams."
          onClose={() => setCreateGroupOpen(false)}
        >
          <div className="mt-4">
            <label className="text-xs font-medium">Group name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Marketing"
              className="mt-1 h-10 w-full rounded-full bg-background px-4 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          <div className="mt-3">
            <label className="text-xs font-medium">Description</label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What is this group for?"
              className="mt-1 min-h-[84px] w-full resize-none rounded-2xl bg-background p-3 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setCreateGroupOpen(false)} className="rounded-full px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              onClick={createGroup}
              disabled={!groupName.trim()}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </ModalShell>
      )}

      {/* Invite modal (demo placeholder) */}
      {inviteOpen && (
        <ModalShell
          title="Invite member"
          description="This is a demo. Invitations, roles and permissions would be handled here in a real workspace."
          onClose={() => setInviteOpen(false)}
        >
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
            <button onClick={() => setInviteOpen(false)} className="rounded-full px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              disabled
              className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background opacity-60"
            >
              Send invite
            </button>
          </div>
        </ModalShell>
      )}
    </main>
  );
}
