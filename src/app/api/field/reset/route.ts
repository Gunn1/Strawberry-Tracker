import { actorName, requireAdmin } from "@/lib/api/guard";
import { badRequest, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

// POST /api/field/reset -> mark rows fresh again (admins only). Body { patchId }
// resets one patch, { fieldId } one field, an empty body the whole farm.
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = (await readJson<{ patchId?: string; fieldId?: string }>(req)) ?? {};
  if (body.patchId !== undefined && typeof body.patchId !== "string") {
    return badRequest("Invalid patch");
  }
  if (body.fieldId !== undefined && typeof body.fieldId !== "string") {
    return badRequest("Invalid field");
  }
  const where = body.patchId
    ? { patchId: body.patchId }
    : body.fieldId
      ? { patch: { fieldId: body.fieldId } }
      : {};

  const prisma = getPrisma();
  try {
    await prisma.fieldRow.updateMany({ where, data: { pickedStart: 0, pickedEnd: 0 } });

    // Record the reset in each row's history so the drop back to fresh is
    // visible rather than looking like missing data.
    const rows = await prisma.fieldRow.findMany({ where, select: { id: true, status: true } });
    if (rows.length > 0) {
      const userName = actorName(guard.user);
      await prisma.rowEvent.createMany({
        data: rows.map((row) => ({
          rowId: row.id,
          pickedStart: 0,
          pickedEnd: 0,
          status: row.status,
          userName,
        })),
      });
    }
    return ok({ ok: true });
  } catch {
    return serverError("Couldn't reset the field.");
  }
}
