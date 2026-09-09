// All time-zone math lives here. The farm is in one place, so "today" always
// means today at the farm — never the server's clock, which on Cloudflare
// Workers is UTC and would roll over six hours early.

export const FARM_TIME_ZONE = "America/Chicago";

const PART_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: FARM_TIME_ZONE,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

interface FarmParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

function farmParts(date: Date): FarmParts {
  const parts = Object.fromEntries(PART_FORMAT.formatToParts(date).map((p) => [p.type, p.value]));
  // Intl renders midnight as hour "24" in some engines; normalise it to 0.
  const hour = Number(parts.hour) % 24;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY_INDEX[parts.weekday as string] ?? 0,
  };
}

/** Milliseconds the farm's zone is ahead of UTC at this instant. */
function farmOffsetMs(date: Date): number {
  const p = farmParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
}

/** Farm-local weekday (0-6), minutes from midnight, and YYYY-MM-DD date. */
export function farmNow(now: Date = new Date()): { weekday: number; minutes: number; date: string } {
  const p = farmParts(now);
  return {
    weekday: p.weekday,
    minutes: p.hour * 60 + p.minute,
    date: `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`,
  };
}

/** The farm-local calendar day of an instant, as YYYY-MM-DD. */
export function farmDayKey(date: Date): string {
  return farmNow(date).date;
}

/**
 * The instant at which the farm's calendar day containing `now` began.
 * Use this, not `setHours(0,0,0,0)`, to bound "today's sales" queries.
 */
export function startOfFarmDay(now: Date = new Date()): Date {
  const p = farmParts(now);
  const midnightAsUTC = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0);
  // Convert that wall-clock midnight to a real instant, then correct once in
  // case the offset differs across the DST boundary we just stepped over.
  const firstPass = new Date(midnightAsUTC - farmOffsetMs(now));
  const corrected = new Date(midnightAsUTC - farmOffsetMs(firstPass));
  return corrected;
}

/** Midnight farm-local `days` days before today. `daysAgo(0)` is this morning. */
export function startOfFarmDaysAgo(days: number, now: Date = new Date()): Date {
  const start = startOfFarmDay(now);
  return startOfFarmDay(new Date(start.getTime() - days * 24 * 60 * 60 * 1000));
}

/**
 * Calendar-date arithmetic on YYYY-MM-DD strings. These are plain dates, not
 * instants, so they are computed in UTC deliberately: adding a day to
 * "2026-03-08" must give "2026-03-09" whatever the clocks did that night.
 */
export function addCalendarDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(
    shifted.getUTCDate(),
  ).padStart(2, "0")}`;
}

/**
 * A Postgres `date` column round-trips as midnight UTC, so read and write it in
 * UTC. Going through farm-local here would shift the day by one.
 */
export function toCalendarDate(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** A YYYY-MM-DD string as the instant a `date` column stores. */
export function fromCalendarDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** Weekday of a YYYY-MM-DD calendar date, 0 = Sunday. */
export function calendarWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** A YYYY-MM-DD date as "Sat, Jun 27". */
export function formatCalendarDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** minutes-from-midnight -> "7 a.m." / "noon" / "12:30 p.m." */
export function formatClock(min: number): string {
  if (min === 720) return "noon";
  if (min === 0 || min === 1440) return "midnight";
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h < 12 || h === 24 ? "a.m." : "p.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${period}` : `${h12} ${period}`;
}

/** An ISO timestamp as a short farm-local time, e.g. "9:05 AM". */
export function formatTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: FARM_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Today at the farm, spelled out: "Friday, June 12". */
export function formatFarmLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    timeZone: FARM_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** An ISO timestamp as a short farm-local date, e.g. "Jun 12". */
export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: FARM_TIME_ZONE,
    month: "short",
    day: "numeric",
  });
}
