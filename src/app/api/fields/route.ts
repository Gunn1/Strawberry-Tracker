import { requireAdmin, requireStaff } from "@/lib/api/guard";
import { badRequest, created, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { fieldInclude } from "@/lib/db/select";
import { trimTo } from "@/lib/validate";

// GET /api/fields -> every field with its patches and rows, which is the whole
// board. One call keeps the map, the list and the totals in step.
export async function GET() {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  try {
    const fields = await getPrisma().field.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: fieldInclude(),
    });
    return ok(fields);
  } catch {
    return serverError("Failed to load the field.");
  }
}

// POST /api/fields -> add a field (admins only).
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ name?: string }>(req);
  if (!body) return badRequest("Invalid JSON");

  const name = trimTo(body.name, 40);
  if (!name) return badRequest("Please enter a field name.");

  const prisma = getPrisma();
  try {
    const sortOrder = await prisma.field.count();
    const field = await prisma.field.create({
      data: { name, sortOrder },
      include: fieldInclude(),
    });
    return created(field);
  } catch {
    return serverError("Couldn't add that field.");
  }
}
