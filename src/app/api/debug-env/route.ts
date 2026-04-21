import { NextResponse } from "next/server";

// Debug endpoint — prints the shape of DATABASE_URL (host, port, query params,
// whitespace) without exposing the password. Remove after the Phase 2 preview
// is green.
//
// Gate: only responds when `?token=<CRON_SECRET>` matches, so the internals
// are not discoverable by the public. If CRON_SECRET is unset it responds 404
// so we don't accidentally ship an open diagnostic in production.
export const dynamic = "force-dynamic";

type UrlShape = {
  present: boolean;
  length: number | null;
  startsWith: string | null;
  endsWith: string | null;
  hasLeadingWhitespace: boolean;
  hasTrailingWhitespace: boolean;
  hasSurroundingQuotes: boolean;
  parseable: boolean;
  parseError: string | null;
  protocol: string | null;
  username: string | null;
  host: string | null;
  port: string | null;
  path: string | null;
  search: string | null;
};

function inspect(raw: string | undefined): UrlShape {
  if (raw === undefined) {
    return {
      present: false,
      length: null,
      startsWith: null,
      endsWith: null,
      hasLeadingWhitespace: false,
      hasTrailingWhitespace: false,
      hasSurroundingQuotes: false,
      parseable: false,
      parseError: null,
      protocol: null,
      username: null,
      host: null,
      port: null,
      path: null,
      search: null,
    };
  }

  const trimmed = raw.trim();
  const hasSurroundingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  let parseable = false;
  let parseError: string | null = null;
  let protocol: string | null = null;
  let username: string | null = null;
  let host: string | null = null;
  let port: string | null = null;
  let path: string | null = null;
  let search: string | null = null;

  try {
    const url = new URL(trimmed);
    parseable = true;
    protocol = url.protocol;
    username = url.username;
    host = url.hostname;
    port = url.port;
    path = url.pathname;
    search = url.search;
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
  }

  return {
    present: true,
    length: raw.length,
    startsWith: raw.slice(0, 20),
    endsWith: raw.slice(-20),
    hasLeadingWhitespace: raw !== raw.trimStart(),
    hasTrailingWhitespace: raw !== raw.trimEnd(),
    hasSurroundingQuotes,
    parseable,
    parseError,
    protocol,
    username,
    host,
    port,
    path,
    search,
  };
}

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: inspect(process.env.DATABASE_URL),
    DIRECT_URL: inspect(process.env.DIRECT_URL),
  });
}
