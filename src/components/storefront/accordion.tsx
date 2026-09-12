"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

export function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-line">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="label-caps flex w-full items-center justify-between py-4 text-left transition-colors hover:text-accent"
        >
          {title}
          {open ? (
            <Minus className="size-4 shrink-0" strokeWidth={1.5} />
          ) : (
            <Plus className="size-4 shrink-0" strokeWidth={1.5} />
          )}
        </button>
      </h3>

      {open ? <div className="pb-5">{children}</div> : null}
    </div>
  );
}
