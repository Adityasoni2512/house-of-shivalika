"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Table, Td, Th } from "@/components/admin/shell";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  changePasswordAction,
  createAdminAction,
  deleteAdminAction,
  setAdminActiveAction,
} from "@/lib/actions/content";
import { formatDateTime } from "@/lib/utils";

export type AdminRowView = {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  isSelf: boolean;
};

export function AdminsManager({ admins }: { admins: AdminRowView[] }) {
  const [pending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function create(formData: FormData) {
    setCreateError(null);

    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    if (password !== confirm) {
      setCreateError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await createAdminAction({
        email: String(formData.get("email") ?? ""),
        password,
        fullName: String(formData.get("fullName") ?? ""),
      });

      if (result.error) {
        setCreateError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Admin created");
    });
  }

  function changePassword(formData: FormData) {
    setPasswordError(null);

    const password = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirmNewPassword") ?? "");

    if (password !== confirm) {
      setPasswordError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await changePasswordAction(password);

      if (result.error) {
        setPasswordError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Password changed");
    });
  }

  function toggleActive(admin: AdminRowView) {
    startTransition(async () => {
      const result = await setAdminActiveAction(admin.id, !admin.isActive);
      if (result.error) toast.error(result.error);
      else toast.success(admin.isActive ? "Deactivated" : "Activated");
    });
  }

  function remove(admin: AdminRowView) {
    if (
      !confirm(
        `Permanently delete ${admin.email}?\n\nTheir login stops working immediately. This cannot be undone.`,
      )
    )
      return;

    startTransition(async () => {
      const result = await deleteAdminAction(admin.id);
      if (result.error) toast.error(result.error);
      else toast.success("Admin deleted");
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader title={`${admins.length} admins`} />
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Last sign-in</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className={pending ? "opacity-60" : undefined}>
                <Td>
                  <span className="font-medium">{admin.fullName ?? "—"}</span>
                  {admin.isSelf ? (
                    <span className="ml-2 text-xs text-ink-muted">(you)</span>
                  ) : null}
                </Td>

                <Td className="text-ink-muted">{admin.email}</Td>

                <Td className="text-xs text-ink-muted">
                  {admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : "Never"}
                </Td>

                <Td>
                  <Badge variant={admin.isActive ? "success" : "muted"}>
                    {admin.isActive ? "Active" : "Inactive"}
                  </Badge>
                </Td>

                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleActive(admin)}
                      disabled={pending || admin.isSelf}
                      title={
                        admin.isSelf
                          ? "You cannot deactivate yourself"
                          : undefined
                      }
                    >
                      {admin.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(admin)}
                      disabled={pending || admin.isSelf}
                      aria-label={`Delete ${admin.email}`}
                      title={admin.isSelf ? "You cannot delete yourself" : undefined}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="space-y-5">
        <Card className="h-fit">
          <CardHeader title="Add an admin" />
          <form action={create} className="space-y-4 p-5">
            <Field label="Full name" htmlFor="fullName">
              <Input id="fullName" name="fullName" maxLength={80} />
            </Field>

            <Field label="Email" htmlFor="email" required>
              <Input id="email" name="email" type="email" required />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              required
              hint="At least 10 characters"
            >
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Confirm password" htmlFor="confirmPassword" required>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </Field>

            {createError ? (
              <p role="alert" className="text-xs text-sale">
                {createError}
              </p>
            ) : null}

            <Button type="submit" full disabled={pending}>
              {pending ? "Creating…" : "Create admin"}
            </Button>

            <p className="text-xs text-ink-muted">
              Share the password securely and ask them to change it after their
              first sign-in.
            </p>
          </form>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Change your password" />
          <form action={changePassword} className="space-y-4 p-5">
            <Field
              label="New password"
              htmlFor="newPassword"
              required
              hint="At least 10 characters"
            >
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Confirm" htmlFor="confirmNewPassword" required>
              <Input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </Field>

            {passwordError ? (
              <p role="alert" className="text-xs text-sale">
                {passwordError}
              </p>
            ) : null}

            <Button type="submit" variant="secondary" full disabled={pending}>
              {pending ? "Changing…" : "Change password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
