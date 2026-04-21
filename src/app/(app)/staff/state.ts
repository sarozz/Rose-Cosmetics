export type StaffFormState = {
  fieldErrors: Record<string, string>;
  formError: string | null;
};

export const emptyStaffState: StaffFormState = {
  fieldErrors: {},
  formError: null,
};
