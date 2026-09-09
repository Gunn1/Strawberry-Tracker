import { requireAdmin } from "@/lib/api/guard";
import { badRequest, created, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { trimTo } from "@/lib/validate";

// POST /api/field/rows -> add a row to a patch (admins only).
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ patchId?: string; label?: string }>(req);
  if (!body) return badRequest("Invalid JSON");

  const patchId = trimTo(body.patchId, 40);
  if (!patchId) return badRequest("Missing patch.");
  const label = trimTo(body.label, 30);
  if (!label) return badRequest("Please enter a row label.");

  const prisma = getPrisma();
  try {
    const sortOrder = await prisma.fieldRow.count({ where: { patchId } });
    const row = await prisma.fieldRow.create({ data: { patchId, label, sortOrder } });
    return created(row);
  } catch {
    return serverError("Couldn't add that row.");
  }
}
