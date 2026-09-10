import { actorName, requireAdmin } from "@/lib/api/guard";
import { badRequest, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";

// POST /api/field/reset -> mark rows fresh again (admins only). Body { patchId }
// resets one patch, { fieldId } one field, an empty body the whole farm.
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = (await readJson<{ patchId?: string; fieldId?: string; all?: boolean }>(req)) ?? {};
  const patchId = typeof body.patchId === "string" ? body.patchId.trim() : "";
  const fieldId = typeof body.fieldId === "string" ? body.fieldId.trim() : "";

  // A missing id used to fall through to "every row on the farm". An id that
  // arrives undefined by accident must not wipe the whole place, so the
  // farm-wide reset has to be asked for by name.
  const where = patchId
    ? { patchId }
    : fieldId
      ? { patch: { fieldId } }
      : body.all === true
        ? {}
        : null;
  if (where === null) return badRequest("Say which patch or field to reset.");

  const prisma = getPrisma();
  try {
    // Fresh means pickable. Leaving a row PICKED_OUT while calling it 100%
    // fresh makes the map contradict itself and keeps it out of the "send
    // pickers here" tip, which is the one thing the board is for. Statuses
    // that describe being spent go back to open; a deliberate CLOSED or
    // NEEDS_ATTENTION is left for a human to clear.
    await prisma.fieldRow.updateMany({ where, data: { pickedStart: 0, pickedEnd: 0 } });
    await prisma.fieldRow.updateMany({
      where: { ...where, status: { in: ["PICKED_OUT", "RESTING"] } },
      data: { status: "OPEN" },
    });

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
