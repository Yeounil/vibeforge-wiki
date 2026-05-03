import type { ReactNode } from "react";

type BlockVariant = "lilac" | "mint" | "cream" | "pink" | "navy";

interface Props {
  variant: BlockVariant;
  as?: "section" | "div";
  className?: string;
  children: ReactNode;
}

const variantClass: Record<BlockVariant, string> = {
  lilac: "bg-[var(--block-lilac)] text-[var(--ink)]",
  mint:  "bg-[var(--block-mint)]  text-[var(--ink)]",
  cream: "bg-[var(--block-cream)] text-[var(--ink)]",
  pink:  "bg-[var(--block-pink)]  text-[var(--ink)]",
  navy:  "bg-[var(--block-navy)]  text-[var(--ink-inverse)]",
};

const baseClass =
  "rounded-[var(--r-lg)] p-[var(--s-xxl)] md:rounded-[var(--r-lg)]";

export function ColorBlock({ variant, as = "section", className = "", children }: Props) {
  const Tag = as;
  return (
    <Tag className={`${baseClass} ${variantClass[variant]} ${className}`}>
      {children}
    </Tag>
  );
}
