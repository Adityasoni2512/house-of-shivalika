import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge, statusVariant } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn, formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Orders" };

const STATUSES = [
  "",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();

  const { status } = await searchParams;
  const db = createAdminClient();

  let builder = db
    .from("orders")
    .select("*, order_items(id)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && STATUSES.includes(status)) {
    builder = builder.eq(
      "status",
      status as "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "returned",
    );
  }

  const { data: orders } = await builder;

  return (
    <>
      <PageHeader
        title="Orders"
        description="Created by hand once a WhatsApp conversation is confirmed."
        action={
          <Link href="/admin/orders/new" className={buttonVariants()}>
            <Plus className="size-4" /> New order
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {STATUSES.map((value) => (
          <Link
            key={value || "all"}
            href={value ? `/admin/orders?status=${value}` : "/admin/orders"}
            className={cn(
              "label-caps-sm rounded-xs border px-3 py-2.5 capitalize transition-colors",
              (status ?? "") === value
                ? "border-ink bg-ink text-paper"
                : "border-line text-ink-muted hover:border-ink-muted/50 hover:text-ink",
            )}
          >
            {value || "All"}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader title={`${orders?.length ?? 0} orders`} />

        {!orders || orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Once you have agreed an order on WhatsApp, record it here. Converting a lead pre-fills everything."
            action={
              <Link
                href="/admin/orders/new"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Create an order
              </Link>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th className="text-right">Items</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
                <Th>Tracking</Th>
                <Th>Placed</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium tabular-nums text-accent underline-offset-4 hover:underline"
                    >
                      {order.order_number}
                    </Link>
                  </Td>

                  <Td>
                    <span className="font-medium">{order.customer_name}</span>
                    <div className="text-xs tabular-nums text-ink-muted">
                      {order.customer_phone}
                    </div>
                  </Td>

                  <Td className="text-right tabular-nums">
                    {order.order_items.length}
                  </Td>

                  <Td className="text-right tabular-nums">
                    {formatPrice(order.total)}
                  </Td>

                  <Td>
                    <Badge variant={statusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </Td>

                  <Td className="text-xs text-ink-muted">
                    {order.tracking_number ? (
                      <>
                        {order.courier_name ?? "—"}
                        <div className="font-mono">{order.tracking_number}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </Td>

                  <Td className="text-xs text-ink-muted">
                    {formatDate(order.created_at)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
