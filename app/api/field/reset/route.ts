import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

// POST /api/field/reset -> mark rows fresh again (admins only).
// Body { patchId } resets one patch; no body resets the whole field.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const prisma = getPrisma();

  let patchId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    patchId = body?.patchId ? String(body.patchId) : undefined;
  } catch {
    patchId = undefined;
  }

  try {
    await prisma.fieldRow.updateMany({
      where: patchId ? { patchId } : {},
      data: { pickedStart: 0, pickedEnd: 0 },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn't reset the field." }, { status: 500 });
  }
}
