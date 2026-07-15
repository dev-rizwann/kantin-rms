/** Verifies that the checked-in workbook snapshot resolves into the agreed portal model. */
import assert from "node:assert"
import { WORKBOOK_INGREDIENTS, WORKBOOK_RECIPES, RECIPE_ALIASES, ingredientKind } from "../prisma/recipe-seed-data"
import { costRecipe, type CostingGraph, type CostingProduct, type CostingRecipe } from "./recipe-cost"

let passed = 0
function check(name: string, fn: () => void) { try { fn(); passed++; console.log(`  ok  ${name}`) } catch (e) { console.error(`FAIL  ${name}: ${(e as Error).message}`); process.exitCode = 1 } }
const approx = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`)

const products: CostingProduct[] = WORKBOOK_INGREDIENTS.map(([name, uom, price, qty]) => ({ id: name, name, kind: ingredientKind(name), stockUomCode: uom, avgCost: price / qty }))
for (const prep of WORKBOOK_RECIPES.filter((r) => r.kind === "SEMI_FINISHED")) products.push({ id: prep.outputProduct!, name: prep.outputProduct!, kind: "SEMI_FINISHED", stockUomCode: prep.outputUomCode, avgCost: null })
const recipes: CostingRecipe[] = WORKBOOK_RECIPES.map((r) => ({
  id: r.name, name: r.name, kind: r.kind, version: 1, outputProductId: r.outputProduct ?? null, outputQty: r.outputQty, outputUomCode: r.outputUomCode,
  referenceSellPrice: r.referenceSellPrice ?? null, targetFoodCostPct: .33,
  lines: r.lines.map((line, i) => "product" in line
    ? { id: `${r.name}-${i}`, kind: "PRODUCT", productId: line.product, label: null, quantity: line.qty, uomCode: line.uomCode ?? products.find((p) => p.id === line.product)?.stockUomCode ?? null, fixedUnitCost: null, sortOrder: i }
    : { id: `${r.name}-${i}`, kind: "COST_ADJUSTMENT", productId: null, label: line.adjustment, quantity: 1, uomCode: null, fixedUnitCost: line.cost, sortOrder: i }),
}))
const graph: CostingGraph = { products: new Map(products.map((p) => [p.id, p])), recipes: new Map(recipes.map((r) => [r.id, r])), recipeByOutputProduct: new Map(recipes.filter((r) => r.outputProductId).map((r) => [r.outputProductId!, r.id])) }

check("55 workbook ingredients are preserved", () => assert.equal(WORKBOOK_INGREDIENTS.length, 55))
check("3 semis and 12 menu recipes are seeded", () => { assert.equal(WORKBOOK_RECIPES.filter((r) => r.kind === "SEMI_FINISHED").length, 3); assert.equal(WORKBOOK_RECIPES.filter((r) => r.kind === "MENU").length, 12) })
check("every menu recipe has a POS alias", () => WORKBOOK_RECIPES.filter((r) => r.kind === "MENU").forEach((r) => assert.ok(RECIPE_ALIASES[r.name]?.length, r.name)))
check("Cooked Fries reconciles to Rs 0.522667/g", () => approx(costRecipe("Cooked Fries", graph).costPerOutputUnit!, .5226666666666666))
check("Chinese Sauce reconciles to Rs 0.586011/ml", () => approx(costRecipe("Chinese Sauce", graph).costPerOutputUnit!, .586010989010989))
check("House Sauce reconciles to Rs 0.401928/g", () => approx(costRecipe("House Sauce", graph).costPerOutputUnit!, .4019275824175825))
check("House Sauce replacement lowers Chicken Sandwich to Rs 70.2845", () => approx(costRecipe("Chicken Sandwich", graph).totalCost, 70.28446538461539))
check("Tender Pops remains a visible loss hot spot", () => { const r = costRecipe("Tender Pops with Fries", graph); assert.ok(r.foodCostPct! > 1); assert.ok(r.margin! < 0) })
check("all seeded recipes cost without model errors", () => recipes.forEach((r) => assert.deepEqual(costRecipe(r.id, graph).flags, [], r.name)))

console.log(`\n${passed} workbook-seed checks passed.`)
