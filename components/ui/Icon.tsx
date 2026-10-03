import type { ReactNode } from "react";

export type IconName =
  | "home"
  | "library"
  | "clubs"
  | "explore"
  | "profile"
  | "search"
  | "arrow"
  | "sparkle"
  | "plus"
  | "check"
  | "star"
  | "heart"
  | "close"
  | "chevron-down";

const paths: Record<IconName, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  library: (
    <>
      <path d="M4.5 4.5h3.5v15H4.5zM9.5 4.5H13v15H9.5z" />
      <path d="m15 6.2 3-.9 3.4 13.6-3 .8z" />
    </>
  ),
  clubs: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" />
      <circle cx="16.8" cy="9.3" r="2.3" />
      <path d="M16.3 14.4c2.2.3 3.7 2 4.2 4.8" />
    </>
  ),
  explore: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.3 8.7-1.9 4.7-4.7 1.9 1.9-4.7z" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c1-3.8 3.8-5.8 7.2-5.8s6.2 2 7.2 5.8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.3" />
      <path d="m19.5 19.5-4-4" />
    </>
  ),
  arrow: <path d="M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5" />,
  sparkle: (
    <path
      d="M12 3.5c.5 4.3 2.4 6.2 6.5 6.7-4.1.5-6 2.4-6.5 6.7-.5-4.3-2.4-6.2-6.5-6.7 4.1-.5 6-2.4 6.5-6.7z"
      fill="currentColor"
    />
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  check: <path d="m5.5 12.5 4 4 9-9.5" />,
  star: <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" />,
  heart: <path d="M12 19.5s-7.5-4.4-7.5-9.9A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.5 2.2c0 5.5-7.5 9.9-7.5 9.9z" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  "chevron-down": <path d="m7 10 5 5 5-5" />,
};

type IconProps = {
  name: IconName;
  className?: string;
};

export function Icon({ name, className = "size-5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
