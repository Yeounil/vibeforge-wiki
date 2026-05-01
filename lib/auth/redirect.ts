// Sanitises a `next` query param into a same-origin relative path.
//
// Rejects:
//   - protocol-relative URLs (//evil.com/x) — browsers treat as cross-origin
//   - absolute URLs (https://evil.com/x)
//   - backslash variants Windows browsers may normalise to // (\\evil.com)
//   - empty / missing input
//
// Falls back to "/" on any reject. Caller composes `${origin}${safeRedirectPath(raw)}`.
export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith("/\\") || raw.startsWith("\\")) return "/";
  return raw;
}
