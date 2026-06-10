import { NextResponse } from "next/server";
import { getPrisma } from "@/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// MailerLite is optional. Set these in .env (local) and Vercel env vars to turn
// it on; until then, signups are simply saved to the database.
//   MAILERLITE_API_KEY   — token from MailerLite → Integrations → API
//   MAILERLITE_GROUP_ID  — (optional) id of the "Season updates" group
const ML_KEY = process.env.MAILERLITE_API_KEY;
const ML_GROUP_ID = process.env.MAILERLITE_GROUP_ID;

// Add (or upsert) the email in MailerLite. Never throws — a MailerLite hiccup
// must not break the visitor's signup, which is already saved in our DB.
async function addToMailerLite(email: string): Promise<void> {
  if (!ML_KEY) return; // integration not configured yet
  try {
    const body: { email: string; groups?: string[] } = { email };
    if (ML_GROUP_ID) body.groups = [ML_GROUP_ID];

    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ML_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`MailerLite signup failed (${res.status}): ${detail}`);
    }
  } catch (err) {
    console.error("MailerLite request error:", err);
  }
}

// POST /api/subscribers -> add an email to the season-updates list.
// Idempotent: signing up twice with the same address is a no-op.
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const prisma = getPrisma();

  try {
    // Always keep our own copy (a backup, and works even before MailerLite is on).
    await prisma.subscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    // Mirror into MailerLite when configured (non-blocking on failure).
    await addToMailerLite(email);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Couldn't sign you up. Please try again." }, { status: 500 });
  }
}
