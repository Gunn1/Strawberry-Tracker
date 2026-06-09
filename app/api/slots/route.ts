import { NextResponse } from "next/server";
import { prisma } from "@/prisma";

// Today at UTC midnight — matches how @db.Date values come back from Prisma,
// so "upcoming" filtering doesn't drift with the server's timezone.
function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

// GET /api/slots -> upcoming U-pick windows with live spots-left counts.
export async function GET() {
  try {
    const slots = await prisma.slot.findMany({
      where: { date: { gte: todayUTC() } },
      orderBy: [{ date: "asc" }, { startMin: "asc" }],
      include: { reservations: { select: { partySize: true } } },
    });

    const out = slots.map((s) => {
      const booked = s.reservations.reduce((a, r) => a + r.partySize, 0);
      return {
        id: s.id,
        date: s.date.toISOString().slice(0, 10), // YYYY-MM-DD
        startMin: s.startMin,
        endMin: s.endMin,
        capacity: s.capacity,
        spotsLeft: Math.max(0, s.capacity - booked),
      };
    });

    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ error: "Failed to load slots" }, { status: 500 });
  }
}
