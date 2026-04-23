export type CloseFormState = {
  fieldErrors: Record<string, string>;
  formError: string | null;
  closeId?: string;
};

export const emptyCloseState: CloseFormState = {
  fieldErrors: {},
  formError: null,
};
