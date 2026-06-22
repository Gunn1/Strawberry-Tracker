import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

const SELECT = { id: true, name: true, unit: true, priceCents: true, active: true, sortOrder: true } as const;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "ADMIN") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session };
}

// PATCH /api/products/:id -> edit name / unit / price / active (admins only).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const prisma = getPrisma();
  const { id } = await ctx.params;

  let body: { name?: string; unit?: string; priceCents?: number; active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { name?: string; unit?: string; priceCents?: number; active?: boolean } = {};
  if (body.name !== undefined) {
    const name = body.name.trim().slice(0, 40);
    if (!name) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    data.name = name;
  }
  if (body.unit !== undefined) data.unit = body.unit.trim().slice(0, 10) || "each";
  if (body.priceCents !== undefined) {
    if (!Number.isInteger(body.priceCents) || body.priceCents < 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    data.priceCents = body.priceCents;
  }
  if (body.active !== undefined) data.active = !!body.active;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    const product = await prisma.product.update({ where: { id }, data, select: SELECT });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Couldn't update that product." }, { status: 500 });
  }
}

// DELETE /api/products/:id -> remove a product (past sales keep their stored name).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const prisma = getPrisma();
  const { id } = await ctx.params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn't remove that product." }, { status: 500 });
  }
}
