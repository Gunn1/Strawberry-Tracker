/**
 * Which picking windows customers may book.
 *
 * Nothing is generated ahead of time. The grid of windows is derived from the
 * opening schedule staff already keep at /admin, so changing the hours changes
 * what is bookable with nothing to regenerate. A `Slot` row only comes into
 * existence when someone books it or an admin overrides its capacity.
 */

import { addCalendarDays, calendarWeekday, farmNow } from "@/lib/format/datetime";
import { parseDays } from "@/lib/hours";

export interface BookingSettings {
  seasonActive: boolean;
  openDays: string;
  openMin: number;
  closeMin: number;
  bookingEnabled: boolean;
  slotMinutes: number;
  slotCapacity: number;
  bookingDays: number;
}

export interface Window {
  startMin: number;
  endMin: number;
}

/**
 * The windows a day's opening hours divide into.
 *
 * The tail is included only when it is at least half a window long: with
 * 7 a.m. to noon in 90-minute windows the last 30 minutes are not worth
 * offering, but in 45-minute windows they are.
 */
export function windowsForDay(openMin: number, closeMin: number, slotMinutes: number): Window[] {
  if (slotMinutes <= 0 || closeMin <= openMin) return [];

  const windows: Window[] = [];
  for (let start = openMin; start < closeMin; start += slotMinutes) {
    const end = Math.min(start + slotMinutes, closeMin);
    if (end - start < slotMinutes && end - start < slotMinutes / 2) break;
    windows.push({ startMin: start, endMin: end });
  }
  return windows;
}

/** Whether the schedule allows booking at all right now. */
export function bookingOpen(settings: BookingSettings): boolean {
  return settings.bookingEnabled && settings.seasonActive;
}

export interface DayWindows {
  /** Farm-local YYYY-MM-DD. */
  date: string;
  windows: Window[];
}

/**
 * Every bookable window from today up to the booking horizon, skipping closed
 * weekdays. Windows that have already started today are dropped: you cannot
 * reserve a place in a window you are standing in.
 */
export function bookableWindows(settings: BookingSettings, now: Date = new Date()): DayWindows[] {
  if (!bookingOpen(settings)) return [];

  const open = parseDays(settings.openDays);
  if (open.length === 0) return [];

  const { date: today, minutes } = farmNow(now);
  const horizon = Math.max(0, settings.bookingDays);
  const days: DayWindows[] = [];

  for (let offset = 0; offset <= horizon; offset++) {
    const date = addCalendarDays(today, offset);
    if (!open.includes(calendarWeekday(date))) continue;

    let windows = windowsForDay(settings.openMin, settings.closeMin, settings.slotMinutes);
    if (offset === 0) windows = windows.filter((w) => w.startMin > minutes);
    if (windows.length > 0) days.push({ date, windows });
  }
  return days;
}

/** A window a customer sees, with how much room is left in it. */
export interface Availability extends Window {
  date: string;
  capacity: number;
  booked: number;
  remaining: number;
}

export interface SlotRow {
  date: string;
  startMin: number;
  capacity: number;
  booked: number;
}

/**
 * Fold what is stored onto the derived grid. A stored slot supplies its
 * capacity override and its headcount; anything with no row is simply empty at
 * the default capacity.
 */
export function withAvailability(
  days: DayWindows[],
  stored: SlotRow[],
  defaultCapacity: number,
): Availability[] {
  const byKey = new Map(stored.map((s) => [`${s.date}|${s.startMin}`, s]));

  return days.flatMap((day) =>
    day.windows.map((window) => {
      const row = byKey.get(`${day.date}|${window.startMin}`);
      const capacity = row?.capacity ?? defaultCapacity;
      const booked = row?.booked ?? 0;
      return {
        date: day.date,
        startMin: window.startMin,
        endMin: window.endMin,
        capacity,
        booked,
        remaining: Math.max(0, capacity - booked),
      };
    }),
  );
}

/** Whether a party still fits, used before writing a reservation. */
export function fits(availability: Pick<Availability, "remaining">, partySize: number): boolean {
  return partySize > 0 && partySize <= availability.remaining;
}
