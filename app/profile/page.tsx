import type { Metadata } from "next";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Container } from "@/components/ui/Container";
import { requireUser, userInitial } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const name = user.displayName ?? user.email ?? "Reader";

  return (
    <Container className="pt-10 sm:pt-16">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-forest font-serif text-2xl text-cream"
        >
          {userInitial(user)}
        </span>
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-muted uppercase">Your profile</p>
          <h1 className="mt-1 truncate font-serif text-3xl leading-tight text-ink sm:text-4xl">{name}</h1>
        </div>
      </div>

      {user.email && <p className="mt-5 text-base break-all text-ink-soft">{user.email}</p>}
      <p className="mt-2 max-w-md font-serif text-lg text-ink-muted italic">
        This room is still being furnished.
      </p>

      <LogoutButton className="mt-4" />
    </Container>
  );
}
