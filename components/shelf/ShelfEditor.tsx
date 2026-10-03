"use client";

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { ShelfObject } from "@/components/bookshelf/ShelfDecorations";
import { Icon } from "@/components/ui/Icon";
import { restoreDefaultShelfAction, saveShelfPreferencesAction } from "@/lib/shelf/actions";
import {
  BOOKCASE_STYLES,
  DECORATIONS,
  DEFAULT_SHELF_PREFERENCES,
  LIGHTING_STYLES,
  SHELF_STYLES,
  WALL_KINDS,
  WALL_STYLES,
  decorationAt,
  decorationPreset,
  isValidArrangement,
  placeDecoration,
  placementConflict,
  removeDecoration,
  samePreferences,
  slotLabel,
  wallKind,
  type DecorationId,
  type DecorationPlacement,
  type ShelfPreferences,
  type SlotId,
  type WallStyleId,
} from "@/lib/shelf/catalogue";
import { BookcaseSample } from "./BookcaseSample";
import { useShelfCustomizer } from "./shelf-context";

type Tab = "bookcase" | "material" | "wall" | "lighting" | "objects";

const TABS: { id: Tab; label: string }[] = [
  { id: "bookcase", label: "Bookcase" },
  { id: "material", label: "Material" },
  { id: "wall", label: "Wall" },
  { id: "lighting", label: "Lighting" },
  { id: "objects", label: "Objects" },
];

const WALL_GROUPS = WALL_KINDS.map((kind) => ({
  label: kind.label,
  presets: WALL_STYLES.filter((wall) => wall.kind === kind.id),
}));

/**
 * The shelf editor: a tray beside the live bookcase on large screens, a bottom sheet on
 * small ones. Every choice updates the real shelf at once; nothing is stored until
 * "Save changes".
 */
export function ShelfEditor() {
  const { draft, saved, source, editorId, setDraft, close } = useShelfCustomizer();
  const [tab, setTab] = useState<Tab>("bookcase");
  const [error, setError] = useState<string | null>(null);
  const [confirmingRestore, setConfirmingRestore] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const tabRefs = useRef(new Map<Tab, HTMLButtonElement>());
  const restoreRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  const titleId = useId();
  const baseId = useId();

  useEffect(() => {
    tabRefs.current.get("bookcase")?.focus();
  }, []);

  useEffect(() => {
    if (confirmingRestore === wasConfirming.current) return;
    wasConfirming.current = confirmingRestore;
    (confirmingRestore ? keepRef : restoreRef).current?.focus();
  }, [confirmingRestore]);

  if (!draft) return null;
  const current = draft;

  function change(next: Partial<ShelfPreferences>, message?: string) {
    setDraft({ ...current, ...next });
    setError(null);
    if (message) setAnnouncement(message);
  }

  function cancel() {
    if (busy.current) return;
    close();
  }

  function save() {
    if (busy.current) return;
    if (!isValidArrangement(current.decorations)) {
      setError("Two objects are in each other’s way. Move one of them, then save.");
      return;
    }
    // Nothing new to keep: leave without writing (and without creating a row for the defaults).
    if (source !== "unavailable" && samePreferences(current, saved)) {
      close();
      return;
    }
    busy.current = true;
    const submitted = current;
    startTransition(async () => {
      const result = await saveShelfPreferencesAction(submitted);
      busy.current = false;
      if (result.ok) close({ saved: submitted, source: "saved", notice: "Your shelf is saved." });
      else setError(result.message);
    });
  }

  function restore() {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      const result = await restoreDefaultShelfAction();
      busy.current = false;
      if (result.ok) {
        close({ saved: DEFAULT_SHELF_PREFERENCES, source: "default", notice: "The default shelf is back." });
      } else {
        setConfirmingRestore(false);
        setError(result.message);
      }
    });
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1;
    const target =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    const next = TABS[target].id;
    setTab(next);
    tabRefs.current.get(next)?.focus();
  }

  return (
    <section
      id={editorId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || busy.current) return;
        event.preventDefault();
        if (confirmingRestore) setConfirmingRestore(false);
        else cancel();
      }}
      className="flex flex-col bg-cream text-ink max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:max-h-[46dvh] max-lg:rounded-t-2xl max-lg:border-t max-lg:border-line max-lg:shadow-[0_-14px_32px_-18px_rgb(42_29_21/0.5)] motion-safe:max-lg:animate-unfold lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:rounded-md lg:border lg:border-line lg:shadow-paper"
    >
      <div className="px-4 pt-3.5 sm:px-5 lg:pt-5">
        <p className="text-[0.6875rem] font-medium tracking-[0.16em] text-ink-muted uppercase">Your reading room</p>
        <h2 id={titleId} className="font-serif text-xl leading-tight text-ink">
          Decorate your library
        </h2>
        {source === "unavailable" ? (
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
            We couldn’t open your saved shelf, so this starts from the default. Saving will replace it.
          </p>
        ) : null}
      </div>

      <div role="tablist" aria-label="What to change" className="mt-2 flex border-b border-line/80 px-2 sm:px-3">
        {TABS.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              if (node) tabRefs.current.set(item.id, node);
              else tabRefs.current.delete(item.id);
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={tab === item.id ? `${baseId}-panel-${item.id}` : undefined}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => onTabKey(event, index)}
            className="relative min-h-11 flex-1 px-1 text-sm whitespace-nowrap text-ink-muted sm:px-2 transition-colors after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-transparent hover:text-ink aria-selected:font-medium aria-selected:text-ink aria-selected:after:bg-burgundy"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
      >
        {tab === "bookcase" ? (
          <PresetPicker
            legend="Bookcase"
            presets={BOOKCASE_STYLES}
            value={current.bookcase}
            onChange={(bookcase, label) => change({ bookcase }, `${label} bookcase`)}
            sample={(id) => (
              <span data-shelf={current.shelf} className="block rounded-[2px] bg-parchment/50 px-1 py-1">
                <BookcaseSample id={id} />
              </span>
            )}
          />
        ) : null}
        {tab === "material" ? (
          <PresetPicker
            legend="Material"
            presets={SHELF_STYLES}
            value={current.shelf}
            onChange={(shelf, label) => change({ shelf }, label)}
            sample={(id) => (
              <span
                data-shelf={id}
                className="shelf-sample block h-11 rounded-[2px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08),0_1px_2px_rgb(42_29_21/0.2)]"
              />
            )}
          />
        ) : null}
        {tab === "wall" ? (
          <PresetPicker
            legend="Wall"
            groups={WALL_GROUPS}
            value={current.wall}
            onChange={(wall, label) => change({ wall }, `${label} wall`)}
            sample={(id) => (
              <span
                data-wall={id}
                className="wall-sample relative block h-14 overflow-hidden rounded-[2px] shadow-[inset_0_0_0_1px_rgb(60_44_28/0.12)]"
              >
                <span data-shelf={current.shelf} className="shelf-sample absolute bottom-0 left-3 h-3 w-12 rounded-t-[1px]" />
              </span>
            )}
          />
        ) : null}
        {tab === "lighting" ? (
          <PresetPicker
            legend="Lighting"
            presets={LIGHTING_STYLES}
            value={current.lighting}
            onChange={(lighting, label) => change({ lighting }, `${label} lighting`)}
            sample={(id) => <LightSample light={id} wall={current.wall} shelf={current.shelf} />}
          />
        ) : null}
        {tab === "objects" ? (
          <ObjectsPanel
            decorations={current.decorations}
            onChange={(decorations, message) => change({ decorations }, message)}
          />
        ) : null}
      </div>

      <div className="border-t border-line/80 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 lg:pb-4">
        <div role="alert">{error ? <p className="mb-2.5 text-sm leading-relaxed text-burgundy">{error}</p> : null}</div>
        {confirmingRestore ? (
          <div role="group" aria-label="Restore the default shelf" className="flex flex-wrap items-center gap-2">
            <span className="mr-auto text-sm text-ink-soft">Restore the default shelf?</span>
            <button
              ref={keepRef}
              type="button"
              onClick={() => setConfirmingRestore(false)}
              disabled={pending}
              className="min-h-11 rounded-full px-3.5 text-sm text-ink-soft hover:text-ink"
            >
              Keep mine
            </button>
            <button
              type="button"
              onClick={restore}
              disabled={pending}
              className="min-h-11 rounded-full border border-ink/70 px-4 text-sm font-medium text-ink hover:bg-ink hover:text-cream disabled:opacity-60"
            >
              {pending ? "Restoring…" : "Restore default"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              ref={restoreRef}
              type="button"
              onClick={() => setConfirmingRestore(true)}
              disabled={pending}
              className="mr-auto min-h-11 px-1 text-sm text-ink-muted underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink-muted/50"
            >
              Restore default
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="min-h-11 rounded-full px-3 text-sm text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              aria-disabled={pending}
              className="min-h-11 rounded-full bg-ink px-4 text-sm font-medium text-cream transition-colors hover:bg-ink-soft aria-disabled:cursor-progress aria-disabled:opacity-70"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}

type PresetOption<Id extends string> = { id: Id; label: string; description: string };

type PresetGroup<Id extends string> = { label: string; presets: readonly PresetOption<Id>[] };

/**
 * One radio group of presets. With `groups`, the options sit under visible headings
 * (still a single group, so arrow keys move through every option).
 */
function PresetPicker<Id extends string>({
  legend,
  presets,
  groups,
  value,
  onChange,
  sample,
}: {
  legend: string;
  value: Id;
  onChange: (id: Id, label: string) => void;
  sample: (id: Id) => ReactNode;
} & ({ presets: readonly PresetOption<Id>[]; groups?: never } | { groups: readonly PresetGroup<Id>[]; presets?: never })) {
  const name = useId();

  const options = (list: readonly PresetOption<Id>[]) => (
    <div className="grid grid-cols-2 gap-2.5">
      {list.map((preset) => {
        const checked = preset.id === value;
        return (
          <label
            key={preset.id}
            className="group flex cursor-pointer flex-col gap-2 rounded-md border border-line bg-paper/50 p-2 transition-colors hover:border-ink-muted/40 has-checked:border-ink/60 has-checked:bg-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-forest"
          >
            <input
              type="radio"
              name={name}
              value={preset.id}
              checked={checked}
              onChange={() => onChange(preset.id, preset.label)}
              aria-describedby={`${name}-${preset.id}`}
              className="sr-only"
            />
            <span aria-hidden="true">{sample(preset.id)}</span>
            <span className="flex min-h-6 items-center justify-between gap-2 text-sm leading-tight text-ink-soft group-has-checked:font-medium group-has-checked:text-ink">
              {preset.label}
              {checked ? (
                <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-cream">
                  <Icon name="check" className="size-3" />
                </span>
              ) : null}
            </span>
            <span id={`${name}-${preset.id}`} className="sr-only">
              {preset.description}
            </span>
          </label>
        );
      })}
    </div>
  );

  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      {groups
        ? groups.map((group, index) => (
            <div key={group.label} role="group" aria-labelledby={`${name}-group-${index}`} className={index > 0 ? "mt-5" : undefined}>
              <h3
                id={`${name}-group-${index}`}
                className="mb-2 text-[0.6875rem] font-medium tracking-[0.16em] text-ink-muted uppercase"
              >
                {group.label}
              </h3>
              {options(group.presets)}
            </div>
          ))
        : options(presets)}
    </fieldset>
  );
}

function LightSample({ light, wall, shelf }: { light: string; wall: WallStyleId; shelf: string }) {
  return (
    <span
      data-light={light}
      data-wall={wall}
      data-wall-kind={wallKind(wall)}
      data-shelf={shelf}
      className="wall-sample light-sample relative block h-11 overflow-hidden rounded-[2px] shadow-[inset_0_0_0_1px_rgb(60_44_28/0.12)]"
    >
      <span className="light-sample-books absolute bottom-2 left-3 flex items-end gap-px">
        <span className="h-5 w-1.5 rounded-t-[1px] bg-burgundy" />
        <span className="h-6 w-2 rounded-t-[1px] bg-dusty" />
        <span className="h-4.5 w-1.5 rounded-t-[1px] bg-forest" />
        <span className="h-5.5 w-2 rounded-t-[1px] bg-ochre" />
      </span>
      <span className="shelf-sample absolute inset-x-1.5 bottom-0 h-2" />
    </span>
  );
}

function ObjectsPanel({
  decorations,
  onChange,
}: {
  decorations: DecorationPlacement[];
  onChange: (decorations: DecorationPlacement[], message: string) => void;
}) {
  const [expanded, setExpanded] = useState<DecorationId | null>(null);
  const placeButtons = useRef(new Map<DecorationId, HTMLButtonElement>());
  const baseId = useId();

  function place(item: DecorationId, slot: SlotId) {
    const label = decorationPreset(item).label;
    const occupant = decorationAt(decorations, slot);
    const replaced = occupant && occupant !== item ? `, in place of the ${decorationPreset(occupant).label.toLowerCase()}` : "";
    onChange(placeDecoration(decorations, item, slot), `${label}: ${slotLabel(slot).toLowerCase()}${replaced}.`);
  }

  function remove(item: DecorationId) {
    onChange(removeDecoration(decorations, item), `${decorationPreset(item).label} taken off the shelf.`);
    // The remove button disappears; keep focus on this object's row.
    window.requestAnimationFrame(() => placeButtons.current.get(item)?.focus());
  }

  return (
    <div>
      <p className="text-sm leading-relaxed text-ink-soft">
        Pick an object, then where it stands. Each spot holds one thing, and nothing covers your books.
      </p>
      <ul className="mt-2 divide-y divide-line/70">
        {DECORATIONS.map((preset) => {
          const slot = decorations.find((placement) => placement.item === preset.id)?.slot ?? null;
          const open = expanded === preset.id;
          const panelId = `${baseId}-${preset.id}`;
          return (
            <li key={preset.id} className="py-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-14 shrink-0 items-end justify-center overflow-hidden rounded-md bg-parchment/60 pb-1.5 [--book-h:4.5rem]"
                >
                  <ShelfObject id={preset.id} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{preset.label}</p>
                  <p className="text-xs text-ink-muted">{slot ? slotLabel(slot) : "Not on your shelf"}</p>
                </div>
                <button
                  ref={(node) => {
                    if (node) placeButtons.current.set(preset.id, node);
                    else placeButtons.current.delete(preset.id);
                  }}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  aria-label={`${slot ? "Move" : "Place"} the ${preset.label.toLowerCase()}`}
                  onClick={() => setExpanded(open ? null : preset.id)}
                  className="min-h-11 rounded-full border border-line px-3.5 text-sm text-ink-soft transition-colors hover:border-ink-muted/50 hover:text-ink aria-expanded:border-ink/50 aria-expanded:text-ink"
                >
                  {slot ? "Move" : "Place"}
                </button>
                {slot ? (
                  <button
                    type="button"
                    onClick={() => remove(preset.id)}
                    aria-label={`Take the ${preset.label.toLowerCase()} off the shelf`}
                    className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-parchment hover:text-ink"
                  >
                    <Icon name="close" className="size-4" />
                  </button>
                ) : null}
              </div>
              {open ? (
                <fieldset id={panelId} className="mt-3">
                  <legend className="sr-only">Where the {preset.label.toLowerCase()} stands</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {preset.slots.map((option) => (
                      <SlotOption
                        key={option}
                        name={panelId}
                        slot={option}
                        checked={slot === option}
                        conflict={placementConflict(decorations, preset.id, option)}
                        occupant={decorationAt(decorations, option)}
                        item={preset.id}
                        onSelect={() => place(preset.id, option)}
                      />
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SlotOption({
  name,
  slot,
  checked,
  conflict,
  occupant,
  item,
  onSelect,
}: {
  name: string;
  slot: SlotId;
  checked: boolean;
  conflict: string | null;
  occupant: DecorationId | null;
  item: DecorationId;
  onSelect: () => void;
}) {
  const note = conflict ?? (occupant && occupant !== item ? `Replaces the ${decorationPreset(occupant).label.toLowerCase()}` : null);
  return (
    <label
      className={`flex min-h-11 items-center gap-2.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors has-checked:border-ink/60 has-checked:bg-paper has-checked:font-medium has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-forest ${
        conflict ? "cursor-not-allowed border-dashed bg-transparent text-ink-muted" : "cursor-pointer bg-paper/50 hover:border-ink-muted/40"
      }`}
    >
      <input type="radio" name={name} value={slot} checked={checked} disabled={conflict !== null} onChange={onSelect} className="sr-only" />
      <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center rounded-full border border-current">
        {checked ? <Icon name="check" className="size-3" /> : null}
      </span>
      <span className="flex min-w-0 flex-col leading-snug">
        {slotLabel(slot)}
        {note ? <span className="text-xs font-normal text-ink-muted">{note}</span> : null}
      </span>
    </label>
  );
}
