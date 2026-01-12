import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export type SmartRuleField = "ratio" | "name" | "keywords";
export type SmartRuleOp = "is" | "contains";

export type SmartRule = {
  field: SmartRuleField;
  op: SmartRuleOp;
  value: string;
};

type CreateSmartFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { name: string; rules: SmartRule[] }) => void;
};

const DEFAULT_RULE: SmartRule = { field: "ratio", op: "is", value: "3/4" };

export function CreateSmartFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateSmartFolderDialogProps) {
  const [name, setName] = React.useState("");
  const [rules, setRules] = React.useState<SmartRule[]>([DEFAULT_RULE]);

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      setName("");
      setRules([DEFAULT_RULE]);
    }
  }, [open]);

  const canCreate = React.useMemo(() => {
    const n = name.trim();
    const validRules = rules
      .map((r) => ({ ...r, value: String(r.value ?? "").trim() }))
      .filter((r) => r.value.length > 0);
    return n.length > 0 && validRules.length > 0;
  }, [name, rules]);

  const handleCreate = () => {
    const n = name.trim();
    const validRules = rules
      .map((r) => ({ ...r, value: String(r.value ?? "").trim() }))
      .filter((r) => r.value.length > 0);

    if (!n || validRules.length === 0) return;

    onCreate({ name: n, rules: validRules });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create smart folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Name</div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Christmas portraits"
              autoFocus
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (canCreate) handleCreate();
                }
              }}
            />
            <div className="text-xs text-muted-foreground">
              Tip: Use Ctrl/⌘ + Enter to create.
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground">
                Rules (all must match)
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRules((prev) => [...prev, DEFAULT_RULE])}
              >
                Add rule
              </Button>
            </div>

            <div className="space-y-2">
              {rules.map((r, idx) => {
                const isRatio = r.field === "ratio";

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md border bg-background p-2"
                  >
                    <Select
                      value={r.field}
                      onValueChange={(v) => {
                        setRules((prev) =>
                          prev.map((x, i) => {
                            if (i !== idx) return x;
                            const field = v as SmartRuleField;
                            return {
                              ...x,
                              field,
                              op: field === "ratio" ? "is" : "contains",
                              value: field === "ratio" ? "3/4" : "",
                            };
                          })
                        );
                      }}
                    >
                      <SelectTrigger className="h-9 w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ratio">Aspect ratio</SelectItem>
                        <SelectItem value="name">Name contains</SelectItem>
                        <SelectItem value="keywords">Keywords contains</SelectItem>
                      </SelectContent>
                    </Select>

                    {isRatio ? (
                      <Select
                        value={r.value}
                        onValueChange={(v) =>
                          setRules((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, value: v } : x))
                          )
                        }
                      >
                        <SelectTrigger className="h-9 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3/4">Portrait (3:4)</SelectItem>
                          <SelectItem value="16/9">Wide (16:9)</SelectItem>
                          <SelectItem value="1/1">Square (1:1)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={r.value}
                        onChange={(e) =>
                          setRules((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, value: e.target.value } : x
                            )
                          )
                        }
                        placeholder="e.g. christmas"
                        className="h-9 flex-1"
                      />
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Remove rule"
                      title="Remove rule"
                      onClick={() => setRules((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={rules.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate} disabled={!canCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
