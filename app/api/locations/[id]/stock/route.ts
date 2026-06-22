import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

function clampInt(v: unknown): number | null {
  if (!Number.isFinite(v as number)) return null;
  return Math.max(0, Math.round(v as number));
}

const STOCK_KEYS = ["stockQuart", "stockAsparagus", "stockRhubarb"] as const;

// PATCH /api/locations/:id/stock -> set on-hand stock levels (any signed-in staff).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, number> = {};
  for (const key of STOCK_KEYS) {
    if (body[key] !== undefined) {
      const v = clampInt(body[key]);
      if (v === null) return NextResponse.json({ error: "Invalid stock value" }, { status: 400 });
      data[key] = v;
    }
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    const loc = await prisma.location.update({
      where: { id },
      data,
      select: { id: true, name: true, active: true, trackStock: true, stockQuart: true, stockAsparagus: true, stockRhubarb: true },
    });
    return NextResponse.json(loc);
  } catch {
    return NextResponse.json({ error: "Couldn't update stock." }, { status: 500 });
  }
}
