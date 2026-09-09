import { requireStaff } from "@/lib/api/guard";
import { badRequest, created, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { saleSelect } from "@/lib/db/select";
import { startOfFarmDay } from "@/lib/format/datetime";
import { drawDownStock, tallyByProduct } from "@/lib/inventory";
import { parseQuantity, trimToOrNull } from "@/lib/validate";

interface OrderItem {
  productId: string;
  quantity: number;
}

/** Validate the request's line items. Returns `null` if any of them is unusable. */
function parseItems(raw: unknown): OrderItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const items: OrderItem[] = [];
  for (const entry of raw) {
    const productId = (entry as { productId?: unknown })?.productId;
    const quantity = parseQuantity((entry as { quantity?: unknown })?.quantity);
    if (typeof productId !== "string" || !productId || quantity === null) return null;
    items.push({ productId, quantity });
  }
  return items;
}

// GET /api/sales -> the signed-in cashier's own sales for today, newest first.
export async function GET() {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  try {
    const sales = await getPrisma().sale.findMany({
      where: { createdAt: { gte: startOfFarmDay() }, cashierId: guard.user.id },
      orderBy: { createdAt: "desc" },
      select: saleSelect,
    });
    return ok(sales);
  } catch {
    return serverError("Failed to load sales");
  }
}

// POST /api/sales -> record a multi-item order as one line per product, tied
// together by a shared groupId. Prices are read from the products server-side,
// so a tampered payload can't change what gets recorded.
export async function POST(req: Request) {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  const body = await readJson<{ items?: unknown; tenderedCents?: number; location?: string }>(req);
  if (!body) return badRequest("Invalid JSON");

  const items = parseItems(body.items);
  const tenderedCents = body.tenderedCents;
  if (!items || !Number.isInteger(tenderedCents) || (tenderedCents as number) < 0) {
    return badRequest("Invalid sale data");
  }

  const prisma = getPrisma();
  try {
    const products = await prisma.product.findMany({
      where: { id: { in: [...new Set(items.map((item) => item.productId))] } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) return null;
      return {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        totalCents: product.priceCents * item.quantity,
      };
    });
    if (lines.some((line) => line === null)) return badRequest("Unknown product");
    const orderLines = lines as NonNullable<(typeof lines)[number]>[];

    const orderTotal = orderLines.reduce((sum, line) => sum + line.totalCents, 0);
    if ((tenderedCents as number) < orderTotal) {
      return badRequest("Tendered amount is less than total");
    }

    const location = trimToOrNull(body.location, 60);
    const groupId = crypto.randomUUID();
    const changeCents = (tenderedCents as number) - orderTotal;

    // The tender and change belong to the order, not to any one line, so they
    // are recorded on the first line and zeroed on the rest. Summing a column
    // across the group then gives the order's figure exactly once.
    await prisma.sale.createMany({
      data: orderLines.map((line, index) => ({
        ...line,
        tenderedCents: index === 0 ? (tenderedCents as number) : 0,
        changeCents: index === 0 ? changeCents : 0,
        cashierId: guard.user.id ?? null,
        location,
        groupId,
      })),
    });

    await drawDownStock(prisma, location, tallyByProduct(orderLines));

    return created({ ok: true, groupId, changeCents });
  } catch {
    return serverError("Failed to save sale");
  }
}
