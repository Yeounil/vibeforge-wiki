import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export function Eyebrow({ children, className = "" }: Props) {
  return (
    <span
      className={`inline-block font-mono text-xs uppercase tracking-[0.08em] text-[var(--ink-muted)] ${className}`}
    >
      {children}
    </span>
  );
}
