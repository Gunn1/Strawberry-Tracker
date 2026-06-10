import type { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "@/prisma";
import { sendMagicLink } from "@/lib/email";

// NextAuth holds one adapter for the isolate's lifetime, but on Workers a DB
// client can't be reused across requests. This proxy hands the adapter a fresh
// client on every access, so each operation uses a request-safe client.
const prismaProxy = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Staff who are allowed into the admin / till. Set ADMIN_EMAILS in the
// environment (comma-separated). While it's empty, any successful sign-in is
// allowed — set it to lock the admin down to just your addresses.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Shared NextAuth (v4) config. Used by the [...nextauth] route handler and by
// getServerSession() inside the API routes.
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prismaProxy),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM,
      // Send via Resend's HTTP API instead of SMTP so it works on Workers.
      async sendVerificationRequest({ identifier, url, provider }) {
        await sendMagicLink({ to: identifier, url, from: provider.from as string });
      },
    }),
  ],
  callbacks: {
    // Decide who may sign in, and keep admin roles in sync with ADMIN_EMAILS.
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const prisma = getPrisma();

      if (ADMIN_EMAILS.includes(email)) {
        // Env-designated owners are always admins and always allowed.
        await prisma.user.update({ where: { email }, data: { role: "ADMIN", active: true } }).catch(() => {});
        return true;
      }

      const dbUser = await prisma.user.findUnique({ where: { email } });
      if (dbUser?.active) return true;

      // Before any allowlist is configured, allow sign-in (bootstrap) as staff.
      if (ADMIN_EMAILS.length === 0) {
        await prisma.user.update({ where: { email }, data: { active: true } }).catch(() => {});
        return true;
      }
      return false;
    },
    // Database session strategy: the user row is passed here. Expose id + role.
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: "ADMIN" | "STAFF" }).role ?? "STAFF";
      }
      return session;
    },
  },
};
