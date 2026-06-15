import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

function clampPct(v: unknown): number | null {
  if (!Number.isFinite(v as number)) return null;
  const n = Math.round(v as number);
  return Math.max(0, Math.min(100, n));
}

// PATCH /api/field/rows/:id -> update picked progress (any staff) or label (admins).
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  const { id } = await ctx.params;

  let body: { pickedStart?: number; pickedEnd?: number; label?: string; status?: string; note?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.fieldRow.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const STATUSES = ["OPEN", "CLOSED", "RESTING", "PICKED_OUT", "NEEDS_ATTENTION"];
  const data: {
    pickedStart?: number;
    pickedEnd?: number;
    label?: string;
    status?: "OPEN" | "CLOSED" | "RESTING" | "PICKED_OUT" | "NEEDS_ATTENTION";
    note?: string | null;
  } = {};

  // Status and note are admin-only.
  if (body.status !== undefined || body.note !== undefined) {
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      data.status = body.status as typeof data.status;
    }
    if (body.note !== undefined) {
      const note = body.note ? String(body.note).trim().slice(0, 120) : "";
      data.note = note || null;
    }
  }

  if (body.pickedStart !== undefined || body.pickedEnd !== undefined) {
    let start = body.pickedStart !== undefined ? clampPct(body.pickedStart) : existing.pickedStart;
    let end = body.pickedEnd !== undefined ? clampPct(body.pickedEnd) : existing.pickedEnd;
    if (start === null || end === null) return NextResponse.json({ error: "Invalid value" }, { status: 400 });
    // The two ends can't overlap past the middle.
    if (start + end > 100) {
      if (body.pickedStart !== undefined) end = 100 - start;
      else start = 100 - end;
    }
    data.pickedStart = start;
    data.pickedEnd = end;
  }

  // Only admins may rename a row.
  if (body.label !== undefined) {
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const label = body.label.trim().slice(0, 30);
    if (!label) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    data.label = label;
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    const row = await prisma.fieldRow.update({ where: { id }, data });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Couldn't update that row." }, { status: 500 });
  }
}

// DELETE /api/field/rows/:id -> remove a row (admins only).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const prisma = getPrisma();
  const { id } = await ctx.params;
  try {
    await prisma.fieldRow.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn't remove that row." }, { status: 500 });
  }
}
