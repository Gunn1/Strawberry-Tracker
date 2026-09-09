// Money is stored and passed around as integer cents everywhere. These are the
// only places it turns into (or comes back from) a string.

/** Bill and coin values the till can hand back, largest first. */
export const DENOMINATIONS: readonly [number, string][] = [
  [10000, "$100"],
  [5000, "$50"],
  [2000, "$20"],
  [1000, "$10"],
  [500, "$5"],
  [100, "$1"],
  [25, "25¢"],
  [10, "10¢"],
  [5, "5¢"],
  [1, "1¢"],
];

/** Cents -> "$12.50". Negative amounts keep their sign. */
export function formatCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const text = `$${Math.floor(abs / 100).toLocaleString()}.${String(abs % 100).padStart(2, "0")}`;
  return negative ? `-${text}` : text;
}

/** A typed dollar amount -> cents. Anything unparseable reads as 0. */
export function parseCents(value: string): number {
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
}

export interface ChangePart {
  count: number;
  label: string;
}

/** The fewest bills and coins that make up `cents`. */
export function makeChange(cents: number): ChangePart[] {
  if (cents <= 0) return [];
  let remaining = cents;
  const parts: ChangePart[] = [];
  for (const [value, label] of DENOMINATIONS) {
    const count = Math.floor(remaining / value);
    if (count > 0) {
      parts.push({ count, label });
      remaining -= count * value;
    }
  }
  return parts;
}
