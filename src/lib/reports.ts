// Turning raw sale rows into the numbers the admin reports show. Kept separate
// from the route handler so it's a pure function over rows: same input, same
// totals, no database.

import { farmDayKey } from "@/lib/format/datetime";

/** The sale fields the aggregation needs. */
export interface ReportableSale {
  createdAt: Date;
  productName: string;
  unit: string;
  quantity: number;
  totalCents: number;
  tenderedCents: number;
  changeCents: number;
  location: string | null;
  cashierId: string | null;
  cashier: { name: string | null; email: string | null } | null;
}

export interface SalesTotals {
  count: number;
  revenue: number;
  tendered: number;
  change: number;
  byProduct: { name: string; unit: string; units: number; revenue: number; count: number }[];
  byDay: { date: string; revenue: number; count: number }[];
  byCashier: { id: string; name: string; count: number; revenue: number }[];
  byLocation: { name: string; count: number; revenue: number }[];
}

/** Accumulate `value` into the entry at `key`, seeding it on first sight. */
function bucket<T>(map: Map<string, T>, key: string, seed: () => T, add: (entry: T) => void): void {
  const entry = map.get(key) ?? seed();
  add(entry);
  map.set(key, entry);
}

export function summarizeSales(sales: ReportableSale[]): SalesTotals {
  let revenue = 0;
  let tendered = 0;
  let change = 0;

  const products = new Map<string, SalesTotals["byProduct"][number]>();
  const days = new Map<string, SalesTotals["byDay"][number]>();
  const cashiers = new Map<string, SalesTotals["byCashier"][number]>();
  const locations = new Map<string, SalesTotals["byLocation"][number]>();

  for (const sale of sales) {
    revenue += sale.totalCents;
    tendered += sale.tenderedCents;
    change += sale.changeCents;

    const productName = sale.productName || "—";
    bucket(
      products,
      productName,
      () => ({ name: productName, unit: sale.unit, units: 0, revenue: 0, count: 0 }),
      (p) => {
        p.units += sale.quantity;
        p.revenue += sale.totalCents;
        p.count += 1;
      },
    );

    // Group by the farm's calendar day, not the server's.
    const date = farmDayKey(sale.createdAt);
    bucket(
      days,
      date,
      () => ({ date, revenue: 0, count: 0 }),
      (d) => {
        d.revenue += sale.totalCents;
        d.count += 1;
      },
    );

    const cashierId = sale.cashierId ?? "unknown";
    bucket(
      cashiers,
      cashierId,
      () => ({
        id: cashierId,
        name: sale.cashier?.name || sale.cashier?.email || "Unknown",
        count: 0,
        revenue: 0,
      }),
      (c) => {
        c.count += 1;
        c.revenue += sale.totalCents;
      },
    );

    const locationName = sale.location || "Unspecified";
    bucket(
      locations,
      locationName,
      () => ({ name: locationName, count: 0, revenue: 0 }),
      (l) => {
        l.count += 1;
        l.revenue += sale.totalCents;
      },
    );
  }

  const byRevenue = <T extends { revenue: number }>(a: T, b: T) => b.revenue - a.revenue;

  return {
    count: sales.length,
    revenue,
    tendered,
    change,
    byProduct: [...products.values()].sort(byRevenue),
    byDay: [...days.values()].sort((a, b) => (a.date < b.date ? 1 : -1)),
    byCashier: [...cashiers.values()].sort(byRevenue),
    byLocation: [...locations.values()].sort(byRevenue),
  };
}
