import * as React from "react";
import { Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type CommentReply = { id: string; text: string; createdAt: string };
export type CommentItem = { id: string; text: string; createdAt: string; replies?: CommentReply[] };

export type AssetMeta = {
  tags: string[];
  comments: CommentItem[];
  updatedAt: string;
  fields?: {
    addedBy?: string;
    filename?: string;
    size?: string;
    dimensions?: string;
    camera?: string;
    exposure?: string;
    captured?: string;
  };
};

export type ViewerSidebarProps = {
  meta: AssetMeta;
  setMeta: React.Dispatch<React.SetStateAction<AssetMeta>>;

  // File info
  assetTitle: string;
  assetId: string;

  // Tabs
  viewerTab: string;
  setViewerTab: (v: string) => void;

  // Tags
  tagInput: string;
  setTagInput: (v: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;

  // Comments
  commentInput: string;
  setCommentInput: (v: string) => void;
  postComment: () => void;
  deleteComment: (id: string) => void;

  // Edit comment
  editingCommentId: string | null;
  editingCommentText: string;
  setEditingCommentId: (v: string | null) => void;
  setEditingCommentText: (v: string) => void;
  saveEditComment: () => void;
  cancelEditComment: () => void;

  // Replies
  replyToId: string | null;
  replyText: string;
  setReplyText: (v: string) => void;
  startReply: (id: string) => void;
  postReply: () => void;
  cancelReply: () => void;
};


export function ViewerSidebar(props: ViewerSidebarProps) {
  const {
    meta,
    assetTitle,
    assetId,
    viewerTab,
    setViewerTab,

    tagInput,
    setTagInput,
    addTag,
    removeTag,

    commentInput,
    setCommentInput,
    postComment,
    deleteComment,

    editingCommentId,
    editingCommentText,
    setEditingCommentId,
    setEditingCommentText,
    saveEditComment,
    cancelEditComment,

    replyToId,
    replyText,
    setReplyText,
    startReply,
    postReply,
    cancelReply,
  } = props;

  const fields = meta.fields ?? {};

  const setField = (key: keyof NonNullable<AssetMeta["fields"]>, value: string) => {
    props.setMeta((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      fields: {
        ...(prev.fields ?? {}),
        [key]: value,
      },
    }));
  };

  const addedBy = fields.addedBy ?? "Nicki Larsen";

  const initialsFromName = (name: string) => {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0]?.[0] ?? "";
    const last = (parts.length > 1 ? parts[parts.length - 1] : parts[0])?.[0] ?? "";
    const out = (first + last).toUpperCase();
    return out || "?";
  };

  const commentAuthorName = addedBy;
  const commentAuthorInitials = initialsFromName(addedBy);

  const filename = fields.filename ?? assetTitle;
  const size = fields.size ?? "17.98 MB";
  const dimensions = fields.dimensions ?? "5110 × 3518";
  const camera = fields.camera ?? "NIKON D5";
  const exposure = fields.exposure ?? "ƒ/1.8 • 1/250 • ISO 1000 • 50mm";
  const captured = fields.captured ?? "Apr 28, 2018";

  type FieldKey = keyof NonNullable<AssetMeta["fields"]>;

  function EditableRow({
    label,
    fieldKey,
    value,
    placeholder,
    multiline,
  }: {
    label: string;
    fieldKey: FieldKey;
    value: string;
    placeholder?: string;
    multiline?: boolean;
  }) {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(value);
    const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

    React.useEffect(() => {
      if (!editing) setDraft(value);
    }, [value, editing]);

    React.useEffect(() => {
      if (!editing) return;
      // focus next tick
      const t = window.setTimeout(() => {
        inputRef.current?.focus();
        // move caret to end
        const el = inputRef.current as any;
        if (el && typeof el.setSelectionRange === "function") {
          const len = (el.value ?? "").length;
          el.setSelectionRange(len, len);
        }
      }, 0);
      return () => window.clearTimeout(t);
    }, [editing]);

    const commit = () => {
      setField(fieldKey, draft);
      setEditing(false);
    };

    const cancel = () => {
      setDraft(value);
      setEditing(false);
    };

    return (
      <div className="group">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          {!editing && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => setEditing(true)}
              aria-label={`Edit ${label}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {editing ? (
          multiline ? (
            <Textarea
              ref={inputRef as any}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              rows={3}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commit();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
              onBlur={() => commit()}
            />
          ) : (
            <Input
              ref={inputRef as any}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
              onBlur={() => commit()}
            />
          )
        ) : (
          <div
            className="min-h-[40px] cursor-text rounded-md border border-transparent bg-muted/0 px-3 py-2 text-sm text-foreground transition-colors group-hover:border-border group-hover:bg-muted/20"
            onClick={() => setEditing(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEditing(true);
              }
            }}
          >
            {value?.trim() ? value : <span className="text-muted-foreground">{placeholder ?? "—"}</span>}
          </div>
        )}

        {editing && (
          <div className="mt-1 text-xs text-muted-foreground">
            Enter saves • Esc cancels
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <Tabs value={viewerTab} onValueChange={setViewerTab} className="flex h-full flex-col">
        <div className="border-b border-border px-3 py-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
        </div>

        {/* INFO */}
        <TabsContent value="info" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="space-y-6 p-3">
              {/* Header */}
              <div>
                <div className="text-base font-semibold">{assetTitle}</div>
                <div className="mt-1 text-xs text-muted-foreground">ID {assetId} • Demo asset</div>
              </div>

              <Separator />

              {/* Keywords */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Keywords</div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {meta.tags.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No keywords yet</div>
                  ) : (
                    meta.tags.map((t) => (
                      <Badge key={t} variant="outline" className="gap-1 rounded-full px-3 py-1 text-xs">
                        {t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${t}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add keyword"
                    className="bg-background/80 border border-input shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                  <Button onClick={addTag} variant="secondary">
                    Add
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">Saved automatically (local demo)</div>
              </div>

              <Separator />

              {/* General */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground">General</div>

                <div className="grid gap-3">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Added by</div>
                    <div className="min-h-[40px] rounded-md border border-transparent bg-muted/0 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] font-medium">
                            {commentAuthorInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm text-foreground">{addedBy}</div>
                      </div>
                    </div>
                  </div>
                  <EditableRow label="Filename" fieldKey="filename" value={filename} placeholder="Filename" />

                  <div className="grid grid-cols-2 gap-3">
                    <EditableRow label="Size" fieldKey="size" value={size} placeholder="e.g. 12.4 MB" />
                    <EditableRow label="Dimensions" fieldKey="dimensions" value={dimensions} placeholder="e.g. 4000 × 3000" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Metadata */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-muted-foreground">Metadata</div>

                <div className="grid gap-3">
                  <EditableRow label="Camera" fieldKey="camera" value={camera} placeholder="Camera" />
                  <EditableRow label="Exposure" fieldKey="exposure" value={exposure} placeholder="Exposure" />
                  <EditableRow label="Captured" fieldKey="captured" value={captured} placeholder="Date" />
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* STATS */}
        <TabsContent value="stats" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="space-y-6 p-3">
              {/* Header */}
              <div>
                <div className="text-base font-semibold">Statistics</div>
                <div className="mt-1 text-xs text-muted-foreground">Per asset • Demo data</div>
              </div>

              <Separator />

              {/* Quick metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs text-muted-foreground">Views (30d)</div>
                  <div className="mt-1 text-2xl font-semibold">128</div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs text-muted-foreground">Downloads (30d)</div>
                  <div className="mt-1 text-2xl font-semibold">14</div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs text-muted-foreground">Shares (30d)</div>
                  <div className="mt-1 text-2xl font-semibold">6</div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs text-muted-foreground">Used in</div>
                  <div className="mt-1 text-2xl font-semibold">3</div>
                </div>
              </div>

              <Separator />

              {/* Activity */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Activity</div>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-muted-foreground">Last viewed</div>
                    <div className="text-foreground">Today, 14:22</div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-muted-foreground">Last downloaded</div>
                    <div className="text-foreground">Dec 12</div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-muted-foreground">Last shared</div>
                    <div className="text-foreground">Dec 09</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Top referrers (demo) */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground">Top referrers</div>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-muted-foreground">Brand portal</div>
                    <div className="text-foreground">62</div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-muted-foreground">Shared link</div>
                    <div className="text-foreground">41</div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-muted-foreground">Search</div>
                    <div className="text-foreground">25</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="text-sm font-medium">Next step</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  This is demo data. Later we can back this with real events (views, downloads, shares) and show trends over time.
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* COMMENTS */}
        <TabsContent value="comments" className="flex-1 p-0">
          <div className="flex h-full flex-col">
            {/* Comment list */}
            <ScrollArea className="flex-1">
              <div className="space-y-3 p-3">
                {meta.comments.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
                    <div className="text-sm font-medium">No comments yet</div>
                    <div className="max-w-xs text-xs text-muted-foreground">
                      Be the first to add a comment. Your feedback will appear here.
                    </div>
                  </div>
                )}

                {meta.comments.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] font-medium">
                            {commentAuthorInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="leading-tight">
                          <div className="text-xs font-medium">{commentAuthorName}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">⋯</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingCommentId(c.id);
                              setEditingCommentText(c.text);
                            }}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteComment(c.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {editingCommentId === c.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button onClick={saveEditComment}>Save</Button>
                          <Button variant="outline" onClick={cancelEditComment}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="whitespace-pre-wrap">{c.text}</div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startReply(c.id)}
                        >
                          Reply
                        </Button>

                        {Array.isArray(c.replies) && c.replies.length > 0 && (
                          <div className="space-y-2 pl-6">
                            {c.replies.map((r) => (
                              <div key={r.id} className="rounded-lg border border-border p-2">
                                <div className="text-xs text-muted-foreground">
                                  {new Date(r.createdAt).toLocaleString()}
                                </div>
                                <div className="mt-1 whitespace-pre-wrap text-sm">{r.text}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {replyToId === c.id && (
                          <div className="space-y-2 pl-6">
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => {
                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                  e.preventDefault();
                                  postReply();
                                }
                              }}
                              rows={3}
                              placeholder="Write a reply…"
                            />
                            <div className="flex gap-2">
                              <Button onClick={postReply}>Post reply</Button>
                              <Button variant="outline" onClick={cancelReply}>Cancel</Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Tip: Press <span className="font-medium text-foreground">Ctrl/⌘ + Enter</span> to post
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Composer */}
            <div className="shrink-0 border-t border-border bg-background p-3">
              <Textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    postComment();
                  }
                }}
                rows={3}
                placeholder="Write a comment…"
              />
              <div className="mt-2 flex justify-end">
                <Button onClick={postComment}>Post comment</Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Tip: Press <span className="font-medium text-foreground">Ctrl/⌘ + Enter</span> to post
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}