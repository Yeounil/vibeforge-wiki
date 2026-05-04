"use client";

import { useState } from "react";
import { MobileMenu } from "./MobileMenu";

interface Props {
  isAdmin: boolean;
  searchSlot: React.ReactNode;
}

export function MobileHeaderControls({ isAdmin, searchSlot }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="lg:hidden min-h-[var(--touch-target)] min-w-[var(--touch-target)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)]"
      >
        <span aria-hidden="true" className="text-xl leading-none">☰</span>
      </button>
      <MobileMenu open={open} onClose={() => setOpen(false)} isAdmin={isAdmin}>
        {searchSlot}
      </MobileMenu>
    </>
  );
}
