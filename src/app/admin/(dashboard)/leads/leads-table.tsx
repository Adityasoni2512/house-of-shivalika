"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, Table, Td, Th } from "@/components/admin/shell";
import { Textarea } from "@/components/ui/input";
import {
  deleteLeadAction,
  setLeadNotesAction,
  setLeadStatusAction,
} from "@/lib/actions/orders";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";

export type LeadCartLine = {
  productId?: string;
  variantId?: string;
  name: string;
  sku: string;
  sizeLabel: string;
  qty: number;
  price: number;
  slug?: string;
};

export type LeadRow = {
  id: string;
  ref: string;
  name: string;
  phone: string;
  pincode: string | null;
  cartTotal: number;
  itemCount: number;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  convertedOrderId: string | null;
  utmSource: string | null;
  cart: LeadCartLine[];
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

export function LeadsTable({
  leads,
  activeStatus,
  counts,
  whatsappNumber,
  brandName,
}: {
  leads: LeadRow[];
  activeStatus: string;
  counts: { all: number; new: number };
  whatsappNumber: string | null;
  brandName: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeStatus(lead: LeadRow, status: string) {
    startTransition(async () => {
      const result = await setLeadStatusAction(lead.id, status);
      if (result.error) toast.error(result.error);
      else toast.success(`Marked ${status}`);
    });
  }

  function saveNotes(lead: LeadRow, notes: string) {
    startTransition(async () => {
      const result = await setLeadNotesAction(lead.id, notes);
      if (result.error) toast.error(result.error);
      else toast.success("Notes saved");
    });
  }

  function remove(lead: LeadRow) {
    const confirmed = confirm(
      `Permanently delete the lead for ${lead.name}?\n\nThis removes their name, phone and pincode. Use this for data-deletion requests.\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteLeadAction(lead.id);
      if (result.error) toast.error(result.error);
      else toast.success("Lead deleted");
    });
  }

  function openWhatsApp(lead: LeadRow) {
    const message = [
      `Hi ${lead.name}!`,
      "",
      `Thank you for your interest in ${brandName}. I'm following up on your enquiry (${lead.ref}).`,
    ].join("\n");

    // The customer's own number, not the shop's — this is an outbound message.
    window.open(buildWhatsAppUrl(`91${lead.phone}`, message), "_blank", "noopener");
  }

  function convert(lead: LeadRow) {
    const params = new URLSearchParams({ lead: lead.id });
    router.push(`/admin/orders/new?${params.toString()}`);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/admin/leads?status=${filter.value}` : "/admin/leads"}
            className={cn(
              "label-caps-sm rounded-xs border px-3 py-2.5 transition-colors",
              activeStatus === filter.value
                ? "border-ink bg-ink text-paper"
                : "border-line text-ink-muted hover:border-ink-muted/50 hover:text-ink",
            )}
          >
            {filter.label}
            {filter.value === "new" && counts.new > 0 ? ` (${counts.new})` : ""}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader title={`${leads.length} leads`} />

        {leads.length === 0 ? (
          <EmptyState
            title="No leads yet"
            description="When a customer fills in the WhatsApp form, their details and basket land here — whether or not they go on to message you."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-10" />
                <Th>Reference</Th>
                <Th>Customer</Th>
                <Th className="text-right">Basket</Th>
                <Th>Status</Th>
                <Th>Received</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <Fragment key={lead.id}>
                  <tr className={pending ? "opacity-60" : undefined}>
                    <Td>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(expanded === lead.id ? null : lead.id)
                        }
                        aria-label={
                          expanded === lead.id ? "Hide basket" : "Show basket"
                        }
                        aria-expanded={expanded === lead.id}
                        className="p-1 text-ink-muted transition-colors hover:text-ink"
                      >
                        {expanded === lead.id ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>
                    </Td>

                    <Td className="font-mono text-xs">{lead.ref}</Td>

                    <Td>
                      <span className="font-medium">{lead.name}</span>
                      <div className="text-xs tabular-nums text-ink-muted">
                        {lead.phone}
                        {lead.pincode ? ` · ${lead.pincode}` : ""}
                      </div>
                      {lead.utmSource ? (
                        <div className="text-xs text-ink-muted">
                          via {lead.utmSource}
                        </div>
                      ) : null}
                    </Td>

                    <Td className="text-right">
                      <span className="tabular-nums">
                        {formatPrice(lead.cartTotal)}
                      </span>
                      <div className="text-xs text-ink-muted">
                        {lead.itemCount} item{lead.itemCount === 1 ? "" : "s"}
                      </div>
                    </Td>

                    <Td>
                      <select
                        value={lead.status}
                        onChange={(e) => changeStatus(lead, e.target.value)}
                        disabled={pending}
                        aria-label={`Status for ${lead.name}`}
                        className="cursor-pointer border-none bg-transparent p-0 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                      <div className="mt-0.5">
                        <Badge variant={statusVariant(lead.status)}>
                          {lead.status}
                        </Badge>
                      </div>
                    </Td>

                    <Td className="text-xs text-ink-muted">
                      {formatDateTime(lead.createdAt)}
                    </Td>

                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        {whatsappNumber ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openWhatsApp(lead)}
                            title="Message this customer on WhatsApp"
                            aria-label={`Message ${lead.name}`}
                          >
                            <MessageCircle className="size-4" />
                          </Button>
                        ) : null}

                        {lead.convertedOrderId ? (
                          <Link
                            href={`/admin/orders/${lead.convertedOrderId}`}
                            className="label-caps-sm px-2 py-2 text-accent"
                          >
                            Order
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => convert(lead)}
                            disabled={pending}
                          >
                            Convert
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(lead)}
                          disabled={pending}
                          aria-label={`Delete lead for ${lead.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </Td>
                  </tr>

                  {expanded === lead.id ? (
                    <tr>
                      <Td />
                      <Td className="!py-5" colSpan={6}>
                        <div className="space-y-4">
                          <div>
                            <p className="label-caps-sm text-ink-muted">Basket</p>
                            {lead.cart.length === 0 ? (
                              <p className="mt-1 text-xs text-ink-muted">
                                No basket recorded.
                              </p>
                            ) : (
                              <ul className="mt-2 space-y-1 text-sm">
                                {lead.cart.map((line, index) => (
                                  <li key={index} className="flex gap-3">
                                    <span className="tabular-nums text-ink-muted">
                                      {line.qty}×
                                    </span>
                                    <span className="flex-1">
                                      {line.name}
                                      <span className="ml-2 text-xs text-ink-muted">
                                        {line.sku} · size {line.sizeLabel}
                                      </span>
                                    </span>
                                    <span className="tabular-nums">
                                      {formatPrice(line.price * line.qty)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <form
                            action={(formData) =>
                              saveNotes(lead, String(formData.get("notes") ?? ""))
                            }
                          >
                            <label
                              htmlFor={`notes-${lead.id}`}
                              className="label-caps-sm text-ink-muted"
                            >
                              Internal notes
                            </label>
                            <Textarea
                              id={`notes-${lead.id}`}
                              name="notes"
                              rows={2}
                              defaultValue={lead.adminNotes ?? ""}
                              className="mt-2"
                              placeholder="What happened on the call or chat?"
                            />
                            <Button
                              type="submit"
                              size="sm"
                              variant="secondary"
                              className="mt-2"
                              disabled={pending}
                            >
                              Save notes
                            </Button>
                          </form>
                        </div>
                      </Td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
