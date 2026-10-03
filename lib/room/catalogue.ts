/**
 * The Living Reading Room catalogue: every surface, item and placement zone a reader's room can
 * use. Ids are stable and must match
 * supabase/migrations/20260930210000_reading_rooms.sql (the checks and
 * public.reading_room_item_valid / reading_room_item_covers / reading_room_consistent).
 *
 * Purely cosmetic and separate from the library: nothing here knows about books. The bookcase
 * itself (model, material) and the wall reuse the shelf catalogue ids.
 */
import type {
  BookcaseStyleId,
  LightingStyleId,
  ShelfPreferences,
  ShelfStyleId,
  SlotId,
  Unlock,
  WallStyleId,
} from "../shelf/catalogue";

const AVAILABLE: Unlock = { type: "default" };

type Preset<Id extends string> = { id: Id; label: string; description: string; unlock: Unlock };

/* ------------------------------------------------------------------------------------------------
 * Placement zones: named places in one fixed room composition, never coordinates.
 *
 *            ceiling
 *   wall-left     [ bookcase: top-left · top-center · top-right ]     wall-right
 *                 [           row-start · row-middle · row-end  ]
 *   corner-left   [ trim follows the bookcase outline            ]    corner-right
 *   mid-left            mid-center (low)            mid-right       <- table-* on top of tables
 *                          rug (floor layer)
 *   front-left          front-center (low)          front-right
 * ---------------------------------------------------------------------------------------------- */

export const ROOM_ZONE_IDS = [
  "wall-left",
  "wall-right",
  "ceiling",
  "bookcase-top-left",
  "bookcase-top-center",
  "bookcase-top-right",
  "bookcase-row-start",
  "bookcase-row-middle",
  "bookcase-row-end",
  "bookcase-trim",
  "rug",
  "corner-left",
  "corner-right",
  "mid-left",
  "mid-center",
  "mid-right",
  "table-left",
  "table-center",
  "table-right",
  "front-left",
  "front-center",
  "front-right",
] as const;

export type RoomZoneId = (typeof ROOM_ZONE_IDS)[number];

export type ZoneLayer = "wall" | "ceiling" | "bookcase" | "floor" | "standing" | "surface";

export type RoomZone = {
  id: RoomZoneId;
  layer: ZoneLayer;
  side: "left" | "center" | "right";
  /** Drawn in the compact (phone) composition; other zones stay saved but are not shown there. */
  compact: boolean;
};

export const ROOM_ZONES: readonly RoomZone[] = [
  { id: "wall-left", layer: "wall", side: "left", compact: false },
  { id: "wall-right", layer: "wall", side: "right", compact: true },
  { id: "ceiling", layer: "ceiling", side: "center", compact: true },
  { id: "bookcase-top-left", layer: "bookcase", side: "left", compact: true },
  { id: "bookcase-top-center", layer: "bookcase", side: "center", compact: true },
  { id: "bookcase-top-right", layer: "bookcase", side: "right", compact: true },
  { id: "bookcase-row-start", layer: "bookcase", side: "left", compact: true },
  { id: "bookcase-row-middle", layer: "bookcase", side: "center", compact: true },
  { id: "bookcase-row-end", layer: "bookcase", side: "right", compact: true },
  { id: "bookcase-trim", layer: "bookcase", side: "center", compact: true },
  { id: "rug", layer: "floor", side: "center", compact: true },
  { id: "corner-left", layer: "standing", side: "left", compact: false },
  { id: "corner-right", layer: "standing", side: "right", compact: true },
  { id: "mid-left", layer: "standing", side: "left", compact: false },
  { id: "mid-center", layer: "standing", side: "center", compact: true },
  { id: "mid-right", layer: "standing", side: "right", compact: true },
  { id: "table-left", layer: "surface", side: "left", compact: false },
  { id: "table-center", layer: "surface", side: "center", compact: true },
  { id: "table-right", layer: "surface", side: "right", compact: true },
  { id: "front-left", layer: "standing", side: "left", compact: false },
  { id: "front-center", layer: "standing", side: "center", compact: true },
  { id: "front-right", layer: "standing", side: "right", compact: true },
];

const WALLS: readonly RoomZoneId[] = ["wall-left", "wall-right"];
const CORNERS: readonly RoomZoneId[] = ["corner-left", "corner-right"];
const MID_SIDES: readonly RoomZoneId[] = ["mid-left", "mid-right"];
const FRONT_SIDES: readonly RoomZoneId[] = ["front-left", "front-right"];
const LOW_CENTRE: readonly RoomZoneId[] = ["mid-center", "front-center"];
const TABLES: readonly RoomZoneId[] = ["table-left", "table-center", "table-right"];
const BOOKCASE_TOP: readonly RoomZoneId[] = ["bookcase-top-left", "bookcase-top-center", "bookcase-top-right"];
const BOOKCASE_TOP_CORNERS: readonly RoomZoneId[] = ["bookcase-top-left", "bookcase-top-right"];
const BOOKCASE_ROWS: readonly RoomZoneId[] = ["bookcase-row-start", "bookcase-row-middle", "bookcase-row-end"];
const SMALL_OBJECT_ZONES: readonly RoomZoneId[] = [...BOOKCASE_TOP, ...BOOKCASE_ROWS, ...TABLES];

/* ------------------------------------------------------------------------------------------------
 * Room surfaces (one each per room).
 * ---------------------------------------------------------------------------------------------- */

export const FLOOR_STYLE_IDS = ["warm-oak-floor", "dark-wood-floor", "pale-oak-floor", "old-parquet", "muted-stone"] as const;
export type FloorStyleId = (typeof FLOOR_STYLE_IDS)[number];

export const FLOOR_STYLES: readonly Preset<FloorStyleId>[] = [
  { id: "warm-oak-floor", label: "Warm Oak", description: "Honeyed oak boards", unlock: AVAILABLE },
  { id: "dark-wood-floor", label: "Dark Wood", description: "Deep, worn boards", unlock: AVAILABLE },
  { id: "pale-oak-floor", label: "Pale Oak", description: "Light, limed oak", unlock: AVAILABLE },
  { id: "old-parquet", label: "Old Parquet", description: "Herringbone blocks with a soft patina", unlock: AVAILABLE },
  { id: "muted-stone", label: "Muted Stone", description: "Cool, matte stone flags", unlock: AVAILABLE },
];

/* ------------------------------------------------------------------------------------------------
 * Bookcase capabilities. The model and material ids come from the shelf catalogue; this is what
 * the room and future features need to know about each model.
 * ---------------------------------------------------------------------------------------------- */

export type BookcaseCapabilities = {
  hasDoors: boolean;
  hasGlass: boolean;
  hasLadder: boolean;
  isBuiltIn: boolean;
  supportsTopObjects: boolean;
  supportedMaterials: readonly ShelfStyleId[] | "all";
  /** How much of the back wall the bookcase takes in the room composition. */
  roomFootprint: "narrow" | "standard" | "wide" | "full-wall";
  /** How rows of books are held: one board per row, or boards behind glass doors, etc. */
  shelfGeometry: "open-boards" | "floating-boards" | "arched-nook";
  /** The path string lights follow when placed on the bookcase trim. */
  trimPath: "crown" | "board-edges" | "arch";
};

export const BOOKCASE_CAPABILITIES: Record<BookcaseStyleId, BookcaseCapabilities> = {
  classic: {
    hasDoors: false,
    hasGlass: false,
    hasLadder: false,
    isBuiltIn: false,
    supportsTopObjects: true,
    supportedMaterials: "all",
    roomFootprint: "standard",
    shelfGeometry: "open-boards",
    trimPath: "crown",
  },
  floating: {
    hasDoors: false,
    hasGlass: false,
    hasLadder: false,
    isBuiltIn: false,
    supportsTopObjects: true,
    supportedMaterials: "all",
    roomFootprint: "wide",
    shelfGeometry: "floating-boards",
    trimPath: "board-edges",
  },
  arched: {
    hasDoors: false,
    hasGlass: false,
    hasLadder: false,
    isBuiltIn: true,
    supportsTopObjects: true,
    supportedMaterials: "all",
    roomFootprint: "standard",
    shelfGeometry: "arched-nook",
    trimPath: "arch",
  },
};

/* ------------------------------------------------------------------------------------------------
 * Placeable items.
 * ---------------------------------------------------------------------------------------------- */

export const ROOM_ITEM_KINDS = ["architecture", "rug", "furniture", "fixture", "object"] as const;
export type RoomItemKind = (typeof ROOM_ITEM_KINDS)[number];

export const LIGHT_TONE_IDS = ["candle-amber", "warm-gold", "soft-ivory", "moonlight", "dusty-rose"] as const;
export type LightToneId = (typeof LIGHT_TONE_IDS)[number];

export const UPHOLSTERY_IDS = ["moss", "oxblood", "ink-blue", "oatmeal", "faded-rose"] as const;
export type UpholsteryId = (typeof UPHOLSTERY_IDS)[number];
/** Wooden furniture reuses the bookcase materials, so a desk can match the shelves. */
export type FinishId = UpholsteryId | ShelfStyleId;

export type SizeClass = "small" | "medium" | "large" | "wide" | "low";

type ItemBase<Kind extends RoomItemKind, Id extends string, Category extends string> = Preset<Id> & {
  kind: Kind;
  category: Category;
  zones: readonly RoomZoneId[];
  /** "wide" items also cover a neighbouring zone (see coveredZones); "low" items keep the bookcase in view. */
  size: SizeClass;
};

export type ArchitectureId = "tall-window" | "reading-window" | "rain-window";
export type RugId = "vintage-medallion" | "muted-kilim" | "faded-floral" | "woven-neutral" | "dark-library";
export type FurnitureId =
  | "classic-armchair"
  | "velvet-armchair"
  | "small-sofa"
  | "chaise"
  | "reading-bench"
  | "round-side-table"
  | "coffee-table"
  | "writing-desk"
  | "writing-chair";
export type FixtureId = "brass-floor-lamp" | "ceramic-table-lamp" | "library-sconce" | "pendant-light" | "candle" | "string-lights";
export type ObjectId =
  | "glazed-bookend"
  | "brass-bookend"
  | "stone-bookend"
  | "potted-plant"
  | "trailing-plant"
  | "fern"
  | "succulent"
  | "dried-flowers"
  | "ceramic-vase"
  | "framed-print"
  | "framed-botanical"
  | "abstract-print"
  | "paper-stack"
  | "globe"
  | "analog-clock"
  | "ceramic-figure"
  | "small-sculpture"
  | "decorative-box"
  | "magnifying-glass";

export type ArchitecturePreset = ItemBase<"architecture", ArchitectureId, "window">;
export type RugPreset = ItemBase<"rug", RugId, "rug">;
export type FurniturePreset = ItemBase<"furniture", FurnitureId, "seating" | "table" | "chair"> & {
  finish: "upholstery" | "wood";
};
export type FixturePreset = ItemBase<"fixture", FixtureId, "floor-lamp" | "table-lamp" | "wall-light" | "ceiling-light" | "candle" | "string-lights"> & {
  tones: readonly LightToneId[];
};
export type ObjectPreset = ItemBase<"object", ObjectId, "plant" | "ceramic" | "art" | "library-object" | "bookend" | "paper">;

export type RoomItemPreset = ArchitecturePreset | RugPreset | FurniturePreset | FixturePreset | ObjectPreset;
export type RoomItemId = RoomItemPreset["id"];

const ALL_TONES = LIGHT_TONE_IDS;

export const ROOM_ITEMS: readonly RoomItemPreset[] = [
  // Architecture
  { kind: "architecture", id: "tall-window", category: "window", label: "Tall window", description: "A tall sash window with soft daylight", zones: WALLS, size: "large", unlock: AVAILABLE },
  { kind: "architecture", id: "reading-window", category: "window", label: "Reading window", description: "A deep window with a sill for a cushion", zones: WALLS, size: "large", unlock: AVAILABLE },
  { kind: "architecture", id: "rain-window", category: "window", label: "Rain window", description: "A window streaked with gentle rain", zones: WALLS, size: "large", unlock: AVAILABLE },

  // Rugs
  { kind: "rug", id: "vintage-medallion", category: "rug", label: "Vintage Medallion", description: "A faded rug with a central medallion", zones: ["rug"], size: "large", unlock: AVAILABLE },
  { kind: "rug", id: "muted-kilim", category: "rug", label: "Muted Kilim", description: "A flat-woven rug with quiet geometry", zones: ["rug"], size: "large", unlock: AVAILABLE },
  { kind: "rug", id: "faded-floral", category: "rug", label: "Faded Floral", description: "Soft, worn flowers on a warm ground", zones: ["rug"], size: "large", unlock: AVAILABLE },
  { kind: "rug", id: "woven-neutral", category: "rug", label: "Woven Neutral", description: "A plain, nubbly woven rug", zones: ["rug"], size: "large", unlock: AVAILABLE },
  { kind: "rug", id: "dark-library", category: "rug", label: "Dark Library", description: "A deep, bordered rug for a study", zones: ["rug"], size: "large", unlock: AVAILABLE },

  // Furniture
  { kind: "furniture", id: "classic-armchair", category: "seating", finish: "upholstery", label: "Classic armchair", description: "A deep armchair made for long chapters", zones: [...CORNERS, ...MID_SIDES], size: "medium", unlock: AVAILABLE },
  { kind: "furniture", id: "velvet-armchair", category: "seating", finish: "upholstery", label: "Velvet armchair", description: "A soft velvet chair with rounded arms", zones: [...CORNERS, ...MID_SIDES], size: "medium", unlock: AVAILABLE },
  { kind: "furniture", id: "small-sofa", category: "seating", finish: "upholstery", label: "Small sofa", description: "A two-seat sofa for reading together", zones: MID_SIDES, size: "wide", unlock: AVAILABLE },
  { kind: "furniture", id: "chaise", category: "seating", finish: "upholstery", label: "Chaise", description: "A long chaise for reading lying down", zones: MID_SIDES, size: "wide", unlock: AVAILABLE },
  { kind: "furniture", id: "reading-bench", category: "seating", finish: "wood", label: "Reading bench", description: "A low wooden bench with a cushion", zones: LOW_CENTRE, size: "low", unlock: AVAILABLE },
  { kind: "furniture", id: "round-side-table", category: "table", finish: "wood", label: "Round side table", description: "A small round table beside a chair", zones: MID_SIDES, size: "small", unlock: AVAILABLE },
  { kind: "furniture", id: "coffee-table", category: "table", finish: "wood", label: "Coffee table", description: "A low table for a pot of tea and a stack of books", zones: LOW_CENTRE, size: "low", unlock: AVAILABLE },
  { kind: "furniture", id: "writing-desk", category: "table", finish: "wood", label: "Writing desk", description: "A desk for letters and notebooks", zones: MID_SIDES, size: "wide", unlock: AVAILABLE },
  { kind: "furniture", id: "writing-chair", category: "chair", finish: "wood", label: "Writing chair", description: "A simple wooden chair", zones: FRONT_SIDES, size: "medium", unlock: AVAILABLE },

  // Light fixtures
  { kind: "fixture", id: "brass-floor-lamp", category: "floor-lamp", tones: ALL_TONES, label: "Brass floor lamp", description: "A tall brass reading lamp", zones: [...CORNERS, ...FRONT_SIDES], size: "medium", unlock: AVAILABLE },
  { kind: "fixture", id: "ceramic-table-lamp", category: "table-lamp", tones: ALL_TONES, label: "Ceramic table lamp", description: "A glazed lamp with a linen shade", zones: TABLES, size: "small", unlock: AVAILABLE },
  { kind: "fixture", id: "library-sconce", category: "wall-light", tones: ALL_TONES, label: "Library sconce", description: "A small brass wall light", zones: WALLS, size: "small", unlock: AVAILABLE },
  { kind: "fixture", id: "pendant-light", category: "ceiling-light", tones: ALL_TONES, label: "Pendant light", description: "A hanging lamp with a warm shade", zones: ["ceiling"], size: "medium", unlock: AVAILABLE },
  { kind: "fixture", id: "candle", category: "candle", tones: ["candle-amber", "warm-gold"], label: "Candle", description: "A cream pillar candle in a brass dish", zones: SMALL_OBJECT_ZONES, size: "small", unlock: AVAILABLE },
  { kind: "fixture", id: "string-lights", category: "string-lights", tones: ALL_TONES, label: "String lights", description: "Tiny lights along the bookcase", zones: ["bookcase-trim"], size: "small", unlock: AVAILABLE },

  // Objects (the first seven match the shelf decorations)
  { kind: "object", id: "glazed-bookend", category: "bookend", label: "Glazed bookend", description: "A green glazed quarter-round bookend", zones: BOOKCASE_ROWS, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "brass-bookend", category: "bookend", label: "Brass bookend", description: "A slim brass bookend", zones: BOOKCASE_ROWS, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "stone-bookend", category: "bookend", label: "Stone bookend", description: "A heavy block of pale stone", zones: BOOKCASE_ROWS, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "potted-plant", category: "plant", label: "Potted plant", description: "A small leafy plant in a terracotta pot", zones: SMALL_OBJECT_ZONES, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "trailing-plant", category: "plant", label: "Trailing plant", description: "A plant whose vines trail over the edge", zones: BOOKCASE_TOP_CORNERS, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "fern", category: "plant", label: "Fern", description: "A full fern in a woven basket", zones: [...BOOKCASE_TOP_CORNERS, ...CORNERS, ...FRONT_SIDES], size: "medium", unlock: AVAILABLE },
  { kind: "object", id: "succulent", category: "plant", label: "Succulent", description: "A tiny succulent in a stone pot", zones: SMALL_OBJECT_ZONES, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "dried-flowers", category: "plant", label: "Dried flowers", description: "A small bunch of dried flowers", zones: SMALL_OBJECT_ZONES, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "ceramic-vase", category: "ceramic", label: "Ceramic vase", description: "A speckled stoneware vase with a dried stem", zones: SMALL_OBJECT_ZONES, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "framed-print", category: "art", label: "Framed print", description: "A small landscape print", zones: [...BOOKCASE_TOP_CORNERS, ...WALLS], size: "wide", unlock: AVAILABLE },
  { kind: "object", id: "framed-botanical", category: "art", label: "Framed botanical", description: "A pressed-leaf study in a thin frame", zones: [...BOOKCASE_TOP_CORNERS, ...WALLS], size: "small", unlock: AVAILABLE },
  { kind: "object", id: "abstract-print", category: "art", label: "Abstract print", description: "Quiet shapes in faded colour", zones: WALLS, size: "medium", unlock: AVAILABLE },
  { kind: "object", id: "paper-stack", category: "paper", label: "Paper stack", description: "A tied bundle of letters and notebooks", zones: SMALL_OBJECT_ZONES, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "globe", category: "library-object", label: "Globe", description: "A small, faded desk globe", zones: [...BOOKCASE_TOP, ...TABLES], size: "small", unlock: AVAILABLE },
  { kind: "object", id: "analog-clock", category: "library-object", label: "Clock", description: "A round clock with a quiet tick", zones: [...WALLS, ...BOOKCASE_TOP, ...TABLES], size: "small", unlock: AVAILABLE },
  { kind: "object", id: "ceramic-figure", category: "ceramic", label: "Ceramic figure", description: "A small glazed animal", zones: SMALL_OBJECT_ZONES, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "small-sculpture", category: "library-object", label: "Small sculpture", description: "A smooth carved form", zones: SMALL_OBJECT_ZONES, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "decorative-box", category: "library-object", label: "Decorative box", description: "A little lidded box for keepsakes", zones: SMALL_OBJECT_ZONES, size: "small", unlock: AVAILABLE },
  { kind: "object", id: "magnifying-glass", category: "library-object", label: "Magnifying glass", description: "A brass-rimmed reading glass", zones: SMALL_OBJECT_ZONES, size: "small", unlock: AVAILABLE },
];

/** Tables that give a surface zone, keyed by the surface. */
export const TABLE_SURFACES: Record<"table-left" | "table-center" | "table-right", { zones: readonly RoomZoneId[]; tables: readonly FurnitureId[] }> = {
  "table-left": { zones: ["mid-left"], tables: ["round-side-table", "writing-desk"] },
  "table-center": { zones: ["mid-center", "front-center"], tables: ["coffee-table"] },
  "table-right": { zones: ["mid-right"], tables: ["round-side-table", "writing-desk"] },
};

/* ------------------------------------------------------------------------------------------------
 * Room state.
 * ---------------------------------------------------------------------------------------------- */

export type RoomItemPlacement = {
  kind: RoomItemKind;
  item: RoomItemId;
  zone: RoomZoneId;
  /** Furniture only. */
  finish: FinishId | null;
  /** Fixtures only. */
  tone: LightToneId | null;
  /** Fixtures only. */
  on: boolean | null;
};

export type ReadingRoom = {
  wall: WallStyleId;
  floor: FloorStyleId;
  bookcase: BookcaseStyleId;
  material: ShelfStyleId;
  ambience: LightingStyleId;
  items: RoomItemPlacement[];
};

export const MAX_ROOM_ITEMS = ROOM_ZONE_IDS.length;

const itemsById = new Map<string, RoomItemPreset>(ROOM_ITEMS.map((item) => [item.id, item]));

export function roomItemPreset(id: string): RoomItemPreset | undefined {
  return itemsById.get(id);
}

/** Zones an item takes up beyond its own. Mirrors public.reading_room_item_covers(). */
export function coveredZones(item: RoomItemId, zone: RoomZoneId): RoomZoneId[] {
  if (item === "framed-print" && (zone === "bookcase-top-left" || zone === "bookcase-top-right")) return ["bookcase-top-center"];
  if (item === "small-sofa" || item === "chaise" || item === "writing-desk") {
    if (zone === "mid-left") return ["corner-left"];
    if (zone === "mid-right") return ["corner-right"];
  }
  return [];
}

/** One placement on its own: known item of that kind, allowed zone, matching finish/tone fields. Mirrors public.reading_room_item_valid(). */
export function isValidPlacement(placement: RoomItemPlacement): boolean {
  const preset = roomItemPreset(placement.item);
  if (!preset || preset.kind !== placement.kind || !preset.zones.includes(placement.zone)) return false;
  if (preset.kind === "furniture") {
    const family: readonly string[] = preset.finish === "upholstery" ? UPHOLSTERY_IDS : ["warm-oak", "dark-walnut", "honey-pine", "painted-cream"];
    if (placement.finish === null || !family.includes(placement.finish)) return false;
  } else if (placement.finish !== null) {
    return false;
  }
  if (preset.kind === "fixture") {
    return placement.tone !== null && preset.tones.includes(placement.tone) && placement.on !== null;
  }
  return placement.tone === null && placement.on === null;
}

/** The whole arrangement: valid placements, one per zone, each item once, nothing covered, tabletops on tables. Mirrors the database checks. */
export function isValidRoomArrangement(items: readonly RoomItemPlacement[]): boolean {
  if (items.length > MAX_ROOM_ITEMS || !items.every(isValidPlacement)) return false;
  const zones = new Set(items.map((placement) => placement.zone));
  const ids = new Set(items.map((placement) => placement.item));
  if (zones.size !== items.length || ids.size !== items.length) return false;
  if (items.some((placement) => coveredZones(placement.item, placement.zone).some((zone) => zones.has(zone)))) return false;
  return items.every((placement) => {
    if (!(placement.zone in TABLE_SURFACES)) return true;
    const surface = TABLE_SURFACES[placement.zone as keyof typeof TABLE_SURFACES];
    return items.some((other) => surface.zones.includes(other.zone) && (surface.tables as readonly string[]).includes(other.item));
  });
}

/* ------------------------------------------------------------------------------------------------
 * The bookcase slice shared with the shelf, so Room View and Shelf View read one state.
 * ---------------------------------------------------------------------------------------------- */

const SLOT_ZONES: Record<SlotId, RoomZoneId> = {
  "top-left": "bookcase-top-left",
  "top-center": "bookcase-top-center",
  "top-right": "bookcase-top-right",
  "row-start": "bookcase-row-start",
  "row-middle": "bookcase-row-middle",
  "row-end": "bookcase-row-end",
};

const SHELF_DECORATION_IDS: readonly string[] = [
  "glazed-bookend",
  "potted-plant",
  "trailing-plant",
  "candle",
  "ceramic-vase",
  "framed-print",
  "paper-stack",
];

/** A reader who has only ever saved a shelf: their room is that shelf in the default room. */
export function roomFromShelfPreferences(shelf: ShelfPreferences): ReadingRoom {
  return {
    wall: shelf.wall,
    floor: "warm-oak-floor",
    bookcase: shelf.bookcase,
    material: shelf.shelf,
    ambience: shelf.lighting,
    items: shelf.decorations.map(({ slot, item }) =>
      item === "candle"
        ? { kind: "fixture", item, zone: SLOT_ZONES[slot], finish: null, tone: "candle-amber", on: true }
        : { kind: "object", item, zone: SLOT_ZONES[slot], finish: null, tone: null, on: null },
    ),
  };
}

/** What the bookcase renderer needs from a room. Objects the V1 shelf cannot draw yet are left out. */
export function shelfAppearanceFromRoom(room: ReadingRoom): ShelfPreferences {
  const slots = Object.entries(SLOT_ZONES) as [SlotId, RoomZoneId][];
  return {
    bookcase: room.bookcase,
    shelf: room.material,
    wall: room.wall,
    lighting: room.ambience,
    decorations: room.items.flatMap((placement) => {
      const slot = slots.find(([, zone]) => zone === placement.zone)?.[0];
      if (!slot || !SHELF_DECORATION_IDS.includes(placement.item)) return [];
      return [{ slot, item: placement.item as ShelfPreferences["decorations"][number]["item"] }];
    }),
  };
}
