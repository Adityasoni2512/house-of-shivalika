import { ConsentProvider } from "@/components/storefront/consent";
import { Footer } from "@/components/storefront/footer";
import { Header, type NavCategory } from "@/components/storefront/header";
import { TrackView } from "@/components/storefront/track-view";
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
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  const organisationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.brand_name,
    description: settings.brand_tagline,
    url: siteUrl,
    ...(settings.instagram_url ? { sameAs: [settings.instagram_url] } : {}),
    ...(settings.contact_email || settings.contact_phone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            ...(settings.contact_email ? { email: settings.contact_email } : {}),
            ...(settings.contact_phone ? { telephone: settings.contact_phone } : {}),
            areaServed: "IN",
            availableLanguage: "English",
          },
        }
      : {}),
  };

  // Enables the sitelinks search box in Google results.
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.brand_name,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <ConsentProvider
      ga4Id={settings.ga4_id}
      metaPixelId={settings.meta_pixel_id}
      googleAdsId={settings.google_ads_id}
    >
      <CartProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />

        <TrackView event="page_view" />

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
    </ConsentProvider>
  );
}
