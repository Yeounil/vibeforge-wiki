import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Route } from "next";
import type { UrlObject } from "url";

type PillVariant = "primary" | "secondary" | "magenta";
type PillSize = "default" | "sm";

interface CommonProps {
  variant?: PillVariant;
  size?: PillSize;
  children: ReactNode;
  className?: string;
}

type PillProps =
  | (CommonProps & { href: Route | UrlObject; onClick?: never })
  | (CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined });

const variantClass: Record<PillVariant, string> = {
  primary:   "bg-[image:var(--brand-gradient)] text-white",
  secondary: "bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)]",
  magenta:   "bg-[var(--accent-magenta)] text-white",
};

const sizeClass: Record<PillSize, string> = {
  default: "px-[var(--s-lg)] py-[var(--s-xs)] text-base",
  sm:      "px-[var(--s-md)] py-[var(--s-xxs)] text-sm",
};

const baseClass =
  "inline-flex items-center justify-center rounded-[var(--r-pill)] font-medium transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-from)] focus-visible:ring-offset-2";

export function Pill(props: PillProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "default";
  const merged = `${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${props.className ?? ""}`;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={merged}>
        {props.children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children, ...rest } =
    props as CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={merged} {...rest}>
      {children}
    </button>
  );
}
