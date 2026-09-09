import { requireAdmin } from "@/lib/api/guard";
import { badRequest, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { userSelect } from "@/lib/db/select";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/users/:id -> change a user's role or whether they may sign in.
export async function PATCH(req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ role?: string; active?: boolean }>(req);
  if (!body) return badRequest("Invalid JSON");

  const data: { role?: "ADMIN" | "STAFF"; active?: boolean } = {};
  if (body.role !== undefined) data.role = body.role === "ADMIN" ? "ADMIN" : "STAFF";
  if (body.active !== undefined) data.active = !!body.active;
  if (Object.keys(data).length === 0) return badRequest("Nothing to update");

  const { id } = await ctx.params;
  try {
    const user = await getPrisma().user.update({ where: { id }, data, select: userSelect });
    return ok(user);
  } catch {
    return serverError("Couldn't update that user.");
  }
}

// DELETE /api/users/:id -> remove a user. You can't lock yourself out.
export async function DELETE(_req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  if (guard.user.id === id) return badRequest("You can't remove your own account.");

  try {
    await getPrisma().user.delete({ where: { id } });
    return ok({ ok: true });
  } catch {
    return serverError("Couldn't remove that user.");
  }
}
