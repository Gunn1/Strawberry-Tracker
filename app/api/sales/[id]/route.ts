import { NextResponse } from "next/server";
import { prisma } from "@/prisma";

// DELETE /api/sales/:id -> void a mis-rung sale so it drops out of the day's totals.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await prisma.sale.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to void sale" }, { status: 500 });
  }
}
