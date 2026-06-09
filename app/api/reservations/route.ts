import { NextResponse } from "next/server";
import { prisma } from "@/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Today at UTC midnight — matches how @db.Date values come back from Prisma.
function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

// GET /api/reservations -> upcoming reservations with their window, for the
// staff admin view. Ordered by day, then window, then booking time.
export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { slot: { date: { gte: todayUTC() } } },
      orderBy: [
        { slot: { date: "asc" } },
        { slot: { startMin: "asc" } },
        { createdAt: "asc" },
      ],
      include: { slot: true },
    });

    const out = reservations.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      name: r.name,
      email: r.email,
      partySize: r.partySize,
      slot: {
        id: r.slot.id,
        date: r.slot.date.toISOString().slice(0, 10),
        startMin: r.slot.startMin,
        endMin: r.slot.endMin,
        capacity: r.slot.capacity,
      },
    }));

    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ error: "Failed to load reservations" }, { status: 500 });
  }
}

// POST /api/reservations -> book a window. Capacity is checked inside a
// transaction so two people can't push a window past its limit.
export async function POST(req: Request) {
  let body: { slotId?: string; name?: string; email?: string; partySize?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slotId, name, email, partySize } = body;

  if (
    typeof slotId !== "string" || !slotId ||
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !EMAIL_RE.test(email.trim()) ||
    !Number.isInteger(partySize) || (partySize as number) < 1 || (partySize as number) > 20
  ) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }

  const size = partySize as number;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: { reservations: { select: { partySize: true } } },
      });
      if (!slot) return { kind: "err" as const, status: 404, error: "That window is no longer available." };

      const booked = slot.reservations.reduce((a, r) => a + r.partySize, 0);
      const left = slot.capacity - booked;
      if (size > left) {
        return {
          kind: "err" as const,
          status: 409,
          error: left > 0 ? `Only ${left} spot${left === 1 ? "" : "s"} left in that window.` : "That window just filled up.",
        };
      }

      const reservation = await tx.reservation.create({
        data: { slotId, name: name.trim(), email: email.trim(), partySize: size },
      });
      return { kind: "ok" as const, reservation, slot, spotsLeft: left - size };
    });

    if (result.kind === "err") {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        id: result.reservation.id,
        date: result.slot.date.toISOString().slice(0, 10),
        startMin: result.slot.startMin,
        endMin: result.slot.endMin,
        name: result.reservation.name,
        email: result.reservation.email,
        partySize: result.reservation.partySize,
        spotsLeft: Math.max(0, result.spotsLeft),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Couldn't save your reservation. Please try again." }, { status: 500 });
  }
}
