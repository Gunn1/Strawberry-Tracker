import { NextResponse } from "next/server";
import { prisma } from "@/prisma";
import { effectiveStatus, fmtClock, fmtDays, farmNow, parseDays } from "@/lib/hours";

const OVERRIDES = ["", "open", "closed", "pickedout"];

// GET /api/status -> the effective status customers see, the display hours, and
// the raw schedule config (for the admin).
export async function GET() {
  try {
    const s = await prisma.standSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    const eff = effectiveStatus(s);
    return NextResponse.json({
      openStatus: eff.openStatus,
      statusNote: eff.statusNote,
      hoursWindow: `${fmtClock(s.openMin)} – ${fmtClock(s.closeMin)}`,
      hoursDays: fmtDays(s.openDays),
      hoursFinishBy: fmtClock(s.finishByMin),
      config: {
        seasonActive: s.seasonActive,
        openMin: s.openMin,
        closeMin: s.closeMin,
        finishByMin: s.finishByMin,
        openDays: s.openDays,
        overrideStatus: s.overrideStatus,
        overrideDate: s.overrideDate,
        statusNote: s.statusNote,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}

function clampMin(v: unknown): number | null {
  if (!Number.isInteger(v)) return null;
  const n = v as number;
  return n >= 0 && n <= 1440 ? n : null;
}

// PUT /api/status -> staff update the schedule/season and/or today's override.
// Only fields present in the body change.
export async function PUT(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.seasonActive !== undefined) data.seasonActive = !!body.seasonActive;

  for (const key of ["openMin", "closeMin", "finishByMin"] as const) {
    if (body[key] !== undefined) {
      const v = clampMin(body[key]);
      if (v === null) return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
      data[key] = v;
    }
  }

  if (body.openDays !== undefined) {
    const days = parseDays(String(body.openDays));
    data.openDays = days.join(",");
  }

  if (body.overrideStatus !== undefined) {
    const ov = String(body.overrideStatus);
    if (!OVERRIDES.includes(ov)) {
      return NextResponse.json({ error: "Invalid override" }, { status: 400 });
    }
    data.overrideStatus = ov;
    // Stamp / clear the day the override applies to (farm-local).
    data.overrideDate = ov === "" ? "" : farmNow().date;
  }

  if (body.statusNote !== undefined) data.statusNote = String(body.statusNote).trim().slice(0, 160);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const s = await prisma.standSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    const eff = effectiveStatus(s);
    return NextResponse.json({ ok: true, openStatus: eff.openStatus, statusNote: eff.statusNote });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
