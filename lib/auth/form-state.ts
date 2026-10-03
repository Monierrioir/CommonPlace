export type AuthFieldName = "displayName" | "email" | "password";

export type AuthFormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<AuthFieldName, string>>;
      /** Non-secret values echoed back so the form keeps them. Passwords are never returned. */
      fields: { displayName?: string; email?: string };
    }
  | { status: "check-email"; email: string };

export const initialAuthFormState: AuthFormState = { status: "idle" };

export const PASSWORD_MIN_LENGTH = 8;
export const DISPLAY_NAME_MAX_LENGTH = 60;
