import { requireRole, STAFF_WRITE_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { isTelegramConfigured } from "@/lib/services/telegram";
import { deleteRecipientAction, testRecipientAction } from "./actions";

export const metadata = { title: "Telegram alerts — Rose Cosmetics POS" };

export default async function TelegramSettingsPage() {
  await requireRole(STAFF_WRITE_ROLES);
  const [recipients, configured] = await Promise.all([
    prisma.telegramRecipient.findMany({
      orderBy: [{ enabled: "desc" }, { name: "asc" }],
    }),
    Promise.resolve(isTelegramConfigured()),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Settings"
        title="Telegram alerts"
        description="Send low-stock pings and daily summaries to phones or groups."
        actions={
          <a href="/settings/telegram/new" className="btn-primary">
            Add recipient
          </a>
        }
      />

      {!configured ? (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-medium">Bot token not configured.</p>
          <p className="mt-1 text-amber-200/80">
            Create a bot with{" "}
            <span className="font-mono">@BotFather</span> on Telegram, then set{" "}
            <span className="font-mono">TELEGRAM_BOT_TOKEN</span> in your
            deployment environment. Recipients saved here will start receiving
            alerts as soon as the token is present.
          </p>
        </div>
      ) : null}

      {recipients.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-card p-6 text-sm text-ink-muted">
          No recipients yet. Add one to start receiving alerts.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-card">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Chat ID</th>
                <th className="px-4 py-3">Alerts</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recipients.map((r) => {
                const flags: string[] = [];
                if (r.notifySales) flags.push("Sales");
                if (r.notifyStockReceipts) flags.push("Stock");
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-soft">
                      {r.chatId}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-soft">
                      {flags.length > 0 ? flags.join(" · ") : "None"}
                    </td>
                    <td className="px-4 py-3">
                      {r.enabled ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                          Enabled
                        </span>
                      ) : (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-muted">
                          Paused
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3 text-xs">
                        <form action={sendTest}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="text-rose-300 hover:underline disabled:opacity-40"
                            disabled={!configured || !r.enabled}
                          >
                            Test
                          </button>
                        </form>
                        <a
                          href={`/settings/telegram/${r.id}/edit`}
                          className="text-rose-300 hover:underline"
                        >
                          Edit
                        </a>
                        <form
                          action={deleteRecipientAction}
                          onSubmit={(e) => {
                            if (
                              !confirm(
                                "Remove this recipient? They'll stop receiving alerts.",
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="text-ink-muted hover:text-rose-300"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <details className="mt-6 rounded-lg border border-white/10 bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium text-ink">
          How to find a chat ID
        </summary>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-ink-soft">
          <li>
            Open Telegram and message{" "}
            <span className="font-mono">@userinfobot</span> — it replies with
            your numeric chat ID.
          </li>
          <li>
            For a group, invite your bot into the group, then message{" "}
            <span className="font-mono">@RawDataBot</span> inside the group —
            look for the <span className="font-mono">&quot;chat&quot;:&#123;&quot;id&quot;: ...&#125;</span> field.
            Group IDs start with <span className="font-mono">-100</span>.
          </li>
          <li>
            Start a chat with your bot (so it can message you first) by
            pressing <em>Start</em> in the bot&apos;s DM.
          </li>
        </ol>
      </details>
    </div>
  );
}

// The list action expects an async FormData handler — delegate to the
// shared server action.
async function sendTest(formData: FormData) {
  "use server";
  await testRecipientAction(formData);
}
