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

  let body: { mode?: SaleMode; quantity?: number; tenderedCents?: number; location?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mode, quantity, tenderedCents } = body;

  if (
    (mode !== "QUART" && mode !== "ASPARAGUS" && mode !== "RHUBARB") ||
    !Number.isInteger(quantity) ||
    (quantity as number) <= 0 ||
    !Number.isInteger(tenderedCents) ||
    (tenderedCents as number) < 0
  ) {
    return NextResponse.json({ error: "Invalid sale data" }, { status: 400 });
  }

  try {
    const settings = await prisma.standSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });

    const unitPriceCents = settings[PRICE_FIELD[mode]];
    const totalCents = unitPriceCents * (quantity as number);

    if ((tenderedCents as number) < totalCents) {
      return NextResponse.json({ error: "Tendered amount is less than total" }, { status: 400 });
    }

    const location = typeof body.location === "string" ? body.location.trim().slice(0, 60) || null : null;

    const sale = await prisma.sale.create({
      data: {
        mode,
        quantity: quantity as number,
        unitPriceCents,
        totalCents,
        tenderedCents: tenderedCents as number,
        changeCents: (tenderedCents as number) - totalCents,
        cashierId: session?.user?.id ?? null,
        location,
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save sale" }, { status: 500 });
  }
}
