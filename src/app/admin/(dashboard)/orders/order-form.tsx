"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardHeader } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  decrementStockForOrderAction,
  saveOrderAction,
} from "@/lib/actions/orders";
import { formatPrice } from "@/lib/utils";

export type OrderItemDraft = {
  productId: string | null;
  variantId: string | null;
  productName: string;
  sku: string;
  sizeLabel: string;
  imageUrl: string | null;
  unitPrice: string;
  qty: string;
};

export type CatalogueVariant = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  sizeLabel: string;
  price: number;
  stock: number;
  imageUrl: string | null;
};

export type OrderFormValues = {
  id: string | null;
  orderNumber: string | null;
  leadId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
  discount: string;
  shippingCharge: string;
  paymentNote: string;
  courierName: string;
  trackingNumber: string;
  adminNotes: string;
  items: OrderItemDraft[];
};

const STATUSES = [
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

export function OrderForm({
  initial,
  catalogue,
}: {
  initial: OrderFormValues;
  catalogue: CatalogueVariant[];
}) {
  const router = useRouter();
  const isEdit = initial.id !== null;

  const [values, setValues] = useState<OrderFormValues>(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof OrderFormValues>(
    key: K,
    value: OrderFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const subtotal = values.items.reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.qty) || 0),
    0,
  );
  const total = Math.max(
    0,
    subtotal - (Number(values.discount) || 0) + (Number(values.shippingCharge) || 0),
  );

  const filteredCatalogue = search.trim()
    ? catalogue.filter((entry) => {
        const needle = search.toLowerCase();
        return (
          entry.productName.toLowerCase().includes(needle) ||
          entry.sku.toLowerCase().includes(needle)
        );
      })
    : catalogue.slice(0, 40);

  function addItem(entry: CatalogueVariant) {
    const existing = values.items.findIndex(
      (item) => item.variantId === entry.variantId,
    );

    if (existing >= 0) {
      const next = [...values.items];
      next[existing] = {
        ...next[existing],
        qty: String((Number(next[existing].qty) || 0) + 1),
      };
      set("items", next);
    } else {
      set("items", [
        ...values.items,
        {
          productId: entry.productId,
          variantId: entry.variantId,
          productName: entry.productName,
          sku: entry.sku,
          sizeLabel: entry.sizeLabel,
          imageUrl: entry.imageUrl,
          unitPrice: String(entry.price),
          qty: "1",
        },
      ]);
    }

    setPickerOpen(false);
    setSearch("");
  }

  function addBlankItem() {
    set("items", [
      ...values.items,
      {
        productId: null,
        variantId: null,
        productName: "",
        sku: "",
        sizeLabel: "",
        imageUrl: null,
        unitPrice: "0",
        qty: "1",
      },
    ]);
  }

  function updateItem(index: number, patch: Partial<OrderItemDraft>) {
    const next = [...values.items];
    next[index] = { ...next[index], ...patch };
    set("items", next);
  }

  function removeItem(index: number) {
    set(
      "items",
      values.items.filter((_, i) => i !== index),
    );
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = await saveOrderAction(values.id, {
        leadId: values.leadId,
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerEmail: values.customerEmail,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        status: values.status,
        discount: values.discount || 0,
        shippingCharge: values.shippingCharge || 0,
        paymentNote: values.paymentNote,
        courierName: values.courierName,
        trackingNumber: values.trackingNumber,
        adminNotes: values.adminNotes,
        items: values.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sku: item.sku || null,
          sizeLabel: item.sizeLabel || null,
          imageUrl: item.imageUrl,
          unitPrice: item.unitPrice || 0,
          qty: item.qty || 1,
        })),
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Order saved" : "Order created");

      if (!isEdit && result.id) {
        // Stock is never moved silently — ask, because an edited order would
        // otherwise be double-counted.
        const shouldDecrement = confirm(
          "Order created.\n\nDecrement stock for these items now?\n\nStock is not adjusted automatically — say no if you have already done it by hand.",
        );

        if (shouldDecrement) {
          const stockResult = await decrementStockForOrderAction(result.id);
          if (stockResult.error) {
            toast.error(stockResult.error);
          } else {
            toast.success(
              `Stock updated for ${stockResult.adjusted} item${stockResult.adjusted === 1 ? "" : "s"}`,
            );
            if (stockResult.skipped?.length) {
              toast.warning(`Skipped: ${stockResult.skipped.join(", ")}`);
            }
          }
        }

        router.push(`/admin/orders/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-5 xl:grid-cols-[1fr_20rem]"
    >
      <div className="space-y-5">
        {/* Items */}
        <Card>
          <CardHeader
            title="Items"
            action={
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setPickerOpen((v) => !v)}
                >
                  <Plus className="size-4" /> From catalogue
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={addBlankItem}>
                  Custom line
                </Button>
              </div>
            }
          />

          {pickerOpen ? (
            <div className="border-b border-line bg-paper p-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products by name or SKU"
                  aria-label="Search catalogue"
                  className="pl-9"
                  autoFocus
                />
              </div>

              <ul className="mt-3 max-h-64 overflow-y-auto border border-line bg-surface">
                {filteredCatalogue.length === 0 ? (
                  <li className="px-4 py-6 text-center text-xs text-ink-muted">
                    Nothing matches.
                  </li>
                ) : (
                  filteredCatalogue.map((entry) => (
                    <li key={entry.variantId}>
                      <button
                        type="button"
                        onClick={() => addItem(entry)}
                        className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-left text-sm last:border-0 hover:bg-accent-soft"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {entry.productName}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {entry.sku} · size {entry.sizeLabel} ·{" "}
                            {entry.stock} in stock
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatPrice(entry.price)}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}

          <div className="p-5">
            {values.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                No items yet. Add them from the catalogue, or create a custom line
                for something not listed.
              </p>
            ) : (
              <ul className="space-y-3">
                {values.items.map((item, index) => (
                  <li
                    key={index}
                    className="grid gap-2 border border-line p-3 sm:grid-cols-[1fr_6rem_5rem_2.5rem] sm:items-end"
                  >
                    <div className="space-y-2">
                      <Input
                        value={item.productName}
                        onChange={(e) =>
                          updateItem(index, { productName: e.target.value })
                        }
                        placeholder="Product name"
                        aria-label={`Item ${index + 1} name`}
                        className="h-9"
                        required
                      />
                      <div className="flex gap-2">
                        <Input
                          value={item.sku}
                          onChange={(e) => updateItem(index, { sku: e.target.value })}
                          placeholder="SKU"
                          aria-label={`Item ${index + 1} SKU`}
                          className="h-8 font-mono text-xs"
                        />
                        <Input
                          value={item.sizeLabel}
                          onChange={(e) =>
                            updateItem(index, { sizeLabel: e.target.value })
                          }
                          placeholder="Size"
                          aria-label={`Item ${index + 1} size`}
                          className="h-8 w-24 text-xs"
                        />
                      </div>
                    </div>

                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, { unitPrice: e.target.value })
                      }
                      aria-label={`Item ${index + 1} unit price`}
                      className="h-9 tabular-nums"
                    />

                    <Input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => updateItem(index, { qty: e.target.value })}
                      aria-label={`Item ${index + 1} quantity`}
                      className="h-9 tabular-nums"
                    />

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(index)}
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Customer */}
        <Card>
          <CardHeader title="Customer" />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="customerName" required>
                <Input
                  id="customerName"
                  value={values.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  required
                />
              </Field>

              <Field label="Phone" htmlFor="customerPhone" required>
                <Input
                  id="customerPhone"
                  value={values.customerPhone}
                  onChange={(e) => set("customerPhone", e.target.value)}
                  required
                  className="tabular-nums"
                />
              </Field>
            </div>

            <Field label="Email" htmlFor="customerEmail">
              <Input
                id="customerEmail"
                type="email"
                value={values.customerEmail}
                onChange={(e) => set("customerEmail", e.target.value)}
              />
            </Field>

            <Field label="Address line 1" htmlFor="addressLine1">
              <Input
                id="addressLine1"
                value={values.addressLine1}
                onChange={(e) => set("addressLine1", e.target.value)}
              />
            </Field>

            <Field label="Address line 2" htmlFor="addressLine2">
              <Input
                id="addressLine2"
                value={values.addressLine2}
                onChange={(e) => set("addressLine2", e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" htmlFor="city">
                <Input
                  id="city"
                  value={values.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </Field>
              <Field label="State" htmlFor="state">
                <Input
                  id="state"
                  value={values.state}
                  onChange={(e) => set("state", e.target.value)}
                />
              </Field>
              <Field label="Pincode" htmlFor="pincode">
                <Input
                  id="pincode"
                  value={values.pincode}
                  onChange={(e) => set("pincode", e.target.value)}
                  maxLength={6}
                  className="tabular-nums"
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Fulfilment */}
        <Card>
          <CardHeader title="Fulfilment" />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Courier" htmlFor="courierName">
                <Input
                  id="courierName"
                  value={values.courierName}
                  onChange={(e) => set("courierName", e.target.value)}
                  placeholder="Delhivery, Bluedart…"
                />
              </Field>

              <Field label="Tracking number" htmlFor="trackingNumber">
                <Input
                  id="trackingNumber"
                  value={values.trackingNumber}
                  onChange={(e) => set("trackingNumber", e.target.value)}
                  className="font-mono"
                />
              </Field>
            </div>

            <Field
              label="Payment note"
              htmlFor="paymentNote"
              hint="How and when payment was received"
            >
              <Input
                id="paymentNote"
                value={values.paymentNote}
                onChange={(e) => set("paymentNote", e.target.value)}
                placeholder="UPI received 12 Sep"
              />
            </Field>

            <Field label="Internal notes" htmlFor="adminNotes">
              <Textarea
                id="adminNotes"
                rows={3}
                value={values.adminNotes}
                onChange={(e) => set("adminNotes", e.target.value)}
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        <Card className="xl:sticky xl:top-6">
          <CardHeader title={values.orderNumber ?? "New order"} />
          <div className="space-y-4 p-5">
            <Field label="Status" htmlFor="status">
              <Select
                id="status"
                value={values.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status} className="capitalize">
                    {status}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount" htmlFor="discount">
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.discount}
                  onChange={(e) => set("discount", e.target.value)}
                  className="tabular-nums"
                />
              </Field>

              <Field label="Shipping" htmlFor="shippingCharge">
                <Input
                  id="shippingCharge"
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.shippingCharge}
                  onChange={(e) => set("shippingCharge", e.target.value)}
                  className="tabular-nums"
                />
              </Field>
            </div>

            <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
              </div>
              {Number(values.discount) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Discount</dt>
                  <dd className="tabular-nums text-sale">
                    −{formatPrice(Number(values.discount))}
                  </dd>
                </div>
              ) : null}
              {Number(values.shippingCharge) > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Shipping</dt>
                  <dd className="tabular-nums">
                    {formatPrice(Number(values.shippingCharge))}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-2 text-base">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(total)}</dd>
              </div>
            </dl>

            {error ? (
              <p role="alert" className="border border-sale/30 bg-sale/5 px-3 py-2 text-xs text-sale">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-line pt-4">
              <Button type="submit" full disabled={pending || values.items.length === 0}>
                {pending ? "Saving…" : isEdit ? "Save order" : "Create order"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                full
                onClick={() => router.push("/admin/orders")}
              >
                Back to orders
              </Button>
            </div>
          </div>
        </Card>

        {isEdit && values.id ? (
          <Card>
            <CardHeader title="Stock" />
            <div className="space-y-3 p-5">
              <p className="text-xs text-ink-muted">
                Stock is never adjusted automatically. Use this once, when the
                order is confirmed.
              </p>
              <Button
                type="button"
                variant="secondary"
                full
                size="sm"
                disabled={pending}
                onClick={() => {
                  if (
                    !confirm(
                      "Decrement stock for every item on this order?\n\nRunning this twice will subtract twice.",
                    )
                  )
                    return;

                  startTransition(async () => {
                    const result = await decrementStockForOrderAction(values.id!);
                    if (result.error) toast.error(result.error);
                    else {
                      toast.success(`Stock updated for ${result.adjusted} item(s)`);
                      if (result.skipped?.length) {
                        toast.warning(`Skipped: ${result.skipped.join(", ")}`);
                      }
                    }
                  });
                }}
              >
                Decrement stock
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </form>
  );
}
