import type { IconName } from "@/components/ui/Icon";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

export const primaryNavigation: readonly NavItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Library", href: "/library", icon: "library" },
  { label: "Clubs", href: "/clubs", icon: "clubs" },
  { label: "Explore", href: "/explore", icon: "explore" },
  { label: "Profile", href: "/profile", icon: "profile" },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
