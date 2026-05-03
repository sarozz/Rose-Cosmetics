"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Field, inputClass } from "@/components/form/field";
import {
  FormPendingOverlay,
  SubmitTracker,
} from "@/components/form-pending-overlay";
import { signInAction, type SignInState } from "./actions";

const initialState: SignInState = { error: null };

export function LoginForm() {
  const [state, formAction] = useFormState(signInAction, initialState);
  // Manual flag so the overlay stays open from submit-click all the way
  // through the redirect. We never rely on useFormStatus alone — that
  // flips back to false the moment the action returns and would let the
  // login screen flash before the dashboard mounts.
  const [submitting, setSubmitting] = useState(false);

  // If the action returned an error, close the overlay so the user can
  // see + correct it. On success the action redirects and the form
  // unmounts, taking the overlay with it — no need to flip submitting back.
  useEffect(() => {
    if (state.error) setSubmitting(false);
  }, [state.error]);

  return (
    <form action={formAction} className="space-y-4">
      <SubmitTracker onSubmitStart={() => setSubmitting(true)} />
      <Field label="Email" htmlFor="email" adornment="@">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass()}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass()}
        />
      </Field>
      {state.error ? (
        <p
          role="alert"
          className="rounded-md bg-rose-500/15 px-3 py-2 text-sm text-rose-200"
        >
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
      <FormPendingOverlay
        open={submitting}
        title="Signing you in"
        messages={[
          "Verifying your credentials…",
          "Loading your workspace…",
          "Almost there — just a moment…",
        ]}
      />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              opacity="0.25"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          Signing in…
        </span>
      ) : (
        "Sign in"
      )}
    </button>
  );
}
