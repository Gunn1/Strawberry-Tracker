import { describe, expect, it } from "vitest";

import { outOfDate, statesBaseline } from "./concurrency";

const current = { pickedStart: 40, pickedEnd: 10 };

describe("statesBaseline", () => {
  it("needs both figures to be checkable", () => {
    expect(statesBaseline({ expectedStart: 0, expectedEnd: 0 })).toBe(true);
    expect(statesBaseline({ expectedStart: 40 })).toBe(false);
    expect(statesBaseline({ expectedEnd: 10 })).toBe(false);
    expect(statesBaseline({})).toBe(false);
  });

  it("ignores anything that is not a whole number", () => {
    expect(statesBaseline({ expectedStart: "40", expectedEnd: "10" })).toBe(false);
    expect(statesBaseline({ expectedStart: 40.5, expectedEnd: 10 })).toBe(false);
    expect(statesBaseline({ expectedStart: null, expectedEnd: null })).toBe(false);
  });
});

describe("outOfDate", () => {
  it("passes a write built on what the row actually reads", () => {
    expect(outOfDate({ expectedStart: 40, expectedEnd: 10 }, current)).toBe(false);
  });

  it("refuses one built on a reading that has since moved", () => {
    expect(outOfDate({ expectedStart: 0, expectedEnd: 0 }, current)).toBe(true);
    expect(outOfDate({ expectedStart: 40, expectedEnd: 0 }, current)).toBe(true);
    expect(outOfDate({ expectedStart: 0, expectedEnd: 10 }, current)).toBe(true);
  });

  // A caller that says nothing cannot be checked, and must still work.
  it("lets a write with no stated baseline through", () => {
    expect(outOfDate({}, current)).toBe(false);
    expect(outOfDate({ expectedStart: 40 }, current)).toBe(false);
  });

  // Zero is a real reading, not a missing one.
  it("treats zero as a stated baseline", () => {
    expect(outOfDate({ expectedStart: 0, expectedEnd: 0 }, { pickedStart: 0, pickedEnd: 0 })).toBe(false);
    expect(outOfDate({ expectedStart: 0, expectedEnd: 0 }, { pickedStart: 5, pickedEnd: 0 })).toBe(true);
  });
});
