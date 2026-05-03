import type { InputHTMLAttributes } from "react";

export function TextInput({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`bg-[var(--canvas)] text-[var(--ink)] border border-[var(--hairline)] rounded-[var(--r-md)] px-[var(--s-sm)] py-[var(--s-xs)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-from)] focus:border-transparent ${className}`}
      {...rest}
    />
  );
}
