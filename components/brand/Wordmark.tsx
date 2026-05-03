// components/brand/Wordmark.tsx — shared "VibeForge" wordmark + brand mark.
// Two-block geometric mark echoes color-block vocabulary; "Vibe" sits at the
// design-system display weight (340) and "Forge" picks up --brand-gradient at
// weight 700 — same single-voice-flex pattern across header and hero.

type WordmarkSize = "header" | "hero";

const SIZE_CONFIG: Record<
  WordmarkSize,
  { font: string; mark: number; tracking: string; gap: string }
> = {
  header: { font: "var(--t-card-title)", mark: 22, tracking: "-0.02em", gap: "gap-2.5" },
  hero:   { font: "var(--t-display-lg)", mark: 56, tracking: "-0.045em", gap: "gap-5" },
};

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="2.5" y="5.5" width="9" height="15" rx="1.6" fill="var(--brand-from)" />
      <rect x="12.5" y="2.5" width="9" height="15" rx="1.6" fill="var(--brand-to)" />
    </svg>
  );
}

interface WordmarkProps {
  size?: WordmarkSize;
  className?: string;
  showMark?: boolean;
}

export function Wordmark({
  size = "header",
  className = "",
  showMark = true,
}: WordmarkProps) {
  const cfg = SIZE_CONFIG[size];
  return (
    <span
      aria-label="VibeForge"
      className={`inline-flex items-center ${cfg.gap} leading-none ${className}`}
      style={{ fontSize: cfg.font, letterSpacing: cfg.tracking }}
    >
      {showMark && <BrandMark size={cfg.mark} />}
      <span className="whitespace-nowrap">
        <span style={{ fontWeight: 340 }}>Vibe</span><span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: "var(--brand-gradient)", fontWeight: 700 }}
        >Forge</span>
      </span>
    </span>
  );
}
