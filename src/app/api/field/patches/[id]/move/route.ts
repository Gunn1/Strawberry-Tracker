import { requireAdmin } from "@/lib/api/guard";
import { badRequest, notFound, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { rowOrder } from "@/lib/db/select";
import { reorder, type Direction } from "@/lib/order";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/field/patches/:id/move -> shift a patch one place within its field.
export async function POST(req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ direction?: string }>(req);
  if (!body) return badRequest("Invalid JSON");
  if (body.direction !== "up" && body.direction !== "down") return badRequest("Invalid direction");
  const direction = body.direction as Direction;

  const prisma = getPrisma();
  const { id } = await ctx.params;

  try {
    const patch = await prisma.patch.findUnique({ where: { id }, select: { fieldId: true } });
    if (!patch) return notFound("Patch not found");

    const siblings = await prisma.patch.findMany({
      where: { fieldId: patch.fieldId },
      orderBy: [...rowOrder],
      select: { id: true },
    });
    const ids = siblings.map((s) => s.id);
    const next = reorder(ids, ids.indexOf(id), direction);
    if (!next) return ok({ ok: true, moved: false });

    await prisma.$transaction(
      next.map((patchId, index) => prisma.patch.update({ where: { id: patchId }, data: { sortOrder: index } })),
    );
    return ok({ ok: true, moved: true });
  } catch {
    return serverError("Couldn't move that patch.");
  }
}
