import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

// GET /api/locations -> active locations (for the till). ?all=1 (admins) lists all.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  const all = new URL(req.url).searchParams.get("all") === "1" && session.user.role === "ADMIN";
  const locations = await prisma.location.findMany({
    where: all ? {} : { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, active: true },
  });
  return NextResponse.json(locations);
}

// POST /api/locations -> add a location (admins only).
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
  const name = (body.name ?? "").trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: "Please enter a location name." }, { status: 400 });

  try {
    const loc = await prisma.location.upsert({
      where: { name },
      update: { active: true },
      create: { name },
      select: { id: true, name: true, active: true },
    });
    return NextResponse.json(loc, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Couldn't add that location." }, { status: 500 });
  }
}
