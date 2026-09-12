import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/*
 * Temporary holding page. Replaced by the real homepage once the storefront
 * sections are built — it exists so the design tokens can be eyeballed early.
 */
export default function Home() {
  return (
    <main className="container-page section-y">
      <div className="mx-auto max-w-2xl text-center">
        <p className="label-caps text-ink-muted">Coming soon</p>

        <h1 className="mt-6 font-serif text-5xl md:text-7xl">
          House of Shivalika
        </h1>

        <p className="mt-6 text-ink-muted">
          Considered clothing for everyday women.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary">Shop the collection</Button>
          <Button variant="secondary">Our story</Button>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="sale">-30%</Badge>
          <Badge variant="neutral">New in</Badge>
          <Badge variant="outline">Free size</Badge>
          <Badge variant="success">In stock</Badge>
        </div>

        <hr className="mt-16 border-line" />

        <p className="mt-6 text-xs text-ink-muted">
          Site under construction.
        </p>
      </div>
    </main>
  );
}
