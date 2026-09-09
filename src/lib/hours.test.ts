import { describe, expect, it } from "vitest";

import { effectiveStatus, formatOpenDays, parseDays, type StatusSettings } from "./hours";

const inSeason: StatusSettings = {
  seasonActive: true,
  openMin: 420, // 7 a.m.
  closeMin: 720, // noon
  finishByMin: 750,
  openDays: "1,2,3,4,5,6",
  overrideStatus: "",
  overrideDate: "",
  statusNote: "",
};

// 2026-06-12 is a Friday; 14:00 UTC is 09:00 at the farm.
const fridayMorning = new Date("2026-06-12T14:00:00Z");

describe("parseDays", () => {
  it("reads the stored weekday list", () => {
    expect(parseDays("1,2,3,4,5,6")).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("drops anything that isn't a weekday number", () => {
    expect(parseDays("0, 9, x, 3")).toEqual([0, 3]);
  });
});

describe("formatOpenDays", () => {
  it("collapses a contiguous run and names the closed days", () => {
    expect(formatOpenDays("1,2,3,4,5,6")).toBe("Mon – Sat · closed Sundays");
    expect(formatOpenDays("1,2,3,4,5")).toBe("Mon – Fri · closed Sundays & Saturdays");
  });

  it("lists the days individually when they aren't contiguous", () => {
    expect(formatOpenDays("1,3,5")).toBe(
      "Mon, Wed, Fri · closed Sundays, Tuesdays, Thursdays & Saturdays",
    );
  });

  it("handles the all-and-nothing cases", () => {
    expect(formatOpenDays("0,1,2,3,4,5,6")).toBe("Open daily");
    expect(formatOpenDays("")).toBe("Closed");
  });
});

describe("effectiveStatus", () => {
  it("follows the schedule during opening hours", () => {
    expect(effectiveStatus(inSeason, fridayMorning).openStatus).toBe("open");
  });

  it("closes outside the hours and on closed days", () => {
    const fridayAfternoon = new Date("2026-06-12T19:00:00Z"); // 14:00 local
    const sunday = new Date("2026-06-14T14:00:00Z");
    expect(effectiveStatus(inSeason, fridayAfternoon).openStatus).toBe("closed");
    expect(effectiveStatus(inSeason, sunday).openStatus).toBe("closed");
  });

  it("hides the status entirely out of season", () => {
    expect(effectiveStatus({ ...inSeason, seasonActive: false }, fridayMorning).openStatus).toBe(
      "hidden",
    );
  });

  it("lets a same-day override beat the schedule, note and all", () => {
    const settings = {
      ...inSeason,
      overrideStatus: "pickedout",
      overrideDate: "2026-06-12",
      statusNote: "All gone for today",
    };
    expect(effectiveStatus(settings, fridayMorning)).toEqual({
      openStatus: "pickedout",
      statusNote: "All gone for today",
    });
  });

  it("ignores yesterday's override so it can't keep the stand shut", () => {
    const stale = { ...inSeason, overrideStatus: "pickedout", overrideDate: "2026-06-11" };
    expect(effectiveStatus(stale, fridayMorning).openStatus).toBe("open");
  });
});
