// Small input coercions shared by the route handlers. Each returns `null` for
// input it can't accept, so callers answer with a 400 rather than writing junk.

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

/** Trim, cap the length, and treat an empty result as absent. */
export function trimTo(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

/** Trim and cap, but return `null` rather than an empty string. */
export function trimToOrNull(value: unknown, maxLength: number): string | null {
  return trimTo(value, maxLength) || null;
}

/** A whole number clamped into [min, max]. Non-numeric input is `null`. */
export function clampInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/** A 0-100 percentage. */
export function clampPercent(value: unknown): number | null {
  return clampInt(value, 0, 100);
}

/** A non-negative count, with no upper bound. */
export function clampCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

/** Minutes from midnight, 0-1440 inclusive. Rejects non-integers outright. */
export function parseMinuteOfDay(value: unknown): number | null {
  if (!Number.isInteger(value)) return null;
  const n = value as number;
  return n >= 0 && n <= 1440 ? n : null;
}

/** A positive whole quantity, as required on a sale line. */
export function parseQuantity(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) > 0 ? (value as number) : null;
}

/** A non-negative whole price in cents. */
export function parsePriceCents(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : null;
}
