const COVERS_BASE_URL = "https://covers.openlibrary.org/b/id";

/** S ≈ 45px, M ≈ 180px, L ≈ 500px wide. */
export type OpenLibraryCoverSize = "S" | "M" | "L";

export function openLibraryCoverUrl(coverId: number, size: OpenLibraryCoverSize): string {
  return `${COVERS_BASE_URL}/${coverId}-${size}.jpg`;
}
