import { requireAdmin } from "@/lib/api/guard";
import { badRequest, created, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { addToMailingList } from "@/lib/mailing-list";
import { isEmail, trimTo } from "@/lib/validate";

// GET /api/subscribers -> the season-updates list (admins only). These are
// customer email addresses, so this is not staff-wide.
export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  try {
    const subscribers = await getPrisma().subscriber.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, createdAt: true },
    });
    return ok(subscribers);
  } catch {
    return serverError("Couldn't load the mailing list.");
  }
}

// POST /api/subscribers -> add an email to the season-updates list.
// Public, and idempotent: signing up twice with the same address is a no-op.
export async function POST(req: Request) {
  const body = await readJson<{ email?: string }>(req);
  if (!body) return badRequest("Invalid JSON");

  const email = trimTo(body.email, 200).toLowerCase();
  if (!isEmail(email)) return badRequest("Please enter a valid email address.");

  try {
    // Keep our own copy first: it's the backup, and it works whether or not the
    // mailing-list provider is configured.
    await getPrisma().subscriber.upsert({ where: { email }, update: {}, create: { email } });
    await addToMailingList(email);
    return created({ ok: true });
  } catch {
    return serverError("Couldn't sign you up. Please try again.");
  }
}
