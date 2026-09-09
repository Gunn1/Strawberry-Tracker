import { requireStaff } from "@/lib/api/guard";
import { badRequest, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { locationSelect } from "@/lib/db/select";
import { clampCount } from "@/lib/validate";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/locations/:id/stock -> set on-hand stock per product (any staff).
// Body: { stock: { [productId]: quantity } }.
export async function PATCH(req: Request, ctx: RouteContext) {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  const body = await readJson<{ stock?: Record<string, unknown> }>(req);
  if (!body) return badRequest("Invalid JSON");
  if (!body.stock || typeof body.stock !== "object") return badRequest("Nothing to update");

  const entries: { productId: string; quantity: number }[] = [];
  for (const [productId, raw] of Object.entries(body.stock)) {
    const quantity = clampCount(raw);
    if (quantity === null) return badRequest("Invalid stock value");
    entries.push({ productId, quantity });
  }
  if (entries.length === 0) return badRequest("Nothing to update");

  const { id } = await ctx.params;
  const prisma = getPrisma();
  try {
    await prisma.$transaction(
      entries.map((entry) =>
        prisma.locationStock.upsert({
          where: { locationId_productId: { locationId: id, productId: entry.productId } },
          update: { quantity: entry.quantity },
          create: { locationId: id, productId: entry.productId, quantity: entry.quantity },
        }),
      ),
    );
    const location = await prisma.location.findUnique({ where: { id }, select: locationSelect });
    return ok(location);
  } catch {
    return serverError("Couldn't update stock.");
  }
}
