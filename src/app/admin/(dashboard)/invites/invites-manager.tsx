"use client";

import { useState, useTransition } from "react";
import { Copy, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, Table, Td, Th } from "@/components/admin/shell";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import {
  createReviewInviteAction,
  deleteReviewInviteAction,
  revokeReviewInviteAction,
} from "@/lib/actions/reviews";
import { buildReviewRequestUrl } from "@/lib/whatsapp";
import { formatDate } from "@/lib/utils";

export type InviteRow = {
  id: string;
  token: string;
  productName: string;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

export function InvitesManager({
  invites,
  products,
  siteUrl,
  brandName,
  expiryDays,
}: {
  invites: InviteRow[];
  products: { id: string; name: string; sku: string }[];
  siteUrl: string;
  brandName: string;
  expiryDays: number;
}) {
  const [pending, startTransition] = useTransition();
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  function reviewUrl(token: string) {
    return `${siteUrl}/review/${token}`;
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link copied");
    } catch {
      // Clipboard needs a secure context; fall back to showing it.
      toast.error("Could not copy — select the link and copy it manually");
    }
  }

  function create(formData: FormData) {
    startTransition(async () => {
      const result = await createReviewInviteAction({
        productId: String(formData.get("productId") ?? ""),
        customerName: String(formData.get("customerName") ?? ""),
        customerPhone: String(formData.get("customerPhone") ?? ""),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.url) {
        setLastUrl(result.url);
        await copy(result.url);
      }
      toast.success("Invite created");
    });
  }

  function sendOnWhatsApp(invite: InviteRow) {
    if (!invite.customerPhone) {
      toast.error("No phone number saved for this invite");
      return;
    }

    const digits = invite.customerPhone.replace(/\D/g, "");
    const withCountry = digits.length === 10 ? `91${digits}` : digits;

    window.open(
      buildReviewRequestUrl(withCountry, brandName, {
        customerName: invite.customerName,
        productName: invite.productName,
        reviewUrl: reviewUrl(invite.token),
      }),
      "_blank",
      "noopener",
    );
  }

  function revoke(invite: InviteRow) {
    startTransition(async () => {
      const result = await revokeReviewInviteAction(invite.id);
      if (result.error) toast.error(result.error);
      else toast.success("Invite revoked");
    });
  }

  function remove(invite: InviteRow) {
    if (!confirm("Delete this invite? The link will stop working immediately."))
      return;

    startTransition(async () => {
      const result = await deleteReviewInviteAction(invite.id);
      if (result.error) toast.error(result.error);
      else toast.success("Invite deleted");
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader title={`${invites.length} invites`} />

        {invites.length === 0 ? (
          <EmptyState
            title="No invites yet"
            description="Create one after an order is delivered, then send the link over WhatsApp."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Expires</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id} className={pending ? "opacity-60" : undefined}>
                  <Td className="font-medium">{invite.productName}</Td>

                  <Td>
                    {invite.customerName ?? (
                      <span className="text-ink-muted">—</span>
                    )}
                    {invite.customerPhone ? (
                      <div className="text-xs tabular-nums text-ink-muted">
                        {invite.customerPhone}
                      </div>
                    ) : null}
                  </Td>

                  <Td>
                    <Badge variant={statusVariant(invite.status)}>
                      {invite.status}
                    </Badge>
                  </Td>

                  <Td className="text-xs text-ink-muted">
                    {invite.status === "used" && invite.usedAt
                      ? `Used ${formatDate(invite.usedAt)}`
                      : formatDate(invite.expiresAt)}
                  </Td>

                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copy(reviewUrl(invite.token))}
                        aria-label="Copy review link"
                        title="Copy link"
                      >
                        <Copy className="size-4" />
                      </Button>

                      {invite.customerPhone && invite.status === "pending" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => sendOnWhatsApp(invite)}
                          aria-label="Send on WhatsApp"
                          title="Send on WhatsApp"
                        >
                          <MessageCircle className="size-4" />
                        </Button>
                      ) : null}

                      {invite.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revoke(invite)}
                          disabled={pending}
                        >
                          Revoke
                        </Button>
                      ) : null}

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(invite)}
                        disabled={pending}
                        aria-label="Delete invite"
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
        <CardHeader title="New invite" />

        <form action={create} className="space-y-4 p-5">
          <Field label="Product" htmlFor="productId" required>
            <Select id="productId" name="productId" required>
              <option value="">Choose a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Customer name"
            htmlFor="customerName"
            hint="Pre-fills their name on the form"
          >
            <Input id="customerName" name="customerName" maxLength={80} />
          </Field>

          <Field
            label="Customer phone"
            htmlFor="customerPhone"
            hint="Enables the one-click WhatsApp send"
          >
            <Input
              id="customerPhone"
              name="customerPhone"
              maxLength={20}
              className="tabular-nums"
            />
          </Field>

          <Button type="submit" full disabled={pending}>
            {pending ? "Creating…" : "Create invite"}
          </Button>

          {lastUrl ? (
            <div className="border border-line bg-paper p-3">
              <p className="label-caps-sm text-ink-muted">Latest link</p>
              <p className="mt-1.5 break-all font-mono text-xs">{lastUrl}</p>
            </div>
          ) : null}

          <p className="text-xs leading-relaxed text-ink-muted">
            Links are single-use and expire after {expiryDays} days. Change that
            under Settings.
          </p>
        </form>
      </Card>
    </div>
  );
}
