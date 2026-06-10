import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getPrisma } from "@/prisma";
import { authOptions } from "@/lib/auth";

type SaleMode = "QUART" | "ASPARAGUS" | "RHUBARB";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Local YYYY-MM-DD key for grouping sales into days.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// GET /api/sales/summary?range=today|7d|30d|all
// Aggregated till numbers for the staff sales report.
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
    since = today; // "today"
  }

  try {
    const sales = await prisma.sale.findMany({
      where: since ? { createdAt: { gte: since } } : {},
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        mode: true,
        quantity: true,
        totalCents: true,
        tenderedCents: true,
        changeCents: true,
      },
    });

    let revenue = 0;
    let tendered = 0;
    let change = 0;
    const byMode: Record<SaleMode, { units: number; revenue: number; count: number }> = {
      QUART: { units: 0, revenue: 0, count: 0 },
      ASPARAGUS: { units: 0, revenue: 0, count: 0 },
      RHUBARB: { units: 0, revenue: 0, count: 0 },
    };
    const dayMap = new Map<string, { revenue: number; count: number }>();

    for (const s of sales) {
      revenue += s.totalCents;
      tendered += s.tenderedCents;
      change += s.changeCents;

      const m = byMode[s.mode as SaleMode];
      if (m) {
        m.units += s.quantity;
        m.revenue += s.totalCents;
        m.count += 1;
      }

      const key = dayKey(s.createdAt);
      const d = dayMap.get(key) ?? { revenue: 0, count: 0 };
      d.revenue += s.totalCents;
      d.count += 1;
      dayMap.set(key, d);
    }

    const byDay = [...dayMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

    return NextResponse.json({
      range,
      since: since ? since.toISOString() : null,
      count: sales.length,
      revenue,
      tendered,
      change,
      byMode,
      byDay,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load sales summary" }, { status: 500 });
  }
}
