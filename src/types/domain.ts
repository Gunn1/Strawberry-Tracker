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
  /** What borders the far end of this patch's rows, e.g. "Treeline". */
  farLabel: string;
  /** What borders the near end, where you walk in, e.g. "Road & parking". */
  nearLabel: string;
  rows: FieldRow[];
}

/** A named parcel of land holding patches. */
export interface Field {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
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

/* ---------------------------------------------------------------- */
/* Booking                                                          */
/* ---------------------------------------------------------------- */

/** One picking window, with the room left in it. */
export interface BookingWindow {
  /** Farm-local YYYY-MM-DD. */
  date: string;
  startMin: number;
  endMin: number;
  capacity: number;
  booked: number;
  remaining: number;
}

export interface BookingDay {
  date: string;
  windows: BookingWindow[];
}

/** What /api/booking/availability returns. */
export interface Availability {
  /** False when booking or the season is switched off. */
  open: boolean;
  slotMinutes: number;
  days: BookingDay[];
}

/** A reservation as its holder sees it, reached by the token in their email. */
export interface Reservation {
  token: string;
  name: string;
  email: string;
  partySize: number;
  cancelledAt: string | null;
  slot: { date: string; startMin: number; endMin: number };
}

/** A window with its guest list, for staff. */
export interface BookedSlot {
  date: string;
  startMin: number;
  endMin: number;
  capacity: number;
  booked: number;
  /** True when this window has a capacity of its own, not the default. */
  overridden: boolean;
  reservations: {
    id: string;
    name: string;
    email: string;
    partySize: number;
    createdAt: string;
  }[];
}

/** What the staff bookings screen loads. */
export interface BookingBoard {
  open: boolean;
  defaultCapacity: number;
  slots: BookedSlot[];
}

/** Everything /api/status exposes as `config`: the schedule plus booking. */
export interface StandConfig {
  seasonActive: boolean;
  openMin: number;
  closeMin: number;
  finishByMin: number;
  openDays: string;
  overrideStatus: string;
  overrideDate: string;
  statusNote: string;
  bookingEnabled: boolean;
  slotMinutes: number;
  slotCapacity: number;
  bookingDays: number;
}

/** Someone waiting to hear that picking has opened. */
export interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
}
