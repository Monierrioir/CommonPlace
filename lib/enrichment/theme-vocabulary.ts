/**
 * Commonplace's controlled theme vocabulary. Keys are stable and may be stored; labels
 * are reader-facing and may be reworded. Stored keys are checked against the list in
 * the `book_reflections_book_themes_known` constraint: never rename or remove a key, and
 * add one only together with a migration that widens that list.
 *
 * `matches` are source headings in normalized form (see `subjectKey` in ./themes):
 * lowercase, accents and punctuation removed, "&" written as "and". Matching is exact —
 * no stemming, no fuzzy or semantic guessing — so plural catalogue headings
 * ("murderers") are listed explicitly.
 *
 * A source value maps to at most one theme. Add a synonym only when the heading means
 * the theme itself, not merely something that tends to appear alongside it.
 */

export const THEME_VOCABULARY_VERSION = 1;

type Definition = { readonly key: string; readonly label: string; readonly matches: readonly string[] };

export const THEMES = [
  // Relationships
  { key: "friendship", label: "Friendship", matches: ["friendship", "friends", "best friends", "male friendship", "female friendship"] },
  {
    key: "family",
    label: "Family",
    matches: [
      "family", "families", "family life", "family relationships", "parents and children", "fathers and sons",
      "fathers and daughters", "mothers and sons", "mothers and daughters", "brothers and sisters", "siblings", "orphans",
    ],
  },
  { key: "love", label: "Love", matches: ["love", "first loves", "man woman relationships", "romantic love", "unrequited love"] },
  {
    key: "marriage",
    label: "Marriage",
    matches: ["marriage", "married people", "marital conflict", "husband and wife", "husbands and wives", "adultery", "divorce"],
  },

  // Self
  { key: "identity", label: "Identity", matches: ["identity", "self", "self discovery", "self realization", "personal identity"] },
  { key: "coming_of_age", label: "Growing up", matches: ["coming of age", "growing up", "adolescence", "childhood"] },
  { key: "belonging", label: "Belonging", matches: ["belonging", "acceptance", "social acceptance", "homesickness"] },
  { key: "loneliness", label: "Loneliness", matches: ["loneliness", "solitude", "isolation", "social isolation"] },
  { key: "alienation", label: "Alienation", matches: ["alienation", "outsiders", "outcasts"] },
  { key: "memory", label: "Memory", matches: ["memory", "memories", "recollection", "nostalgia", "amnesia", "remembrance"] },
  { key: "ambition", label: "Ambition", matches: ["ambition", "success"] },
  { key: "obsession", label: "Obsession", matches: ["obsession", "obsessive compulsive disorder", "compulsive behavior"] },
  { key: "madness", label: "Madness", matches: ["madness", "insanity", "mental illness", "mentally ill", "psychoses", "schizophrenia"] },
  { key: "idleness", label: "Idleness", matches: ["idleness", "laziness", "apathy", "boredom", "indolence"] },
  { key: "aging", label: "Growing old", matches: ["aging", "old age", "older people"] },

  // Morality
  { key: "morality", label: "Morality", matches: ["morality", "ethics", "conscience", "moral and ethical aspects"] },
  { key: "good_and_evil", label: "Good and evil", matches: ["good and evil", "evil"] },
  { key: "guilt", label: "Guilt", matches: ["guilt", "remorse", "shame", "guilty conscience"] },
  { key: "redemption", label: "Redemption", matches: ["redemption", "atonement", "forgiveness", "repentance"] },
  { key: "justice", label: "Justice", matches: ["justice", "injustice", "punishment", "law", "trials"] },
  {
    key: "crime",
    label: "Crime",
    matches: ["crime", "crimes", "murder", "murderers", "criminals", "homicide", "theft", "robbery", "serial murderers", "organized crime"],
  },
  { key: "violence", label: "Violence", matches: ["violence", "cruelty", "torture", "child abuse"] },
  { key: "revenge", label: "Revenge", matches: ["revenge", "vengeance", "retribution"] },
  { key: "betrayal", label: "Betrayal", matches: ["betrayal", "treachery", "treason"] },
  { key: "sacrifice", label: "Sacrifice", matches: ["sacrifice", "self sacrifice"] },
  { key: "duty", label: "Duty", matches: ["duty", "honor", "obligation", "responsibility"] },
  { key: "courage", label: "Courage", matches: ["courage", "heroes", "heroism", "bravery"] },
  { key: "free_will", label: "Free will", matches: ["free will and determinism", "free will", "choice", "determinism"] },
  { key: "fate", label: "Fate", matches: ["fate and fatalism", "fate", "destiny", "prophecies", "prophecy"] },

  // Belief and ideas
  {
    key: "religion",
    label: "Faith & religion",
    matches: [
      "religion", "religions", "faith", "belief and doubt", "god", "christianity", "christian life", "spirituality",
      "spiritual life", "religious life", "theology", "church", "islam", "judaism", "messiahs",
    ],
  },
  { key: "philosophy", label: "Philosophy", matches: ["philosophy", "existentialism", "nihilism", "meaning of life"] },
  { key: "humanity", label: "Human nature", matches: ["human nature", "humanity", "humanism"] },

  // Society and power
  { key: "power", label: "Power", matches: ["power", "authority", "leadership", "domination", "power politics"] },
  {
    key: "politics",
    label: "Politics",
    matches: ["politics", "politics and government", "revolutions", "revolution", "political corruption", "elections", "government"],
  },
  { key: "war", label: "War", matches: ["war", "wars", "warfare", "battles", "soldiers", "military", "civil war"] },
  {
    key: "oppression",
    label: "Oppression",
    matches: ["oppression", "tyranny", "totalitarianism", "dictatorship", "dictators", "slavery", "persecution", "authoritarianism", "repression"],
  },
  { key: "freedom", label: "Freedom", matches: ["freedom", "liberty", "emancipation"] },
  {
    key: "class",
    label: "Social class",
    matches: [
      "social classes", "social class", "class", "aristocracy", "gentry", "nobility", "upper class", "working class",
      "middle class", "peasants", "serfdom", "social status",
    ],
  },
  { key: "poverty", label: "Poverty", matches: ["poverty", "poor", "the poor", "homelessness", "hunger"] },
  { key: "wealth", label: "Wealth & money", matches: ["wealth", "money", "rich people", "riches", "greed"] },
  {
    key: "society",
    label: "Society",
    matches: ["society", "civilization", "culture", "social conditions", "social problems", "social change"],
  },
  { key: "colonialism", label: "Colonialism & empire", matches: ["colonialism", "imperialism", "colonies", "postcolonialism", "decolonization"] },
  { key: "prejudice", label: "Prejudice", matches: ["prejudice", "prejudices", "racism", "race relations", "discrimination", "antisemitism"] },
  { key: "gender", label: "Gender", matches: ["sex role", "gender identity", "gender roles", "feminism", "womens rights", "masculinity"] },
  {
    key: "education",
    label: "School & learning",
    matches: [
      "schools", "school", "school life", "boarding schools", "education", "teachers", "college teachers", "english teachers",
      "teaching", "students", "college students", "universities and colleges",
    ],
  },
  { key: "work", label: "Work", matches: ["work", "occupations", "careers", "employment", "labor", "bureaucracy", "civil service", "office workers"] },

  // Nature, science and the uncanny
  { key: "nature", label: "Nature", matches: ["nature", "wilderness", "wilderness areas"] },
  {
    key: "ecology",
    label: "Ecology",
    matches: ["ecology", "environment", "environmental protection", "environmental degradation", "climate change", "human ecology"],
  },
  { key: "survival", label: "Survival", matches: ["survival", "survival skills", "wilderness survival"] },
  {
    key: "technology",
    label: "Science & technology",
    matches: ["technology", "science", "artificial intelligence", "robots", "computers", "genetic engineering"],
  },
  {
    key: "magic",
    label: "Magic",
    matches: [
      "magic", "magicians", "magician", "wizards", "witches", "witchcraft", "sorcery", "sorcerers",
      "magic and supernatural", "supernatural", "alchemy",
    ],
  },

  // Feeling
  { key: "grief", label: "Grief & loss", matches: ["grief", "loss", "bereavement", "mourning", "widows", "widowers"] },
  { key: "death", label: "Death", matches: ["death", "dying", "mortality", "suicide"] },
  { key: "suffering", label: "Suffering", matches: ["suffering", "anguish", "despair", "misery", "pain"] },
  { key: "fear", label: "Fear", matches: ["fear", "anxiety", "terror", "dread"] },
  { key: "trauma", label: "Trauma", matches: ["trauma", "psychic trauma", "post traumatic stress disorder"] },
  { key: "hope", label: "Hope", matches: ["hope", "optimism"] },

  // Movement and making
  { key: "journeys", label: "Journeys", matches: ["voyages and travels", "journeys", "quests", "travel"] },
  {
    key: "art",
    label: "Art & creativity",
    matches: ["art", "artists", "creativity", "authorship", "music", "musicians", "painters", "painting"],
  },
] as const satisfies readonly Definition[];

export type ThemeKey = (typeof THEMES)[number]["key"];

/** Normalized headings that begin one of these phrases map to the theme (e.g. "world war 1939 1945"). */
export const THEME_PREFIXES: readonly { prefix: string; key: ThemeKey }[] = [{ prefix: "world war ", key: "war" }];

/**
 * Genres are classification, never themes: "crime fiction" is a genre, "crime" a theme.
 * Kept for later analysis; not asked about.
 */
export const GENRES = [
  {
    key: "fantasy",
    label: "Fantasy",
    matches: ["fantasy", "fantasy fiction", "fantasy and magic", "english fantasy literature"],
  },
  {
    key: "science_fiction",
    label: "Science fiction",
    matches: ["science fiction", "american science fiction", "soft science fiction", "social science fiction", "planetary romance", "space opera"],
  },
  {
    key: "mystery",
    label: "Mystery",
    matches: ["mystery", "mystery fiction", "detective and mystery stories", "mystery and detective stories", "detective fiction", "mystery and detective"],
  },
  { key: "crime_fiction", label: "Crime fiction", matches: ["crime fiction", "crime stories"] },
  {
    key: "psychological_fiction",
    label: "Psychological fiction",
    matches: ["psychological fiction", "psychological novel", "russian psychological fiction"],
  },
  { key: "philosophical_fiction", label: "Philosophical fiction", matches: ["philosophical fiction", "philosophical novels"] },
  { key: "domestic_fiction", label: "Domestic fiction", matches: ["domestic fiction"] },
  { key: "campus_novel", label: "Campus novel", matches: ["campus novel", "campus fiction", "academic fiction"] },
  { key: "historical_fiction", label: "Historical fiction", matches: ["historical fiction"] },
  {
    key: "adventure",
    label: "Adventure",
    matches: ["adventure", "adventure fiction", "adventure stories", "adventure and adventurers", "action and adventure"],
  },
  { key: "school_story", label: "School story", matches: ["school stories"] },
  { key: "realism", label: "Realism", matches: ["realism", "critical realism", "realistic fiction"] },
  { key: "romance", label: "Romance", matches: ["romance", "love stories", "romance fiction"] },
  { key: "horror", label: "Horror", matches: ["horror", "horror stories", "horror fiction"] },
  {
    key: "young_readers",
    label: "Young readers",
    matches: [
      "young adult fiction", "young adult literature", "juvenile fiction", "juvenile literature", "childrens fiction",
      "childrens stories", "teen fiction",
    ],
  },
] as const satisfies readonly Definition[];

export type GenreKey = (typeof GENRES)[number]["key"];

function indexOf<K extends string>(definitions: readonly { key: K; matches: readonly string[] }[]): Map<string, K> {
  const index = new Map<string, K>();
  for (const definition of definitions) {
    for (const match of definition.matches) {
      if (index.has(match)) throw new Error(`Vocabulary heading "${match}" is mapped twice`);
      index.set(match, definition.key);
    }
  }
  return index;
}

export const THEME_INDEX: ReadonlyMap<string, ThemeKey> = indexOf<ThemeKey>(THEMES);
export const GENRE_INDEX: ReadonlyMap<string, GenreKey> = indexOf<GenreKey>(GENRES);

export const themeLabels = Object.fromEntries(THEMES.map((theme) => [theme.key, theme.label])) as Record<ThemeKey, string>;
export const genreLabels = Object.fromEntries(GENRES.map((genre) => [genre.key, genre.label])) as Record<GenreKey, string>;
