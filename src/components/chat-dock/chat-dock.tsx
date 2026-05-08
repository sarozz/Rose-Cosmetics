"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  sendChatMessageAction,
  markChatReadAction,
} from "@/app/(app)/chat/actions";
import type { ChatBootstrap, ChatMessageRow } from "@/lib/services/chat";
import { playChime } from "./chime";

type Member = ChatBootstrap["members"][number];

const STORAGE_OPEN_KEY = "rose-chat-open";
const STORAGE_LAST_SEEN_KEY = "rose-chat-last-seen";

export function ChatDock({
  currentUserId,
  bootstrap,
}: {
  currentUserId: string;
  bootstrap: ChatBootstrap;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [members, setMembers] = useState<Map<string, Member>>(
    () => new Map(bootstrap.members.map((m) => [m.id, m])),
  );
  const [messages, setMessages] = useState<ChatMessageRow[]>(bootstrap.messages);
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_OPEN_KEY) === "1";
  });
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Persist open/closed across reloads so the dock feels stateful.
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_OPEN_KEY, open ? "1" : "0");
  }, [open]);

  // Realtime: subscribe to INSERTs on chat_messages + chat_reads.
  useEffect(() => {
    const channel = supabase
      .channel("rose-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const r = payload.new as {
            id: string;
            author_id: string;
            body: string;
            created_at: string;
          };
          // Avoid double-inserting our own optimistic message.
          if (messagesRef.current.some((m) => m.id === r.id)) return;
          const author = members.get(r.author_id);
          const next: ChatMessageRow = {
            id: r.id,
            authorId: r.author_id,
            body: r.body,
            createdAt: r.created_at,
            authorName: author?.displayName ?? "Teammate",
            authorRole: author?.role ?? "CASHIER",
            readBy: [],
          };
          setMessages((prev) => [...prev, next]);
          if (r.author_id !== currentUserId) {
            playChime();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_reads" },
        (payload) => {
          const r = payload.new as { message_id: string; user_id: string };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === r.message_id && !m.readBy.includes(r.user_id)
                ? { ...m, readBy: [...m.readBy, r.user_id] }
                : m,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId, members]);

  // Auto-scroll to bottom whenever messages grow & dock is open.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  // Mark unread incoming messages as read whenever the dock is open.
  const lastReadAtRef = useRef<string | null>(bootstrap.lastReadAt);
  useEffect(() => {
    if (!open) return;
    const unreadIds = messages
      .filter(
        (m) =>
          m.authorId !== currentUserId &&
          !m.readBy.includes(currentUserId),
      )
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    // Optimistically update local state so the badge clears immediately.
    setMessages((prev) =>
      prev.map((m) =>
        unreadIds.includes(m.id) && !m.readBy.includes(currentUserId)
          ? { ...m, readBy: [...m.readBy, currentUserId] }
          : m,
      ),
    );
    const now = new Date().toISOString();
    lastReadAtRef.current = now;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_LAST_SEEN_KEY, now);
    }
    void markChatReadAction(unreadIds);
  }, [open, messages, currentUserId]);

  const send = useCallback(() => {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    // Optimistic local insert.
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessageRow = {
      id: tempId,
      authorId: currentUserId,
      body,
      createdAt: new Date().toISOString(),
      authorName: members.get(currentUserId)?.displayName ?? "You",
      authorRole: members.get(currentUserId)?.role ?? "CASHIER",
      readBy: [],
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    startTransition(async () => {
      const result = await sendChatMessageAction(body);
      if (!result.ok) {
        setError(result.error);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setDraft(body);
        return;
      }
      // Swap the temp row for the real one (or merge if Realtime already arrived).
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (withoutTemp.some((m) => m.id === result.message.id))
          return withoutTemp;
        return [...withoutTemp, result.message];
      });
    });
  }, [draft, currentUserId, members]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const unreadCount = useMemo(
    () =>
      messages.filter(
        (m) => m.authorId !== currentUserId && !m.readBy.includes(currentUserId),
      ).length,
    [messages, currentUserId],
  );

  // Build "members minus me" map once for seen-by display.
  const otherMembers = useMemo(() => {
    const out: Member[] = [];
    members.forEach((m) => {
      if (m.id !== currentUserId) out.push(m);
    });
    return out;
  }, [members, currentUserId]);

  // Track members changes via prop (in case bootstrap re-renders).
  useEffect(() => {
    setMembers(new Map(bootstrap.members.map((m) => [m.id, m])));
  }, [bootstrap.members]);

  return (
    <div className="no-print pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div
          className="pointer-events-auto flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl"
          role="dialog"
          aria-label="Team chat"
        >
          <header className="flex items-center justify-between border-b border-white/10 bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">Team chat</p>
              <p className="text-[11px] text-ink-muted">
                {otherMembers.length} teammate
                {otherMembers.length === 1 ? "" : "s"} · realtime
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1 text-ink-muted transition-colors hover:bg-white/5 hover:text-ink"
            >
              <CloseIcon />
            </button>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-page/40 px-3 py-3"
          >
            {messages.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-ink-muted">
                No messages yet — say hi.
              </p>
            ) : (
              <MessageList
                messages={messages}
                currentUserId={currentUserId}
                members={members}
              />
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-white/10 bg-surface p-2"
          >
            {error ? (
              <p
                role="alert"
                className="px-2 pb-1 text-[11px] text-rose-300"
              >
                {error}
              </p>
            ) : null}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message your team — Enter to send"
                rows={1}
                className="block max-h-32 min-h-[2.25rem] flex-1 resize-none rounded-lg border border-white/10 bg-page/60 px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
              />
              <button
                type="submit"
                disabled={pending || draft.trim().length === 0}
                className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-rose-500/40"
                aria-label="Send"
              >
                <SendIcon />
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide team chat" : "Open team chat"}
        aria-expanded={open}
        className="pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl transition-transform hover:scale-105 hover:bg-rose-400 focus:outline-none focus:ring-4 focus:ring-rose-400/40"
      >
        <ChatBubbleIcon />
        {!open && unreadCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-page"
            aria-label={`${unreadCount} unread`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function MessageList({
  messages,
  currentUserId,
  members,
}: {
  messages: ChatMessageRow[];
  currentUserId: string;
  members: Map<string, Member>;
}) {
  // Group consecutive messages from the same author within ~5 minutes for a
  // tighter Messenger-like read.
  const groups = useMemo(() => groupMessages(messages), [messages]);

  // For "seen by", show readers under the LAST message overall (typical
  // chat semantics — older messages are implicitly seen if a newer one is).
  const lastIndex = messages.length - 1;

  return (
    <>
      {groups.map((g, gi) => {
        const mine = g.authorId === currentUserId;
        return (
          <div
            key={g.firstId}
            className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
          >
            {!mine ? (
              <span className="px-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                {g.authorName}
              </span>
            ) : null}
            {g.messages.map((m, mi) => {
              const isLast = gi === groups.length - 1 && mi === g.messages.length - 1;
              const overallIndex = m.indexInList;
              return (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm leading-snug ${
                    mine
                      ? "bg-rose-500/90 text-white"
                      : "bg-white/5 text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  {isLast ? (
                    <SeenBy
                      message={m}
                      members={members}
                      currentUserId={currentUserId}
                      mine={mine}
                    />
                  ) : null}
                  {overallIndex === lastIndex && !isLast ? null : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

function SeenBy({
  message,
  members,
  currentUserId,
  mine,
}: {
  message: ChatMessageRow;
  members: Map<string, Member>;
  currentUserId: string;
  mine: boolean;
}) {
  // For your own message, show who else has seen it. For incoming, no need.
  if (!mine) return null;
  const seers = message.readBy
    .filter((uid) => uid !== currentUserId)
    .map((uid) => members.get(uid)?.displayName)
    .filter((n): n is string => Boolean(n));
  if (seers.length === 0) return null;
  return (
    <p className="mt-1 text-right text-[10px] font-medium text-white/70">
      Seen by {seers.join(", ")}
    </p>
  );
}

type Group = {
  firstId: string;
  authorId: string;
  authorName: string;
  messages: (ChatMessageRow & { indexInList: number })[];
};

function groupMessages(messages: ChatMessageRow[]): Group[] {
  const groups: Group[] = [];
  messages.forEach((m, i) => {
    const last = groups[groups.length - 1];
    const sameAuthor = last?.authorId === m.authorId;
    const closeInTime =
      last &&
      new Date(m.createdAt).getTime() -
        new Date(last.messages[last.messages.length - 1].createdAt).getTime() <
        5 * 60 * 1000;
    if (last && sameAuthor && closeInTime) {
      last.messages.push({ ...m, indexInList: i });
    } else {
      groups.push({
        firstId: m.id,
        authorId: m.authorId,
        authorName: m.authorName,
        messages: [{ ...m, indexInList: i }],
      });
    }
  });
  return groups;
}

function ChatBubbleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-6 w-6"
      aria-hidden
    >
      <path
        d="M21 12a8 8 0 1 1-3.42-6.55L21 4l-1.45 3.42A7.96 7.96 0 0 1 21 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="13" cy="12" r="1" fill="currentColor" />
      <circle cx="17" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M6 6l12 12M6 18L18 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M4 4l16 8-16 8 3-8-3-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
