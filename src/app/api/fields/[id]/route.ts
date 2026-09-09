import { requireAdmin } from "@/lib/api/guard";
import { badRequest, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { fieldInclude } from "@/lib/db/select";
import { trimTo } from "@/lib/validate";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/fields/:id -> rename a field or set the landmarks its map is
// oriented by (admins only).
export async function PATCH(req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ name?: string; farLabel?: string; nearLabel?: string; active?: boolean }>(req);
  if (!body) return badRequest("Invalid JSON");

  const data: { name?: string; farLabel?: string; nearLabel?: string; active?: boolean } = {};
  if (body.name !== undefined) {
    const name = trimTo(body.name, 40);
    if (!name) return badRequest("Name can't be empty.");
    data.name = name;
  }
  if (body.farLabel !== undefined) data.farLabel = trimTo(body.farLabel, 30);
  if (body.nearLabel !== undefined) data.nearLabel = trimTo(body.nearLabel, 30);
  if (body.active !== undefined) data.active = !!body.active;
  if (Object.keys(data).length === 0) return badRequest("Nothing to update");

  const { id } = await ctx.params;
  try {
    const field = await getPrisma().field.update({ where: { id }, data, include: fieldInclude() });
    return ok(field);
  } catch {
    return serverError("Couldn't update that field.");
  }
}

// DELETE /api/fields/:id -> remove a field, its patches and their rows.
export async function DELETE(_req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  try {
    await getPrisma().field.delete({ where: { id } });
    return ok({ ok: true });
  } catch {
    return serverError("Couldn't remove that field.");
  }
}
