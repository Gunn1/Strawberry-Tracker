import { requireAdmin } from "@/lib/api/guard";
import { badRequest, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { productSelect } from "@/lib/db/select";
import { parsePriceCents, trimTo } from "@/lib/validate";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/products/:id -> edit name / unit / price / active (admins only).
export async function PATCH(req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ name?: string; unit?: string; priceCents?: number; active?: boolean }>(req);
  if (!body) return badRequest("Invalid JSON");

  const data: { name?: string; unit?: string; priceCents?: number; active?: boolean } = {};
  if (body.name !== undefined) {
    const name = trimTo(body.name, 40);
    if (!name) return badRequest("Name can't be empty.");
    data.name = name;
  }
  if (body.unit !== undefined) data.unit = trimTo(body.unit, 10) || "each";
  if (body.priceCents !== undefined) {
    const priceCents = parsePriceCents(body.priceCents);
    if (priceCents === null) return badRequest("Invalid price");
    data.priceCents = priceCents;
  }
  if (body.active !== undefined) data.active = !!body.active;
  if (Object.keys(data).length === 0) return badRequest("Nothing to update");

  const { id } = await ctx.params;
  try {
    const product = await getPrisma().product.update({ where: { id }, data, select: productSelect });
    return ok(product);
  } catch {
    return serverError("Couldn't update that product.");
  }
}

// DELETE /api/products/:id -> remove a product (past sales keep their stored name).
export async function DELETE(_req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  try {
    await getPrisma().product.delete({ where: { id } });
    return ok({ ok: true });
  } catch {
    return serverError("Couldn't remove that product.");
  }
}
