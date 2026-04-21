import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Rose Cosmetics POS" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-card p-8 shadow-sm">
        <header className="mb-6 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-rose-400">
            Rose Cosmetics
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Staff sign-in</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Use the email your owner provisioned for you.
          </p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
