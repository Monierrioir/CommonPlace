"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ShelfPreferences } from "@/lib/shelf/catalogue";
import { ShelfCustomizerContext, useShelfCustomizer, type ShelfCustomizerValue, type ShelfSource } from "./shelf-context";
import { ShelfEditor } from "./ShelfEditor";

const NOTICE_MS = 4000;

type ShelfCustomizerProps = { preferences: ShelfPreferences; source: ShelfSource; children: ReactNode };

/** Holds the reader's saved shelf and, while they customize it, an unsaved draft previewed live. */
export function ShelfCustomizer({ preferences, source, children }: ShelfCustomizerProps) {
  const [saved, setSaved] = useState(preferences);
  const [savedSource, setSavedSource] = useState(source);
  const [draft, setDraft] = useState<ShelfPreferences | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const editorId = useId();

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const value: ShelfCustomizerValue = {
    saved,
    source: savedSource,
    draft,
    editorId,
    triggerRef,
    notice,
    open: () => {
      setNotice(null);
      setDraft((current) => current ?? saved);
    },
    setDraft,
    close: (outcome) => {
      if (outcome) {
        setSaved(outcome.saved);
        setSavedSource(outcome.source);
        setNotice(outcome.notice);
      }
      setDraft(null);
      // Back to the control that opened the editor, once it has closed. It may sit under the
      // sticky header after the small-screen scroll, so bring it into view as well.
      window.requestAnimationFrame(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        trigger.focus({ preventScroll: true });
        if (trigger.getBoundingClientRect().top >= parseFloat(getComputedStyle(trigger).scrollMarginTop)) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        trigger.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      });
    },
  };

  return <ShelfCustomizerContext value={value}>{children}</ShelfCustomizerContext>;
}

/** The quiet "Decorate your library" control beside the Library heading. */
export function CustomizeShelfButton() {
  const { draft, editorId, triggerRef, notice, open } = useShelfCustomizer();
  const editing = draft !== null;

  return (
    <div className="flex items-center gap-3 sm:flex-row-reverse sm:pb-1">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={editing}
        aria-controls={editing ? editorId : undefined}
        onClick={() => {
          if (editing) document.getElementById(editorId)?.focus();
          else open();
        }}
        className="inline-flex min-h-11 scroll-mt-24 items-center gap-2 rounded-full border border-line px-4 text-sm text-ink-soft transition-colors hover:border-ink-muted/50 hover:text-ink aria-expanded:border-ochre/50 aria-expanded:bg-ochre/[0.08] aria-expanded:text-ink"
      >
        <Icon name="sparkle" className="size-3.5 text-ochre" />
        Decorate your library
      </button>
      <p role="status" className="text-sm text-forest">
        {notice ? (
          <span className="flex items-center gap-1.5">
            <Icon name="check" className="size-4" />
            {notice}
          </span>
        ) : null}
      </p>
    </div>
  );
}

/**
 * Lays the editor out around the live shelf: beside it on large screens, as a bottom sheet
 * below that. While customizing, the shelf is a preview only (inert), so a stray tap can't
 * open a book mid-arrangement.
 */
export function ShelfWorkspace({ children }: { children: ReactNode }) {
  const { draft } = useShelfCustomizer();
  const editing = draft !== null;
  const shelfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing || window.matchMedia("(min-width: 64rem)").matches) return;
    // On small screens, bring the bookcase up above the sheet so the preview is in view.
    const room = shelfRef.current?.querySelector(".shelf-room");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    room?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [editing]);

  return (
    <div className={editing ? "lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-10" : undefined}>
      <div
        ref={shelfRef}
        inert={editing}
        className={editing ? "max-lg:pb-[48dvh] [&_.shelf-room]:scroll-mt-20" : undefined}
      >
        {children}
      </div>
      {editing ? <ShelfEditor /> : null}
    </div>
  );
}
