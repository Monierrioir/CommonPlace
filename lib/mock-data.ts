import type { CurrentRead, ShelfBook } from "@/types/book";
import type { ClubSummary } from "@/types/club";

// Static prototype data. Replace with persisted user data once the database exists.

export const mockReader = {
  firstName: "Ayşenur",
  initial: "A",
};

/** Home's nightstand fallback, shown only while the reader has no books marked "currently reading". */
export const demoCurrentReads: CurrentRead[] = [
  {
    id: "crime-and-punishment",
    title: "Crime and Punishment",
    author: "Fyodor Dostoevsky",
    progress: 68,
    cover: {
      motif: "frame",
      background: "var(--color-burgundy)",
      ink: "#f3e6cf",
      accent: "var(--color-ochre)",
      ribbon: "var(--color-ochre)",
    },
  },
  {
    id: "dune",
    title: "Dune",
    author: "Frank Herbert",
    progress: 31,
    cover: {
      motif: "dunes",
      background: "var(--color-sand)",
      ink: "#3b2415",
      accent: "var(--color-burgundy)",
      ribbon: "var(--color-forest)",
    },
  },
  {
    id: "the-bell-jar",
    title: "The Bell Jar",
    author: "Sylvia Plath",
    progress: 14,
    cover: {
      motif: "dome",
      background: "var(--color-dusty)",
      ink: "#f4ecdd",
      accent: "#f4ecdd",
      ribbon: "var(--color-burgundy)",
    },
  },
];

export const mockLibraryStats = {
  totalBooks: 128,
  finishedThisYear: 23,
};

export const mockShelfBooks: ShelfBook[] = [
  { id: "middlemarch", title: "Middlemarch", author: "George Eliot", color: "#3e5a46", ink: "#efe3c8", spine: "bands", height: 0.94, thickness: 1.35 },
  { id: "jane-eyre", title: "Jane Eyre", author: "Charlotte Brontë", color: "#7b2d37", ink: "#f1dfc0", spine: "foil", height: 0.84, thickness: 1.05 },
  { id: "stoner", title: "Stoner", author: "John Williams", color: "#e9dcc2", ink: "#3b2a1c", spine: "label", height: 0.76, thickness: 0.85 },
  { id: "the-master-and-margarita", title: "The Master and Margarita", author: "Mikhail Bulgakov", color: "#2f3b4a", ink: "#d9b677", spine: "foil", height: 0.97, thickness: 1.2 },
  { id: "rebecca", title: "Rebecca", author: "Daphne du Maurier", color: "#8b6a4a", ink: "#f5e9d3", spine: "plain", height: 0.8, thickness: 0.95 },
  { id: "beloved", title: "Beloved", author: "Toni Morrison", color: "#5d7890", ink: "#f4ecdd", spine: "bands", height: 0.87, thickness: 1 },
  { id: "piranesi", title: "Piranesi", author: "Susanna Clarke", color: "#b98a45", ink: "#2a1d15", spine: "plain", height: 0.78, thickness: 0.9 },
  { id: "frankenstein", title: "Frankenstein", author: "Mary Shelley", color: "#40302a", ink: "#d8b27a", spine: "bands", height: 0.9, thickness: 1.1 },
  { id: "mrs-dalloway", title: "Mrs Dalloway", author: "Virginia Woolf", color: "#c9a3a0", ink: "#3a1f22", spine: "label", height: 0.74, thickness: 0.8 },
  { id: "the-secret-history", title: "The Secret History", author: "Donna Tartt", color: "#1f2a24", ink: "#e8dcc4", spine: "foil", height: 0.92, thickness: 1.3 },
  { id: "circe", title: "Circe", author: "Madeline Miller", color: "#a4552f", ink: "#f6e8cf", spine: "plain", height: 0.82, thickness: 0.95 },
  { id: "the-hobbit", title: "The Hobbit", author: "J.R.R. Tolkien", color: "#4f6a52", ink: "#efe3c8", spine: "bands", height: 0.79, thickness: 1 },
  { id: "norwegian-wood", title: "Norwegian Wood", author: "Haruki Murakami", color: "#d9c7a4", ink: "#4d311e", spine: "label", height: 0.86, thickness: 0.9 },
  { id: "wuthering-heights", title: "Wuthering Heights", author: "Emily Brontë", color: "#57313a", ink: "#e6c98f", spine: "foil", height: 0.95, thickness: 1.15 },
  { id: "the-remains-of-the-day", title: "The Remains of the Day", author: "Kazuo Ishiguro", color: "#6f8193", ink: "#f4ecdd", spine: "plain", height: 0.83, thickness: 1 },
  { id: "anna-karenina", title: "Anna Karenina", author: "Leo Tolstoy", color: "#2d4a3c", ink: "#d9b677", spine: "bands", height: 0.98, thickness: 1.45 },
  { id: "the-little-prince", title: "The Little Prince", author: "Antoine de Saint-Exupéry", color: "#e3c78c", ink: "#2f3b4a", spine: "plain", height: 0.72, thickness: 0.8 },
];

export const mockClubs: ClubSummary[] = [
  {
    id: "sunday-classics",
    name: "Sunday Classics",
    currentBookTitle: "Crime and Punishment",
    readerCount: 7,
    memberInitials: ["E", "M", "D"],
    emblemColor: "var(--color-forest)",
  },
  {
    id: "fantasy-after-dark",
    name: "Fantasy After Dark",
    currentBookTitle: "Dune",
    readerCount: 12,
    memberInitials: ["K", "S", "L"],
    emblemColor: "var(--color-dusty)",
  },
];

export const mockInsight = {
  message: "You’ve been spending a lot of time with complicated characters lately.",
  basis: "Drawn from Raskolnikov, Paul Atreides, and Esther Greenwood.",
};
