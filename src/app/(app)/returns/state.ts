export type ReturnFormState = {
  fieldErrors: Record<string, string>;
  formError: string | null;
  returnRef?: string;
};

export const emptyReturnState: ReturnFormState = {
  fieldErrors: {},
  formError: null,
};
