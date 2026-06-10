import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

// GET /api/settings -> the singleton settings row (created with defaults if missing)
export async function GET() {
  const prisma = getPrisma();
  try {
    const settings = await prisma.standSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    return NextResponse.json({
      quartCents: settings.quartCents,
      asparagusCents: settings.asparagusCents,
      rhubarbCents: settings.rhubarbCents,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

// PUT /api/settings -> update prices (admins only)
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const prisma = getPrisma();

  let body: { quartCents?: number; asparagusCents?: number; rhubarbCents?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { quartCents, asparagusCents, rhubarbCents } = body;

  if (
    !Number.isInteger(quartCents) || (quartCents as number) < 0 ||
    !Number.isInteger(asparagusCents) || (asparagusCents as number) < 0 ||
    !Number.isInteger(rhubarbCents) || (rhubarbCents as number) < 0
  ) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }

  try {
    const settings = await prisma.standSettings.upsert({
      where: { id: "default" },
      update: { quartCents, asparagusCents, rhubarbCents },
      create: { id: "default", quartCents, asparagusCents, rhubarbCents },
    });
    return NextResponse.json({
      quartCents: settings.quartCents,
      asparagusCents: settings.asparagusCents,
      rhubarbCents: settings.rhubarbCents,
    });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
