import { requireStaff } from "@/lib/api/guard";
import { ok, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/** How far back the row history panel looks. */
const HISTORY_LIMIT = 200;

// GET /api/field/rows/:id/history -> the row's recorded changes, newest first.
export async function GET(_req: Request, ctx: RouteContext) {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  try {
    const events = await getPrisma().rowEvent.findMany({
      where: { rowId: id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });
    return ok(events);
  } catch {
    return serverError("Failed to load history.");
  }
}
