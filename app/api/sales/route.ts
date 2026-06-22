import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

type SaleMode = "QUART" | "ASPARAGUS" | "RHUBARB";

const PRICE_FIELD: Record<SaleMode, "quartCents" | "asparagusCents" | "rhubarbCents"> = {
  QUART: "quartCents",
  ASPARAGUS: "asparagusCents",
  RHUBARB: "rhubarbCents",
};

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

// POST /api/sales -> create a sale. Totals are recomputed server-side from
// the saved prices so a tampered client payload can't change what's recorded.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();

  let body: { items?: { mode?: SaleMode; quantity?: number }[]; tenderedCents?: number; location?: string };
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
    !items.every(
      (it) =>
        (it.mode === "QUART" || it.mode === "ASPARAGUS" || it.mode === "RHUBARB") &&
        Number.isInteger(it.quantity) &&
        (it.quantity as number) > 0,
    )
  ) {
    return NextResponse.json({ error: "Invalid sale data" }, { status: 400 });
  }

  try {
    const settings = await prisma.standSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });

    // Server-side line totals so a tampered payload can't change what's recorded.
    const lines = items.map((it) => {
      const unitPriceCents = settings[PRICE_FIELD[it.mode as SaleMode]];
      return { mode: it.mode as SaleMode, quantity: it.quantity as number, unitPriceCents, totalCents: unitPriceCents * (it.quantity as number) };
    });
    const orderTotal = lines.reduce((sum, l) => sum + l.totalCents, 0);

    if ((tenderedCents as number) < orderTotal) {
      return NextResponse.json({ error: "Tendered amount is less than total" }, { status: 400 });
    }

    const location = typeof body.location === "string" ? body.location.trim().slice(0, 60) || null : null;
    const groupId = crypto.randomUUID();
    const cashierId = session?.user?.id ?? null;
    const change = (tenderedCents as number) - orderTotal;

    // Record the transaction's cash on the first line only, so report totals
    // (revenue / tendered / change) stay accurate while each line keeps its product.
    await prisma.sale.createMany({
      data: lines.map((l, i) => ({
        mode: l.mode,
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

    return NextResponse.json({ ok: true, groupId, changeCents: change }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save sale" }, { status: 500 });
  }
}
