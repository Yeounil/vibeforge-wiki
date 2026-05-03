import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconBtnVariant = "default" | "inverse";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconBtnVariant;
  "aria-label": string;
  children: ReactNode;
}

const variantClass: Record<IconBtnVariant, string> = {
  default: "bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-[var(--hairline)]",
  inverse: "bg-white/10 text-[var(--ink-inverse)] hover:bg-white/20",
};

export function IconButton({ variant = "default", className = "", children, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center w-10 h-10 rounded-[var(--r-full)] transition-colors ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
