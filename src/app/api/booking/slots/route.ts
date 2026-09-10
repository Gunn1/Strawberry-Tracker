import { requireAdmin } from "@/lib/api/guard";
import { badRequest, ok, readJson, serverError } from "@/lib/api/http";
import { bookableWindows, bookingOpen } from "@/lib/booking";
import { bookingSettings } from "@/lib/db/booking-query";
import { getPrisma } from "@/lib/db/prisma";
import { fromCalendarDate } from "@/lib/format/datetime";
import { clampInt } from "@/lib/validate";

/**
 * PATCH /api/booking/slots -> give one window a capacity of its own.
 *
 * The window has to exist in the derived grid, so a capacity cannot be set on
 * a morning the schedule does not offer. Passing null puts it back on the
 * default by deleting the row, which is only possible while nothing is booked.
 */
export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const body = await readJson<{ date?: string; startMin?: number; capacity?: number | null }>(req);
  if (!body) return badRequest("Invalid JSON");
  if (typeof body.date !== "string" || !Number.isInteger(body.startMin)) {
    return badRequest("Say which window.");
  }
  const date = body.date;
  const startMin = body.startMin as number;

  const prisma = getPrisma();
  try {
    const settings = await bookingSettings(prisma);
    if (!bookingOpen(settings)) return badRequest("Booking isn't open at the moment.");

    const window = bookableWindows(settings)
      .find((d) => d.date === date)
      ?.windows.find((w) => w.startMin === startMin);
    if (!window) return badRequest("That window isn't on the schedule.");

    if (body.capacity === null) {
      const slot = await prisma.slot.findUnique({
        where: { date_startMin: { date: fromCalendarDate(date), startMin } },
        select: { id: true, _count: { select: { reservations: true } } },
      });
      if (slot && slot._count.reservations > 0) {
        return badRequest("That window has bookings, so it keeps its own capacity.");
      }
      if (slot) await prisma.slot.delete({ where: { id: slot.id } });
      return ok({ ok: true, capacity: settings.slotCapacity, overridden: false });
    }

    const capacity = clampInt(body.capacity, 0, 500);
    if (capacity === null) return badRequest("Invalid capacity");

    await prisma.slot.upsert({
      where: { date_startMin: { date: fromCalendarDate(date), startMin } },
      update: { capacity },
      create: { date: fromCalendarDate(date), startMin, endMin: window.endMin, capacity },
    });
    return ok({ ok: true, capacity, overridden: capacity !== settings.slotCapacity });
  } catch {
    return serverError("Couldn't set that capacity.");
  }
}
