import { requireUser } from "@/lib/auth";
import { DisplayClient } from "./display-client";

export const metadata = { title: "Customer display · Rose Cosmetics" };

/**
 * Customer-facing secondary display. Opened in a second browser window
 * and dragged to an external monitor facing the shopper. Kept behind
 * auth because the shop's owner is already signed in; the BroadcastChannel
 * it listens on is same-origin/same-browser, so there's no cross-device
 * leakage to worry about.
 */
export default async function DisplayPage() {
  await requireUser();
  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-page text-ink">
      <DisplayClient />
    </main>
  );
}
