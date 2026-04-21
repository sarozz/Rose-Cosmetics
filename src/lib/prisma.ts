import { PrismaClient } from "@prisma/client";

// Normalize DB URLs before the Prisma engine reads them. Pasting into web UIs
// (Vercel, Supabase) can smuggle a trailing newline into the value, which the
// Rust URL parser in @prisma/client rejects as "invalid port number" even
// though JS's URL() tolerates it.
for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
  const value = process.env[key];
  if (value) process.env[key] = value.trim();
}

// Re-use the Prisma client across hot reloads in development.
// In production each serverless instance creates its own client.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
