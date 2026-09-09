import { requireAdmin } from "@/lib/api/guard";
import { badRequest, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { locationSelect } from "@/lib/db/select";
import { trimTo } from "@/lib/validate";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/locations/:id -> rename, show/hide, or toggle stock tracking.
export async function PATCH(req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ name?: string; active?: boolean; trackStock?: boolean }>(req);
  if (!body) return badRequest("Invalid JSON");

  const data: { name?: string; active?: boolean; trackStock?: boolean } = {};
  if (body.name !== undefined) {
    const name = trimTo(body.name, 60);
    if (!name) return badRequest("Name can't be empty.");
    data.name = name;
  }
  if (body.active !== undefined) data.active = !!body.active;
  if (body.trackStock !== undefined) data.trackStock = !!body.trackStock;
  if (Object.keys(data).length === 0) return badRequest("Nothing to update");

  const { id } = await ctx.params;
  try {
    const location = await getPrisma().location.update({ where: { id }, data, select: locationSelect });
    return ok(location);
  } catch {
    return serverError("Couldn't update that location.");
  }
}

// DELETE /api/locations/:id -> remove a location (past sales keep their stored name).
export async function DELETE(_req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  try {
    await getPrisma().location.delete({ where: { id } });
    return ok({ ok: true });
  } catch {
    return serverError("Couldn't remove that location.");
  }
}
