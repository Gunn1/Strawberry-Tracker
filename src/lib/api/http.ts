import { NextResponse } from "next/server";

// Uniform JSON responses for the route handlers. Every error body is
// `{ error: string }`, so the client can read failures the same way everywhere.

export function ok<T>(data: T): NextResponse {
  return NextResponse.json(data);
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message = "Invalid request"): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/** The caller's view of the record is out of date; hand back the current one. */
export function conflict<T>(message: string, current: T): NextResponse {
  return NextResponse.json({ error: message, current }, { status: 409 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Something went wrong"): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Read a JSON request body. Returns `undefined` when the body is missing or
 * unparseable, so callers can answer with a 400 instead of throwing a 500.
 */
export async function readJson<T extends object>(req: Request): Promise<T | undefined> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as T) : undefined;
  } catch {
    return undefined;
  }
}
