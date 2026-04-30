interface Props {
  children: React.ReactNode;
}

export function RightPanel({ children }: Props) {
  return (
    <section
      aria-label="Page context"
      className="bg-[var(--surface-card)] rounded-[var(--radius-card)] shadow-[var(--surface-shadow)] p-4 space-y-6"
    >
      {children}
    </section>
  );
}
