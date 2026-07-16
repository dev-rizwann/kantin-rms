import assert from "node:assert/strict"
import { calculateOilAllocation } from "./oil-allocation"

const result = calculateOilAllocation([
  { id: "fries", unitsSold: 100, friesGrams: 150, breadedGrams: 0, directOilMl: 0, directCostInRecipe: false },
  { id: "protein", unitsSold: 50, friesGrams: 0, breadedGrams: 100, directOilMl: 0, directCostInRecipe: false },
  { id: "paratha", unitsSold: 20, friesGrams: 0, breadedGrams: 0, directOilMl: 15, directCostInRecipe: true },
], { totalOilSpend: 10_000, directOilUnitCost: 0.6, breadedFactor: 1.25 })

assert.ok(Math.abs(result.allocatedTotal - 10_000) < 0.000001)
assert.ok(Math.abs(result.variance) < 0.000001)
assert.equal(result.rows.find((r) => r.id === "paratha")?.recipeAdjustmentPerUnit, 0)
assert.equal(result.rows.find((r) => r.id === "paratha")?.directCostPerUnit, 9)
assert.ok(result.breadedCostPerGram > result.friesCostPerGram)

console.log("✓ oil allocation reconciles direct oil and fryer load to the source pool")
