"use client";

// The browser side of the API. Every route answers with JSON, and errors always
// arrive as `{ error: string }`, so failures can be surfaced in one place
// instead of each page inventing its own try/catch.

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection.", 0);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? "Something went wrong.";
    throw new ApiError(message, res.status);
  }
  return body as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, jsonInit("POST", body)),
  put: <T>(path: string, body: unknown) => request<T>(path, jsonInit("PUT", body)),
  patch: <T>(path: string, body: unknown) => request<T>(path, jsonInit("PATCH", body)),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** The message to show a user for a failed call. */
export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  return err instanceof ApiError ? err.message : fallback;
}
