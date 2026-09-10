import { requireAdmin } from "@/lib/api/guard";
import { ok, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/subscribers/:id -> take someone off the list, because they asked.
export async function DELETE(_req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  try {
    await getPrisma().subscriber.delete({ where: { id } });
    return ok({ ok: true });
  } catch {
    return serverError("Couldn't remove that address.");
  }
}
