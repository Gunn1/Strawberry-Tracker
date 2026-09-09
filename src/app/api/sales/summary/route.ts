import { requireAdmin } from "@/lib/api/guard";
import { ok, serverError } from "@/lib/api/http";
import { parseRange, rangeStart, rangeWhere } from "@/lib/api/range";
import { getPrisma } from "@/lib/db/prisma";
import { summarizeSales } from "@/lib/reports";

// GET /api/sales/summary?range=today|7d|30d|all -> aggregated till numbers.
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const range = parseRange(req.url);
  try {
    const sales = await getPrisma().sale.findMany({
      where: rangeWhere(range),
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        productName: true,
        unit: true,
        quantity: true,
        totalCents: true,
        tenderedCents: true,
        changeCents: true,
        location: true,
        cashierId: true,
        cashier: { select: { name: true, email: true } },
      },
    });

    const since = rangeStart(range);
    return ok({ range, since: since?.toISOString() ?? null, ...summarizeSales(sales) });
  } catch {
    return serverError("Failed to load sales summary");
  }
}
