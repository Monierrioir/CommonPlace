import type { BookFacets, FacetUnavailableReason } from "./book-facets";

/**
 * Decides which Finished Experience questions a book gets. Deterministic: the same
 * facets always give the same plan. Wording is product copy, versioned here — never
 * generated from book metadata.
 */

export const QUESTION_COPY_VERSION = 1;

export const QUESTION_IDS = [
  "rating",
  "favorite_character",
  "least_favorite_character",
  "liked_aspects",
  "book_themes",
  "emotions",
  "favorite_place",
  "would_live_there",
  "final_thought",
] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export const QUESTION_COPY: Record<QuestionId, { prompt: string }> = {
  rating: { prompt: "How was it?" },
  favorite_character: { prompt: "Who stayed with you?" },
  least_favorite_character: { prompt: "Who tested your patience?" },
  liked_aspects: { prompt: "What drew you in?" },
  book_themes: { prompt: "What stayed with you?" },
  emotions: { prompt: "How did it leave you feeling?" },
  favorite_place: { prompt: "Where would you wander off to?" },
  would_live_there: { prompt: "Would you live in this world?" },
  final_thought: { prompt: "One last thought?" },
};

/**
 * core      — asked of every book, unchanged.
 * choices   — book-aware: the reader picks from the book's own options.
 * free-text — a character question without a trustworthy cast: today's text field.
 */
export type PlannedQuestion =
  | { id: QuestionId; prompt: string; mode: "core" }
  | { id: QuestionId; prompt: string; mode: "choices"; options: string[] }
  | { id: QuestionId; prompt: string; mode: "free-text"; reason: FacetUnavailableReason };

/** A book-aware question left out entirely, and why. */
export type OmittedQuestion = { id: QuestionId; reason: FacetUnavailableReason };

export type QuestionPlan = {
  copyVersion: typeof QUESTION_COPY_VERSION;
  questions: PlannedQuestion[];
  omitted: OmittedQuestion[];
};

export function planQuestions(facets: BookFacets): QuestionPlan {
  const questions: PlannedQuestion[] = [];
  const omitted: OmittedQuestion[] = [];
  const core = (id: QuestionId) => questions.push({ id, prompt: QUESTION_COPY[id].prompt, mode: "core" });

  // Character questions always appear; the cast only decides between choices and free text.
  const character = (id: QuestionId) =>
    questions.push(
      facets.characters.status === "available"
        ? { id, prompt: QUESTION_COPY[id].prompt, mode: "choices", options: facets.characters.options.map((member) => member.label) }
        : { id, prompt: QUESTION_COPY[id].prompt, mode: "free-text", reason: facets.characters.reason },
    );

  // Theme and place questions exist only when their own data qualifies.
  const optional = (id: QuestionId, facet: BookFacets["themes"] | BookFacets["places"]) => {
    if (facet.status === "available") {
      questions.push({ id, prompt: QUESTION_COPY[id].prompt, mode: "choices", options: facet.options.map((option) => option.label) });
    } else {
      omitted.push({ id, reason: facet.reason });
    }
  };

  core("rating");
  character("favorite_character");
  character("least_favorite_character");
  core("liked_aspects");
  optional("book_themes", facets.themes);
  core("emotions");
  optional("favorite_place", facets.places);
  core("would_live_there");
  core("final_thought");

  return { copyVersion: QUESTION_COPY_VERSION, questions, omitted };
}
