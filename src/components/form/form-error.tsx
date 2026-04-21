export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md bg-rose-500/15 px-3 py-2 text-sm text-rose-200"
    >
      {message}
    </p>
  );
}
