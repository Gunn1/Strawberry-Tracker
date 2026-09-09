import { startOfFarmDay, startOfFarmDaysAgo } from "@/lib/format/datetime";

// Reporting endpoints all take the same `?range=` window.
export const RANGES = ["today", "7d", "30d", "all"] as const;
export type Range = (typeof RANGES)[number];

export function parseRange(url: string): Range {
  const value = new URL(url).searchParams.get("range");
  return (RANGES as readonly string[]).includes(value ?? "") ? (value as Range) : "today";
}

/** The earliest instant a range covers, farm-local. `null` means no lower bound. */
export function rangeStart(range: Range, now: Date = new Date()): Date | null {
  switch (range) {
    case "all":
      return null;
    case "30d":
      return startOfFarmDaysAgo(29, now);
    case "7d":
      return startOfFarmDaysAgo(6, now);
    default:
      return startOfFarmDay(now);
  }
}

/** A Prisma `where` clause covering the range. */
export function rangeWhere(range: Range, now: Date = new Date()): { createdAt?: { gte: Date } } {
  const since = rangeStart(range, now);
  return since ? { createdAt: { gte: since } } : {};
}

/** The range picker shown on the admin reports. */
export const RANGE_OPTIONS: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All" },
];
