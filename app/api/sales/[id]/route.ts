import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getPrisma } from "@/prisma";
import { authOptions } from "@/lib/auth";

const STOCK_COL: Record<string, "stockQuart" | "stockAsparagus" | "stockRhubarb"> = {
  prod_quart: "stockQuart",
  prod_asparagus: "stockAsparagus",
  prod_rhubarb: "stockRhubarb",
};

const SALE_SELECT = {
  id: true,
  createdAt: true,
  productId: true,
  productName: true,
  unit: true,
  quantity: true,
  unitPriceCents: true,
  totalCents: true,
  tenderedCents: true,
  changeCents: true,
  location: true,
  cashierId: true,
  cashier: { select: { name: true, email: true } },
} as const;

// PATCH /api/sales/:id -> edit a recorded sale (admins only).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const prisma = getPrisma();
  const { id } = await ctx.params;

  let body: { productId?: string; quantity?: number; location?: string | null; cashierId?: string | null; createdAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  let quantity = existing.quantity;
  let unitPriceCents = existing.unitPriceCents;
  let moneyDirty = false;

  if (body.productId !== undefined) {
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product) return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    data.productId = product.id;
    data.productName = product.name;
    data.unit = product.unit;
    unitPriceCents = product.priceCents;
    moneyDirty = true;
  }
  if (body.quantity !== undefined) {
    if (!Number.isInteger(body.quantity) || body.quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be a whole number above zero." }, { status: 400 });
    }
    quantity = body.quantity;
    data.quantity = quantity;
    moneyDirty = true;
  }
  if (body.location !== undefined) data.location = body.location ? String(body.location).trim().slice(0, 60) || null : null;
  if (body.cashierId !== undefined) data.cashierId = body.cashierId || null;
  if (body.createdAt !== undefined) {
    const dt = new Date(body.createdAt);
    if (isNaN(dt.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    data.createdAt = dt;
  }

  if (moneyDirty) {
    const totalCents = unitPriceCents * quantity;
    let tenderedCents = existing.tenderedCents;
    let changeCents = tenderedCents - totalCents;
    if (changeCents < 0) {
      tenderedCents = totalCents;
      changeCents = 0;
    }
    data.unitPriceCents = unitPriceCents;
    data.totalCents = totalCents;
    data.tenderedCents = tenderedCents;
    data.changeCents = changeCents;
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    const updated = await prisma.sale.update({ where: { id }, data, select: SALE_SELECT });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Couldn't update that sale." }, { status: 500 });
  }
}

// DELETE /api/sales/:id -> void a mis-rung sale so it drops out of the day's totals.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  const { id } = await ctx.params;
  try {
    const sale = await prisma.sale.findUnique({ where: { id }, select: { productId: true, quantity: true, location: true } });
    await prisma.sale.delete({ where: { id } });
    // Put stock back if its location tracks inventory (original three only).
    const col = sale?.productId ? STOCK_COL[sale.productId] : undefined;
    if (sale?.location && col) {
      const loc = await prisma.location.findUnique({ where: { name: sale.location }, select: { id: true, trackStock: true } });
      if (loc?.trackStock) {
        await prisma.location.update({ where: { id: loc.id }, data: { [col]: { increment: sale.quantity } } });
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to void sale" }, { status: 500 });
  }
}
