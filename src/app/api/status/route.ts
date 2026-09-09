import { requireStaff } from "@/lib/api/guard";
import { badRequest, ok, readJson, serverError } from "@/lib/api/http";
import { getPrisma } from "@/lib/db/prisma";
import { farmNow } from "@/lib/format/datetime";
import { displayHours, effectiveStatus, isOverrideStatus, parseDays } from "@/lib/hours";
import { parseMinuteOfDay, trimTo } from "@/lib/validate";

/** The settings row is a singleton; this is its fixed primary key. */
const SETTINGS_ID = "default";

// GET /api/status -> the status customers see, the display hours, and the raw
// schedule config the admin edits. Public: the homepage reads it.
export async function GET() {
  try {
    const settings = await getPrisma().standSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });

    return ok({
      ...effectiveStatus(settings),
      ...displayHours(settings),
      config: {
        seasonActive: settings.seasonActive,
        openMin: settings.openMin,
        closeMin: settings.closeMin,
        finishByMin: settings.finishByMin,
        openDays: settings.openDays,
        overrideStatus: settings.overrideStatus,
        overrideDate: settings.overrideDate,
        statusNote: settings.statusNote,
      },
    });
  } catch {
    return serverError("Failed to load status");
  }
}

// PUT /api/status -> staff update the schedule/season and/or today's override.
// Only the fields present in the body change.
export async function PUT(req: Request) {
  const guard = await requireStaff();
  if (guard.response) return guard.response;

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return badRequest("Invalid JSON");

  const data: Record<string, unknown> = {};

  if (body.seasonActive !== undefined) data.seasonActive = !!body.seasonActive;

  for (const key of ["openMin", "closeMin", "finishByMin"] as const) {
    if (body[key] === undefined) continue;
    const minutes = parseMinuteOfDay(body[key]);
    if (minutes === null) return badRequest(`Invalid ${key}`);
    data[key] = minutes;
  }

  if (body.openDays !== undefined) data.openDays = parseDays(String(body.openDays)).join(",");

  if (body.overrideStatus !== undefined) {
    if (!isOverrideStatus(body.overrideStatus)) return badRequest("Invalid override");
    data.overrideStatus = body.overrideStatus;
    // An override only applies to the day it was set on, so stamp (or clear)
    // that day here rather than trusting a date from the client.
    data.overrideDate = body.overrideStatus === "" ? "" : farmNow().date;
  }

  if (body.statusNote !== undefined) data.statusNote = trimTo(body.statusNote, 160);

  if (Object.keys(data).length === 0) return badRequest("Nothing to update");

  try {
    const settings = await getPrisma().standSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });
    return ok({ ok: true, ...effectiveStatus(settings) });
  } catch {
    return serverError("Failed to save");
  }
}
