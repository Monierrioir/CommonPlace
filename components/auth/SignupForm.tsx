"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { signup } from "@/lib/auth/actions";
import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH, initialAuthFormState } from "@/lib/auth/form-state";
import { AuthField } from "./AuthField";
import { FormAlert } from "./FormAlert";
import { SubmitButton } from "./SubmitButton";

type SignupFormProps = {
  next: string;
  loginHref: string;
};

export function SignupForm({ next, loginHref }: SignupFormProps) {
  const [state, formAction, pending] = useActionState(signup, initialAuthFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const error = state.status === "error" ? state : null;

  useEffect(() => {
    if (state.status === "check-email") {
      confirmationRef.current?.focus();
    } else if (state.status === "error" && state.fieldErrors) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state]);

  if (state.status === "check-email") {
    return (
      <div ref={confirmationRef} tabIndex={-1} className="outline-none">
        <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-forest uppercase">Almost there</p>
        <h2 className="mt-2 font-serif text-2xl leading-tight text-ink">Check your email</h2>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          We’ve sent a confirmation link to <span className="font-medium break-all text-ink">{state.email}</span>.
          Open it in this browser and your reading room will be ready.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Nothing there after a few minutes? Peek in your spam folder.
        </p>
        <p className="mt-5 text-sm text-ink-soft">
          Already confirmed?{" "}
          <Link
            href={loginHref}
            className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:text-burgundy hover:decoration-burgundy/40"
          >
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <FormAlert message={error?.message ?? null} />

      <AuthField
        name="displayName"
        label="What should we call you?"
        type="text"
        autoComplete="nickname"
        defaultValue={error?.fields.displayName}
        error={error?.fieldErrors?.displayName}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        autoFocus
      />
      <AuthField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={error?.fields.email}
        error={error?.fieldErrors?.email}
      />
      <AuthField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        error={error?.fieldErrors?.password}
        minLength={PASSWORD_MIN_LENGTH}
      />

      <SubmitButton pending={pending} label="Create account" pendingLabel="Preparing your shelf…" />
    </form>
  );
}
