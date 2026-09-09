import { requireAdmin } from "@/lib/api/guard";
import { badRequest, created, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { userSelect } from "@/lib/db/select";
import { isEmail, trimTo } from "@/lib/validate";

// GET /api/users -> the staff/admin roster (admins only).
export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const users = await getPrisma().user.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    select: userSelect,
  });
  return ok(users);
}

// POST /api/users -> invite someone by email with a role, so they can sign in.
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ email?: string; role?: string }>(req);
  if (!body) return badRequest("Invalid JSON");

  const email = trimTo(body.email, 200).toLowerCase();
  if (!isEmail(email)) return badRequest("Please enter a valid email address.");
  const role = body.role === "ADMIN" ? "ADMIN" : "STAFF";

  try {
    const user = await getPrisma().user.upsert({
      where: { email },
      update: { role, active: true },
      create: { email, role, active: true },
      select: userSelect,
    });
    return created(user);
  } catch {
    return serverError("Couldn't add that user.");
  }
}
