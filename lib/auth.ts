import type { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/prisma";

// Shared NextAuth (v4) config. Used by the [...nextauth] route handler and by
// getServerSession() inside the API routes.
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    // With the database session strategy the user row is passed here; expose
    // its id on the session so routes can attribute a sale to the cashier.
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
};
