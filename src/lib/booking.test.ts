import { describe, expect, it } from "vitest";

import {
  bookableWindows,
  bookingOpen,
  fits,
  windowsForDay,
  withAvailability,
  type BookingSettings,
} from "./booking";

const settings: BookingSettings = {
  seasonActive: true,
  openDays: "1,2,3,4,5,6", // Mon-Sat
  openMin: 420, // 7 a.m.
  closeMin: 720, // noon
  bookingEnabled: true,
  slotMinutes: 90,
  slotCapacity: 20,
  bookingDays: 21,
};

describe("windowsForDay", () => {
  it("divides the morning into whole windows", () => {
    expect(windowsForDay(420, 720, 90)).toEqual([
      { startMin: 420, endMin: 510 },
      { startMin: 510, endMin: 600 },
      { startMin: 600, endMin: 690 },
    ]);
  });

  // 7 a.m. to noon leaves 30 minutes after three 90-minute windows, which is
  // not worth offering; the same tail is worth offering at 45 minutes a window.
  it("keeps a tail only when it is at least half a window", () => {
    expect(windowsForDay(420, 720, 90).at(-1)?.endMin).toBe(690);
    expect(windowsForDay(420, 720, 45).at(-1)).toEqual({ startMin: 690, endMin: 720 });
  });

  it("divides evenly when the hours allow it", () => {
    expect(windowsForDay(420, 720, 60)).toHaveLength(5);
    expect(windowsForDay(420, 720, 60).at(-1)).toEqual({ startMin: 660, endMin: 720 });
  });

  it("returns nothing for hours or a length that make no sense", () => {
    expect(windowsForDay(720, 420, 90)).toEqual([]);
    expect(windowsForDay(420, 420, 90)).toEqual([]);
    expect(windowsForDay(420, 720, 0)).toEqual([]);
    expect(windowsForDay(420, 720, -30)).toEqual([]);
  });

  it("gives one window when it covers the whole morning", () => {
    expect(windowsForDay(420, 720, 600)).toEqual([{ startMin: 420, endMin: 720 }]);
  });
});

describe("bookingOpen", () => {
  it("needs both the season and booking switched on", () => {
    expect(bookingOpen(settings)).toBe(true);
    expect(bookingOpen({ ...settings, seasonActive: false })).toBe(false);
    expect(bookingOpen({ ...settings, bookingEnabled: false })).toBe(false);
  });
});

describe("bookableWindows", () => {
  // Friday 2026-06-12, 14:00 UTC is 09:00 at the farm.
  const fridayMorning = new Date("2026-06-12T14:00:00Z");

  it("offers nothing while booking is off", () => {
    expect(bookableWindows({ ...settings, bookingEnabled: false }, fridayMorning)).toEqual([]);
  });

  it("offers nothing when no weekday is open", () => {
    expect(bookableWindows({ ...settings, openDays: "" }, fridayMorning)).toEqual([]);
  });

  it("skips closed weekdays", () => {
    const days = bookableWindows(settings, fridayMorning).map((d) => d.date);
    expect(days).not.toContain("2026-06-14"); // a Sunday
    expect(days).toContain("2026-06-13"); // the Saturday
  });

  // You cannot reserve a place in a window you are already standing in.
  it("drops windows that have already started today", () => {
    const today = bookableWindows(settings, fridayMorning).find((d) => d.date === "2026-06-12");
    expect(today?.windows).toEqual([{ startMin: 600, endMin: 690 }]);
  });

  it("drops today entirely once the last window has started", () => {
    const afternoon = new Date("2026-06-12T18:00:00Z"); // 13:00 at the farm
    expect(bookableWindows(settings, afternoon).map((d) => d.date)).not.toContain("2026-06-12");
  });

  it("stops at the booking horizon", () => {
    const days = bookableWindows({ ...settings, bookingDays: 2 }, fridayMorning).map((d) => d.date);
    expect(days).toEqual(["2026-06-12", "2026-06-13"]); // the 14th is a Sunday
  });

  it("can offer just today", () => {
    const days = bookableWindows({ ...settings, bookingDays: 0 }, fridayMorning);
    expect(days.map((d) => d.date)).toEqual(["2026-06-12"]);
  });
});

describe("withAvailability", () => {
  const days = [{ date: "2026-06-13", windows: [{ startMin: 420, endMin: 510 }, { startMin: 510, endMin: 600 }] }];

  it("treats a window with no stored row as empty at the default capacity", () => {
    expect(withAvailability(days, [], 20)[0]).toEqual({
      date: "2026-06-13",
      startMin: 420,
      endMin: 510,
      capacity: 20,
      booked: 0,
      remaining: 20,
    });
  });

  it("takes the capacity override and headcount from a stored row", () => {
    const stored = [{ date: "2026-06-13", startMin: 420, capacity: 8, booked: 5 }];
    const [first, second] = withAvailability(days, stored, 20);
    expect(first).toMatchObject({ capacity: 8, booked: 5, remaining: 3 });
    expect(second).toMatchObject({ capacity: 20, booked: 0, remaining: 20 });
  });

  it("never reports negative room if a slot was overbooked then shrunk", () => {
    const stored = [{ date: "2026-06-13", startMin: 420, capacity: 4, booked: 9 }];
    expect(withAvailability(days, stored, 20)[0].remaining).toBe(0);
  });
});

describe("fits", () => {
  it("accepts a party up to the remaining room", () => {
    expect(fits({ remaining: 4 }, 4)).toBe(true);
    expect(fits({ remaining: 4 }, 5)).toBe(false);
  });

  it("rejects a party of nothing or less", () => {
    expect(fits({ remaining: 4 }, 0)).toBe(false);
    expect(fits({ remaining: 4 }, -1)).toBe(false);
  });
});
