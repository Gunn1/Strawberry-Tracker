import { requireAdmin, requireStaff } from "@/lib/api/guard";
import { badRequest, created, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { productSelect } from "@/lib/db/select";
import { parsePriceCents, trimTo } from "@/lib/validate";

// GET /api/products -> active products (for the till). ?all=1 (admins) lists all.
export async function GET(req: Request) {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  const includeInactive =
    new URL(req.url).searchParams.get("all") === "1" && guard.user.role === "ADMIN";

  const products = await getPrisma().product.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: productSelect,
  });
  return ok(products);
}

// POST /api/products -> add a product (admins only).
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ name?: string; unit?: string; priceCents?: number }>(req);
  if (!body) return badRequest("Invalid JSON");

  const name = trimTo(body.name, 40);
  if (!name) return badRequest("Please enter a product name.");
  const unit = trimTo(body.unit, 10) || "each";
  const priceCents = parsePriceCents(body.priceCents) ?? 0;

  const prisma = getPrisma();
  try {
    const sortOrder = await prisma.product.count();
    const product = await prisma.product.create({
      data: { name, unit, priceCents, sortOrder },
      select: productSelect,
    });
    return created(product);
  } catch {
    return serverError("Couldn't add that product.");
  }
}
