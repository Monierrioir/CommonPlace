import type { AuthError } from "@supabase/supabase-js";

const GENERIC = "Something went wrong on our side. Please try again in a moment.";
const OFFLINE = "We couldn’t reach the library just now. Check your connection and try again.";

function isNetworkError(error: AuthError): boolean {
  return error.name === "AuthRetryableFetchError" || error.status === 0;
}

export function loginErrorMessage(error: AuthError): string {
  if (isNetworkError(error)) return OFFLINE;
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password don’t match our records.";
    case "email_not_confirmed":
      return "Your email isn’t confirmed yet. Follow the link we sent you, then log in.";
    case "over_request_rate_limit":
      return "Too many attempts. Take a short breather and try again soon.";
    case "user_banned":
      return "This account can’t sign in right now.";
    default:
      return GENERIC;
  }
}

export function signupErrorMessage(error: AuthError): string {
  if (isNetworkError(error)) return OFFLINE;
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Try logging in instead.";
    case "weak_password":
      return "That password is too easy to guess. Try something longer or less common.";
    case "email_address_invalid":
      return "That email address doesn’t look right.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "We’ve sent a lot of emails recently. Please wait a little and try again.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "New accounts aren’t open right now.";
    default:
      return GENERIC;
  }
}
