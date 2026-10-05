type Props = {
  label?: string;
  fullscreen?: boolean;
};

export function LoadingSpinner({ label = "Loading…", fullscreen = false }: Props) {
  const ring = (
    <span
      className="inline-block h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent"
      aria-hidden
    />
  );

  if (fullscreen) {
    return (
      <div
        className="grid min-h-screen place-items-center text-ink-soft"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-3">
          {ring}
          <span>{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 py-4 text-ink-soft"
      role="status"
      aria-live="polite"
    >
      {ring}
      <span>{label}</span>
    </div>
  );
}
