import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/me -> the signed-in user's email + role (for the admin UI).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role: session.user.role ?? "STAFF",
  });
}
