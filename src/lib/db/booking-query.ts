import { getPrisma } from "@/lib/db/prisma";
import { fromCalendarDate, toCalendarDate } from "@/lib/format/datetime";
import type { SlotRow } from "@/lib/booking";

type Prisma = ReturnType<typeof getPrisma>;

/**
 * The stored slots covering a run of days, with each one's live headcount.
 * Cancelled reservations do not count against capacity.
 */
export async function storedSlots(prisma: Prisma, dates: string[]): Promise<SlotRow[]> {
  if (dates.length === 0) return [];

  const slots = await prisma.slot.findMany({
    where: { date: { in: dates.map(fromCalendarDate) } },
    select: {
      date: true,
      startMin: true,
      capacity: true,
      reservations: { where: { cancelledAt: null }, select: { partySize: true } },
    },
  });

  return slots.map((slot) => ({
    date: toCalendarDate(slot.date),
    startMin: slot.startMin,
    capacity: slot.capacity,
    booked: slot.reservations.reduce((sum, r) => sum + r.partySize, 0),
  }));
}

/** The settings row is a singleton, created on first read. */
export async function bookingSettings(prisma: Prisma) {
  return prisma.standSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}
