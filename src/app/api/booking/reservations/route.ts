import { requireStaff } from "@/lib/api/guard";
import { ok, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { farmNow, fromCalendarDate, toCalendarDate } from "@/lib/format/datetime";

/** Staff care about who is coming, so the list looks forward by default. */
const DEFAULT_DAYS = 14;

// GET /api/booking/reservations?days=14 -> who is booked in, by day.
export async function GET(req: Request) {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  const raw = Number(new URL(req.url).searchParams.get("days"));
  const days = Number.isFinite(raw) && raw > 0 ? Math.min(90, Math.round(raw)) : DEFAULT_DAYS;

  try {
    const from = fromCalendarDate(farmNow().date);
    const until = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

    const slots = await getPrisma().slot.findMany({
      where: { date: { gte: from, lte: until } },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
      select: {
        date: true,
        startMin: true,
        endMin: true,
        capacity: true,
        reservations: {
          where: { cancelledAt: null },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, email: true, partySize: true, createdAt: true },
        },
      },
    });

    return ok(
      slots
        .filter((slot) => slot.reservations.length > 0)
        .map((slot) => ({
          date: toCalendarDate(slot.date),
          startMin: slot.startMin,
          endMin: slot.endMin,
          capacity: slot.capacity,
          booked: slot.reservations.reduce((sum, r) => sum + r.partySize, 0),
          reservations: slot.reservations,
        })),
    );
  } catch {
    return serverError("Couldn't load the bookings.");
  }
}
