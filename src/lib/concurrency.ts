/**
 * Guarding writes that carry an absolute value.
 *
 * Picking is recorded as "this row is now 60% picked from the near end", not
 * as a delta. Two people working the same patch therefore overwrite each other
 * silently: the second save simply asserts its own figure over the first. The
 * caller states what the row read when it opened, and a write built on a
 * reading that has since moved is refused rather than applied.
 */

export interface Reading {
  pickedStart: number;
  pickedEnd: number;
}

export interface Claim {
  expectedStart?: unknown;
  expectedEnd?: unknown;
}

/**
 * Whether the caller has stated a baseline at all. Both figures are required:
 * half a claim cannot be checked, and is treated as no claim so that a client
 * which does not send them still works.
 */
export function statesBaseline(claim: Claim): boolean {
  return Number.isInteger(claim.expectedStart) && Number.isInteger(claim.expectedEnd);
}

/** Whether the write should be refused because the row has moved since. */
export function outOfDate(claim: Claim, current: Reading): boolean {
  if (!statesBaseline(claim)) return false;
  return claim.expectedStart !== current.pickedStart || claim.expectedEnd !== current.pickedEnd;
}
