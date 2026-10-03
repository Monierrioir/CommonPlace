export function formatAuthors(authors: string[]): string | null {
  if (authors.length === 0) return null;
  if (authors.length <= 2) return authors.join(" & ");
  return `${authors.slice(0, 2).join(", ")} & ${authors.length - 2} more`;
}
