// The stand's opening schedule, and the status customers see on the homepage.
// Shared by the status API, the marketing page, and the admin controls so all
// three agree on what "open" means.

import { farmNow, formatClock } from "@/lib/format/datetime";

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The statuses the stand can show. An empty override means "follow the schedule". */
export const OPEN_STATUSES = ["open", "closed", "pickedout", "hidden"] as const;
export type OpenStatus = (typeof OPEN_STATUSES)[number];

export const OVERRIDE_STATUSES = ["", "open", "closed", "pickedout"] as const;
export type OverrideStatus = (typeof OVERRIDE_STATUSES)[number];

export function isOverrideStatus(value: unknown): value is OverrideStatus {
  return (OVERRIDE_STATUSES as readonly unknown[]).includes(value);
}

/**
 * What each status is called for customers. "hidden" has no label on purpose:
 * out of season the chip is simply not shown.
 */
export const STATUS_LABEL: Partial<Record<OpenStatus, string>> = {
  open: "Open today",
  closed: "Closed today",
  pickedout: "Picked out",
};

/** "1,2,3" -> [1, 2, 3], dropping anything that isn't a weekday number. */
export function parseDays(openDays: string): number[] {
  return openDays
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);
}

/** "1,2,3,4,5,6" -> "Mon – Sat · closed Sundays" */
export function formatOpenDays(openDays: string): string {
  const open = parseDays(openDays);
  if (open.length === 0) return "Closed";
  if (open.length === 7) return "Open daily";

  const contiguous = open.every((d, i) => i === 0 || d === open[i - 1] + 1);
  const openText =
    contiguous && open.length > 1
      ? `${WEEKDAY_SHORT[open[0]]} – ${WEEKDAY_SHORT[open[open.length - 1]]}`
      : open.map((d) => WEEKDAY_SHORT[d]).join(", ");

  const closed = [0, 1, 2, 3, 4, 5, 6].filter((d) => !open.includes(d));
  if (closed.length === 0) return openText;
  return `${openText} · closed ${listSentence(closed.map((d) => `${WEEKDAY_LONG[d]}s`))}`;
}

/** ["a"] -> "a"; ["a","b"] -> "a & b"; ["a","b","c"] -> "a, b & c" */
function listSentence(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

/** The schedule fields of StandSettings that the status calculation reads. */
export interface StatusSettings {
  seasonActive: boolean;
  openMin: number;
  closeMin: number;
  finishByMin: number;
  openDays: string;
  overrideStatus: string;
  overrideDate: string;
  statusNote: string;
}

/**
 * The status shown to customers. A same-day override set by staff wins;
 * otherwise it follows the season toggle and the weekly schedule.
 */
export function effectiveStatus(
  settings: StatusSettings,
  now: Date = new Date(),
): { openStatus: OpenStatus; statusNote: string } {
  const { weekday, minutes, date } = farmNow(now);

  if (settings.overrideStatus && settings.overrideDate === date) {
    return { openStatus: settings.overrideStatus as OpenStatus, statusNote: settings.statusNote };
  }
  if (!settings.seasonActive) return { openStatus: "hidden", statusNote: "" };

  const isOpen =
    parseDays(settings.openDays).includes(weekday) &&
    minutes >= settings.openMin &&
    minutes < settings.closeMin;
  return { openStatus: isOpen ? "open" : "closed", statusNote: "" };
}

/** The three display strings the homepage shows for the stand's hours. */
export function displayHours(settings: StatusSettings): {
  hoursWindow: string;
  hoursDays: string;
  hoursFinishBy: string;
} {
  return {
    hoursWindow: `${formatClock(settings.openMin)} – ${formatClock(settings.closeMin)}`,
    hoursDays: formatOpenDays(settings.openDays),
    hoursFinishBy: formatClock(settings.finishByMin),
  };
}
