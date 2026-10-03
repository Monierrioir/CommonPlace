import { logout } from "@/lib/auth/actions";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  return (
    <form action={logout} className={className}>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center text-sm font-medium text-ink-muted underline-offset-[6px] transition-colors hover:text-burgundy hover:underline hover:decoration-burgundy/40 active:translate-y-px"
      >
        Log out
      </button>
    </form>
  );
}
