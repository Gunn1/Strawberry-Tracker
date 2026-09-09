import { requireAdmin } from "@/lib/api/guard";
import { badRequest, created, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { trimTo } from "@/lib/validate";

// POST /api/field/patches -> add a patch to a field (admins only).
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ fieldId?: string; name?: string }>(req);
  if (!body) return badRequest("Invalid JSON");

  const fieldId = trimTo(body.fieldId, 40);
  if (!fieldId) return badRequest("Missing field.");
  const name = trimTo(body.name, 40);
  if (!name) return badRequest("Please enter a patch name.");

  const prisma = getPrisma();
  try {
    const sortOrder = await prisma.patch.count({ where: { fieldId } });
    const patch = await prisma.patch.create({
      data: { fieldId, name, sortOrder },
      include: { rows: true },
    });
    return created(patch);
  } catch {
    return serverError("Couldn't add that patch.");
  }
}
