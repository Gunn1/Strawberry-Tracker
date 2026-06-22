import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/sales -> the signed-in cashier's own sales for today, newest first.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  try {
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startOfToday() }, cashierId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch {
    return NextResponse.json({ error: "Failed to load sales" }, { status: 500 });
  }
}

// POST /api/sales -> create a multi-item order. Prices come from the products
// server-side so a tampered payload can't change what's recorded.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();

  let body: { items?: { productId?: string; quantity?: number }[]; tenderedCents?: number; location?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const tenderedCents = body.tenderedCents;
  if (
    items.length === 0 ||
    !Number.isInteger(tenderedCents) ||
    (tenderedCents as number) < 0 ||
    !items.every((it) => typeof it.productId === "string" && Number.isInteger(it.quantity) && (it.quantity as number) > 0)
  ) {
    return NextResponse.json({ error: "Invalid sale data" }, { status: 400 });
  }

  try {
    const ids = [...new Set(items.map((it) => it.productId as string))];
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = items.map((it) => {
      const p = byId.get(it.productId as string);
      if (!p) return null;
      const quantity = it.quantity as number;
      return { productId: p.id, productName: p.name, unit: p.unit, quantity, unitPriceCents: p.priceCents, totalCents: p.priceCents * quantity };
    });
    if (lines.some((l) => l === null)) return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    const goodLines = lines as NonNullable<(typeof lines)[number]>[];

    const orderTotal = goodLines.reduce((sum, l) => sum + l.totalCents, 0);
    if ((tenderedCents as number) < orderTotal) {
      return NextResponse.json({ error: "Tendered amount is less than total" }, { status: 400 });
    }

    const location = typeof body.location === "string" ? body.location.trim().slice(0, 60) || null : null;
    const groupId = crypto.randomUUID();
    const cashierId = session.user.id ?? null;
    const change = (tenderedCents as number) - orderTotal;

    await prisma.sale.createMany({
      data: goodLines.map((l, i) => ({
        productId: l.productId,
        productName: l.productName,
        unit: l.unit,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        totalCents: l.totalCents,
        tenderedCents: i === 0 ? (tenderedCents as number) : 0,
        changeCents: i === 0 ? change : 0,
        cashierId,
        location,
        groupId,
      })),
    });

    // Draw down per-location, per-product stock if this location tracks it.
    if (location) {
      const loc = await prisma.location.findUnique({
        where: { name: location },
        select: { id: true, trackStock: true, stock: { select: { productId: true, quantity: true } } },
      });
      if (loc?.trackStock) {
        const onHand = new Map(loc.stock.map((s) => [s.productId, s.quantity]));
        const sold = new Map<string, number>();
        for (const l of goodLines) sold.set(l.productId, (sold.get(l.productId) ?? 0) + l.quantity);
        await prisma.$transaction(
          [...sold].map(([productId, qty]) => {
            const next = Math.max(0, (onHand.get(productId) ?? 0) - qty);
            return prisma.locationStock.upsert({
              where: { locationId_productId: { locationId: loc.id, productId } },
              update: { quantity: next },
              create: { locationId: loc.id, productId, quantity: next },
            });
          }),
        );
      }
    }

    return NextResponse.json({ ok: true, groupId, changeCents: change }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save sale" }, { status: 500 });
  }
}
