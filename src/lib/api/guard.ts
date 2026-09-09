import type { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";

import { authOptions } from "@/lib/auth";
import { forbidden, unauthorized } from "@/lib/api/http";

type SessionUser = NonNullable<Session["user"]>;

/**
 * The result of a guard: either a `response` to return verbatim, or the `user`
 * to work with. The two are mutually exclusive, so handlers read as:
 *
 *   const guard = await requireAdmin();
 *   if (guard.response) return guard.response;
 *   guard.user // signed in, an admin, and typed
 */
export type Guard =
  | { response: NextResponse; user?: undefined }
  | { response?: undefined; user: SessionUser };

/** Any signed-in staff member. */
export async function requireStaff(): Promise<Guard> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { response: unauthorized() };
  return { user: session.user };
}

/** Signed in *and* holding the ADMIN role. */
export async function requireAdmin(): Promise<Guard> {
  const guard = await requireStaff();
  if (guard.response) return guard;
  if (guard.user.role !== "ADMIN") return { response: forbidden() };
  return guard;
}

/** Who to credit in an audit trail: real name, else email, else nothing. */
export function actorName(user: SessionUser): string | null {
  return user.name || user.email || null;
}
