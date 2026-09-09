import { ok, serverError } from "@/lib/api/http";
import { bookableWindows, bookingOpen, withAvailability } from "@/lib/booking";
import { bookingSettings, storedSlots } from "@/lib/db/booking-query";
import { getPrisma } from "@/lib/db/prisma";

// GET /api/booking/availability -> the windows customers may book, with the
// room left in each. Public: the booking page is for people with no account.
export async function GET() {
  const prisma = getPrisma();
  try {
    const settings = await bookingSettings(prisma);
    if (!bookingOpen(settings)) {
      return ok({ open: false, slotMinutes: settings.slotMinutes, days: [] });
    }

    const days = bookableWindows(settings);
    const stored = await storedSlots(prisma, days.map((d) => d.date));
    const availability = withAvailability(days, stored, settings.slotCapacity);

    // Grouped by day, because that is how the page is read.
    const byDate = new Map<string, typeof availability>();
    for (const window of availability) {
      const list = byDate.get(window.date) ?? [];
      list.push(window);
      byDate.set(window.date, list);
    }

    return ok({
      open: true,
      slotMinutes: settings.slotMinutes,
      days: [...byDate.entries()].map(([date, windows]) => ({ date, windows })),
    });
  } catch {
    return serverError("Couldn't load the picking times.");
  }
}
