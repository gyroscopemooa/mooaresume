/** Keep return destinations on this origin, including after URL normalization. */
export function safeAuthNextPath(value: string | null, fallback = "/analysis/prepare"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const base = "https://auth-return.invalid";
    const url = new URL(value, base);
    if (url.origin !== base || url.pathname.startsWith("//") || url.pathname.startsWith("/auth/")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function emailCompletionPath(next: string): string {
  return `/auth/complete-profile?next=${encodeURIComponent(safeAuthNextPath(next))}`;
}
