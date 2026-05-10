import { Prisma } from "@prisma/client";

/**
 * Turn an unknown error into a human-readable, actionable message. We:
 *
 *   1. Recognise Prisma's known error codes and map them to specific
 *      copy that explains what the operator can do about it.
 *   2. Recognise our own typed service errors (passed through verbatim).
 *   3. Fall through to `err.message` so the user always sees something
 *      concrete instead of a generic "Something went wrong".
 *
 * The full error is also logged server-side at error level so we can
 * debug from Vercel logs even when the user's screenshot only shows the
 * humanised message.
 */
export function explainError(
  err: unknown,
  options: { logPrefix?: string } = {},
): string {
  const prefix = options.logPrefix ?? "action";
  console.error(`${prefix}:`, err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return explainPrismaKnown(err);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    // Validation errors are verbose — keep just the first line.
    const firstLine = err.message.split("\n").find((l) => l.trim().length > 0);
    return `Invalid data sent to the database: ${firstLine ?? err.message}`;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return "Could not reach the database. Check your connection and try again.";
  }

  if (err instanceof Prisma.PrismaClientRustPanicError) {
    return "The database client crashed. Please retry.";
  }

  if (err instanceof Error) {
    return err.message || "Unknown error.";
  }

  return String(err);
}

function explainPrismaKnown(err: Prisma.PrismaClientKnownRequestError): string {
  const meta = (err.meta ?? {}) as Record<string, unknown>;
  const target = Array.isArray(meta.target)
    ? (meta.target as string[]).join(", ")
    : typeof meta.target === "string"
      ? meta.target
      : "";
  const fieldName = typeof meta.field_name === "string" ? meta.field_name : "";
  const modelName = typeof meta.modelName === "string" ? meta.modelName : "";
  const column = typeof meta.column === "string" ? meta.column : "";

  switch (err.code) {
    case "P2002":
      return target
        ? `Already exists: a row with the same ${target} is in the database. Refresh and try again.`
        : "Duplicate value — refresh and try again.";
    case "P2003":
      return fieldName
        ? `Linked record missing: ${fieldName} points to something that no longer exists. The product or supplier may have been deleted — refresh and pick again.`
        : "Linked record missing. Refresh the page and pick again.";
    case "P2025":
      return "Record not found. Someone else may have deleted it. Refresh the page.";
    case "P2014":
      return "This change would break a required relationship. Refresh and try again.";
    case "P2011":
      return column
        ? `Required field is empty: ${column}.`
        : "A required field is empty.";
    case "P2012":
      return "A required field is missing.";
    case "P2022":
      return column
        ? `Database column ${column} is missing. The schema migration didn't run yet.`
        : "A database column is missing — schema migration hasn't run.";
    case "P2024":
      return "Database connection pool was exhausted (too many concurrent queries). Retry in a moment.";
    case "P2034":
      return "The transaction conflicted with another change. Retry.";
    default:
      return `Database error ${err.code}${modelName ? ` on ${modelName}` : ""}: ${err.message.split("\n")[0]}`;
  }
}
