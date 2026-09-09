import { requireAdmin } from "@/lib/api/guard";
import { ok, serverError } from "@/lib/api/http";
import { parseRange, rangeWhere } from "@/lib/api/range";
import { getPrisma } from "@/lib/db/prisma";
import { saleSelect } from "@/lib/db/select";

/** Most rows the transactions list will return in one request. */
const PAGE_LIMIT = 500;

// GET /api/transactions?range=today|7d|30d|all -> individual sale lines (admins).
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  try {
    const sales = await getPrisma().sale.findMany({
      where: rangeWhere(parseRange(req.url)),
      orderBy: { createdAt: "desc" },
      take: PAGE_LIMIT,
      select: saleSelect,
    });
    return ok(sales);
  } catch {
    return serverError("Failed to load transactions");
  }
}
