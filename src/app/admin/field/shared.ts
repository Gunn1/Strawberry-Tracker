import type { Field, FieldRow, Patch, RowStatus } from "@/types/domain";

/** Badge colour, badge background, and the colour of a row's fresh segment. */
export const STATUS_META: Record<RowStatus, { label: string; color: string; bg: string; fill: string }> = {
  OPEN: { label: "Open", color: "#4f7a33", bg: "#e7f1da", fill: "#6f9e4a" },
  STAFF_PICKING: { label: "Staff picking", color: "#6b4fa0", bg: "#ece5f6", fill: "#8d72c4" },
  CLOSED: { label: "Closed", color: "#5b5b5b", bg: "#e9e9e9", fill: "#a6a6a6" },
  RESTING: { label: "Resting", color: "#2f6f8f", bg: "#dbebf3", fill: "#5f97b5" },
  PICKED_OUT: { label: "Picked out", color: "#9e2a20", bg: "#fbe3df", fill: "#c25b4d" },
  NEEDS_ATTENTION: { label: "Needs attention", color: "#8a5a0c", bg: "#fbeccb", fill: "#d9a441" },
};

/** Picking progress moves in steps this size. */
export const STEP = 5;

/** The straw fill standing for ground that has already been picked. */
export const STRAW = "repeating-linear-gradient(var(--straw-angle,90deg),#d6c4a2,#d6c4a2 6px,#cdba95 6px,#cdba95 12px)";

/** How much of a row is still unpicked, as a percentage. */
export function freshPct(row: Pick<FieldRow, "pickedStart" | "pickedEnd">): number {
  return Math.max(0, 100 - row.pickedStart - row.pickedEnd);
}

/** Mean freshness across rows. Returns 0 when there are none to average. */
export function meanFresh(rows: FieldRow[]): number {
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((sum, r) => sum + freshPct(r), 0) / rows.length);
}

export function fieldRows(field: Field): FieldRow[] {
  return field.patches.flatMap((p) => p.rows);
}

/** A row plus the patch it belongs to, for views that mix patches together. */
export interface LocatedRow {
  row: FieldRow;
  patch: Patch;
}

export function locatedRows(field: Field): LocatedRow[] {
  return field.patches.flatMap((patch) => patch.rows.map((row) => ({ row, patch })));
}

/**
 * Where to send the next group: the freshest row that is actually open to
 * pickers. Rows being worked by staff, resting or closed are not offers.
 */
export function bestRow(field: Field): LocatedRow | null {
  const open = locatedRows(field).filter((r) => r.row.status === "OPEN" && freshPct(r.row) > 0);
  if (open.length === 0) return null;
  return open.reduce((best, r) => (freshPct(r.row) > freshPct(best.row) ? r : best));
}

/** Colour for a freshness readout: green while it is worth picking. */
export function freshColor(pct: number): string {
  if (pct === 0) return "#9E2A20";
  if (pct < 25) return "#b06a16";
  return "#4f7a33";
}

/** Rows sorted so the best picking is first. */
export function byFreshest(rows: LocatedRow[]): LocatedRow[] {
  return [...rows].sort((a, b) => freshPct(b.row) - freshPct(a.row));
}
