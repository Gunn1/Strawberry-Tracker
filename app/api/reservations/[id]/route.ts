import { NextResponse } from "next/server";
import { prisma } from "@/prisma";

// DELETE /api/reservations/:id -> cancel a reservation, freeing its spots.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await prisma.reservation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to cancel reservation" }, { status: 500 });
  }
}
