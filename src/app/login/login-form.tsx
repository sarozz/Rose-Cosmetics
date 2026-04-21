"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInAction, type SignInState } from "./actions";

const initialState: SignInState = { error: null };

export function LoginForm() {
  const [state, formAction] = useFormState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-md border border-white/10 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full rounded-md border border-white/10 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
        />
      </div>
      {state.error ? (
        <p
          role="alert"
          className="rounded-md bg-rose-500/15 px-3 py-2 text-sm text-rose-200"
        >
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}
