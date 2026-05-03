import type { ReactNode } from "react";

type CardVariant = "default" | "soft";

interface Props {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
}

const variantClass: Record<CardVariant, string> = {
  default: "bg-[var(--canvas)] border border-[var(--hairline)]",
  soft:    "bg-[var(--surface-soft)] border border-[var(--hairline-soft)]",
};

export function Card({ variant = "default", className = "", children }: Props) {
  return (
    <div className={`rounded-[var(--r-md)] p-[var(--s-lg)] ${variantClass[variant]} ${className}`}>
      {children}
    </div>
  );
}
