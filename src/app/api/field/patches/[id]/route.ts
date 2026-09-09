import { requireAdmin } from "@/lib/api/guard";
import { badRequest, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { rowOrder } from "@/lib/db/select";
import { trimTo, trimToOrNull } from "@/lib/validate";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/field/patches/:id -> rename a patch, and/or set one variety across
// every row in it (admins only).
export async function PATCH(req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ name?: string; variety?: string | null }>(req);
  if (!body) return badRequest("Invalid JSON");

  const data: { name?: string } = {};
  if (body.name !== undefined) {
    const name = trimTo(body.name, 40);
    if (!name) return badRequest("Name can't be empty.");
    data.name = name;
  }
  if (body.name === undefined && body.variety === undefined) return badRequest("Nothing to update");

  const prisma = getPrisma();
  const { id } = await ctx.params;
  try {
    if (body.variety !== undefined) {
      await prisma.fieldRow.updateMany({
        where: { patchId: id },
        data: { variety: trimToOrNull(body.variety, 40) },
      });
    }
    const patch = await prisma.patch.update({
      where: { id },
      data,
      include: { rows: { orderBy: [...rowOrder] } },
    });
    return ok(patch);
  } catch {
    return serverError("Couldn't update that patch.");
  }
}

// DELETE /api/field/patches/:id -> remove a patch and its rows (admins only).
export async function DELETE(_req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  try {
    await getPrisma().patch.delete({ where: { id } });
    return ok({ ok: true });
  } catch {
    return serverError("Couldn't remove that patch.");
  }
}
