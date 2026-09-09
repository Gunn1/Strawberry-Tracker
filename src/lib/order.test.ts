import { describe, expect, it } from "vitest";

import { reorder } from "./order";

describe("reorder", () => {
  const rows = ["a", "b", "c"];

  it("swaps with the neighbour in each direction", () => {
    expect(reorder(rows, 1, "up")).toEqual(["b", "a", "c"]);
    expect(reorder(rows, 1, "down")).toEqual(["a", "c", "b"]);
  });

  it("refuses to move past either end", () => {
    expect(reorder(rows, 0, "up")).toBeNull();
    expect(reorder(rows, 2, "down")).toBeNull();
  });

  it("refuses an index that isn't in the list", () => {
    expect(reorder(rows, -1, "up")).toBeNull();
    expect(reorder(rows, 9, "down")).toBeNull();
    expect(reorder([], 0, "up")).toBeNull();
  });

  it("leaves the original alone", () => {
    const original = [...rows];
    reorder(rows, 1, "up");
    expect(rows).toEqual(original);
  });
});
