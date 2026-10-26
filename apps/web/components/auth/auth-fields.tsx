"use client";

import { useId, useState } from "react";

/**
 * The shared input styling for the authentication forms.
 */
export const inputClassName =
  "h-12 w-full rounded-xl border border-hairline-strong bg-card px-4 text-[15px] text-text placeholder:text-text-muted transition-colors duration-200 hover:border-white/25 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60";

export type FieldProps = {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "email" | "text" | "numeric";
  required?: boolean;
  disabled?: boolean;
  error?: string;
};

/**
 * A labelled text input.
 *
 * The error is associated with the input via `aria-describedby` and
 * `aria-invalid`, so screen readers announce the problem with the field
 * rather than leaving it as a detached message.
 */
export function TextField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  required,
  disabled,
  error,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-text-secondary"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClassName}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A one-time password input.
 *
 * The code is numeric and short, so the field uses a numeric input mode and
 * a generous letter spacing. The code is masked by default — it is a
 * secret, even though it is short-lived.
 */
export function OtpField({
  label,
  name,
  value,
  onChange,
  placeholder,
  length,
  required,
  disabled,
  error,
}: Omit<FieldProps, "type" | "inputMode"> & { length: number }) {
  const id = useId();
  const errorId = `${id}-error`;
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-text-secondary"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={length}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${inputClassName} pr-12 text-center text-lg tracking-[0.6em]`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? "Hide code" : "Show code"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {visible ? (
        <>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .4 4.2 1" />
          <path d="M21.5 12S18 18.5 12 18.5c-1.4 0-2.7-.3-3.8-.9" />
          <path d="M3 3l18 18" />
        </>
      )}
    </svg>
  );
}
