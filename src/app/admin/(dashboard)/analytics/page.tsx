import Link from "next/link";

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
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics" };

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "12 months" },
];

type EventRow = {
  event_type: string;
  product_id: string | null;
  category_id: string | null;
  size_label: string | null;
  search_query: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  device_type: string | null;
  value: number | null;
};

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdmin();

  const { days = "30" } = await searchParams;
  const windowDays = Math.min(365, Math.max(1, Number(days) || 30));
  const since = new Date(Date.now() - windowDays * 864e5).toISOString();

  const db = createAdminClient();

  /*
   * Pulled as raw rows and aggregated in JS rather than with SQL GROUP BY:
   * PostgREST has no grouping, and adding database functions for six panels is
   * more machinery than this volume warrants. The 50k cap is a guard — past
   * that, move these to the analytics_daily rollup.
   */
  const [{ data: events }, { data: products }, { data: categories }] =
    await Promise.all([
      db
        .from("analytics_events")
        .select(
          "event_type, product_id, category_id, size_label, search_query, referrer_host, utm_source, device_type, value",
        )
        .gte("created_at", since)
        .limit(50000),
      db.from("products").select("id, name, sku"),
      db.from("categories").select("id, name"),
    ]);

  const rows = (events ?? []) as EventRow[];
  const productName = new Map((products ?? []).map((p) => [p.id, p.name]));
  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const countOf = (type: string) => rows.filter((r) => r.event_type === type).length;

  const pageViews = countOf("page_view");
  const productViews = countOf("product_view");
  const addToCarts = countOf("add_to_cart");
  const cartViews = countOf("cart_view");
  const leadForms = countOf("lead_form_open");
  const leadsSubmitted = countOf("lead_submitted");
  const whatsappClicks = countOf("whatsapp_click");

  /* ---- per-product funnel ---- */
  const byProduct = new Map<
    string,
    { views: number; carts: number; whatsapp: number }
  >();

  for (const row of rows) {
    if (!row.product_id) continue;
    const entry = byProduct.get(row.product_id) ?? {
      views: 0,
      carts: 0,
      whatsapp: 0,
    };

    if (row.event_type === "product_view") entry.views += 1;
    if (row.event_type === "add_to_cart") entry.carts += 1;
    if (row.event_type === "whatsapp_click") entry.whatsapp += 1;

    byProduct.set(row.product_id, entry);
  }

  const topProducts = [...byProduct.entries()]
    .map(([id, stats]) => ({ id, name: productName.get(id) ?? "Deleted", ...stats }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  /* ---- categories ---- */
  const byCategory = new Map<string, number>();
  for (const row of rows) {
    if (row.event_type !== "category_view" || !row.category_id) continue;
    byCategory.set(row.category_id, (byCategory.get(row.category_id) ?? 0) + 1);
  }
  const topCategories = [...byCategory.entries()]
    .map(([id, views]) => ({ name: categoryName.get(id) ?? "Deleted", views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  /* ---- traffic sources ---- */
  const bySource = new Map<string, number>();
  for (const row of rows) {
    if (row.event_type !== "page_view") continue;
    const key = row.utm_source ?? row.referrer_host ?? "Direct";
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  }
  const topSources = [...bySource.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  /* ---- searches ---- */
  const bySearch = new Map<string, number>();
  for (const row of rows) {
    if (row.event_type !== "search" || !row.search_query) continue;
    const key = row.search_query.toLowerCase().trim();
    bySearch.set(key, (bySearch.get(key) ?? 0) + 1);
  }
  const topSearches = [...bySearch.entries()]
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  /* ---- size demand ---- */
  const bySize = new Map<string, { selects: number; carts: number }>();
  for (const row of rows) {
    if (!row.size_label) continue;
    const entry = bySize.get(row.size_label) ?? { selects: 0, carts: 0 };
    if (row.event_type === "size_select") entry.selects += 1;
    if (row.event_type === "add_to_cart") entry.carts += 1;
    bySize.set(row.size_label, entry);
  }
  const sizeDemand = [...bySize.entries()]
    .map(([label, stats]) => ({ label, ...stats }))
    .sort((a, b) => b.carts - a.carts || b.selects - a.selects);

  /* ---- devices ---- */
  const byDevice = new Map<string, number>();
  for (const row of rows) {
    if (row.event_type !== "page_view") continue;
    const key = row.device_type ?? "unknown";
    byDevice.set(key, (byDevice.get(key) ?? 0) + 1);
  }
  const devices = [...byDevice.entries()].sort((a, b) => b[1] - a[1]);

  const hasData = rows.length > 0;

  const funnel = [
    { label: "Product views", value: productViews, of: productViews },
    { label: "Added to cart", value: addToCarts, of: productViews },
    { label: "Viewed cart", value: cartViews, of: addToCarts },
    { label: "Opened form", value: leadForms, of: cartViews },
    { label: "Submitted details", value: leadsSubmitted, of: leadForms },
    { label: "Went to WhatsApp", value: whatsappClicks, of: leadsSubmitted },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Your own first-party data, anonymous and stored in your database. Not sampled, not shared."
      />

      <div className="mb-5 flex flex-wrap gap-1">
        {RANGES.map((range) => (
          <Link
            key={range.value}
            href={`/admin/analytics?days=${range.value}`}
            className={cn(
              "label-caps-sm rounded-xs border px-3 py-2.5 transition-colors",
              String(windowDays) === range.value
                ? "border-ink bg-ink text-paper"
                : "border-line text-ink-muted hover:border-ink-muted/50 hover:text-ink",
            )}
          >
            {range.label}
          </Link>
        ))}
      </div>

      {!hasData ? (
        <Card>
          <EmptyState
            title="No data yet"
            description="Events start arriving as soon as people browse the site. Nothing here is sampled — every view, size selection and WhatsApp click is recorded in your own database."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Page views" value={pageViews} />
            <StatTile label="Product views" value={productViews} />
            <StatTile
              label="Added to cart"
              value={addToCarts}
              hint={`${pct(addToCarts, productViews)} of product views`}
            />
            <StatTile
              label="WhatsApp clicks"
              value={whatsappClicks}
              hint={`${pct(whatsappClicks, productViews)} of product views`}
            />
          </div>

          {/* Funnel */}
          <Card className="mt-5">
            <CardHeader title="Conversion funnel" />
            <div className="space-y-3 p-5">
              {funnel.map((step, index) => {
                const width =
                  productViews > 0 ? (step.value / productViews) * 100 : 0;
                const dropoff =
                  index > 0 && step.of > 0
                    ? 100 - (step.value / step.of) * 100
                    : null;

                return (
                  <div key={step.label}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span>{step.label}</span>
                      <span className="tabular-nums">
                        {step.value}
                        {index > 0 ? (
                          <span className="ml-2 text-xs text-ink-muted">
                            {pct(step.value, step.of)}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 bg-line">
                      <div
                        className="h-full bg-ink"
                        style={{ width: `${Math.max(width, 0.5)}%` }}
                        aria-hidden
                      />
                    </div>
                    {dropoff !== null && dropoff > 0 ? (
                      <p className="mt-1 text-xs text-ink-muted">
                        {dropoff.toFixed(0)}% dropped off here
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            {/* Top products */}
            <Card>
              <CardHeader title="Products by views" />
              {topProducts.length === 0 ? (
                <EmptyState title="No product views yet" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Product</Th>
                      <Th className="text-right">Views</Th>
                      <Th className="text-right">Carts</Th>
                      <Th className="text-right">WhatsApp</Th>
                      <Th className="text-right">Rate</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product) => (
                      <tr key={product.id}>
                        <Td className="font-medium">{product.name}</Td>
                        <Td className="text-right tabular-nums">{product.views}</Td>
                        <Td className="text-right tabular-nums">{product.carts}</Td>
                        <Td className="text-right tabular-nums">
                          {product.whatsapp}
                        </Td>
                        <Td className="text-right tabular-nums">
                          {pct(product.whatsapp, product.views)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
                High views with a low rate usually means the price, the photos or
                the description is the problem — not the traffic.
              </p>
            </Card>

            {/* Searches */}
            <Card>
              <CardHeader title="On-site searches" />
              {topSearches.length === 0 ? (
                <EmptyState title="No searches yet" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Query</Th>
                      <Th className="text-right">Count</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSearches.map((search) => (
                      <tr key={search.query}>
                        <Td>{search.query}</Td>
                        <Td className="text-right tabular-nums">{search.count}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
                What people search for and cannot find is a direct list of what to
                stock next.
              </p>
            </Card>

            {/* Sources */}
            <Card>
              <CardHeader title="Traffic sources" />
              {topSources.length === 0 ? (
                <EmptyState title="No traffic data yet" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Source</Th>
                      <Th className="text-right">Views</Th>
                      <Th className="text-right">Share</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSources.map((source) => (
                      <tr key={source.source}>
                        <Td>{source.source}</Td>
                        <Td className="text-right tabular-nums">{source.count}</Td>
                        <Td className="text-right tabular-nums">
                          {pct(source.count, pageViews)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>

            {/* Size demand */}
            <Card>
              <CardHeader title="Size demand" />
              {sizeDemand.length === 0 ? (
                <EmptyState title="No size data yet" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Size</Th>
                      <Th className="text-right">Selected</Th>
                      <Th className="text-right">Added to cart</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeDemand.map((size) => (
                      <tr key={size.label}>
                        <Td>
                          <span className="label-caps">{size.label}</span>
                        </Td>
                        <Td className="text-right tabular-nums">{size.selects}</Td>
                        <Td className="text-right tabular-nums">{size.carts}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
                What to reorder, and in what ratio.
              </p>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader title="Category views" />
              {topCategories.length === 0 ? (
                <EmptyState title="No category views yet" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Category</Th>
                      <Th className="text-right">Views</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCategories.map((category) => (
                      <tr key={category.name}>
                        <Td>{category.name}</Td>
                        <Td className="text-right tabular-nums">{category.views}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>

            {/* Devices */}
            <Card>
              <CardHeader title="Devices" />
              {devices.length === 0 ? (
                <EmptyState title="No device data yet" />
              ) : (
                <div className="space-y-3 p-5">
                  {devices.map(([device, count]) => (
                    <div key={device}>
                      <div className="flex justify-between text-sm capitalize">
                        <span>{device}</span>
                        <span className="tabular-nums">
                          {count}
                          <span className="ml-2 text-xs text-ink-muted">
                            {pct(count, pageViews)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 bg-line">
                        <div
                          className="h-full bg-ink"
                          style={{
                            width: `${pageViews > 0 ? (count / pageViews) * 100 : 0}%`,
                          }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
