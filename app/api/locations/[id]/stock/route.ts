import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

function clampInt(v: unknown): number | null {
  if (!Number.isFinite(v as number)) return null;
  return Math.max(0, Math.round(v as number));
}

const LOC_SELECT = {
  id: true,
  name: true,
  active: true,
  trackStock: true,
  stock: { select: { productId: true, quantity: true } },
} as const;

// PATCH /api/locations/:id/stock -> set on-hand stock per product (any staff).
// Body: { stock: { [productId]: quantity } }.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  const { id } = await ctx.params;

  let body: { stock?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const stock = body.stock;
  if (!stock || typeof stock !== "object") return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const entries: { productId: string; quantity: number }[] = [];
  for (const [productId, raw] of Object.entries(stock)) {
    const quantity = clampInt(raw);
    if (quantity === null) return NextResponse.json({ error: "Invalid stock value" }, { status: 400 });
    entries.push({ productId, quantity });
  }
  if (entries.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    await prisma.$transaction(
      entries.map((e) =>
        prisma.locationStock.upsert({
          where: { locationId_productId: { locationId: id, productId: e.productId } },
          update: { quantity: e.quantity },
          create: { locationId: id, productId: e.productId, quantity: e.quantity },
        }),
      ),
    );
    const loc = await prisma.location.findUnique({ where: { id }, select: LOC_SELECT });
    return NextResponse.json(loc);
  } catch {
    return NextResponse.json({ error: "Couldn't update stock." }, { status: 500 });
  }
}
