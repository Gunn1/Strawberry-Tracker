// Shared schedule/status logic, used by the API, the homepage, and the admin.

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// minutes-from-midnight -> "7 a.m." / "noon" / "12:30 p.m."
export function fmtClock(min: number): string {
  if (min === 720) return "noon";
  if (min === 0 || min === 1440) return "midnight";
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h < 12 || h === 24 ? "a.m." : "p.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${period}` : `${h12} ${period}`;
}

export function parseDays(openDays: string): number[] {
  return openDays
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => n >= 0 && n <= 6)
    .sort((a, b) => a - b);
}

// "1,2,3,4,5,6" -> "Mon – Sat · closed Sundays"
export function fmtDays(openDays: string): string {
  const open = parseDays(openDays);
  if (open.length === 0) return "Closed";
  if (open.length === 7) return "Open daily";
  const contiguous = open.every((d, i) => i === 0 || d === open[i - 1] + 1);
  const openStr =
    contiguous && open.length > 1
      ? `${DOW[open[0]]} – ${DOW[open[open.length - 1]]}`
      : open.map((d) => DOW[d]).join(", ");
  const closed = [0, 1, 2, 3, 4, 5, 6].filter((d) => !open.includes(d));
  if (!closed.length) return openStr;
  const names = closed.map((d) => `${DOW_FULL[d]}s`);
  const closedStr =
    names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} & ${names[1]}`
        : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
  return `${openStr} · closed ${closedStr}`;
}

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

// Farm-local (America/Chicago) now: weekday 0-6, minutes from midnight, date.
export function farmNow(now: Date = new Date()): { weekday: number; minutes: number; date: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = weekdayMap[parts.weekday as string] ?? 0;
  let hour = parseInt(parts.hour as string, 10);
  if (hour === 24) hour = 0;
  const minutes = hour * 60 + parseInt(parts.minute as string, 10);
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { weekday, minutes, date };
}

// The status shown to customers: a same-day override wins; otherwise it's
// derived from the season toggle + schedule.
export function effectiveStatus(
  s: StatusSettings,
  now: Date = new Date(),
): { openStatus: string; statusNote: string } {
  const { weekday, minutes, date } = farmNow(now);
  if (s.overrideStatus && s.overrideDate === date) {
    return { openStatus: s.overrideStatus, statusNote: s.statusNote };
  }
  if (!s.seasonActive) return { openStatus: "hidden", statusNote: "" };
  const isOpen = parseDays(s.openDays).includes(weekday) && minutes >= s.openMin && minutes < s.closeMin;
  return { openStatus: isOpen ? "open" : "closed", statusNote: "" };
}
