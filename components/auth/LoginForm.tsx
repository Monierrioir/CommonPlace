"use client";

import { useActionState, useEffect, useRef } from "react";
import { login } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/form-state";
import { AuthField } from "./AuthField";
import { FormAlert } from "./FormAlert";
import { SubmitButton } from "./SubmitButton";

type LoginFormProps = {
  next: string;
  notice: string | null;
};

export function LoginForm({ next, notice }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, initialAuthFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const error = state.status === "error" ? state : null;

  useEffect(() => {
    if (state.status === "error" && state.fieldErrors) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      {error ? <FormAlert message={error.message} /> : <FormAlert message={notice} tone="notice" />}

      <AuthField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={error?.fields.email}
        error={error?.fieldErrors?.email}
        autoFocus
      />
      <AuthField
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={error?.fieldErrors?.password}
      />

      <SubmitButton pending={pending} label="Log in" pendingLabel="Opening the door…" />
    </form>
  );
}
