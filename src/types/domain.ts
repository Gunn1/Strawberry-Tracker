// The shapes the API returns, as the browser sees them: dates are ISO strings,
// money is integer cents. These mirror the `select` shapes in
// src/lib/db/select.ts — change the two together.

export type Role = "ADMIN" | "STAFF";

export interface Product {
  id: string;
  name: string;
  unit: string;
  priceCents: number;
  active: boolean;
  sortOrder: number;
}

export interface StockEntry {
  productId: string;
  quantity: number;
}

export interface Location {
  id: string;
  name: string;
  active: boolean;
  trackStock: boolean;
  stock: StockEntry[];
}

export interface Cashier {
  name: string | null;
  email: string | null;
}

/** One line of a sale. A multi-item order shares one `groupId` across its lines. */
export interface Sale {
  id: string;
  createdAt: string;
  productId: string | null;
  productName: string;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  tenderedCents: number;
  changeCents: number;
  location: string | null;
  groupId: string | null;
  cashierId: string | null;
  cashier: Cashier | null;
}

export interface StaffUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  createdAt: string;
}

/** The signed-in user, as /api/me reports them. */
export interface CurrentUser {
  email: string | null;
  name: string | null;
  role: Role;
}

export const ROW_STATUSES = [
  "OPEN",
  "STAFF_PICKING",
  "CLOSED",
  "RESTING",
  "PICKED_OUT",
  "NEEDS_ATTENTION",
] as const;
export type RowStatus = (typeof ROW_STATUSES)[number];

export function isRowStatus(value: unknown): value is RowStatus {
  return (ROW_STATUSES as readonly unknown[]).includes(value);
}

/** A row of berries, picked inward from both ends. */
export interface FieldRow {
  id: string;
  patchId: string;
  label: string;
  variety: string | null;
  sortOrder: number;
  pickedStart: number;
  pickedEnd: number;
  status: RowStatus;
  note: string | null;
}

export interface RowEvent {
  id: string;
  rowId: string;
  pickedStart: number;
  pickedEnd: number;
  status: RowStatus;
  userName: string | null;
  createdAt: string;
}

export interface Patch {
  id: string;
  fieldId: string;
  name: string;
  sortOrder: number;
  active: boolean;
  rows: FieldRow[];
}

/** A named parcel of land holding patches. Labels orient the map. */
export interface Field {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  /** What borders the far end of the rows, e.g. "Treeline". */
  farLabel: string;
  /** What borders the near end, where you walk in, e.g. "Road & parking". */
  nearLabel: string;
  patches: Patch[];
}

/** Aggregated till numbers from /api/sales/summary. */
export interface SalesSummary {
  range: string;
  since: string | null;
  count: number;
  revenue: number;
  tendered: number;
  change: number;
  byProduct: { name: string; unit: string; units: number; revenue: number; count: number }[];
  byDay: { date: string; revenue: number; count: number }[];
  byCashier: { id: string; name: string; count: number; revenue: number }[];
  byLocation: { name: string; count: number; revenue: number }[];
}
