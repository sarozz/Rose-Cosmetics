"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, STAFF_WRITE_ROLES } from "@/lib/auth";
import {
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validation/user";
import {
  createStaff,
  deleteStaff,
  StaffValidationError,
  updateStaff,
} from "@/lib/services/user";
import type { StaffFormState } from "./state";

export async function createStaffAction(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const actor = await requireRole(STAFF_WRITE_ROLES);
  const parsed = userCreateSchema.safeParse({
    email: formData.get("email") ?? "",
    displayName: formData.get("displayName") ?? "",
    role: formData.get("role") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      fieldErrors: toFieldErrors(flat.fieldErrors),
      formError: flat.formErrors[0] ?? "Please fix the highlighted fields.",
    };
  }
  try {
    await createStaff(actor.id, parsed.data);
  } catch (err) {
    if (err instanceof StaffValidationError) {
      return { fieldErrors: {}, formError: err.message };
    }
    return { fieldErrors: {}, formError: friendlyError(err) };
  }
  revalidatePath("/staff");
  redirect("/staff");
}

export async function updateStaffAction(
  id: string,
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const actor = await requireRole(STAFF_WRITE_ROLES);
  const parsed = userUpdateSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    role: formData.get("role") ?? "",
    isActive: formData.get("isActive") ?? "",
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      fieldErrors: toFieldErrors(flat.fieldErrors),
      formError: flat.formErrors[0] ?? "Please fix the highlighted fields.",
    };
  }
  try {
    await updateStaff(actor.id, id, parsed.data);
  } catch (err) {
    if (err instanceof StaffValidationError) {
      return { fieldErrors: {}, formError: err.message };
    }
    return { fieldErrors: {}, formError: friendlyError(err) };
  }
  revalidatePath("/staff");
  redirect("/staff");
}

function toFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    if (msgs && msgs.length > 0) out[key] = msgs[0];
  }
  return out;
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("P2002") && message.includes("email")) {
    return "A staff member with that email already exists.";
  }
  return "Something went wrong. Try again.";
}

export type DeleteStaffResult = { ok: true } | { ok: false; message: string };

export async function deleteStaffAction(
  formData: FormData,
): Promise<DeleteStaffResult> {
  const actor = await requireRole(STAFF_WRITE_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing staff id" };
  try {
    await deleteStaff(actor.id, id);
  } catch (err) {
    if (err instanceof StaffValidationError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: friendlyError(err) };
  }
  revalidatePath("/staff");
  return { ok: true };
}
