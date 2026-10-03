import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";
import { DEFAULT_SIGNED_IN_PATH, LOGIN_PATH, loginPathFor, safeNextPath } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  if (await getCurrentUser()) redirect(next);

  const loginHref = next === DEFAULT_SIGNED_IN_PATH ? LOGIN_PATH : loginPathFor(next);

  return (
    <AuthLayout
      eyebrow="Pull up a chair"
      title="Start your commonplace book."
      intro="A quiet corner for everything you read."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href={loginHref}
            className="font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:text-burgundy hover:decoration-burgundy/40"
          >
            Log in
          </Link>
        </p>
      }
    >
      <SignupForm next={next} loginHref={loginHref} />
    </AuthLayout>
  );
}
