// lib/prisma.ts
import { PrismaClient } from "./generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { neonConfig } from "@neondatabase/serverless"

// Run Neon queries over HTTP fetch instead of a persistent WebSocket.
neonConfig.poolQueryViaFetch = true

// Create a fresh Prisma client per request. On Cloudflare Workers, I/O objects
// (DB connections/promises) are bound to the request that created them, so a
// shared module-level client breaks when a second request reuses it. With
// Neon-over-fetch there's no persistent connection, so a new client is cheap.
export function getPrisma() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}