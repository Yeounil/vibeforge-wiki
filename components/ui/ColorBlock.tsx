import type { HTMLAttributes, ReactNode } from "react";

type BlockVariant = "lilac" | "mint" | "cream" | "pink" | "navy";
type BlockPadding = "md" | "lg" | "xl" | "xxl";

interface Props extends HTMLAttributes<HTMLElement> {
  variant: BlockVariant;
  as?: "section" | "div" | "nav";
  padding?: BlockPadding;
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

const paddingClass: Record<BlockPadding, string> = {
  md:  "p-[var(--s-md)]",
  lg:  "p-[var(--s-lg)]",
  xl:  "p-[var(--s-xl)]",
  xxl: "p-[var(--s-xxl)]",
};

const baseClass = "rounded-[var(--r-lg)] md:rounded-[var(--r-lg)]";

export function ColorBlock({
  variant,
  as = "section",
  padding = "xxl",
  className = "",
  children,
  ...rest
}: Props) {
  const Tag = as;
  return (
    <Tag
      className={`${baseClass} ${paddingClass[padding]} ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
