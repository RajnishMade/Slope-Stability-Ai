import { SITE_NAME } from "../../data/site";

/**
 * Brand mark: a stepped bench profile (open-pit terraces) on an amber tile.
 * Kept to three steps so it stays legible down to a 16px favicon — the same
 * geometry lives in public/favicon.svg.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="ssai-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb072" />
          <stop offset="1" stopColor="#f07a2b" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#ssai-tile)" />
      <path d="M6 25V20.5h5.5V15.5H17V10.5h5.5V6.5H26V25Z" fill="#231202" />
      <path d="M6 20.5h5.5V15.5H17V10.5h5.5V6.5H26" fill="none" stroke="#fff4ea" strokeOpacity="0.55" strokeWidth="1.1" />
    </svg>
  );
}

/** Mark + wordmark. "AI" picks up the brand colour. */
export default function Logo({ size = 28 }: { size?: number }) {
  const base = SITE_NAME.replace(/\s*AI$/, "");
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-base font-semibold tracking-[-0.01em] text-primary">
        {base} <span className="text-accent">AI</span>
      </span>
    </span>
  );
}
