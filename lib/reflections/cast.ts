/** A character offered as an answer. Aliases only help recognise an earlier typed answer; they are never shown. */
export type CastMember = { label: string; aliases: string[] };

/** The reader-facing cast of one book: a short, trustworthy list of names, best first. */
export type BookCast = { characters: CastMember[] };

function singleLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * The cast member a saved answer names exactly — by label first, then by an alias that
 * belongs to only one member. Anything else is not a match; there is no fuzzy matching.
 */
export function findCastMember(members: readonly CastMember[], saved: string): number | null {
  const answer = singleLine(saved);
  if (!answer) return null;
  const byLabel = members.findIndex((member) => member.label === answer);
  if (byLabel !== -1) return byLabel;
  const byAlias = members.flatMap((member, index) => (member.aliases.includes(answer) ? [index] : []));
  return byAlias.length === 1 ? byAlias[0] : null;
}

/** Rebuilds a cast from an untrusted response body, or returns null. */
export function parseBookCast(value: unknown): BookCast | null {
  if (typeof value !== "object" || value === null) return null;
  const characters = (value as { characters?: unknown }).characters;
  if (!Array.isArray(characters)) return null;
  const members: CastMember[] = [];
  for (const item of characters) {
    if (typeof item !== "object" || item === null) return null;
    const { label, aliases } = item as { label?: unknown; aliases?: unknown };
    if (typeof label !== "string" || !singleLine(label)) return null;
    members.push({
      label: singleLine(label),
      aliases: Array.isArray(aliases)
        ? aliases.filter((alias): alias is string => typeof alias === "string").map(singleLine)
        : [],
    });
  }
  return members.length > 0 ? { characters: members } : null;
}
