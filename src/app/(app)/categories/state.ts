export type CategoryFormState = {
  fieldErrors: Record<string, string>;
  formError: string | null;
};

export const emptyCategoryState: CategoryFormState = {
  fieldErrors: {},
  formError: null,
};
