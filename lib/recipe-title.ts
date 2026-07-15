/** Stable normalization used by seed import, editor saves, and POS matching. */
export function normalizeRecipeTitle(value: string): string {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")
}
