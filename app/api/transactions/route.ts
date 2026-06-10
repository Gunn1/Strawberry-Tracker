import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/transactions?range=today|7d|30d|all -> individual sales (admins only).
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
      take: 500,
      select: {
        id: true,
        createdAt: true,
        mode: true,
        quantity: true,
        unitPriceCents: true,
        totalCents: true,
        tenderedCents: true,
        changeCents: true,
        location: true,
        cashierId: true,
        cashier: { select: { name: true, email: true } },
      },
    });
    return NextResponse.json(sales);
  } catch {
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
