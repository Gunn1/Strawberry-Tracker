import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "ADMIN") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session };
}

// PATCH /api/field/patches/:id -> rename a patch (admins only).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const prisma = getPrisma();
  const { id } = await ctx.params;

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = (body.name ?? "").trim().slice(0, 40);
  if (!name) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });

  try {
    const patch = await prisma.patch.update({ where: { id }, data: { name }, include: { rows: true } });
    return NextResponse.json(patch);
  } catch {
    return NextResponse.json({ error: "Couldn't rename that patch." }, { status: 500 });
  }
}

// DELETE /api/field/patches/:id -> remove a patch and its rows (admins only).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const prisma = getPrisma();
  const { id } = await ctx.params;
  try {
    await prisma.patch.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn't remove that patch." }, { status: 500 });
  }
}
