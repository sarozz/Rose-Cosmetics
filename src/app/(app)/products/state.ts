export type ProductFormState = {
  fieldErrors: Record<string, string>;
  formError: string | null;
};

export const emptyProductState: ProductFormState = {
  fieldErrors: {},
  formError: null,
};
