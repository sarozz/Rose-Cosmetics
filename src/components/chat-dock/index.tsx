"use client";

import { ChatDock as ChatDockClient } from "./chat-dock";

/**
 * Pure client mount. The dock fetches its own bootstrap from
 * `/api/chat/bootstrap` after hydration so the (app) layout doesn't block
 * on chat queries during page navigation.
 */
export function ChatDock() {
  return <ChatDockClient />;
}
