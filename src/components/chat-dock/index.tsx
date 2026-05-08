import { requireUser } from "@/lib/auth";
import { bootstrapChat } from "@/lib/services/chat";
import { ChatDock as ChatDockClient } from "./chat-dock";

/**
 * Server wrapper: fetches the current user + initial chat state and
 * hands them to the client dock. Mounted in the (app) layout so every
 * authenticated page renders the floating chat button.
 */
export async function ChatDock() {
  const user = await requireUser();
  const bootstrap = await bootstrapChat(user.id);
  return <ChatDockClient currentUserId={user.id} bootstrap={bootstrap} />;
}
