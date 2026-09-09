import { describe, expect, it } from "vitest";

import { farmDayKey, farmNow, formatClock, startOfFarmDay } from "./datetime";

// These matter because the code runs on Cloudflare Workers, where the server
// clock is UTC. A naive local midnight would roll "today" over five or six
// hours early and put the last evening's sales on the wrong day.
describe("farm-local days", () => {
  it("is still yesterday at the farm just after UTC midnight (summer, UTC-5)", () => {
    const lateEvening = new Date("2026-06-12T03:00:00Z"); // 22:00 on the 11th
    expect(farmDayKey(lateEvening)).toBe("2026-06-11");
    expect(startOfFarmDay(lateEvening).toISOString()).toBe("2026-06-11T05:00:00.000Z");
  });

  it("accounts for the winter offset (UTC-6)", () => {
    const lateEvening = new Date("2026-01-15T03:00:00Z"); // 21:00 on the 14th
    expect(farmDayKey(lateEvening)).toBe("2026-01-14");
    expect(startOfFarmDay(lateEvening).toISOString()).toBe("2026-01-14T06:00:00.000Z");
  });

  it("lands on real midnight across a daylight-saving change", () => {
    // 2026-03-08 is the spring-forward day: 02:00 CST becomes 03:00 CDT.
    const afternoon = new Date("2026-03-08T18:00:00Z");
    expect(farmDayKey(afternoon)).toBe("2026-03-08");
    expect(startOfFarmDay(afternoon).toISOString()).toBe("2026-03-08T06:00:00.000Z");
  });

  it("reports the weekday and minutes past midnight at the farm", () => {
    // 17:30 UTC on Friday 2026-06-12 is 12:30 in Chicago.
    expect(farmNow(new Date("2026-06-12T17:30:00Z"))).toEqual({
      weekday: 5,
      minutes: 750,
      date: "2026-06-12",
    });
  });
});

describe("formatClock", () => {
  it("names the edges of the day", () => {
    expect(formatClock(0)).toBe("midnight");
    expect(formatClock(720)).toBe("noon");
  });

  it("renders ordinary times", () => {
    expect(formatClock(420)).toBe("7 a.m.");
    expect(formatClock(750)).toBe("12:30 p.m.");
    expect(formatClock(1035)).toBe("5:15 p.m.");
  });
});
