import { requireAdmin } from "@/lib/api/guard";
import { badRequest, notFound, ok, readJson, serverError } from "@/lib/api/http";
import { notifyCustomerOfCancellation } from "@/lib/booking-mail";
import { getPrisma } from "@/lib/db/prisma";
import { toCalendarDate } from "@/lib/format/datetime";
import { trimTo } from "@/lib/validate";

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/booking/reservations/:id -> the farm cancels someone's booking.
// Admins only: turning a customer away is not a routine till action.
export async function DELETE(req: Request, ctx: RouteContext) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  // A reason is optional but goes into the email, so the customer is not just
  // told no.
  const body = (await readJson<{ reason?: string }>(req)) ?? {};
  const reason = trimTo(body.reason, 300);

  const prisma = getPrisma();
  const { id } = await ctx.params;

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        partySize: true,
        token: true,
        cancelledAt: true,
        slot: { select: { date: true, startMin: true, endMin: true } },
      },
    });
    if (!reservation) return notFound("Booking not found");
    if (reservation.cancelledAt) return badRequest("That booking is already cancelled.");

    await prisma.reservation.update({ where: { id }, data: { cancelledAt: new Date() } });

    // Cancelling without telling them would send someone out to a morning that
    // is not happening, so this is part of the action rather than a nicety.
    await notifyCustomerOfCancellation(
      {
        name: reservation.name,
        email: reservation.email,
        partySize: reservation.partySize,
        date: toCalendarDate(reservation.slot.date),
        startMin: reservation.slot.startMin,
        endMin: reservation.slot.endMin,
        token: reservation.token,
      },
      reason,
    );

    return ok({ ok: true, notified: reservation.email });
  } catch {
    return serverError("Couldn't cancel that booking.");
  }
}
