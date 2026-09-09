import { describe, expect, it } from "vitest";

import { summarizeSales, type ReportableSale } from "./reports";

function sale(overrides: Partial<ReportableSale> = {}): ReportableSale {
  return {
    createdAt: new Date("2026-06-12T14:00:00Z"),
    productName: "Strawberries",
    unit: "qt",
    quantity: 1,
    totalCents: 500,
    tenderedCents: 0,
    changeCents: 0,
    location: "The Farm",
    cashierId: "u1",
    cashier: { name: "Ada", email: "ada@example.com" },
    ...overrides,
  };
}

describe("summarizeSales", () => {
  // A two-line order carries its tender and change on the first line only, so
  // summing those columns must not double-count the order.
  const summary = summarizeSales([
    sale({ quantity: 2, totalCents: 1000, tenderedCents: 2000, changeCents: 500 }),
    sale({ productName: "Rhubarb", unit: "lb", totalCents: 500 }),
    sale({
      createdAt: new Date("2026-06-11T14:00:00Z"),
      totalCents: 300,
      cashierId: "u2",
      cashier: { name: null, email: "bo@example.com" },
      location: null,
    }),
  ]);

  it("totals revenue, tender and change", () => {
    expect(summary.count).toBe(3);
    expect(summary.revenue).toBe(1800);
    expect(summary.tendered).toBe(2000);
    expect(summary.change).toBe(500);
  });

  it("ranks products by revenue and sums their units", () => {
    expect(summary.byProduct.map((p) => [p.name, p.units, p.revenue])).toEqual([
      ["Strawberries", 3, 1300],
      ["Rhubarb", 1, 500],
    ]);
  });

  it("groups by farm-local day, newest first", () => {
    expect(summary.byDay).toEqual([
      { date: "2026-06-12", revenue: 1500, count: 2 },
      { date: "2026-06-11", revenue: 300, count: 1 },
    ]);
  });

  it("names a cashier by email when they have no name", () => {
    expect(summary.byCashier.map((c) => [c.name, c.revenue])).toEqual([
      ["Ada", 1500],
      ["bo@example.com", 300],
    ]);
  });

  it("labels sales with no location", () => {
    expect(summary.byLocation.map((l) => [l.name, l.revenue])).toEqual([
      ["The Farm", 1500],
      ["Unspecified", 300],
    ]);
  });

  it("returns empty totals for no sales", () => {
    const empty = summarizeSales([]);
    expect(empty.count).toBe(0);
    expect(empty.revenue).toBe(0);
    expect(empty.byProduct).toEqual([]);
  });
});
