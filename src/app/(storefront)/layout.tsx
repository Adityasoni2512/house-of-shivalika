import { Footer } from "@/components/storefront/footer";
import { Header, type NavCategory } from "@/components/storefront/header";
import { WhatsAppButton } from "@/components/storefront/whatsapp-button";
import { CartProvider } from "@/lib/cart";
import { getCategoryTree } from "@/lib/queries";
import { getSettings, whatsappNumber } from "@/lib/settings";

export const revalidate = 60;

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, tree] = await Promise.all([getSettings(), getCategoryTree()]);

  const navCategories: NavCategory[] = tree
    .filter((node) => node.show_in_nav)
    .map((node) => ({
      name: node.name,
      slug: node.slug,
      path: node.path,
      children: node.children
        .filter((child) => child.show_in_nav)
        .map((child) => ({
          name: child.name,
          slug: child.slug,
          path: child.path,
        })),
    }));

  const number = whatsappNumber(settings);

  return (
    <CartProvider>
      <a href="#main" className="skip-link label-caps">
        Skip to content
      </a>

      <div className="flex min-h-screen flex-col">
        <Header
          categories={navCategories}
          brandName={settings.brand_name}
          announcement={
            settings.announcement_enabled && settings.announcement_text
              ? settings.announcement_text
              : null
          }
        />

        <main id="main" className="flex-1">
          {children}
        </main>

        <Footer
          categories={navCategories}
          brandName={settings.brand_name}
          tagline={settings.brand_tagline}
          instagramUrl={settings.instagram_url}
          contactEmail={settings.contact_email}
          contactPhone={settings.contact_phone}
          gstin={settings.gstin}
        />
      </div>

      {number ? (
        <WhatsAppButton number={number} brandName={settings.brand_name} />
      ) : null}
    </CartProvider>
  );
}
