import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

// GET /api/field -> all patches with their rows (for the field board).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  try {
    const patches = await prisma.patch.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { rows: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });
    return NextResponse.json(patches);
  } catch {
    return NextResponse.json({ error: "Failed to load the field." }, { status: 500 });
  }
}

// POST /api/field -> add a patch (admins only).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const prisma = getPrisma();

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = (body.name ?? "").trim().slice(0, 40);
  if (!name) return NextResponse.json({ error: "Please enter a patch name." }, { status: 400 });

  try {
    const count = await prisma.patch.count();
    const patch = await prisma.patch.create({ data: { name, sortOrder: count }, include: { rows: true } });
    return NextResponse.json(patch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Couldn't add that patch." }, { status: 500 });
  }
}
