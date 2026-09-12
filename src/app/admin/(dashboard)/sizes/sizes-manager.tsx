"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, Table, Td, Th } from "@/components/admin/shell";
import { Input } from "@/components/ui/input";
import {
  createSizeAction,
  deleteSizeAction,
  reorderSizesAction,
  toggleSizeActiveAction,
  updateSizeAction,
  type ActionState,
} from "@/lib/actions/sizes";

type SizeRow = {
  id: string;
  label: string;
  position: number;
  is_active: boolean;
  usageCount: number;
};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Adding…" : "Add size"}
    </Button>
  );
}

export function SizesManager({ sizes }: { sizes: SizeRow[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createSizeAction(prev, formData);
      if (result.ok) toast.success("Size added");
      else if (result.error) toast.error(result.error);
      return result;
    },
    {},
  );

  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);

  function move(index: number, direction: -1 | 1) {
    const next = [...sizes];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;

    [next[index], next[target]] = [next[target], next[index]];

    startTransition(async () => {
      const result = await reorderSizesAction(next.map((s) => s.id));
      if (result.error) toast.error(result.error);
    });
  }

  function toggle(size: SizeRow) {
    startTransition(async () => {
      const result = await toggleSizeActiveAction(size.id, !size.is_active);
      if (result.error) toast.error(result.error);
      else toast.success(size.is_active ? "Size deactivated" : "Size activated");
    });
  }

  function remove(size: SizeRow) {
    if (!confirm(`Delete the size "${size.label}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteSizeAction(size.id);
      if (result.error) toast.error(result.error);
      else toast.success("Size deleted");
    });
  }

  function saveEdit(size: SizeRow, formData: FormData) {
    startTransition(async () => {
      const result = await updateSizeAction(size.id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Size updated");
        setEditing(null);
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader title={`${sizes.length} sizes`} />

        {sizes.length === 0 ? (
          <EmptyState
            title="No sizes yet"
            description="Add the sizes you stock. Products pick from this list."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-20">Order</Th>
                <Th>Label</Th>
                <Th>Used by</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((size, index) => (
                <tr key={size.id} className={pending ? "opacity-60" : undefined}>
                  <Td>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || pending}
                        aria-label={`Move ${size.label} up`}
                        className="p-1 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === sizes.length - 1 || pending}
                        aria-label={`Move ${size.label} down`}
                        className="p-1 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>
                  </Td>

                  <Td>
                    {editing === size.id ? (
                      <form
                        action={(fd) => saveEdit(size, fd)}
                        className="flex items-center gap-2"
                      >
                        <Input
                          name="label"
                          defaultValue={size.label}
                          className="h-9 w-32"
                          autoFocus
                          required
                        />
                        <input type="hidden" name="position" value={size.position} />
                        {size.is_active ? (
                          <input type="hidden" name="is_active" value="on" />
                        ) : null}
                        <Button type="submit" size="sm">
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing(size.id)}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {size.label}
                      </button>
                    )}
                  </Td>

                  <Td className="text-ink-muted">
                    {size.usageCount === 0
                      ? "—"
                      : `${size.usageCount} variant${size.usageCount === 1 ? "" : "s"}`}
                  </Td>

                  <Td>
                    <Badge variant={size.is_active ? "success" : "muted"}>
                      {size.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>

                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggle(size)}
                        disabled={pending}
                      >
                        {size.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(size)}
                        disabled={pending || size.usageCount > 0}
                        title={
                          size.usageCount > 0
                            ? "In use by products — deactivate instead"
                            : "Delete size"
                        }
                        aria-label={`Delete ${size.label}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="h-fit">
        <CardHeader title="Add a size" />
        <form action={formAction} className="space-y-4 p-5">
          <Input
            name="label"
            placeholder="e.g. XXL"
            required
            maxLength={20}
            aria-label="Size label"
          />
          <input type="hidden" name="position" value={sizes.length + 1} />
          <input type="hidden" name="is_active" value="on" />

          {state.error ? (
            <p role="alert" className="text-xs text-sale">
              {state.error}
            </p>
          ) : null}

          <AddButton />

          <p className="text-xs text-ink-muted">
            Sizes in use by a product cannot be deleted. Deactivate them instead —
            existing products keep working, new ones will not see it.
          </p>
        </form>
      </Card>
    </div>
  );
}
