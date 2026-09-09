import { requireAdmin, requireStaff } from "@/lib/api/guard";
import { badRequest, notFound, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { saleSelect } from "@/lib/db/select";
import { restoreStock } from "@/lib/inventory";
import { parseQuantity, trimToOrNull } from "@/lib/validate";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/sales/:id -> correct a recorded sale (admins only). Changing the
// product or quantity re-prices the line at the product's current price.
export async function PATCH(req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{
    productId?: string;
    quantity?: number;
    location?: string | null;
    cashierId?: string | null;
    createdAt?: string;
  }>(req);
  if (!body) return badRequest("Invalid JSON");

  const prisma = getPrisma();
  const { id } = await ctx.params;

  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) return notFound("Sale not found");

  const data: Record<string, unknown> = {};
  let quantity = existing.quantity;
  let unitPriceCents = existing.unitPriceCents;
  let repriced = false;

  if (body.productId !== undefined) {
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product) return badRequest("Unknown product");
    data.productId = product.id;
    data.productName = product.name;
    data.unit = product.unit;
    unitPriceCents = product.priceCents;
    repriced = true;
  }

  if (body.quantity !== undefined) {
    const parsed = parseQuantity(body.quantity);
    if (parsed === null) return badRequest("Quantity must be a whole number above zero.");
    quantity = parsed;
    data.quantity = quantity;
    repriced = true;
  }

  if (body.location !== undefined) data.location = trimToOrNull(body.location, 60);
  if (body.cashierId !== undefined) data.cashierId = body.cashierId || null;
  if (body.createdAt !== undefined) {
    const when = new Date(body.createdAt);
    if (Number.isNaN(when.getTime())) return badRequest("Invalid date");
    data.createdAt = when;
  }

  if (repriced) {
    const totalCents = unitPriceCents * quantity;
    // Keep the recorded tender if it still covers the new total; otherwise
    // treat it as exact cash rather than recording negative change.
    const tenderedCents = existing.tenderedCents >= totalCents ? existing.tenderedCents : totalCents;
    data.unitPriceCents = unitPriceCents;
    data.totalCents = totalCents;
    data.tenderedCents = tenderedCents;
    data.changeCents = tenderedCents - totalCents;
  }

  if (Object.keys(data).length === 0) return badRequest("Nothing to update");

  try {
    const updated = await prisma.sale.update({ where: { id }, data, select: saleSelect });
    return ok(updated);
  } catch {
    return serverError("Couldn't update that sale.");
  }
}

// DELETE /api/sales/:id -> void a mis-rung sale so it drops out of the day's
// totals, returning its stock if the location tracks inventory.
export async function DELETE(_req: Request, ctx: RouteContext) {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  const prisma = getPrisma();
  const { id } = await ctx.params;
  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      select: { productId: true, quantity: true, location: true },
    });
    if (!sale) return notFound("Sale not found");

    await prisma.sale.delete({ where: { id } });
    await restoreStock(prisma, sale.location, sale.productId, sale.quantity);
    return ok({ ok: true });
  } catch {
    return serverError("Failed to void sale");
  }
}
