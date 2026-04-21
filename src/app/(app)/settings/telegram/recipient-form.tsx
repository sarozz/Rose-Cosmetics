"use client";

import { useFormState } from "react-dom";
import { Field, FieldGroup, inputClass } from "@/components/form/field";
import { FormError } from "@/components/form/form-error";
import { SubmitButton } from "@/components/form/submit-button";
import { emptyTelegramState, type TelegramFormState } from "./state";

type Defaults = {
  name?: string;
  chatId?: string;
  enabled?: boolean;
  notifySales?: boolean;
  notifyStockReceipts?: boolean;
};

export function RecipientForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (
    state: TelegramFormState,
    formData: FormData,
  ) => Promise<TelegramFormState>;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, emptyTelegramState);

  return (
    <form action={formAction} className="max-w-xl space-y-8">
      <FormError message={state.formError} />

      <FieldGroup title="Identity">
        <Field
          label="Name"
          htmlFor="name"
          required
          error={state.fieldErrors.name}
          hint="Shown in the recipient list. Example: Owner's phone."
        >
          <input
            id="name"
            name="name"
            defaultValue={defaults?.name ?? ""}
            required
            autoFocus
            className={inputClass()}
          />
        </Field>
        <Field
          label="Chat ID"
          htmlFor="chatId"
          required
          error={state.fieldErrors.chatId}
          hint="Message @userinfobot on Telegram to find your numeric chat ID. For groups, invite the bot and use -100xxxxxxxxxx."
          adornment="#"
        >
          <input
            id="chatId"
            name="chatId"
            defaultValue={defaults?.chatId ?? ""}
            inputMode="numeric"
            required
            className={inputClass()}
          />
        </Field>
      </FieldGroup>

      <FieldGroup title="Preferences">
        <Toggle
          name="enabled"
          label="Enabled"
          hint="Turn off to pause all messages without losing the chat ID."
          defaultChecked={defaults?.enabled ?? true}
        />
        <Toggle
          name="notifySales"
          label="Sales activity"
          hint="Instant ping after every sale, plus the end-of-day recap."
          defaultChecked={defaults?.notifySales ?? true}
        />
        <Toggle
          name="notifyStockReceipts"
          label="Low-stock alerts"
          hint="Ping when a sale drops a product to or below its reorder level."
          defaultChecked={defaults?.notifyStockReceipts ?? true}
        />
      </FieldGroup>

      <div className="flex gap-3 pt-2">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <a href="/settings/telegram" className="btn-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-white/10 text-rose-400 focus:ring-rose-400"
      />
      <span className="space-y-0.5">
        <span className="block font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}
