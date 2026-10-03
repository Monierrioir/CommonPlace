"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, primaryNavigation } from "@/lib/navigation";

// Profile is reached through the avatar on desktop.
const desktopItems = primaryNavigation.filter((item) => item.href !== "/profile");

export function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden md:mx-auto md:block">
      <ul className="flex items-center gap-1">
        {desktopItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
              className="group relative inline-flex min-h-11 items-center px-3 text-sm font-medium text-ink-muted transition-colors duration-200 hover:text-ink aria-[current=page]:text-ink"
            >
              {item.label}
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-2 h-px origin-left scale-x-0 bg-ink/50 transition-transform duration-300 ease-gentle group-hover:scale-x-100 group-aria-[current=page]:scale-x-100 group-aria-[current=page]:bg-burgundy"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
