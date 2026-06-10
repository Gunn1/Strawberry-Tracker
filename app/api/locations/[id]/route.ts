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

// PATCH /api/locations/:id -> rename or show/hide a location.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const prisma = getPrisma();
  const { id } = await ctx.params;

  let body: { name?: string; active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { name?: string; active?: boolean } = {};
  if (body.name !== undefined) {
    const name = body.name.trim().slice(0, 60);
    if (!name) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    data.name = name;
  }
  if (body.active !== undefined) data.active = !!body.active;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    const loc = await prisma.location.update({ where: { id }, data, select: { id: true, name: true, active: true } });
    return NextResponse.json(loc);
  } catch {
    return NextResponse.json({ error: "Couldn't update that location." }, { status: 500 });
  }
}

// DELETE /api/locations/:id -> remove a location (past sales keep their stored name).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const prisma = getPrisma();
  const { id } = await ctx.params;
  try {
    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn't remove that location." }, { status: 500 });
  }
}
