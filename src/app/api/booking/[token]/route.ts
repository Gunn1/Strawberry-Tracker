import { badRequest, notFound, ok, readJson, serverError } from "@/lib/api/http";
import {
  notifyStaffOfCancellation,
  notifyStaffOfChange,
  sendBookingChange,
} from "@/lib/booking-mail";
import { bookableWindows, bookingOpen, withAvailability } from "@/lib/booking";
import { bookingSettings, storedSlots } from "@/lib/db/booking-query";
import { getPrisma } from "@/lib/db/prisma";
import {
  farmNow,
  formatCalendarDate,
  formatClock,
  fromCalendarDate,
  toCalendarDate,
} from "@/lib/format/datetime";

type RouteContext = { params: Promise<{ token: string }> };

const SELECT = {
  token: true,
  name: true,
  email: true,
  partySize: true,
  cancelledAt: true,
  slot: { select: { date: true, startMin: true, endMin: true } },
} as const;

/** The token is the only credential, so it has to look like one. */
function validToken(token: string): boolean {
  return /^[0-9a-f]{32}$/.test(token);
}

// GET /api/booking/:token -> one reservation. Public, but only reachable by
// someone holding the token from the confirmation email.
export async function GET(_req: Request, ctx: RouteContext) {
  const { token } = await ctx.params;
  if (!validToken(token)) return notFound("Reservation not found");

  try {
    const reservation = await getPrisma().reservation.findUnique({ where: { token }, select: SELECT });
    if (!reservation) return notFound("Reservation not found");
    return ok({
      ...reservation,
      slot: { ...reservation.slot, date: toCalendarDate(reservation.slot.date) },
    });
  } catch {
    return serverError("Couldn't load that booking.");
  }
}

// DELETE /api/booking/:token -> cancel. The row is kept and stamped, so the
// day's history stays honest and the place goes back on sale.
export async function DELETE(_req: Request, ctx: RouteContext) {
  const { token } = await ctx.params;
  if (!validToken(token)) return notFound("Reservation not found");

  try {
    const prisma = getPrisma();
    const reservation = await prisma.reservation.findUnique({
      where: { token },
      select: {
        id: true,
        name: true,
        email: true,
        partySize: true,
        cancelledAt: true,
        slot: { select: { date: true, startMin: true, endMin: true } },
      },
    });
    if (!reservation) return notFound("Reservation not found");
    if (reservation.cancelledAt) return ok({ ok: true, alreadyCancelled: true });

    // Cancelling a morning that has already happened would only confuse the
    // numbers staff are looking at.
    const { date, minutes } = farmNow();
    const slotDate = toCalendarDate(reservation.slot.date);
    if (slotDate < date || (slotDate === date && reservation.slot.startMin <= minutes)) {
      return badRequest("That picking time has already passed.");
    }

    await prisma.reservation.update({ where: { id: reservation.id }, data: { cancelledAt: new Date() } });

    // The farm wants to know a place came back, but not at the cost of the
    // cancellation appearing to fail.
    await notifyStaffOfCancellation({
      name: reservation.name,
      email: reservation.email,
      partySize: reservation.partySize,
      date: slotDate,
      startMin: reservation.slot.startMin,
      endMin: reservation.slot.endMin,
      token,
    });
    return ok({ ok: true });
  } catch {
    return serverError("Couldn't cancel that booking.");
  }
}

// PATCH /api/booking/:token -> move a booking to another window. Cancelling and
// rebooking risked losing the place in between, which is the whole reason
// someone hesitates to change a time at all.
export async function PATCH(req: Request, ctx: RouteContext) {
  const { token } = await ctx.params;
  if (!validToken(token)) return notFound("Reservation not found");

  const body = await readJson<{ date?: string; startMin?: number }>(req);
  if (!body) return badRequest("Invalid JSON");
  if (typeof body.date !== "string" || !Number.isInteger(body.startMin)) {
    return badRequest("Please choose a picking time.");
  }
  const date = body.date;
  const startMin = body.startMin as number;

  const prisma = getPrisma();
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { token },
      select: {
        id: true,
        name: true,
        email: true,
        partySize: true,
        cancelledAt: true,
        slotId: true,
        slot: { select: { date: true, startMin: true, endMin: true } },
      },
    });
    if (!reservation) return notFound("Reservation not found");
    if (reservation.cancelledAt) return badRequest("That booking is cancelled. Please book a new time.");

    const { date: today, minutes } = farmNow();
    const fromDate = toCalendarDate(reservation.slot.date);
    if (fromDate < today || (fromDate === today && reservation.slot.startMin <= minutes)) {
      return badRequest("That picking time has already passed.");
    }
    if (fromDate === date && reservation.slot.startMin === startMin) {
      return ok({ ok: true, moved: false });
    }

    const settings = await bookingSettings(prisma);
    if (!bookingOpen(settings)) return badRequest("Booking isn't open at the moment.");

    const days = bookableWindows(settings);
    const stored = await storedSlots(prisma, days.map((d) => d.date));
    const target = withAvailability(days, stored, settings.slotCapacity).find(
      (w) => w.date === date && w.startMin === startMin,
    );
    if (!target) return badRequest("That picking time is no longer available.");
    if (reservation.partySize > target.remaining) {
      return badRequest(
        target.remaining === 0
          ? "That time is full. Please choose another."
          : `Only ${target.remaining} place${target.remaining === 1 ? "" : "s"} left in that time.`,
      );
    }

    const slot = await prisma.slot.upsert({
      where: { date_startMin: { date: fromCalendarDate(date), startMin } },
      update: {},
      create: {
        date: fromCalendarDate(date),
        startMin,
        endMin: target.endMin,
        capacity: target.capacity,
      },
    });
    await prisma.reservation.update({ where: { id: reservation.id }, data: { slotId: slot.id } });

    const wasWhen = `${formatCalendarDate(fromDate)}, ${formatClock(reservation.slot.startMin)} – ${formatClock(reservation.slot.endMin)}`;
    const details = {
      name: reservation.name,
      email: reservation.email,
      partySize: reservation.partySize,
      date,
      startMin,
      endMin: target.endMin,
      token,
    };
    await sendBookingChange(details, wasWhen);
    await notifyStaffOfChange(details, wasWhen);

    return ok({ ok: true, moved: true, date, startMin, endMin: target.endMin });
  } catch {
    return serverError("Couldn't move that booking.");
  }
}
