// Prisma `select` shapes shared by the route handlers, so every endpoint that
// returns a given model returns the same fields. The client-side counterparts
// live in src/types/domain.ts and must be kept in step with these.

export const productSelect = {
  id: true,
  name: true,
  unit: true,
  priceCents: true,
  active: true,
  sortOrder: true,
} as const;

export const locationSelect = {
  id: true,
  name: true,
  active: true,
  trackStock: true,
  stock: { select: { productId: true, quantity: true } },
} as const;

export const saleSelect = {
  id: true,
  createdAt: true,
  productId: true,
  productName: true,
  unit: true,
  quantity: true,
  unitPriceCents: true,
  totalCents: true,
  tenderedCents: true,
  changeCents: true,
  location: true,
  groupId: true,
  cashierId: true,
  cashier: { select: { name: true, email: true } },
} as const;

export const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

export const rowOrder = [{ sortOrder: "asc" }, { createdAt: "asc" }] as const;

/**
 * A field with its patches and their rows, ordered for the map. A function
 * rather than a constant so each call gets a mutable object: Prisma's `orderBy`
 * will not take the readonly arrays an `as const` would produce.
 */
export function fieldInclude() {
  const order = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];
  return {
    patches: {
      orderBy: order,
      include: { rows: { orderBy: [...order] } },
    },
  };
}
