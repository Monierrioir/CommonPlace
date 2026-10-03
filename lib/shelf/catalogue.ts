/**
 * The shelf cosmetics catalogue: every preset a reader can choose for their bookcase.
 * Ids are stable and must match the checks in
 * supabase/migrations/20260930190000_shelf_preferences.sql and
 * supabase/migrations/20260930200000_shelf_bookcase_and_wallpapers.sql.
 *
 * Purely cosmetic and separate from the library: nothing here knows about books.
 */

/**
 * How a cosmetic becomes available. Everything is available in v1; later variants
 * (for example `{ type: "points"; cost: number }` or `{ type: "achievement"; achievement: string }`)
 * extend this union without changing preferences, which only ever store ids.
 */
export type Unlock = { type: "default" };

const AVAILABLE: Unlock = { type: "default" };

type Preset<Id extends string> = {
  id: Id;
  label: string;
  /** A short, sensory description for screen readers and the editor. */
  description: string;
  unlock: Unlock;
};

export const BOOKCASE_STYLE_IDS = ["classic", "floating", "arched"] as const;
export const SHELF_STYLE_IDS = ["warm-oak", "dark-walnut", "honey-pine", "painted-cream"] as const;
export const WALL_STYLE_IDS = [
  "warm-paper",
  "soft-sage",
  "dusty-blue",
  "faded-rose",
  "tiny-botanical",
  "vintage-floral",
  "toile",
  "library-stripe",
  "arts-and-crafts",
  "quiet-damask",
  "storybook-night",
] as const;
export const LIGHTING_STYLE_IDS = ["daylight", "golden-evening", "soft-night"] as const;
export const DECORATION_IDS = [
  "glazed-bookend",
  "potted-plant",
  "trailing-plant",
  "candle",
  "ceramic-vase",
  "framed-print",
  "paper-stack",
] as const;
export const SLOT_IDS = ["top-left", "top-center", "top-right", "row-start", "row-middle", "row-end"] as const;

export type BookcaseStyleId = (typeof BOOKCASE_STYLE_IDS)[number];
export type ShelfStyleId = (typeof SHELF_STYLE_IDS)[number];
export type WallStyleId = (typeof WALL_STYLE_IDS)[number];
export type LightingStyleId = (typeof LIGHTING_STYLE_IDS)[number];
export type DecorationId = (typeof DECORATION_IDS)[number];
export type SlotId = (typeof SLOT_IDS)[number];

/** The furniture itself. Any bookcase can be built from any material. */
export const BOOKCASE_STYLES: readonly Preset<BookcaseStyleId>[] = [
  { id: "classic", label: "Classic", description: "A framed bookcase with a crown, side posts and a plinth", unlock: AVAILABLE },
  { id: "floating", label: "Floating", description: "Separate wall-mounted shelves with the wall showing between them", unlock: AVAILABLE },
  { id: "arched", label: "Arched", description: "A built-in nook with an arched top and deep shelves", unlock: AVAILABLE },
];

/** The material every bookcase is built from. */
export const SHELF_STYLES: readonly Preset<ShelfStyleId>[] = [
  { id: "warm-oak", label: "Warm Oak", description: "Mid-brown oak with a soft sheen", unlock: AVAILABLE },
  { id: "dark-walnut", label: "Dark Walnut", description: "Deep, warm walnut", unlock: AVAILABLE },
  { id: "honey-pine", label: "Honey Pine", description: "Light golden pine", unlock: AVAILABLE },
  { id: "painted-cream", label: "Painted Cream", description: "Softly painted wood, grain showing through", unlock: AVAILABLE },
];

export type WallKind = "paint" | "wallpaper";

export const WALL_KINDS: readonly { id: WallKind; label: string }[] = [
  { id: "paint", label: "Paint" },
  { id: "wallpaper", label: "Wallpaper" },
];

export type WallPreset = Preset<WallStyleId> & { kind: WallKind };

export const WALL_STYLES: readonly WallPreset[] = [
  { id: "warm-paper", kind: "paint", label: "Warm Paper", description: "The page itself, warm and plain", unlock: AVAILABLE },
  { id: "soft-sage", kind: "paint", label: "Soft Sage", description: "A muted green-grey wash", unlock: AVAILABLE },
  { id: "dusty-blue", kind: "paint", label: "Dusty Blue", description: "A quiet, powdery blue", unlock: AVAILABLE },
  { id: "faded-rose", kind: "paint", label: "Faded Rose", description: "A pale, sun-faded pink", unlock: AVAILABLE },
  { id: "tiny-botanical", kind: "wallpaper", label: "Tiny Botanical", description: "Small green sprigs scattered on cream", unlock: AVAILABLE },
  { id: "vintage-floral", kind: "wallpaper", label: "Vintage Floral", description: "Faded little roses on a blush ground", unlock: AVAILABLE },
  { id: "toile", kind: "wallpaper", label: "Toile", description: "Fine blue pastoral scenes on ivory", unlock: AVAILABLE },
  { id: "library-stripe", kind: "wallpaper", label: "Library Stripe", description: "A quiet green stripe with fine lines", unlock: AVAILABLE },
  { id: "arts-and-crafts", kind: "wallpaper", label: "Arts & Crafts", description: "Dense, muted leaves and berries", unlock: AVAILABLE },
  { id: "quiet-damask", kind: "wallpaper", label: "Quiet Damask", description: "A soft tone-on-tone ornament in grey-teal", unlock: AVAILABLE },
  { id: "storybook-night", kind: "wallpaper", label: "Storybook Night", description: "Tiny stars and sprigs on deep ink blue", unlock: AVAILABLE },
];

export const LIGHTING_STYLES: readonly Preset<LightingStyleId>[] = [
  { id: "daylight", label: "Daylight", description: "Even, natural light", unlock: AVAILABLE },
  { id: "golden-evening", label: "Golden Evening", description: "Warm, low evening light", unlock: AVAILABLE },
  { id: "soft-night", label: "Soft Night", description: "A dim room with a lamp on", unlock: AVAILABLE },
];

export type SlotRegion = "top" | "row";

export const SLOTS: readonly { id: SlotId; label: string; region: SlotRegion }[] = [
  { id: "top-left", label: "Top left", region: "top" },
  { id: "top-center", label: "Top centre", region: "top" },
  { id: "top-right", label: "Top right", region: "top" },
  { id: "row-start", label: "Before the books", region: "row" },
  { id: "row-middle", label: "Among the books", region: "row" },
  { id: "row-end", label: "After the books", region: "row" },
];

const ANY_SLOT: readonly SlotId[] = SLOT_IDS;
const ROW_SLOTS: readonly SlotId[] = ["row-start", "row-middle", "row-end"];
const TOP_CORNERS: readonly SlotId[] = ["top-left", "top-right"];

export type DecorationPreset = Preset<DecorationId> & {
  /** Where the object can stand. */
  slots: readonly SlotId[];
  /** A wide object at a top corner also covers the top-centre position. */
  wide: boolean;
};

export const DECORATIONS: readonly DecorationPreset[] = [
  { id: "glazed-bookend", label: "Glazed bookend", description: "A green glazed quarter-round bookend", slots: ROW_SLOTS, wide: false, unlock: AVAILABLE },
  { id: "potted-plant", label: "Potted plant", description: "A small leafy plant in a terracotta pot", slots: ANY_SLOT, wide: false, unlock: AVAILABLE },
  { id: "trailing-plant", label: "Trailing plant", description: "A plant whose vines trail over the edge", slots: TOP_CORNERS, wide: false, unlock: AVAILABLE },
  { id: "candle", label: "Candle", description: "A cream pillar candle in a brass dish", slots: ANY_SLOT, wide: false, unlock: AVAILABLE },
  { id: "ceramic-vase", label: "Ceramic vase", description: "A speckled stoneware vase with a dried stem", slots: ANY_SLOT, wide: false, unlock: AVAILABLE },
  { id: "framed-print", label: "Framed print", description: "A small landscape print leaning against the wall", slots: TOP_CORNERS, wide: true, unlock: AVAILABLE },
  { id: "paper-stack", label: "Paper stack", description: "A tied bundle of letters and notebooks", slots: ANY_SLOT, wide: false, unlock: AVAILABLE },
];

export type DecorationPlacement = { slot: SlotId; item: DecorationId };

export type ShelfPreferences = {
  bookcase: BookcaseStyleId;
  /** The material. */
  shelf: ShelfStyleId;
  wall: WallStyleId;
  lighting: LightingStyleId;
  decorations: DecorationPlacement[];
};

/** The shelf every reader starts with, and what a missing preferences row means. */
export const DEFAULT_SHELF_PREFERENCES: ShelfPreferences = {
  bookcase: "classic",
  shelf: "warm-oak",
  wall: "warm-paper",
  lighting: "daylight",
  decorations: [
    { slot: "row-start", item: "glazed-bookend" },
    { slot: "row-end", item: "potted-plant" },
  ],
};

export const MAX_DECORATIONS = SLOT_IDS.length;

const decorationsById = new Map(DECORATIONS.map((decoration) => [decoration.id, decoration]));

export function decorationPreset(id: DecorationId): DecorationPreset {
  // Every DecorationId has an entry; the fallback only satisfies the type checker.
  return decorationsById.get(id) ?? DECORATIONS[0];
}

export function slotLabel(id: SlotId): string {
  return SLOTS.find((slot) => slot.id === id)?.label ?? id;
}

export function isBookcaseStyleId(value: unknown): value is BookcaseStyleId {
  return typeof value === "string" && (BOOKCASE_STYLE_IDS as readonly string[]).includes(value);
}

export function wallKind(id: WallStyleId): WallKind {
  return WALL_STYLES.find((wall) => wall.id === id)?.kind ?? "paint";
}

export function isShelfStyleId(value: unknown): value is ShelfStyleId {
  return typeof value === "string" && (SHELF_STYLE_IDS as readonly string[]).includes(value);
}

export function isWallStyleId(value: unknown): value is WallStyleId {
  return typeof value === "string" && (WALL_STYLE_IDS as readonly string[]).includes(value);
}

export function isLightingStyleId(value: unknown): value is LightingStyleId {
  return typeof value === "string" && (LIGHTING_STYLE_IDS as readonly string[]).includes(value);
}

export function isDecorationId(value: unknown): value is DecorationId {
  return typeof value === "string" && (DECORATION_IDS as readonly string[]).includes(value);
}

export function isSlotId(value: unknown): value is SlotId {
  return typeof value === "string" && (SLOT_IDS as readonly string[]).includes(value);
}

/**
 * Why `item` cannot go to `slot` in this arrangement, or null if it can. A slot that
 * another object occupies is not a conflict: placing there replaces that object.
 * Mirrors public.shelf_decorations_valid().
 */
export function placementConflict(
  decorations: readonly DecorationPlacement[],
  item: DecorationId,
  slot: SlotId,
): string | null {
  const preset = decorationPreset(item);
  if (!preset.slots.includes(slot)) return `The ${preset.label.toLowerCase()} doesn’t fit there`;
  const others = decorations.filter((placement) => placement.item !== item && placement.slot !== slot);
  if (slot === "top-center") {
    const wide = others.find((placement) => decorationPreset(placement.item).wide);
    if (wide) return `Covered by the ${decorationPreset(wide.item).label.toLowerCase()}`;
  }
  if (preset.wide) {
    const centre = others.find((placement) => placement.slot === "top-center");
    if (centre) return `Needs the top centre clear — the ${decorationPreset(centre.item).label.toLowerCase()} is there`;
  }
  return null;
}

/** Places (or moves) an object, replacing whatever stood in that slot. Assumes no conflict. */
export function placeDecoration(
  decorations: readonly DecorationPlacement[],
  item: DecorationId,
  slot: SlotId,
): DecorationPlacement[] {
  return [...decorations.filter((placement) => placement.item !== item && placement.slot !== slot), { slot, item }];
}

export function removeDecoration(decorations: readonly DecorationPlacement[], item: DecorationId): DecorationPlacement[] {
  return decorations.filter((placement) => placement.item !== item);
}

/** The full rule set: known ids, allowed slots, one object per slot, each object once, wide objects' room. */
export function isValidArrangement(decorations: readonly DecorationPlacement[]): boolean {
  if (decorations.length > MAX_DECORATIONS) return false;
  const slots = new Set<SlotId>();
  const items = new Set<DecorationId>();
  for (const placement of decorations) {
    if (!isDecorationId(placement.item) || !isSlotId(placement.slot)) return false;
    if (!decorationPreset(placement.item).slots.includes(placement.slot)) return false;
    if (slots.has(placement.slot) || items.has(placement.item)) return false;
    slots.add(placement.slot);
    items.add(placement.item);
  }
  return !(slots.has("top-center") && decorations.some((placement) => decorationPreset(placement.item).wide));
}

export function samePreferences(a: ShelfPreferences, b: ShelfPreferences): boolean {
  if (a.bookcase !== b.bookcase || a.shelf !== b.shelf || a.wall !== b.wall || a.lighting !== b.lighting) return false;
  if (a.decorations.length !== b.decorations.length) return false;
  return a.decorations.every((placement) =>
    b.decorations.some((other) => other.slot === placement.slot && other.item === placement.item),
  );
}

export function decorationAt(decorations: readonly DecorationPlacement[], slot: SlotId): DecorationId | null {
  return decorations.find((placement) => placement.slot === slot)?.item ?? null;
}
