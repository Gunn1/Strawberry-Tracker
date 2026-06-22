import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getPrisma } from "@/prisma";
import { authOptions } from "@/lib/auth";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// GET /api/sales/summary?range=today|7d|30d|all -> aggregated till numbers (admins).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const prisma = getPrisma();

  const range = new URL(req.url).searchParams.get("range") ?? "today";
  let since: Date | null;
  const today = startOfToday();
  if (range === "7d") {
    since = new Date(today);
    since.setDate(since.getDate() - 6);
  } else if (range === "30d") {
    since = new Date(today);
    since.setDate(since.getDate() - 29);
  } else if (range === "all") {
    since = null;
  } else {
    since = today;
  }

  try {
    const sales = await prisma.sale.findMany({
      where: since ? { createdAt: { gte: since } } : {},
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        productName: true,
        unit: true,
        quantity: true,
        totalCents: true,
        tenderedCents: true,
        changeCents: true,
        location: true,
        cashierId: true,
        cashier: { select: { name: true, email: true } },
      },
    });

    let revenue = 0;
    let tendered = 0;
    let change = 0;
    const productMap = new Map<string, { name: string; unit: string; units: number; revenue: number; count: number }>();
    const dayMap = new Map<string, { revenue: number; count: number }>();
    const cashierMap = new Map<string, { id: string; name: string; count: number; revenue: number }>();
    const locMap = new Map<string, { name: string; count: number; revenue: number }>();

    for (const s of sales) {
      revenue += s.totalCents;
      tendered += s.tenderedCents;
      change += s.changeCents;

      const pName = s.productName || "—";
      const pm = productMap.get(pName) ?? { name: pName, unit: s.unit, units: 0, revenue: 0, count: 0 };
      pm.units += s.quantity;
      pm.revenue += s.totalCents;
      pm.count += 1;
      productMap.set(pName, pm);

      const key = dayKey(s.createdAt);
      const d = dayMap.get(key) ?? { revenue: 0, count: 0 };
      d.revenue += s.totalCents;
      d.count += 1;
      dayMap.set(key, d);

      const cid = s.cashierId ?? "unknown";
      const c = cashierMap.get(cid) ?? { id: cid, name: s.cashier?.name || s.cashier?.email || "Unknown", count: 0, revenue: 0 };
      c.count += 1;
      c.revenue += s.totalCents;
      cashierMap.set(cid, c);

      const locName = s.location || "Unspecified";
      const l = locMap.get(locName) ?? { name: locName, count: 0, revenue: 0 };
      l.count += 1;
      l.revenue += s.totalCents;
      locMap.set(locName, l);
    }

    const byProduct = [...productMap.values()].sort((a, b) => b.revenue - a.revenue);
    const byDay = [...dayMap.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => (a.date < b.date ? 1 : -1));
    const byCashier = [...cashierMap.values()].sort((a, b) => b.revenue - a.revenue);
    const byLocation = [...locMap.values()].sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      range,
      since: since ? since.toISOString() : null,
      count: sales.length,
      revenue,
      tendered,
      change,
      byProduct,
      byDay,
      byCashier,
      byLocation,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load sales summary" }, { status: 500 });
  }
}
