import { badRequest, notFound, ok, serverError } from "@/lib/api/http";
import { notifyStaffOfCancellation } from "@/lib/booking-mail";
import { getPrisma } from "@/lib/db/prisma";
import { farmNow, toCalendarDate } from "@/lib/format/datetime";

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
