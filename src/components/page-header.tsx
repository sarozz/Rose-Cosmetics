export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wider text-rose-400 sm:text-sm">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-xl font-semibold text-ink sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
