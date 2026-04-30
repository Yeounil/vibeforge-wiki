import { CATEGORY_LABELS, type ForumCategory } from "@/lib/forum/types";

const COLOR: Record<ForumCategory, { fg: string; bg: string }> = {
  qa: { fg: "#7c3aed", bg: "#7c3aed1a" },       // purple at 10% alpha
  general: { fg: "#22c55e", bg: "#22c55e1a" },  // green
  notice: { fg: "#f97316", bg: "#f973161a" },   // orange
};

interface Props {
  category: ForumCategory;
}

export function CategoryBadge({ category }: Props) {
  const c = COLOR[category];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.fg }}
    >
      <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.fg }} />
      {CATEGORY_LABELS[category]}
    </span>
  );
}
