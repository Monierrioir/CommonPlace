"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginErrorMessage, signupErrorMessage } from "./errors";
import {
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type AuthFieldName,
  type AuthFormState,
} from "./form-state";
import { safeNextPath } from "./routes";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function requestOrigin(): Promise<string | null> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin;
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return null;
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

export async function login(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = readText(formData, "email").trim();
  const password = readText(formData, "password");
  const next = safeNextPath(formData.get("next"));

  const fieldErrors: Partial<Record<AuthFieldName, string>> = {};
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = "Enter the email you signed up with.";
  if (!password) fieldErrors.password = "Enter your password.";
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors, fields: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { status: "error", message: loginErrorMessage(error), fields: { email } };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signup(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const displayName = readText(formData, "displayName").trim().replace(/\s+/g, " ");
  const email = readText(formData, "email").trim();
  const password = readText(formData, "password");
  const next = safeNextPath(formData.get("next"));
  const fields = { displayName, email };

  const fieldErrors: Partial<Record<AuthFieldName, string>> = {};
  if (!displayName) fieldErrors.displayName = "Tell us what to call you.";
  else if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    fieldErrors.displayName = `Keep it under ${DISPLAY_NAME_MAX_LENGTH} characters.`;
  }
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors, fields };
  }

  const origin = await requestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      ...(origin && { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` }),
    },
  });

  if (error) {
    return { status: "error", message: signupErrorMessage(error), fields };
  }

  // With email confirmation disabled Supabase returns a session straight away.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }

  return { status: "check-email", email };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/");
}
