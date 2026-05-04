// components/brand/Wordmark.tsx — shared "VibeForge" wordmark + brand mark.
// Two-block geometric mark echoes color-block vocabulary; "Vibe" sits at the
// design-system display weight (340) and "Forge" picks up --brand-gradient at
// weight 700 — same single-voice-flex pattern across header and hero.

type WordmarkSize = "header" | "hero";

interface SizeCfg {
  font: string;
  /** Fixed mark px (header) or null when responsive (hero). */
  mark: number | null;
  /** When mark is null, BrandMark uses an em-based size instead. */
  markEm?: number;
  tracking: string;
  /** Tailwind gap class applied at base; overridden via the second value at sm: */
  gapBase: string;
  gapSm?: string;
}

const SIZE_CONFIG: Record<WordmarkSize, SizeCfg> = {
  header: {
    font: "var(--t-card-title)",
    mark: 22,
    tracking: "-0.02em",
    gapBase: "gap-2.5",
  },
  hero: {
    font: "var(--t-display-lg)",
    // mark scales with the clamped font: 0.875em → ≈ 35px @ 40px font, ≈ 56px @ 64px font.
    mark: null,
    markEm: 0.875,
    tracking: "-0.045em",
    gapBase: "gap-3",
    gapSm: "sm:gap-5",
  },
};

interface BrandMarkProps {
  size?: number;
  /** When provided, overrides numeric size with em-based sizing (font-relative). */
  sizeEm?: number;
}

export function BrandMark({ size = 22, sizeEm }: BrandMarkProps) {
  const style = sizeEm !== undefined
    ? { width: `${sizeEm}em`, height: `${sizeEm}em` }
    : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      width={sizeEm !== undefined ? undefined : size}
      height={sizeEm !== undefined ? undefined : size}
      style={style}
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
  const gapClasses = [cfg.gapBase, cfg.gapSm].filter(Boolean).join(" ");
  return (
    <span
      aria-label="VibeForge"
      className={`inline-flex items-center ${gapClasses} leading-none ${className}`}
      style={{ fontSize: cfg.font, letterSpacing: cfg.tracking }}
    >
      {showMark && (
        cfg.mark !== null
          ? <BrandMark size={cfg.mark} />
          : <BrandMark sizeEm={cfg.markEm} />
      )}
      <span className="whitespace-nowrap">
        <span style={{ fontWeight: 340 }}>Vibe</span><span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: "var(--brand-gradient)", fontWeight: 700 }}
        >Forge</span>
      </span>
    </span>
  );
}
