import { requireStaff } from "@/lib/api/guard";
import { ok, serverError } from "@/lib/api/http";
import { bookableWindows, bookingOpen, withAvailability } from "@/lib/booking";
import { bookingSettings, storedSlots } from "@/lib/db/booking-query";
import { getPrisma } from "@/lib/db/prisma";
import { fromCalendarDate, toCalendarDate } from "@/lib/format/datetime";

/**
 * GET /api/booking/reservations -> every upcoming window, with who is in it.
 *
 * Derived from the schedule rather than from the stored slots, so a window
 * nobody has booked yet still appears. Otherwise there is no way to set the
 * capacity of a quiet morning before it fills.
 */
export async function GET() {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  const prisma = getPrisma();
  try {
    const settings = await bookingSettings(prisma);
    const days = bookingOpen(settings) ? bookableWindows(settings) : [];
    const dates = days.map((d) => d.date);
    const stored = await storedSlots(prisma, dates);
    const grid = withAvailability(days, stored, settings.slotCapacity);

    const people = dates.length
      ? await prisma.slot.findMany({
          where: { date: { in: dates.map(fromCalendarDate) } },
          select: {
            date: true,
            startMin: true,
            reservations: {
              where: { cancelledAt: null },
              orderBy: { createdAt: "asc" },
              select: { id: true, name: true, email: true, partySize: true, createdAt: true },
            },
          },
        })
      : [];
    const byKey = new Map(people.map((s) => [`${toCalendarDate(s.date)}|${s.startMin}`, s.reservations]));

    return ok({
      open: bookingOpen(settings),
      defaultCapacity: settings.slotCapacity,
      slots: grid.map((w) => ({
        date: w.date,
        startMin: w.startMin,
        endMin: w.endMin,
        capacity: w.capacity,
        booked: w.booked,
        /** True when this window has a capacity of its own, not the default. */
        overridden: stored.some(
          (s) => s.date === w.date && s.startMin === w.startMin && s.capacity !== settings.slotCapacity,
        ),
        reservations: byKey.get(`${w.date}|${w.startMin}`) ?? [],
      })),
    });
  } catch {
    return serverError("Couldn't load the bookings.");
  }
}
