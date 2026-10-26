"use client";

import type { AuthProvider } from "@repo/auth";

/**
 * The social authentication buttons.
 *
 * Social auth is shown before the email form, matching the priority order
 * in the feature spec. A provider that is not configured server-side is
 * simply not rendered.
 */
export function SocialAuthButtons({
  providers,
  onSelect,
  disabled,
  loadingProvider,
}: {
  providers: readonly Exclude<AuthProvider, "email">[];
  onSelect: (provider: Exclude<AuthProvider, "email">) => void;
  disabled?: boolean;
  loadingProvider?: Exclude<AuthProvider, "email"> | null;
}) {
  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => onSelect(provider)}
          disabled={disabled}
          aria-busy={loadingProvider === provider}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-hairline-strong bg-white/5 text-[15px] font-medium text-text transition-colors duration-200 hover:bg-white/10 hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingProvider === provider ? (
            <Spinner />
          ) : (
            <ProviderIcon provider={provider} />
          )}
          {loadingProvider === provider
            ? "Connecting..."
            : `Continue with ${providerLabel(provider)}`}
        </button>
      ))}
    </div>
  );
}

/**
 * The "or continue with email" divider.
 */
export function AuthDivider({ label = "or continue with email" }: { label?: string }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className="h-px flex-1 bg-hairline" />
      <span className="text-xs uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}

/**
 * The form-level error message.
 *
 * The message is safe to display: it never contains provider errors,
 * tokens or internal details.
 */
export function AuthError({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden="true"
        className="mt-0.5 shrink-0"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5M12 16h.01" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

/**
 * The primary submit button.
 *
 * It disables itself while a submission is in flight, which is what
 * prevents duplicate submissions.
 */
export function AuthSubmitButton({
  children,
  loading,
  loadingLabel,
  onClick,
  disabled,
  type = "submit",
}: {
  children: React.ReactNode;
  loading: boolean;
  loadingLabel: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const isDisabled = loading || disabled === true;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold tracking-tight text-primary-ink transition-colors duration-200 hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <>
          <Spinner />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function providerLabel(provider: Exclude<AuthProvider, "email">): string {
  return provider === "google" ? "Google" : "Facebook";
}

function ProviderIcon({
  provider,
}: {
  provider: Exclude<AuthProvider, "email">;
}) {
  if (provider === "facebook") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.61v3h3.87c2.27-2.09 3.58-5.17 3.58-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.93l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.29a12 12 0 0 0 0 10.72l4-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.78c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.64l4 3.09C6.23 6.89 8.88 4.78 12 4.78z"
      />
    </svg>
  );
}
