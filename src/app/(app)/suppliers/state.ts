export type SupplierFormState = {
  fieldErrors: Record<string, string>;
  formError: string | null;
};

export const emptySupplierState: SupplierFormState = {
  fieldErrors: {},
  formError: null,
};
