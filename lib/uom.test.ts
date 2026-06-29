/**
 * Mass-conservation tests for the UoM converter.
 * Run with: npx tsx lib/uom.test.ts   (plain assertions, no test framework needed)
 */
import assert from "node:assert"
import { convert, canConvert, UomConversionError } from "./uom"

let passed = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok  ${name}`)
  } catch (e) {
    console.error(`FAIL  ${name}: ${(e as Error).message}`)
    process.exitCode = 1
  }
}

const approx = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`)

// --- dimension-level identity & round-trip (mass conservation) ---
check("kg -> g", () => approx(convert(1, "KG", "GRAM"), 1000))
check("g -> kg", () => approx(convert(1000, "GRAM", "KG"), 1))
check("kg -> g -> kg round trip", () => approx(convert(convert(2.5, "KG", "GRAM"), "GRAM", "KG"), 2.5))
check("litre -> ml", () => approx(convert(1, "LITRE", "ML"), 1000))
check("ml -> litre round trip", () => approx(convert(convert(750, "ML", "LITRE"), "LITRE", "ML"), 750))
check("dozen -> piece", () => approx(convert(2, "DOZEN", "PIECE"), 24))
check("piece -> dozen", () => approx(convert(24, "PIECE", "DOZEN"), 2))
check("maund -> kg approx", () => approx(convert(1, "MAUND", "KG"), 37.324))
check("same code unchanged", () => approx(convert(5, "KG", "KG"), 5))

// --- cross-dimension is blocked WITHOUT a product bridge ---
check("kg -> piece blocked (no bridge)", () => {
  assert.throws(() => convert(1, "KG", "PIECE"), UomConversionError)
})
check("piece -> gram blocked (no bridge)", () => {
  assert.throws(() => convert(1, "PIECE", "GRAM"), UomConversionError)
})

// --- product-specific bridges ---
// A "bun" product stocked in GRAM, 1 bun = 55 g; recipe says 2 PIECE (buns)
check("buns (piece) -> grams via bridge", () => {
  const opts = { productUoms: { PIECE: 55 }, stockUomCode: "GRAM" }
  approx(convert(2, "PIECE", "GRAM", opts), 110)
})
// Bottled water stocked as BOTTLE, purchased by BOX of 24
check("box -> bottle via bridge", () => {
  const opts = { productUoms: { BOX: 24 }, stockUomCode: "BOTTLE" }
  approx(convert(2, "BOX", "BOTTLE", opts), 48)
})
// Rice stocked in KG, purchased by BORI = 25 kg -> but bridge gives stock UoM (KG)
check("bori -> kg via bridge (stock=KG)", () => {
  const opts = { productUoms: { BORI: 25 }, stockUomCode: "KG" }
  approx(convert(2, "BORI", "KG", opts), 50)
})

// --- canConvert mirrors convert ---
check("canConvert true for kg->g", () => assert.ok(canConvert("KG", "GRAM")))
check("canConvert false for kg->piece", () => assert.ok(!canConvert("KG", "PIECE")))
check("canConvert true with bridge", () =>
  assert.ok(canConvert("BOX", "BOTTLE", { productUoms: { BOX: 24 }, stockUomCode: "BOTTLE" })))

console.log(`\n${passed} checks passed.`)
