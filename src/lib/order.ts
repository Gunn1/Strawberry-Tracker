/**
 * Sibling ordering for things that are laid out in space: the rows across a
 * patch, the patches down a field. `sortOrder` is what the map draws by, so it
 * has to be able to change after the fact — a row added later may sit in the
 * middle of the ground, not at the end of the list.
 */

export type Direction = "up" | "down";

/**
 * Move the item at `index` one place. Returns the reordered list, or `null`
 * when the move is impossible, so callers can no-op instead of writing.
 */
export function reorder<T>(items: T[], index: number, direction: Direction): T[] | null {
  if (index < 0 || index >= items.length) return null;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return null;

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
