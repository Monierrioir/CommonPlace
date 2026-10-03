"use client";

import type { ComponentProps } from "react";
import { useShelfAppearance } from "@/components/shelf/shelf-context";
import { Bookcase } from "./Bookcase";

/** The bookcase in the reader's own appearance — or their live draft while they customize it. */
export function LiveBookcase(props: Omit<ComponentProps<typeof Bookcase>, "appearance">) {
  const appearance = useShelfAppearance();
  return <Bookcase {...props} appearance={appearance} />;
}
