import { PrismaClient } from "@prisma/client";

// Keep a single PrismaClient across hot reloads in dev — otherwise every
// HMR cycle opens new connections and Neon shuts us down.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
