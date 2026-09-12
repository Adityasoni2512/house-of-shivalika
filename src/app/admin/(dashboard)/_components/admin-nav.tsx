"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquareQuote,
  Package,
  Ruler,
  Send,
  Settings,
  ShoppingBag,
  TrendingUp,
  UserCog,
  UserSquare,
  FileText,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { heading: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    heading: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/sizes", label: "Sizes", icon: Ruler },
      { href: "/admin/stock", label: "Stock", icon: Boxes },
    ],
  },
  {
    heading: "Sales",
    items: [
      { href: "/admin/leads", label: "Leads", icon: UserSquare },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    ],
  },
  {
    heading: "Reviews",
    items: [
      { href: "/admin/reviews", label: "Moderation", icon: MessageSquareQuote },
      { href: "/admin/invites", label: "Invites", icon: Send },
    ],
  },
  {
    heading: "Content",
    items: [
      { href: "/admin/banners", label: "Banners", icon: ImageIcon },
      { href: "/admin/pages", label: "Pages", icon: FileText },
    ],
  },
  {
    heading: "System",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
      { href: "/admin/admins", label: "Admins", icon: UserCog },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({
  layout = "vertical",
}: {
  layout?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();

  if (layout === "horizontal") {
    return (
      <nav className="flex gap-1">
        {groups.flatMap((g) => g.items).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "label-caps-sm shrink-0 rounded-xs px-3 py-2 transition-colors",
              isActive(pathname, item.href)
                ? "bg-ink text-paper"
                : "text-ink-muted hover:bg-accent-soft hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.heading}>
          <p className="label-caps-sm px-3 pb-2 text-ink-muted/70">
            {group.heading}
          </p>

          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xs px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-ink text-paper"
                        : "text-ink-muted hover:bg-accent-soft hover:text-ink",
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
