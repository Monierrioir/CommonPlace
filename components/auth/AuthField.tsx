import type { AuthFieldName } from "@/lib/auth/form-state";

type AuthFieldProps = {
  name: AuthFieldName;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  defaultValue?: string;
  hint?: string;
  error?: string;
  minLength?: number;
  maxLength?: number;
  autoFocus?: boolean;
};

export function AuthField({
  name,
  label,
  type,
  autoComplete,
  defaultValue,
  hint,
  error,
  minLength,
  maxLength,
  autoFocus,
}: AuthFieldProps) {
  const id = `auth-${name}`;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = errorId ?? hintId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        minLength={minLength}
        maxLength={maxLength}
        autoFocus={autoFocus}
        spellCheck={false}
        autoCapitalize={type === "text" ? "words" : "none"}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="h-12 w-full rounded-sm border border-line bg-paper/60 px-3.5 text-base text-ink shadow-[inset_0_1px_2px_rgb(42_29_21/0.06)] transition-colors placeholder:text-ink-muted/80 hover:border-ink/25 focus:border-ink/40 focus:bg-cream aria-invalid:border-burgundy/60"
      />
      {error && (
        <p id={errorId} className="text-sm text-burgundy">
          {error}
        </p>
      )}
      {hintId && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
