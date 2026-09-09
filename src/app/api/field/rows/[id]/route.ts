import { actorName, requireAdmin, requireStaff } from "@/lib/api/guard";
import { badRequest, forbidden, notFound, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { isRowStatus, type RowStatus } from "@/types/domain";
import { clampPercent, trimTo, trimToOrNull } from "@/lib/validate";

type RouteContext = { params: Promise<{ id: string }> };

interface RowUpdate {
  pickedStart?: number;
  pickedEnd?: number;
  label?: string;
  status?: RowStatus;
  note?: string | null;
  variety?: string | null;
}

/**
 * A row is picked inward from both ends, so the two percentages can never sum
 * past 100. Whichever end the caller just moved wins; the other gives way.
 */
function reconcileEnds(
  start: number,
  end: number,
  movedStart: boolean,
): { pickedStart: number; pickedEnd: number } {
  if (start + end <= 100) return { pickedStart: start, pickedEnd: end };
  return movedStart
    ? { pickedStart: start, pickedEnd: 100 - start }
    : { pickedStart: 100 - end, pickedEnd: end };
}

// PATCH /api/field/rows/:id -> record picking progress (any staff), or edit the
// row's label, status, note, or variety (admins only).
export async function PATCH(req: Request, ctx: RouteContext) {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  const body = await readJson<{
    pickedStart?: number;
    pickedEnd?: number;
    label?: string;
    status?: string;
    note?: string | null;
    variety?: string | null;
  }>(req);
  if (!body) return badRequest("Invalid JSON");

  const prisma = getPrisma();
  const { id } = await ctx.params;

  const existing = await prisma.fieldRow.findUnique({ where: { id } });
  if (!existing) return notFound("Row not found");

  const data: RowUpdate = {};

  // Everything except picking progress is admin-only.
  const editsMetadata =
    body.status !== undefined ||
    body.note !== undefined ||
    body.variety !== undefined ||
    body.label !== undefined;
  if (editsMetadata && guard.user.role !== "ADMIN") return forbidden();

  if (body.status !== undefined) {
    if (!isRowStatus(body.status)) return badRequest("Invalid status");
    data.status = body.status;
  }
  if (body.note !== undefined) data.note = trimToOrNull(body.note, 120);
  if (body.variety !== undefined) data.variety = trimToOrNull(body.variety, 40);
  if (body.label !== undefined) {
    const label = trimTo(body.label, 30);
    if (!label) return badRequest("Name can't be empty.");
    data.label = label;
  }

  if (body.pickedStart !== undefined || body.pickedEnd !== undefined) {
    const start = body.pickedStart !== undefined ? clampPercent(body.pickedStart) : existing.pickedStart;
    const end = body.pickedEnd !== undefined ? clampPercent(body.pickedEnd) : existing.pickedEnd;
    if (start === null || end === null) return badRequest("Invalid value");
    Object.assign(data, reconcileEnds(start, end, body.pickedStart !== undefined));
  }

  if (Object.keys(data).length === 0) return badRequest("Nothing to update");

  try {
    const row = await prisma.fieldRow.update({ where: { id }, data });

    // Snapshot the row whenever picking or status actually moved, so the
    // history panel shows real changes rather than every save.
    const pickedMoved =
      (data.pickedStart !== undefined && data.pickedStart !== existing.pickedStart) ||
      (data.pickedEnd !== undefined && data.pickedEnd !== existing.pickedEnd);
    const statusMoved = data.status !== undefined && data.status !== existing.status;

    if (pickedMoved || statusMoved) {
      await prisma.rowEvent.create({
        data: {
          rowId: id,
          pickedStart: row.pickedStart,
          pickedEnd: row.pickedEnd,
          status: row.status,
          userName: actorName(guard.user),
        },
      });
    }
    return ok(row);
  } catch {
    return serverError("Couldn't update that row.");
  }
}

// DELETE /api/field/rows/:id -> remove a row (admins only).
export async function DELETE(_req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  try {
    await getPrisma().fieldRow.delete({ where: { id } });
    return ok({ ok: true });
  } catch {
    return serverError("Couldn't remove that row.");
  }
}
