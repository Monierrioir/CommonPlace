import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { DEFAULT_SIGNED_IN_PATH, SIGNUP_PATH, safeNextPath } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Log in",
};

const notices: Record<string, string> = {
  "confirm-failed":
    "That confirmation link didn’t work — it may have expired or been opened in another browser. If you’ve already confirmed your email, log in below.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  if (await getCurrentUser()) redirect(next);

  const notice = typeof params.notice === "string" ? (notices[params.notice] ?? null) : null;
  const signupHref = next === DEFAULT_SIGNED_IN_PATH ? SIGNUP_PATH : `${SIGNUP_PATH}?next=${encodeURIComponent(next)}`;

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Step back into your reading room."
      intro="Your shelves are right where you left them."
      footer={
        <p>
          New to Commonplace?{" "}
          <Link
            href={signupHref}
            className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:text-burgundy hover:decoration-burgundy/40"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <LoginForm next={next} notice={notice} />
    </AuthLayout>
  );
}
