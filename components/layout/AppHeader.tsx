import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { HeaderSearch } from "@/components/search/HeaderSearch";
import { Container } from "@/components/ui/Container";
import { LOGIN_PATH, SIGNUP_PATH } from "@/lib/auth/routes";
import { getCurrentUser, userInitial } from "@/lib/auth/session";
import { Brand } from "./Brand";
import { DesktopNavigation } from "./DesktopNavigation";

export async function AppHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper">
      <Container className="flex h-14 items-center gap-6 md:h-16">
        <Brand />
        <DesktopNavigation />

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <HeaderSearch />

          {user ? (
            <>
              <LogoutButton className="hidden md:block" />
              <Link
                href="/profile"
                aria-label="Your profile"
                title={user.displayName ?? user.email ?? undefined}
                className="hidden size-9 items-center justify-center rounded-full bg-forest font-serif text-base text-cream ring-2 ring-transparent ring-offset-2 ring-offset-paper transition-shadow duration-200 hover:ring-forest/30 md:inline-flex"
              >
                {userInitial(user)}
              </Link>
            </>
          ) : (
            <>
              <Link
                href={LOGIN_PATH}
                className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Log in
              </Link>
              <Link
                href={SIGNUP_PATH}
                className="hidden h-9 items-center rounded-sm bg-ink px-4 text-sm font-medium text-cream transition-[background-color,transform] duration-200 hover:bg-ink-soft active:translate-y-px md:inline-flex"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
