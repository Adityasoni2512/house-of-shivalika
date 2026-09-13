import Link from "next/link";

import { Badge, statusVariant } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, formatPrice } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const LOW_STOCK_THRESHOLD = 3;

export default async function DashboardPage() {
  await requireAdmin();

  const db = createAdminClient();
  // eslint-disable-next-line react-hooks/purity -- async Server Component: reading the clock per request is the intent, not a render-purity violation
  const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();

  const [
    productViews,
    addToCarts,
    whatsappClicks,
    newLeads,
    pendingReviews,
    lowStock,
    recentLeads,
    recentOrders,
    activeProducts,
  ] = await Promise.all([
    db
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "product_view")
      .gte("created_at", sevenDaysAgo),
    db
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "add_to_cart")
      .gte("created_at", sevenDaysAgo),
    db
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "whatsapp_click")
      .gte("created_at", sevenDaysAgo),
    db
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    db
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("product_variants")
      .select("id, stock_qty, sizes(label), products(name, slug)")
      .eq("is_active", true)
      .lte("stock_qty", LOW_STOCK_THRESHOLD)
      .order("stock_qty")
      .limit(8),
    db
      .from("leads")
      .select("id, name, phone, cart_total, item_count, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    db
      .from("orders")
      .select("id, order_number, customer_name, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    db
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const views = productViews.count ?? 0;
  const clicks = whatsappClicks.count ?? 0;
  const conversion = views > 0 ? ((clicks / views) * 100).toFixed(1) : null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Last 7 days unless stated otherwise."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Product views" value={views} hint="7 days" />
        <StatTile label="Added to cart" value={addToCarts.count ?? 0} hint="7 days" />
        <StatTile
          label="WhatsApp clicks"
          value={clicks}
          hint={conversion ? `${conversion}% of views` : "7 days"}
        />
        <StatTile
          label="New leads"
          value={newLeads.count ?? 0}
          hint="Awaiting contact"
          href="/admin/leads"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Active products"
          value={activeProducts.count ?? 0}
          hint="Live on the site"
          href="/admin/products"
        />
        <StatTile
          label="Reviews pending"
          value={pendingReviews.count ?? 0}
          hint="Awaiting moderation"
          href="/admin/reviews"
        />
        <StatTile
          label="Low stock"
          value={lowStock.data?.length ?? 0}
          hint={`${LOW_STOCK_THRESHOLD} or fewer left`}
          href="/admin/stock"
        />
        <StatTile
          label="Orders"
          value={recentOrders.data?.length ?? 0}
          hint="Recent"
          href="/admin/orders"
        />
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {/* Recent leads */}
        <Card>
          <CardHeader
            title="Recent leads"
            action={
              <Link href="/admin/leads" className="label-caps-sm text-accent">
                View all
              </Link>
            }
          />
          {recentLeads.data && recentLeads.data.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Phone</Th>
                  <Th className="text-right">Cart</Th>
                  <Th>Status</Th>
                  <Th>When</Th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.data.map((lead) => (
                  <tr key={lead.id}>
                    <Td className="font-medium">{lead.name}</Td>
                    <Td className="tabular-nums text-ink-muted">{lead.phone}</Td>
                    <Td className="text-right tabular-nums">
                      {formatPrice(lead.cart_total)}
                      <span className="ml-1 text-xs text-ink-muted">
                        ({lead.item_count ?? 0})
                      </span>
                    </Td>
                    <Td>
                      <Badge variant={statusVariant(lead.status)}>
                        {lead.status}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-ink-muted">
                      {formatDateTime(lead.created_at)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              title="No leads yet"
              description="Leads appear here the moment someone submits the WhatsApp form, even if they never send the message."
            />
          )}
        </Card>

        {/* Low stock */}
        <Card>
          <CardHeader
            title="Low stock"
            action={
              <Link href="/admin/stock" className="label-caps-sm text-accent">
                Manage stock
              </Link>
            }
          />
          {lowStock.data && lowStock.data.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>Size</Th>
                  <Th className="text-right">Left</Th>
                </tr>
              </thead>
              <tbody>
                {lowStock.data.map((variant) => (
                  <tr key={variant.id}>
                    <Td className="font-medium">
                      {variant.products?.name ?? "—"}
                    </Td>
                    <Td className="text-ink-muted">
                      {variant.sizes?.label ?? "—"}
                    </Td>
                    <Td className="text-right">
                      <Badge
                        variant={variant.stock_qty === 0 ? "sale" : "warning"}
                      >
                        {variant.stock_qty === 0 ? "Sold out" : variant.stock_qty}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              title="Nothing running low"
              description="Sizes with 3 or fewer left show up here. Remember stock is decremented manually after each WhatsApp order."
            />
          )}
        </Card>
      </div>

      {/* Recent orders */}
      <Card className="mt-5">
        <CardHeader
          title="Recent orders"
          action={
            <Link href="/admin/orders" className="label-caps-sm text-accent">
              View all
            </Link>
          }
        />
        {recentOrders.data && recentOrders.data.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
                <Th>Placed</Th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.data.map((order) => (
                <tr key={order.id}>
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium tabular-nums text-accent"
                    >
                      {order.order_number}
                    </Link>
                  </Td>
                  <Td>{order.customer_name}</Td>
                  <Td className="text-right tabular-nums">
                    {formatPrice(order.total)}
                  </Td>
                  <Td>
                    <Badge variant={statusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-ink-muted">
                    {formatDateTime(order.created_at)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            title="No orders yet"
            description="Orders are created here by hand once a WhatsApp conversation is confirmed."
          />
        )}
      </Card>
    </>
  );
}
