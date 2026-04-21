export type ReceivingFormState = {
  fieldErrors: Record<string, string>;
  formError: string | null;
};

export const emptyReceivingState: ReceivingFormState = {
  fieldErrors: {},
  formError: null,
};
