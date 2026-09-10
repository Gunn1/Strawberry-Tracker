import { badRequest, created, readJson, serverError } from "@/lib/api/http";
import { bookableWindows, bookingOpen, withAvailability } from "@/lib/booking";
import { bookingSettings, storedSlots } from "@/lib/db/booking-query";
import { getPrisma } from "@/lib/db/prisma";
import {
  manageUrl,
  notifyStaffOfBooking,
  sendBookingConfirmation,
  type BookingDetails,
} from "@/lib/booking-mail";
import { fromCalendarDate } from "@/lib/format/datetime";
import { isEmail, parseQuantity, trimTo } from "@/lib/validate";

/** Nobody books a coach party at a u-pick stand; this catches typos. */
const MAX_PARTY = 30;

// POST /api/booking -> reserve a picking window. Public and account-free: the
// confirmation email carries the only way back into the reservation.
export async function POST(req: Request) {
  const body = await readJson<{
    date?: string;
    startMin?: number;
    name?: string;
    email?: string;
    partySize?: number;
  }>(req);
  if (!body) return badRequest("Invalid JSON");

  const name = trimTo(body.name, 60);
  if (!name) return badRequest("Please enter your name.");
  const email = trimTo(body.email, 200).toLowerCase();
  if (!isEmail(email)) return badRequest("Please enter a valid email address.");

  const partySize = parseQuantity(body.partySize);
  if (partySize === null || partySize > MAX_PARTY) {
    return badRequest(`Please enter a party size between 1 and ${MAX_PARTY}.`);
  }
  if (typeof body.date !== "string" || !Number.isInteger(body.startMin)) {
    return badRequest("Please choose a picking time.");
  }
  const date = body.date;
  const startMin = body.startMin as number;

  const prisma = getPrisma();
  try {
    const settings = await bookingSettings(prisma);
    if (!bookingOpen(settings)) return badRequest("Booking isn't open at the moment.");

    // Re-derive the grid rather than trusting the posted window: the schedule
    // may have changed since the page was loaded.
    const days = bookableWindows(settings);
    const stored = await storedSlots(prisma, days.map((d) => d.date));
    const availability = withAvailability(days, stored, settings.slotCapacity);
    const window = availability.find((w) => w.date === date && w.startMin === startMin);
    if (!window) return badRequest("That picking time is no longer available.");
    if (partySize > window.remaining) {
      return badRequest(
        window.remaining === 0
          ? "That time just filled up. Please choose another."
          : `Only ${window.remaining} place${window.remaining === 1 ? "" : "s"} left in that time.`,
      );
    }

    const slot = await prisma.slot.upsert({
      where: { date_startMin: { date: fromCalendarDate(date), startMin } },
      update: {},
      create: {
        date: fromCalendarDate(date),
        startMin,
        endMin: window.endMin,
        capacity: window.capacity,
      },
    });

    const token = crypto.randomUUID().replace(/-/g, "");
    const reservation = await prisma.reservation.create({
      data: { slotId: slot.id, name, email, partySize, token },
    });

    // Neon speaks HTTP, so there is no interactive transaction to hold the
    // capacity check and the insert together. Two people taking the last
    // places at once is rare but possible, so confirm afterwards and stand the
    // later one down rather than quietly overbooking the morning.
    const confirmed = await prisma.reservation.findMany({
      where: { slotId: slot.id, cancelledAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, partySize: true },
    });
    let running = 0;
    let overbooked = false;
    for (const r of confirmed) {
      running += r.partySize;
      if (running > slot.capacity && r.id === reservation.id) overbooked = true;
    }
    if (overbooked) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { cancelledAt: new Date() },
      });
      return badRequest("That time filled up while you were booking. Please choose another.");
    }

    const details: BookingDetails = {
      name,
      email,
      partySize,
      date,
      startMin,
      endMin: window.endMin,
      token,
    };
    // Neither message may sink the booking that is already saved, and the
    // customer's confirmation matters more than the farm's copy.
    await sendBookingConfirmation(details);
    await notifyStaffOfBooking(details);

    return created({
      token,
      date,
      startMin,
      endMin: window.endMin,
      partySize,
      manageUrl: manageUrl(token),
    });
  } catch {
    return serverError("Couldn't save your booking. Please try again.");
  }
}
