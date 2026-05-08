import { prisma } from "@/lib/prisma";

export type ChatMessageRow = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  /** User ids who've read this message (excluding the author). */
  readBy: string[];
};

export type ChatBootstrap = {
  /** All staff — used to render names + initials when realtime payloads arrive. */
  members: { id: string; displayName: string; role: string }[];
  /** Recent messages, oldest-first. */
  messages: ChatMessageRow[];
  /** ISO timestamp of the latest message current user has read. */
  lastReadAt: string | null;
};

const PAGE_SIZE = 100;

/**
 * Initial payload for the chat dock. Caps at the most recent
 * 100 messages — if the team needs older history we'd add lazy
 * pagination.
 */
export async function bootstrapChat(currentUserId: string): Promise<ChatBootstrap> {
  const [members, messages] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, displayName: true, role: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.chatMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        author: { select: { id: true, displayName: true, role: true } },
        reads: { select: { userId: true } },
      },
    }),
  ]);

  const lastReadByCurrent = await prisma.chatRead.findFirst({
    where: { userId: currentUserId },
    orderBy: { readAt: "desc" },
    select: { readAt: true },
  });

  return {
    members: members.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      role: m.role,
    })),
    messages: messages.reverse().map(toRow),
    lastReadAt: lastReadByCurrent?.readAt.toISOString() ?? null,
  };
}

export async function getMessageWithAuthor(id: string): Promise<ChatMessageRow | null> {
  const m = await prisma.chatMessage.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, displayName: true, role: true } },
      reads: { select: { userId: true } },
    },
  });
  return m ? toRow(m) : null;
}

/**
 * Polling fallback: messages strictly newer than `sinceIso`, plus the latest
 * read state for each. Capped at 100 rows so a long disconnected interval
 * can't return an unbounded payload.
 */
export async function chatMessagesSince(sinceIso: string): Promise<ChatMessageRow[]> {
  const cutoff = new Date(sinceIso);
  if (Number.isNaN(cutoff.getTime())) return [];
  const rows = await prisma.chatMessage.findMany({
    where: { createdAt: { gt: cutoff } },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      author: { select: { id: true, displayName: true, role: true } },
      reads: { select: { userId: true } },
    },
  });
  return rows.map(toRow);
}

/**
 * Polling fallback: read receipts for the given message ids — refreshes
 * "Seen by …" lines for messages already in the client cache.
 */
export async function chatReadsForMessages(
  messageIds: string[],
): Promise<{ messageId: string; userId: string }[]> {
  if (messageIds.length === 0) return [];
  const rows = await prisma.chatRead.findMany({
    where: { messageId: { in: messageIds } },
    select: { messageId: true, userId: true },
  });
  return rows;
}

function toRow(m: {
  id: string;
  body: string;
  createdAt: Date;
  authorId: string;
  author: { id: string; displayName: string; role: string };
  reads: { userId: string }[];
}): ChatMessageRow {
  return {
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    authorId: m.authorId,
    authorName: m.author.displayName,
    authorRole: m.author.role,
    readBy: m.reads.map((r) => r.userId).filter((uid) => uid !== m.authorId),
  };
}

export async function insertChatMessage(
  authorId: string,
  body: string,
): Promise<ChatMessageRow> {
  const created = await prisma.chatMessage.create({
    data: { authorId, body },
    include: {
      author: { select: { id: true, displayName: true, role: true } },
      reads: { select: { userId: true } },
    },
  });
  return toRow(created);
}

/**
 * Resolve a Telegram chat id back to a User. Returns null when the chat id
 * isn't linked to a user — in which case the webhook silently ignores the
 * message rather than echoing untrusted strangers into the team chat.
 */
export async function findUserByTelegramChatId(
  telegramChatId: string,
): Promise<{ id: string; displayName: string } | null> {
  const user = await prisma.user.findFirst({
    where: { telegramChatId, isActive: true },
    select: { id: true, displayName: true },
  });
  return user;
}

/**
 * Mark messages as read by the given user. Idempotent — uses upsert per
 * pair so re-reads are no-ops. Skips messages authored by the user (an
 * author has implicitly "read" their own message).
 */
export async function markMessagesRead(
  userId: string,
  messageIds: string[],
): Promise<void> {
  if (messageIds.length === 0) return;
  const candidates = await prisma.chatMessage.findMany({
    where: { id: { in: messageIds }, authorId: { not: userId } },
    select: { id: true },
  });
  if (candidates.length === 0) return;
  await prisma.$transaction(
    candidates.map((c) =>
      prisma.chatRead.upsert({
        where: { messageId_userId: { messageId: c.id, userId } },
        create: { messageId: c.id, userId },
        update: {},
      }),
    ),
  );
}
