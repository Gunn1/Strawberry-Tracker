import { requireStaff } from "@/lib/api/guard";
import { ok } from "@/lib/api/http";

// GET /api/me -> the signed-in user's identity and role (for the admin UI).
export async function GET() {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  return ok({
    email: guard.user.email ?? null,
    name: guard.user.name ?? null,
    role: guard.user.role ?? "STAFF",
  });
}
