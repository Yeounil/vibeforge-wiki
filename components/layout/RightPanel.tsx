interface Props {
  children: React.ReactNode;
}

export function RightPanel({ children }: Props) {
  return (
    <section
      aria-label="Page context"
      className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-[var(--r-md)] p-4 space-y-6"
    >
      {children}
    </section>
  );
}
