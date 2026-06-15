import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

// GET /api/field/rows/:id/history -> the row's recorded changes (newest first).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  const { id } = await ctx.params;
  try {
    const events = await prisma.rowEvent.findMany({
      where: { rowId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: "Failed to load history." }, { status: 500 });
  }
}
