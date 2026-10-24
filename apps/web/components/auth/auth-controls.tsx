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
  providers: readonly Exclude<AuthProvider, "credential">[];
  onSelect: (provider: Exclude<AuthProvider, "credential">) => void;
  disabled?: boolean;
  loadingProvider?: Exclude<AuthProvider, "credential"> | null;
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
            : `Continue with ${provider === "google" ? "Google" : "Apple"}`}
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
 * The password requirements checklist.
 *
 * The requirements come from the backend policy, so the list can never
 * disagree with what the server enforces.
 */
export function PasswordRequirements({
  requirements,
}: {
  requirements: readonly {
    id: string;
    label: string;
    satisfied: boolean;
  }[];
}) {
  return (
    <ul className="space-y-1.5" aria-live="polite">
      {requirements.map((requirement) => (
        <li
          key={requirement.id}
          className="flex items-center gap-2 text-[13px] text-text-secondary"
        >
          <CheckIcon satisfied={requirement.satisfied} />
          <span
            className={
              requirement.satisfied ? "text-primary" : "text-text-secondary"
            }
          >
            {requirement.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CheckIcon({ satisfied }: { satisfied: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={satisfied ? "text-primary" : "text-text-muted"}
    >
      {satisfied ? (
        <path d="M20 6L9 17l-5-5" />
      ) : (
        <circle cx="12" cy="12" r="9" />
      )}
    </svg>
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

function ProviderIcon({
  provider,
}: {
  provider: Exclude<AuthProvider, "credential">;
}) {
  if (provider === "apple") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.05 12.54c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.49-2.6-1.7-3.17-1.72-1.35-.14-2.63.79-3.32.79-.68 0-1.74-.77-2.86-.75-1.47.02-2.83.85-3.58 2.17-1.53 2.65-.39 6.57 1.09 8.72.73 1.05 1.6 2.23 2.74 2.19 1.1-.05 1.51-.71 2.84-.71 1.33 0 1.7.71 2.85.69 1.18-.02 1.92-1.07 2.64-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.48zM14.88 5.06c.6-.73 1.01-1.75.9-2.76-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.7-.92 2.7.97.08 1.97-.49 2.58-1.25z" />
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
