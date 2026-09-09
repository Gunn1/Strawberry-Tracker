import { describe, expect, it } from "vitest";

import { formatCents, makeChange, parseCents } from "./money";

describe("formatCents", () => {
  it("renders whole and part dollars", () => {
    expect(formatCents(1250)).toBe("$12.50");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(5)).toBe("$0.05");
  });

  it("keeps the sign on negative amounts", () => {
    expect(formatCents(-505)).toBe("-$5.05");
  });

  it("groups thousands", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
  });
});

describe("parseCents", () => {
  it("reads typed dollar amounts", () => {
    expect(parseCents("12.5")).toBe(1250);
    expect(parseCents("0.99")).toBe(99);
  });

  it("treats anything unparseable as zero", () => {
    expect(parseCents("abc")).toBe(0);
    expect(parseCents("")).toBe(0);
  });
});

describe("makeChange", () => {
  it("uses the fewest bills and coins", () => {
    expect(makeChange(3767)).toEqual([
      { count: 1, label: "$20" },
      { count: 1, label: "$10" },
      { count: 1, label: "$5" },
      { count: 2, label: "$1" },
      { count: 2, label: "25¢" },
      { count: 1, label: "10¢" },
      { count: 1, label: "5¢" },
      { count: 2, label: "1¢" },
    ]);
  });

  it("gives nothing back for exact cash", () => {
    expect(makeChange(0)).toEqual([]);
    expect(makeChange(-100)).toEqual([]);
  });
});
