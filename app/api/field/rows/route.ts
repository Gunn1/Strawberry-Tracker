import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

// POST /api/field/rows -> add a row to a patch (admins only).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const prisma = getPrisma();

  let body: { patchId?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const patchId = (body.patchId ?? "").trim();
  const label = (body.label ?? "").trim().slice(0, 30);
  if (!patchId) return NextResponse.json({ error: "Missing patch." }, { status: 400 });
  if (!label) return NextResponse.json({ error: "Please enter a row label." }, { status: 400 });

  try {
    const count = await prisma.fieldRow.count({ where: { patchId } });
    const row = await prisma.fieldRow.create({ data: { patchId, label, sortOrder: count } });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Couldn't add that row." }, { status: 500 });
  }
}
