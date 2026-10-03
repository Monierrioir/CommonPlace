"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { isActivePath, primaryNavigation } from "@/lib/navigation";

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgb(42_29_21/0.35)] md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {primaryNavigation.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
              className="group relative flex min-h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium tracking-wide text-ink-muted transition-colors duration-200 active:text-ink aria-[current=page]:text-ink"
            >
              <span
                aria-hidden="true"
                className="absolute top-0 h-[3px] w-7 origin-top scale-y-0 bg-burgundy transition-transform duration-300 ease-gentle group-aria-[current=page]:scale-y-100"
              />
              <Icon
                name={item.icon}
                className="size-[1.375rem] transition-transform duration-200 ease-gentle group-active:scale-90"
              />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
