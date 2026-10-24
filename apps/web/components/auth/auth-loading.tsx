/**
 * The full-screen loading state used while the session is restored.
 *
 * The state is announced to assistive technology so a screen reader user
 * knows the application is loading rather than seeing an empty page.
 */
export function AuthLoadingState({
  label = "Loading",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink text-text"
    >
      <span className="relative flex h-10 w-10 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <span className="relative h-3 w-3 rounded-full bg-primary" />
      </span>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}
