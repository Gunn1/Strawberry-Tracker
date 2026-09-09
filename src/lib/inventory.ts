// Per-location stock. Only locations with `trackStock` on keep a count, so both
// helpers quietly do nothing anywhere else. Selling draws stock down; voiding a
// sale puts it back.

import type { getPrisma } from "@/lib/db/prisma";

type Prisma = ReturnType<typeof getPrisma>;

/** Quantity sold per product, keyed by product id. */
export type SoldQuantities = Map<string, number>;

export function tallyByProduct(lines: { productId: string; quantity: number }[]): SoldQuantities {
  const sold: SoldQuantities = new Map();
  for (const line of lines) {
    sold.set(line.productId, (sold.get(line.productId) ?? 0) + line.quantity);
  }
  return sold;
}

/**
 * Subtract sold quantities from a location's on-hand stock, flooring at zero.
 * `locationName` is the name stored on the sale; an unknown or untracked
 * location is a no-op.
 */
export async function drawDownStock(
  prisma: Prisma,
  locationName: string | null,
  sold: SoldQuantities,
): Promise<void> {
  if (!locationName || sold.size === 0) return;

  const location = await prisma.location.findUnique({
    where: { name: locationName },
    select: { id: true, trackStock: true, stock: { select: { productId: true, quantity: true } } },
  });
  if (!location?.trackStock) return;

  const onHand = new Map(location.stock.map((s) => [s.productId, s.quantity]));
  await prisma.$transaction(
    [...sold].map(([productId, quantity]) => {
      const remaining = Math.max(0, (onHand.get(productId) ?? 0) - quantity);
      return prisma.locationStock.upsert({
        where: { locationId_productId: { locationId: location.id, productId } },
        update: { quantity: remaining },
        create: { locationId: location.id, productId, quantity: remaining },
      });
    }),
  );
}

/** Put stock back after a sale is voided. */
export async function restoreStock(
  prisma: Prisma,
  locationName: string | null,
  productId: string | null,
  quantity: number,
): Promise<void> {
  if (!locationName || !productId || quantity <= 0) return;

  const location = await prisma.location.findUnique({
    where: { name: locationName },
    select: { id: true, trackStock: true },
  });
  if (!location?.trackStock) return;

  await prisma.locationStock.upsert({
    where: { locationId_productId: { locationId: location.id, productId } },
    update: { quantity: { increment: quantity } },
    create: { locationId: location.id, productId, quantity },
  });
}
