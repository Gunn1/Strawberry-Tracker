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

  let body: { name?: string; variety?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    // Apply a variety to every row in the patch (a quick "set for whole patch").
    if (body.variety !== undefined) {
      const variety = body.variety ? String(body.variety).trim().slice(0, 40) || null : null;
      await prisma.fieldRow.updateMany({ where: { patchId: id }, data: { variety } });
    }
    const data: { name?: string } = {};
    if (body.name !== undefined) {
      const name = body.name.trim().slice(0, 40);
      if (!name) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
      data.name = name;
    }
    const patch = await prisma.patch.update({
      where: { id },
      data,
      include: { rows: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });
    return NextResponse.json(patch);
  } catch {
    return NextResponse.json({ error: "Couldn't update that patch." }, { status: 500 });
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
