/** Standard costing categories. Always offered in the pickers, even when no
 *  ingredient uses them yet — categories are stored free-text on Product.costingCategory. */
export const COSTING_CATEGORIES = [
  "Bakery & Carbs",
  "Beverages",
  "Dairy",
  "Dry Goods & Spices",
  "Oil",
  "Packaging",
  "Produce",
  "Protein",
  "Sauces & Condiments",
  "Semi-finished",
] as const

export function categoryOptions(used: readonly string[]): string[] {
  return [...new Set([...COSTING_CATEGORIES, ...used])].sort()
}
