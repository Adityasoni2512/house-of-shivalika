import { formatPrice } from "@/lib/utils";

/**
 * Builds the pre-filled WhatsApp message and the wa.me link.
 *
 * No API, no token, no cost — a wa.me deep link opens the customer's own
 * WhatsApp with the message ready to send. Shared between client and server so
 * the cart preview and the final handoff cannot drift apart.
 */

export type WhatsAppLine = {
  name: string;
  sku: string;
  sizeLabel: string;
  qty: number;
  price: number;
  slug: string;
};

export type WhatsAppOrder = {
  lines: WhatsAppLine[];
  subtotal: number;
  customerName?: string;
  customerPhone?: string;
  pincode?: string;
  leadRef?: string;
  siteUrl: string;
  brandName: string;
};

export function buildOrderMessage(order: WhatsAppOrder): string {
  const parts: string[] = [];

  parts.push(`Hi ${order.brandName}! I'd like to order:`);
  parts.push("");

  order.lines.forEach((line, index) => {
    parts.push(`${index + 1}. ${line.name}`);
    parts.push(
      `   SKU: ${line.sku} | Size: ${line.sizeLabel} | Qty: ${line.qty}`,
    );
    parts.push(`   ${formatPrice(line.price * line.qty)}`);
    parts.push(`   ${order.siteUrl}/product/${line.slug}`);
    parts.push("");
  });

  parts.push("------------------------------");
  parts.push(`Total: ${formatPrice(order.subtotal)}`);

  if (order.customerName) parts.push(`Name: ${order.customerName}`);
  if (order.customerPhone) parts.push(`Phone: ${order.customerPhone}`);
  if (order.pincode) parts.push(`Pincode: ${order.pincode}`);

  // Lets the admin find the exact lead record without asking the customer.
  if (order.leadRef) parts.push(`Ref: ${order.leadRef}`);

  return parts.join("\n");
}

export function buildWhatsAppUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Generic enquiry, used by the floating button and the product page fallback. */
export function buildEnquiryUrl(
  number: string,
  brandName: string,
  context?: { productName?: string; url?: string },
): string {
  const parts = [`Hi ${brandName}!`];

  if (context?.productName) {
    parts.push("", `I have a question about: ${context.productName}`);
    if (context.url) parts.push(context.url);
  } else {
    parts.push("", "I'd like to know more about your collection.");
  }

  return buildWhatsAppUrl(number, parts.join("\n"));
}

/** Review request, sent by an admin after an order is delivered. */
export function buildReviewRequestUrl(
  number: string,
  brandName: string,
  options: { customerName?: string | null; productName: string; reviewUrl: string },
): string {
  const greeting = options.customerName ? `Hi ${options.customerName}!` : "Hi!";

  const message = [
    greeting,
    "",
    `Thank you for shopping with ${brandName}. We'd love to hear what you think of your ${options.productName}.`,
    "",
    "It takes a minute, and you can add photos:",
    options.reviewUrl,
  ].join("\n");

  return buildWhatsAppUrl(number, message);
}
