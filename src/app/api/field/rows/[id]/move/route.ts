import { requireAdmin } from "@/lib/api/guard";
import { badRequest, notFound, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { rowOrder } from "@/lib/db/select";
import { reorder, type Direction } from "@/lib/order";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/field/rows/:id/move -> shift a row one place within its patch, so
// the map can be made to match the order the rows actually run in the ground.
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
    const row = await prisma.fieldRow.findUnique({ where: { id }, select: { patchId: true } });
    if (!row) return notFound("Row not found");

    const siblings = await prisma.fieldRow.findMany({
      where: { patchId: row.patchId },
      orderBy: [...rowOrder],
      select: { id: true },
    });
    const ids = siblings.map((s) => s.id);
    const next = reorder(ids, ids.indexOf(id), direction);
    // Already at the end of the patch: nothing to do, and not an error.
    if (!next) return ok({ ok: true, moved: false });

    // Renumber the whole patch so ties and gaps from earlier edits cannot
    // leave two rows claiming the same place.
    await prisma.$transaction(
      next.map((rowId, index) => prisma.fieldRow.update({ where: { id: rowId }, data: { sortOrder: index } })),
    );
    return ok({ ok: true, moved: true });
  } catch {
    return serverError("Couldn't move that row.");
  }
}
