import "next-auth";

// Expose the user id on the session (populated by the session callback in
// lib/auth.ts) so it's available throughout the app.
declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
