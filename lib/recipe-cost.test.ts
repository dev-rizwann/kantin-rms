/** Run with: npx tsx lib/recipe-cost.test.ts */
import assert from "node:assert"
import { costRecipe, explodeRecipe, type CostingGraph, type CostingProduct, type CostingRecipe } from "./recipe-cost"

let passed = 0
function check(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok  ${name}`) }
  catch (e) { console.error(`FAIL  ${name}: ${(e as Error).message}`); process.exitCode = 1 }
}
const approx = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`)

const products: CostingProduct[] = [
  { id: "fries", name: "Frozen Fries", kind: "RAW_MATERIAL", stockUomCode: "GRAM", avgCost: 0.392 },
  { id: "cooked", name: "Cooked Fries", kind: "SEMI_FINISHED", stockUomCode: "GRAM", avgCost: null },
  { id: "bucket", name: "Fries Bucket", kind: "PACKAGING", stockUomCode: "PIECE", avgCost: 16.52 },
]
const recipes: CostingRecipe[] = [
  {
    id: "prep", name: "Cooked Fries", kind: "SEMI_FINISHED", version: 1, outputProductId: "cooked",
    outputQty: 750, outputUomCode: "GRAM", referenceSellPrice: null, targetFoodCostPct: 0.33,
    lines: [{ id: "p1", kind: "PRODUCT", productId: "fries", label: null, quantity: 1000, uomCode: "GRAM", fixedUnitCost: null, sortOrder: 0 }],
  },
  {
    id: "menu", name: "Masala Fries", kind: "MENU", version: 1, outputProductId: null,
    outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 150, targetFoodCostPct: 0.33,
    lines: [
      { id: "m1", kind: "PRODUCT", productId: "cooked", label: null, quantity: 110, uomCode: "GRAM", fixedUnitCost: null, sortOrder: 0 },
      { id: "m2", kind: "PRODUCT", productId: "bucket", label: null, quantity: 1, uomCode: "PIECE", fixedUnitCost: null, sortOrder: 1 },
      { id: "m3", kind: "COST_ADJUSTMENT", productId: null, label: "Frying oil", quantity: 1, uomCode: null, fixedUnitCost: 12.67858, sortOrder: 2 },
    ],
  },
]
const graph: CostingGraph = {
  products: new Map(products.map((p) => [p.id, p])),
  recipes: new Map(recipes.map((r) => [r.id, r])),
  recipeByOutputProduct: new Map([["cooked", "prep"]]),
}

check("semi cost uses output yield", () => approx(costRecipe("prep", graph).costPerOutputUnit!, 392 / 750))
check("menu recursively costs semi plus packaging and oil", () => approx(costRecipe("menu", graph).totalCost, 110 * (392 / 750) + 16.52 + 12.67858))
check("food cost percentage uses sell price", () => approx(costRecipe("menu", graph).foodCostPct!, costRecipe("menu", graph).totalCost / 150))
check("explosion converts cooked fries back to frozen usage", () => {
  const x = explodeRecipe("menu", 10, graph)
  approx(x.ingredients.find((i) => i.productId === "fries")!.quantity, (1100 / 750) * 1000)
  approx(x.adjustmentCost, 126.7858)
})
check("cycle is blocked", () => {
  const cyclic: CostingGraph = { ...graph, recipeByOutputProduct: new Map([["cooked", "prep"]]) }
  cyclic.recipes = new Map(graph.recipes)
  cyclic.recipes.set("prep", { ...recipes[0], lines: [{ ...recipes[0].lines[0], productId: "cooked" }] })
  assert.ok(costRecipe("prep", cyclic).flags.some((f) => f.code === "CYCLE"))
})

console.log(`\n${passed} recipe-cost checks passed.`)
