// DEVELOPMENT PROTOTYPE — Book Intelligence research. Not used by the app.
import {
  CAPITALISED_NON_NAMES,
  HONORIFICS,
  NON_CHARACTER_PROPER,
  PLACE_NOUNS,
  SPEECH_VERBS,
  STOPWORDS,
  STRONG_LOCATIVES,
  WEAK_LOCATIVES,
} from "./lexicon";
import { concentration, per10k, round, sparkline, spread } from "./stats";
import { chapterSizes, type Token, type TokenizedText } from "./text";

/**
 * Characters and places from the text alone.
 *
 * 1. Name-like words: capitalised away from sentence starts at least twice, and almost
 *    never written in lowercase ("Zakhar" yes, "Street" no).
 * 2. Mentions: runs of adjacent name-like words ("Ilya Ilyitch Oblomov"), optionally
 *    closed by a capitalised place noun ("Gorokhovaya Street").
 * 3. Grouping: each shorter form joins the one fuller form that contains it. A short
 *    form contained in several fuller forms ("Ivan" in "Ivan Matveievich" and "Ivan
 *    Gerasimovich") is ambiguous and kept apart rather than guessed.
 * 4. Role: grammatical cues decide person versus place — honorifics, speech verbs,
 *    possessives and direct address for people; locative prepositions and place-noun
 *    heads for places. Anything without clear cues stays unclassified.
 */
export const NAMES_METHOD_VERSION = "names-v2";

export type Cues = {
  honorific: number;
  speech: number;
  possessive: number;
  address: number;
  locative: number;
  placeNoun: number;
};

export type NameGroup = {
  label: string;
  forms: { form: string; count: number }[];
  mentions: number;
  per10k: number;
  perChapter: number[];
  spread: number;
  concentration: number;
  firstChapter: number;
  distribution: string;
  cues: Cues;
  personScore: number;
  placeScore: number;
  role: "person" | "place" | "unclassified";
  /** Set when this is a short form shared by several fuller names. */
  ambiguousWith: string[];
  honorificsSeen: string[];
};

export type CharacterCandidate = NameGroup & {
  tier: "major" | "supporting" | "minor";
  companions: { label: string; paragraphs: number }[];
};

export type PlaceCandidate = NameGroup & {
  tier: "major" | "supporting" | "minor";
  /** The place name contains a character's name ("Oblomovka" ← "Oblomov"): a hint, not a classification. */
  derivedFromCharacter: string | null;
};

export type RejectedName = { label: string; mentions: number; reason: string };

export type NameExtraction = {
  method: string;
  nameLikeWords: number;
  characters: CharacterCandidate[];
  places: PlaceCandidate[];
  rejected: RejectedName[];
};

type Mention = { tokens: string[]; start: number; end: number; chapter: number; paragraph: number; cues: Cues; honorific: string | null };

const emptyCues = (): Cues => ({ honorific: 0, speech: 0, possessive: 0, address: 0, locative: 0, placeNoun: 0 });

function nameLikeWords(tokens: Token[]): Set<string> {
  const stats = new Map<string, { capitalMid: number; lower: number }>();
  for (const token of tokens) {
    const entry = stats.get(token.lower) ?? { capitalMid: 0, lower: 0 };
    if (token.capitalized && !token.sentenceStart) entry.capitalMid++;
    else if (!token.capitalized) entry.lower++;
    stats.set(token.lower, entry);
  }
  const result = new Set<string>();
  for (const [word, { capitalMid, lower }] of stats) {
    if (capitalMid < 2 || word.length < 2) continue;
    if (CAPITALISED_NON_NAMES.has(word) || HONORIFICS.has(word) || STOPWORDS.has(word) || PLACE_NOUNS.has(word)) continue;
    if (lower > 0.1 * (capitalMid + lower)) continue;
    result.add(word);
  }
  return result;
}

function onlySpace(gap: string): boolean {
  return /^\s+$/.test(gap);
}

function findMentions(text: TokenizedText, nameLike: Set<string>): Mention[] {
  const { tokens } = text;
  const mentions: Mention[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (!token.capitalized || !nameLike.has(token.lower)) {
      i++;
      continue;
    }
    let end = i;
    while (
      end + 1 < tokens.length &&
      end - i < 3 &&
      !tokens[end].possessive &&
      tokens[end + 1].paragraph === token.paragraph &&
      onlySpace(tokens[end + 1].gapBefore) &&
      tokens[end + 1].capitalized &&
      nameLike.has(tokens[end + 1].lower)
    ) {
      end++;
    }
    const cues = emptyCues();
    const words = tokens.slice(i, end + 1).map((t) => t.text);
    const next = tokens[end + 1]?.paragraph === token.paragraph ? tokens[end + 1] : undefined;
    if (next && next.capitalized && PLACE_NOUNS.has(next.lower) && onlySpace(next.gapBefore) && !tokens[end].possessive) {
      words.push(next.text);
      end++;
      cues.placeNoun += 2;
    }
    const after = tokens[end + 1]?.paragraph === token.paragraph ? tokens[end + 1] : undefined;
    const previous = i > 0 && tokens[i - 1].paragraph === token.paragraph ? tokens[i - 1] : undefined;
    const joined = previous && (onlySpace(token.gapBefore) || /^\.\s+$/.test(token.gapBefore));

    let honorific: string | null = null;
    if (previous && joined && HONORIFICS.has(previous.lower) && previous.capitalized) {
      cues.honorific += 2;
      honorific = previous.text;
    }
    if (after && !/[.!?]/.test(after.gapBefore) && SPEECH_VERBS.has(after.lower)) cues.speech++;
    if (previous && onlySpace(token.gapBefore) && SPEECH_VERBS.has(previous.lower)) cues.speech++;
    if (tokens[end].possessive) cues.possessive++;
    const closing = after ? after.gapBefore : "";
    if (/[,"“]/.test(token.gapBefore) && /^[,!?]/.test(closing.trimStart())) cues.address++;
    if (previous && onlySpace(token.gapBefore)) {
      if (STRONG_LOCATIVES.has(previous.lower)) cues.locative += 1;
      else if (WEAK_LOCATIVES.has(previous.lower)) cues.locative += 0.5;
    }
    if (after && !tokens[end].possessive && onlySpace(after.gapBefore) && PLACE_NOUNS.has(after.lower) && !after.capitalized) cues.placeNoun += 1;

    mentions.push({ tokens: words, start: i, end, chapter: token.chapter, paragraph: token.paragraph, cues, honorific });
    i = end + 1;
  }
  return mentions;
}

const key = (words: string[]) => words.map((word) => word.toLowerCase()).join(" ");

function contains(longer: string[], shorter: string[]): boolean {
  if (shorter.length >= longer.length) return false;
  for (let start = 0; start + shorter.length <= longer.length; start++) {
    if (shorter.every((word, index) => longer[start + index] === word)) return true;
  }
  return false;
}

function groupMentions(text: TokenizedText, mentions: Mention[]): NameGroup[] {
  type Form = { words: string[]; display: Map<string, number>; mentions: Mention[] };
  const forms = new Map<string, Form>();
  for (const mention of mentions) {
    const k = key(mention.tokens);
    const entry: Form = forms.get(k) ?? { words: k.split(" "), display: new Map(), mentions: [] };
    const shown = mention.tokens.join(" ");
    entry.display.set(shown, (entry.display.get(shown) ?? 0) + 1);
    entry.mentions.push(mention);
    forms.set(k, entry);
  }

  // A multi-word run seen once ("Rodya Pyotr Petrovitch") may be two names side by side,
  // so it never absorbs shorter forms; only repeated forms act as anchors.
  const all = [...forms.entries()];
  const anchors = all.filter(([, entry]) => entry.words.length === 1 || entry.mentions.length >= 2);
  const maximal = anchors.filter(([, entry]) => !anchors.some(([, other]) => contains(other.words, entry.words)));
  const groups = new Map<string, { root: string; members: string[]; ambiguousWith: string[] }>();
  const rootOf = new Map<string, string>();
  for (const [k, entry] of anchors) {
    const containers = maximal.filter(([, other]) => other.words === entry.words || contains(other.words, entry.words)).map(([mk]) => mk);
    const root = containers.length === 1 ? containers[0] : k;
    const group = groups.get(root) ?? { root, members: [], ambiguousWith: containers.length > 1 ? containers : [] };
    group.members.push(k);
    groups.set(root, group);
    rootOf.set(k, root);
  }
  for (const [k, entry] of all) {
    if (rootOf.has(k)) continue;
    const inside = anchors.filter(([, other]) => contains(entry.words, other.words)).sort((a, b) => b[1].mentions.length - a[1].mentions.length)[0];
    const root = inside ? (rootOf.get(inside[0]) ?? k) : k;
    const group = groups.get(root) ?? { root, members: [], ambiguousWith: [] };
    group.members.push(k);
    groups.set(root, group);
  }

  const sizes = chapterSizes(text);
  const chapterCount = sizes.length;
  const display = (k: string) => [...(forms.get(k)?.display ?? new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? k;

  return [...groups.values()].map((group): NameGroup => {
    const groupMentions = group.members.flatMap((member) => forms.get(member)?.mentions ?? []);
    const cues = emptyCues();
    const perChapter = new Array<number>(chapterCount).fill(0);
    const honorifics = new Set<string>();
    for (const mention of groupMentions) {
      for (const cue of Object.keys(cues) as (keyof Cues)[]) cues[cue] += mention.cues[cue];
      perChapter[mention.chapter]++;
      if (mention.honorific) honorifics.add(mention.honorific);
    }
    const personScore = cues.honorific + cues.speech + cues.possessive + cues.address;
    const placeScore = cues.locative + cues.placeNoun;
    const role = personScore >= 2 && personScore >= 2 * placeScore ? "person" : placeScore >= 2 && placeScore >= 2 * personScore ? "place" : "unclassified";
    return {
      label: display(group.root),
      forms: group.members.map((member) => ({ form: display(member), count: forms.get(member)?.mentions.length ?? 0 })).sort((a, b) => b.count - a.count),
      mentions: groupMentions.length,
      per10k: round(per10k(groupMentions.length, text.wordCount)),
      perChapter,
      spread: round(spread(perChapter)),
      concentration: round(concentration(perChapter)),
      firstChapter: perChapter.findIndex((count) => count > 0) + 1,
      distribution: sparkline(perChapter, sizes),
      cues: Object.fromEntries(Object.entries(cues).map(([name, value]) => [name, round(value, 1)])) as Cues,
      personScore: round(personScore, 1),
      placeScore: round(placeScore, 1),
      role,
      ambiguousWith: group.ambiguousWith.map(display),
      honorificsSeen: [...honorifics],
    };
  });
}

function tierOf(group: NameGroup): "major" | "supporting" | "minor" {
  const chapters = group.perChapter.filter((count) => count > 0).length;
  if (group.mentions >= 50 && group.spread >= 0.3) return "major";
  if (group.mentions >= 10 && chapters >= 3) return "supporting";
  return "minor";
}

export function extractNames(text: TokenizedText, excludedNames: string[]): NameExtraction {
  const nameLike = nameLikeWords(text.tokens);
  const mentions = findMentions(text, nameLike);
  const groups = groupMentions(text, mentions).sort((a, b) => b.mentions - a.mentions);
  // Surnames only: a shared first name ("Ivan") must not remove a character.
  const excluded = new Set(excludedNames.map((name) => name.toLowerCase().split(/[\s.]+/).filter(Boolean).pop() ?? "").filter((word) => word.length > 2));

  const rejected: RejectedName[] = [];
  const people: NameGroup[] = [];
  const places: NameGroup[] = [];
  for (const group of groups) {
    const words = group.label.toLowerCase().split(" ");
    const reject = (reason: string) => rejected.push({ label: group.label, mentions: group.mentions, reason });
    if (words.some((word) => excluded.has(word))) reject("author or translator named in the source metadata");
    else if (words.every((word) => NON_CHARACTER_PROPER.has(word))) reject("a deity or abstraction, not a story character");
    else if (group.mentions < 3) reject("fewer than 3 mentions");
    else if (group.role === "unclassified") {
      reject(`no clear person or place cues (person ${group.personScore}, place ${group.placeScore}) — perhaps a nationality, language, title or institution`);
    } else if (group.role === "person") people.push(group);
    else places.push(group);
  }

  const characterByParagraph = new Map<number, Set<string>>();
  for (const mention of mentions) {
    const owner = people.find((person) => person.forms.some((form) => key(form.form.split(" ")) === key(mention.tokens)));
    if (!owner) continue;
    const set = characterByParagraph.get(mention.paragraph) ?? new Set<string>();
    set.add(owner.label);
    characterByParagraph.set(mention.paragraph, set);
  }
  const pairCounts = new Map<string, Map<string, number>>();
  for (const present of characterByParagraph.values()) {
    for (const a of present) {
      for (const b of present) {
        if (a === b) continue;
        const row = pairCounts.get(a) ?? new Map<string, number>();
        row.set(b, (row.get(b) ?? 0) + 1);
        pairCounts.set(a, row);
      }
    }
  }

  const characters = people.map((person): CharacterCandidate => ({
    ...person,
    tier: tierOf(person),
    companions: [...(pairCounts.get(person.label) ?? new Map<string, number>()).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, paragraphs]) => ({ label, paragraphs })),
  }));
  const characterWords = characters.flatMap((character) => character.label.toLowerCase().split(" ")).filter((word) => word.length >= 5);
  const placeCandidates = places.map((place): PlaceCandidate => {
    const lower = place.label.toLowerCase();
    const root = characterWords.find((word) => lower !== word && lower.split(" ")[0].startsWith(word));
    return { ...place, tier: tierOf(place), derivedFromCharacter: root ? characters.find((c) => c.label.toLowerCase().includes(root))?.label ?? null : null };
  });

  return { method: NAMES_METHOD_VERSION, nameLikeWords: nameLike.size, characters, places: placeCandidates, rejected };
}
