import { brand, markPath } from "@repo/brand";

/**
 * The AIVO mark: an upward chevron glyph in a rounded tile.
 *
 * The geometry comes from `@repo/brand`, the single source of truth shared
 * with the generated app icons, so the rendered logo and the app icon can
 * never drift apart.
 */
export function Logo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="AIVO"
      className={className}
    >
      <rect width="64" height="64" rx="14" fill={brand.ink} />
      <path d={markPath} fill={brand.primary} />
    </svg>
  );
}

/**
 * The bare glyph with no tile, for use on primary-colored surfaces.
 */
export function Glyph({
  size = 32,
  color = brand.primaryInk,
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="AIVO"
      className={className}
    >
      <path d={markPath} fill={color} />
    </svg>
  );
}