import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/prisma";

const SELECT = { id: true, name: true, unit: true, priceCents: true, active: true, sortOrder: true } as const;

// GET /api/products -> active products (for the till). ?all=1 (admins) lists all.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prisma = getPrisma();
  const all = new URL(req.url).searchParams.get("all") === "1" && session.user.role === "ADMIN";
  const products = await prisma.product.findMany({
    where: all ? {} : { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: SELECT,
  });
  return NextResponse.json(products);
}

// POST /api/products -> add a product (admins only).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const prisma = getPrisma();

  let body: { name?: string; unit?: string; priceCents?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = (body.name ?? "").trim().slice(0, 40);
  const unit = (body.unit ?? "each").trim().slice(0, 10) || "each";
  const priceCents = Number.isInteger(body.priceCents) && (body.priceCents as number) >= 0 ? (body.priceCents as number) : 0;
  if (!name) return NextResponse.json({ error: "Please enter a product name." }, { status: 400 });

  try {
    const count = await prisma.product.count();
    const product = await prisma.product.create({ data: { name, unit, priceCents, sortOrder: count }, select: SELECT });
    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Couldn't add that product." }, { status: 500 });
  }
}
