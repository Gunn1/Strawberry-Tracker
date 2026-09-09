import { describe, expect, it } from "vitest";

import type { Field, FieldRow, Patch, RowStatus } from "@/types/domain";
import { bestRow, byFreshest, freshColor, freshPct, locatedRows, meanFresh } from "./shared";

function row(id: string, pickedStart: number, pickedEnd: number, status: RowStatus = "OPEN"): FieldRow {
  return {
    id,
    patchId: "p1",
    label: `Row ${id}`,
    variety: null,
    sortOrder: 0,
    pickedStart,
    pickedEnd,
    status,
    note: null,
  };
}

function patch(id: string, name: string, rows: FieldRow[]): Patch {
  return { id, fieldId: "f1", name, sortOrder: 0, active: true, rows };
}

function field(patches: Patch[]): Field {
  return { id: "f1", name: "Home field", sortOrder: 0, active: true, farLabel: "", nearLabel: "", patches };
}

describe("freshPct", () => {
  it("is what neither end has taken", () => {
    expect(freshPct(row("a", 25, 20))).toBe(55);
    expect(freshPct(row("a", 0, 0))).toBe(100);
  });

  it("never goes negative, even if the two ends overlap", () => {
    expect(freshPct(row("a", 70, 60))).toBe(0);
  });
});

describe("meanFresh", () => {
  it("averages the rows", () => {
    expect(meanFresh([row("a", 0, 0), row("b", 50, 0), row("c", 100, 0)])).toBe(50);
  });

  it("is zero with nothing to average", () => {
    expect(meanFresh([])).toBe(0);
  });
});

describe("bestRow", () => {
  const rows = [
    patch("p1", "Patch A", [row("a1", 60, 0), row("a2", 10, 0)]),
    patch("p2", "Patch B", [row("b1", 5, 0)]),
  ];

  it("picks the freshest row and says which patch it is in", () => {
    const best = bestRow(field(rows));
    expect(best?.row.id).toBe("b1");
    expect(best?.patch.name).toBe("Patch B");
  });

  // A row being worked by staff, resting or closed is not somewhere to send
  // customers, however much fruit is left on it.
  it("ignores rows that are not open to pickers", () => {
    const guarded = [patch("p1", "Patch A", [row("a1", 0, 0, "STAFF_PICKING"), row("a2", 40, 0, "OPEN")])];
    expect(bestRow(field(guarded))?.row.id).toBe("a2");
  });

  it("ignores rows with nothing left", () => {
    const spent = [patch("p1", "Patch A", [row("a1", 100, 0), row("a2", 100, 0)])];
    expect(bestRow(field(spent))).toBeNull();
  });

  it("is null when there is nothing open at all", () => {
    expect(bestRow(field([patch("p1", "Patch A", [row("a1", 0, 0, "CLOSED")])]))).toBeNull();
  });

  it("is null for an empty farm", () => {
    expect(bestRow(field([]))).toBeNull();
  });
});

describe("locatedRows and byFreshest", () => {
  it("flattens every patch and orders greenest first", () => {
    const f = field([
      patch("p1", "Patch A", [row("a1", 60, 0), row("a2", 10, 0)]),
      patch("p2", "Patch B", [row("b1", 30, 0)]),
    ]);
    expect(byFreshest(locatedRows(f)).map((r) => r.row.id)).toEqual(["a2", "b1", "a1"]);
  });
});

describe("freshColor", () => {
  it("warns as a row runs down and marks a spent one", () => {
    expect(freshColor(80)).toBe("#4f7a33");
    expect(freshColor(10)).toBe("#b06a16");
    expect(freshColor(0)).toBe("#9E2A20");
  });
});
