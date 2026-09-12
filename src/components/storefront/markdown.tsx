import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders admin-authored page copy.
 *
 * Raw HTML is not enabled — react-markdown escapes it by default and we keep it
 * that way. Page bodies are written by admins, but an admin account is still
 * not a reason to allow arbitrary script into every visitor's browser.
 */
export function Markdown({ content }: { content: string }) {
  if (!content.trim()) {
    return <p className="text-sm text-ink-muted">Content coming soon.</p>;
  }

  return (
    <div className="space-y-5 text-[0.9375rem] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-10 font-serif text-2xl first:mt-0">{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 font-serif text-2xl first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 font-serif text-xl first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="text-ink-muted">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-accent underline underline-offset-4"
              {...(href?.startsWith("http")
                ? { target: "_blank", rel: "noreferrer noopener" }
                : {})}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1.5 pl-5 text-ink-muted">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1.5 pl-5 text-ink-muted">{children}</ol>
          ),
          strong: ({ children }) => (
            <strong className="font-medium text-ink">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent pl-5 italic text-ink-muted">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-line" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="label-caps-sm border-b border-line px-3 py-2.5 text-left text-ink-muted">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-line px-3 py-2.5">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
