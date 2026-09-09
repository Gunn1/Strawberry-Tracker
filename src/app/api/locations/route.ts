import { requireAdmin, requireStaff } from "@/lib/api/guard";
import { badRequest, created, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { locationSelect } from "@/lib/db/select";
import { trimTo } from "@/lib/validate";

// GET /api/locations -> active locations (for the till). ?all=1 (admins) lists all.
export async function GET(req: Request) {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  const includeInactive =
    new URL(req.url).searchParams.get("all") === "1" && guard.user.role === "ADMIN";

  const locations = await getPrisma().location.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: "asc" },
    select: locationSelect,
  });
  return ok(locations);
}

// POST /api/locations -> add a location (admins only). Re-adding a name that
// already exists just makes it active again.
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ name?: string }>(req);
  if (!body) return badRequest("Invalid JSON");

  const name = trimTo(body.name, 60);
  if (!name) return badRequest("Please enter a location name.");

  try {
    const location = await getPrisma().location.upsert({
      where: { name },
      update: { active: true },
      create: { name },
      select: locationSelect,
    });
    return created(location);
  } catch {
    return serverError("Couldn't add that location.");
  }
}
