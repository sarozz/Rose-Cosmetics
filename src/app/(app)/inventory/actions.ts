"use server";

import { requireUser } from "@/lib/auth";
import {
  searchInventorySuggestions,
  type InventorySuggestion,
} from "@/lib/services/inventory";

const MAX_QUERY_LEN = 60;

/**
 * Returns up to 8 product suggestions matching `query`. Auth-gated so
 * unauthenticated traffic can't probe the catalog through the autocomplete
 * endpoint.
 */
export async function searchInventoryAction(
  query: string,
): Promise<InventorySuggestion[]> {
  await requireUser();
  const trimmed = query.trim().slice(0, MAX_QUERY_LEN);
  if (trimmed.length === 0) return [];
  return searchInventorySuggestions(trimmed, 8);
}
