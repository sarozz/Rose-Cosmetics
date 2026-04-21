export type TelegramFormState = {
  fieldErrors: Record<string, string>;
  formError: string | null;
};

export const emptyTelegramState: TelegramFormState = {
  fieldErrors: {},
  formError: null,
};
