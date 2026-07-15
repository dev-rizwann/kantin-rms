/**
 * Verified seed snapshot from Kantin_Menu_Costing_LINKED.xlsx (15-Jul-2026).
 * The workbook is the import source; the application uses stable product/recipe IDs.
 */

export type WorkbookIngredient = readonly [
  name: string,
  uomCode: "GRAM" | "ML" | "PIECE",
  packPrice: number,
  packQty: number,
  note: string,
]

export const WORKBOOK_INGREDIENTS: WorkbookIngredient[] = [
  ["Frozen Fries", "GRAM", 784, 2000, "Usama Tariq 22-May, Rs784/2kg"],
  ["Chicken Boneless", "GRAM", 1000, 1000, "user price Rs1000/kg"],
  ["Cheese 70/30", "GRAM", 2901.2, 2000, "Usama, 2kg block (70/30 blend)"],
  ["Cheese Mozzarella 100%", "GRAM", 1556.13, 1000, "Usama, 100% mozzarella"],
  ["Pizza Sauce", "GRAM", 727.95, 1000, "Usama"],
  ["Butter", "GRAM", 1266, 1000, "Usama"],
  ["Maida (flour)", "GRAM", 155, 1000, "METRO, 50kg bag basis"],
  ["Cooking Oil", "ML", 9500, 16000, "SUFI 16L, GST-incl"],
  ["Milk", "ML", 375, 1000, "Olpers, GST-incl"],
  ["Sugar", "GRAM", 185, 1000, "GST-incl"],
  ["Garlic", "GRAM", 599, 1000, "METRO"],
  ["Lettuce", "GRAM", 699, 1000, "METRO"],
  ["Cabbage", "GRAM", 99, 1000, "local"],
  ["Capsicum", "GRAM", 249, 1000, "local"],
  ["Mayonnaise", "GRAM", 520, 1000, "Youngs, GST-incl"],
  ["Mustard", "GRAM", 2168, 1000, "GST-incl"],
  ["Ketchup Sachet", "PIECE", 4.09, 1, "DIPIT invoice Rs4.09/sachet (user)"],
  ["Bun", "PIECE", 118, 4, "ATA Bakery, Rs118/4"],
  ["Paratha", "PIECE", 795, 20, "SUFI, Rs795/20"],
  ["Burger Patty", "PIECE", 1065.54, 12, "12 pcs/kg (per-kg price)"],
  ["Zinger Fillet", "PIECE", 1412.15, 8.5, "8-9 fillets/kg (per-kg price)"],
  ["Nugget", "PIECE", 750, 39, "ECO nuggets Rs750/kg, 39 pcs/kg (user)"],
  ["Tender (popcorn)", "PIECE", 1132.8, 50, "Seasons popcorn, 50 pcs/kg (user); 20g/pc — re-weigh"],
  ["Toast Slice", "PIECE", 270, 18, "loaf Rs270 / ~18 slices [ASSUME]"],
  ["Sauce Blend", "GRAM", 450, 1000, "Legacy mayo-ketchup blend [ASSUME]; replaced by House Sauce"],
  ["Fries Sauce", "GRAM", 0.465, 1, "Legacy USER-GIVEN Rs0.465/g; replaced by House Sauce"],
  ["Salad Mix", "GRAM", 350, 1000, "lettuce/cabbage mix ~Rs350/kg [ASSUME]"],
  ["Olives (sliced black)", "GRAM", 4299, 3000, "METRO 3kg tin, 25% luxury tax incl"],
  ["Jalapeno (pickled)", "GRAM", 1375, 3000, "Naturelle 3kg catering jar Rs1375 (verified 14-Jul)"],
  ["Salt", "GRAM", 50, 1000, "~Rs50/kg"],
  ["Tissue", "PIECE", 1, 1, "~Rs1 [ASSUME]"],
  ["Burger Box", "PIECE", 25.96, 1, "Premier Print"],
  ["Fries Bucket", "PIECE", 16.52, 1, "Premier Print"],
  ["Tray", "PIECE", 16.52, 1, "assumed = bucket; confirm"],
  ["Pizza Box", "PIECE", 61.36, 1, "Premier Print"],
  ["Paper Bag", "PIECE", 30.68, 1, "Premier Print"],
  ["Stick", "PIECE", 100, 100, "Rs100 / 100 pc"],
  ["Fork", "PIECE", 400, 100, "Rs400 / 100 pc"],
  ["Pita Bread", "PIECE", 100, 4, "Rs100 / 4-pc pack"],
  ["Yeast", "GRAM", 1895, 500, "Rs1895 / 500 g (user)"],
  ["Chowmein Noodles", "GRAM", 440, 1000, "Rs440 / 1 kg pack"],
  ["Soy Sauce", "ML", 1090, 3500, "Shangrila 3.5L foodservice Rs1090 (verified 14-Jul)"],
  ["Oyster Sauce", "ML", 750, 500, "Azadeh 500g Rs750; workbook treats as ml (verify density)"],
  ["Vinegar", "ML", 940, 5000, "Key 5L Rs940 (verified 14-Jul)"],
  ["Hot Sauce", "GRAM", 4480, 13000, "National chilli-garlic 4x3.25kg Rs4480 (verified 14-Jul)"],
  ["Garlic Powder", "GRAM", 1000, 1000, "Al-Fatah Basic 1kg Rs1000 (verified 14-Jul)"],
  ["Oregano", "GRAM", 850, 500, "Daraz 500g Rs850 (unbranded — sample quality)"],
  ["Lemon Juice", "ML", 445, 800, "Mitchell's 800ml Rs445 (verified 14-Jul)"],
  ["Brown Sugar", "GRAM", 378, 1000, "Sugarie 1kg Rs378 (verified 14-Jul)"],
  ["Chilli Garlic Ketchup", "GRAM", 818, 2000, "DIPIT 10g x100 x2 Rs818 (METRO invoice)"],
  ["Ketchup (bulk)", "GRAM", 409, 1000, "DIPIT rate Rs0.409/g (METRO invoice)"],
  ["Black Pepper", "GRAM", 3150, 1000, "~Rs3150/kg [internet]"],
  ["White Pepper", "GRAM", 3000, 1000, "~Rs3000/kg [internet]"],
  ["Egg", "PIECE", 300, 12, "~Rs300/dozen farmi [internet]"],
  ["Butter Paper", "PIECE", 148.68, 40, "METRO Pro 40-pc pack (invoice)"],
]

export interface RecipeSeed {
  name: string
  kind: "SEMI_FINISHED" | "MENU"
  outputProduct?: string
  outputQty: number
  outputUomCode: "GRAM" | "ML" | "PIECE"
  referenceSellPrice?: number
  notes?: string
  lines: ({ product: string; qty: number; uomCode?: "GRAM" | "ML" | "PIECE" } | { adjustment: string; cost: number })[]
}

export const WORKBOOK_RECIPES: RecipeSeed[] = [
  { name: "Cooked Fries", kind: "SEMI_FINISHED", outputProduct: "Cooked Fries", outputQty: 750, outputUomCode: "GRAM", notes: "1000g frozen → 750g cooked (25% yield loss).", lines: [{ product: "Frozen Fries", qty: 1000 }] },
  { name: "Chinese Sauce", kind: "SEMI_FINISHED", outputProduct: "Chinese Sauce", outputQty: 200, outputUomCode: "ML", notes: "Workbook-compatible mixed ml/g batch; verify sauce density before strict physical yield reporting.", lines: [
    { product: "Soy Sauce", qty: 50 }, { product: "Oyster Sauce", qty: 50 }, { product: "Vinegar", qty: 50 }, { product: "Hot Sauce", qty: 50 },
  ] },
  { name: "House Sauce", kind: "SEMI_FINISHED", outputProduct: "House Sauce", outputQty: 3500, outputUomCode: "GRAM", notes: "Unified replacement for legacy Sauce Blend and Fries Sauce.", lines: [
    { product: "Mayonnaise", qty: 2000 }, { product: "Hot Sauce", qty: 100 }, { product: "Lemon Juice", qty: 60 },
    { product: "Ketchup (bulk)", qty: 220 }, { product: "Chilli Garlic Ketchup", qty: 250 }, { product: "Brown Sugar", qty: 60 },
    { product: "Garlic Powder", qty: 50 }, { product: "Oregano", qty: 20 },
  ] },
  { name: "Chicken Sandwich", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 150, lines: [
    { product: "Toast Slice", qty: 1.5 }, { product: "Chicken Boneless", qty: 30 }, { product: "House Sauce", qty: 35 }, { product: "Butter Paper", qty: 1 },
  ] },
  { name: "Club Sandwich", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 250, lines: [
    { product: "Toast Slice", qty: 1.5 }, { product: "Chicken Boneless", qty: 30 }, { product: "Egg", qty: 1 }, { product: "House Sauce", qty: 35 }, { product: "Salad Mix", qty: 20 }, { product: "Butter Paper", qty: 1 },
  ] },
  { name: "Zinger Burger", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 350, lines: [
    { product: "Bun", qty: 1 }, { product: "Zinger Fillet", qty: 1 }, { product: "House Sauce", qty: 45 }, { product: "Salad Mix", qty: 20 },
    { product: "Ketchup Sachet", qty: 1 }, { product: "Tissue", qty: 1 }, { product: "Burger Box", qty: 1 }, { adjustment: "Frying oil (allocated)", cost: 12.613893394991672 },
  ] },
  { name: "Patty Burger", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 250, lines: [
    { product: "Bun", qty: 1 }, { product: "Burger Patty", qty: 1 }, { product: "House Sauce", qty: 45 }, { product: "Salad Mix", qty: 10 },
    { product: "Ketchup Sachet", qty: 1 }, { product: "Tissue", qty: 1 }, { product: "Burger Box", qty: 1 }, { adjustment: "Frying oil (allocated)", cost: 8.948317536618026 },
  ] },
  { name: "Chicken Roll Paratha", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 250, lines: [
    { product: "Paratha", qty: 1 }, { product: "Chicken Boneless", qty: 40 }, { product: "House Sauce", qty: 45 }, { product: "Salad Mix", qty: 20 }, { product: "Cooking Oil", qty: 15 }, { product: "Butter Paper", qty: 1 },
  ] },
  { name: "Shawarma", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 200, lines: [
    { product: "Pita Bread", qty: 1 }, { product: "Chicken Boneless", qty: 40 }, { product: "House Sauce", qty: 45 }, { product: "Salad Mix", qty: 20 }, { product: "Butter Paper", qty: 1 },
  ] },
  { name: "Masala Fries", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 150, lines: [
    { product: "Cooked Fries", qty: 110 }, { product: "Fries Bucket", qty: 1 }, { product: "Stick", qty: 1 }, { adjustment: "Frying oil (allocated)", cost: 12.678580027786504 },
  ] },
  { name: "Nuggets with Fries", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 200, lines: [
    { product: "Cooked Fries", qty: 110 }, { product: "Nugget", qty: 4 }, { product: "Tray", qty: 1 }, { product: "Stick", qty: 1 }, { adjustment: "Frying oil (allocated)", cost: 20.872220181798188 },
  ] },
  { name: "Tender Pops with Fries", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 200, notes: "Tender source implies 20g/pc; historical oil load used 25g/pc. Re-weigh before approval.", lines: [
    { product: "Cooked Fries", qty: 110 }, { product: "Tender (popcorn)", qty: 6 }, { product: "Tray", qty: 1 }, { product: "Stick", qty: 1 }, { adjustment: "Frying oil (allocated)", cost: 28.85023822649378 },
  ] },
  { name: "Loaded Fries", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 300, lines: [
    { product: "Cooked Fries", qty: 250 }, { product: "Chicken Boneless", qty: 50 }, { product: "House Sauce", qty: 85 }, { product: "Olives (sliced black)", qty: 10 },
    { product: "Jalapeno (pickled)", qty: 10 }, { product: "Tray", qty: 1 }, { product: "Fork", qty: 1 }, { adjustment: "Frying oil (allocated)", cost: 28.720864960904116 },
  ] },
  { name: "Pizza (whole 8-slice)", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 1499, lines: [
    { product: "Maida (flour)", qty: 440 }, { product: "Chicken Boneless", qty: 160 }, { product: "Pizza Sauce", qty: 50 }, { product: "Salad Mix", qty: 15 },
    { product: "Cheese 70/30", qty: 175 }, { product: "Milk", qty: 25 }, { product: "Cooking Oil", qty: 10 }, { product: "Yeast", qty: 5 },
    { product: "Pizza Box", qty: 1 }, { product: "Ketchup Sachet", qty: 1 },
  ] },
  { name: "Chicken Chowmein (per plate)", kind: "MENU", outputQty: 1, outputUomCode: "PIECE", referenceSellPrice: 300, lines: [
    { product: "Chowmein Noodles", qty: 90 }, { product: "Chicken Boneless", qty: 40 }, { product: "Chinese Sauce", qty: 40 }, { product: "Cooking Oil", qty: 9 },
    { product: "Black Pepper", qty: 2 }, { product: "White Pepper", qty: 2 }, { product: "Salt", qty: 2 }, { product: "Garlic", qty: 2 }, { product: "Sugar", qty: 2 },
    { product: "Tray", qty: 1 }, { product: "Fork", qty: 1 }, { product: "Ketchup Sachet", qty: 1 }, { product: "Tissue", qty: 1 },
  ] },
]

export const RECIPE_ALIASES: Record<string, { title: string; posItemId?: number; primary?: boolean }[]> = {
  "Chicken Sandwich": [{ title: "Chicken Sandwich", posItemId: 101, primary: true }, { title: "Chiken Sasdwich", posItemId: 801 }],
  "Club Sandwich": [{ title: "Club Sandwich", posItemId: 102, primary: true }, { title: "Club  Sandwic", posItemId: 805 }],
  "Zinger Burger": [{ title: "Zinger Burger", posItemId: 103, primary: true }, { title: "Zanger Burger", posItemId: 806 }],
  "Patty Burger": [{ title: "Patty Burger", posItemId: 104, primary: true }, { title: "Patty Burgr", posItemId: 808 }],
  "Chicken Roll Paratha": [{ title: "ROLL PRATHA", posItemId: 204, primary: true }, { title: "Chicke Roll paratha", posItemId: 812 }],
  "Shawarma": [{ title: "SHAWARMA", posItemId: 203, primary: true }, { title: "Shawarama", posItemId: 813 }],
  "Masala Fries": [{ title: "Masala Fries", posItemId: 106, primary: true }, { title: "Masala Faries", posItemId: 815 }],
  "Nuggets with Fries": [{ title: "Fries & Nuggets", posItemId: 109, primary: true }, { title: "4 Nughts Faries", posItemId: 818 }],
  "Tender Pops with Fries": [{ title: "TENDER POPS with FRIES", posItemId: 205, primary: true }, { title: "Tander Fries", posItemId: 828 }, { title: "Tander Faries", posItemId: 819 }],
  "Loaded Fries": [{ title: "Loaded Fries", posItemId: 107, primary: true }, { title: "Loaded Frise", posItemId: 816 }],
  "Pizza (whole 8-slice)": [{ title: "Tikka pizza", posItemId: 709, primary: true }, { title: "Tikaa", posItemId: 820 }],
  "Chicken Chowmein (per plate)": [{ title: "Chicken Chow Mein", posItemId: 111, primary: true }, { title: "Chicken Cchowmen", posItemId: 809 }],
}

export const OIL_ALLOCATIONS: Record<string, { unitsSold: number; friesGrams: number; breadedGrams: number; cost: number; notes: string }> = {
  "Masala Fries": { unitsSold: 3270, friesGrams: 147, breadedGrams: 0, cost: 12.678580027786504, notes: "110g cooked / 0.75" },
  "Nuggets with Fries": { unitsSold: 5117, friesGrams: 147, breadedGrams: 76, cost: 20.872220181798188, notes: "Fries + 4×19g nuggets; includes Foodpanda" },
  "Tender Pops with Fries": { unitsSold: 4567, friesGrams: 147, breadedGrams: 150, cost: 28.85023822649378, notes: "Fries + historical 6×25g tender fry load; re-weigh" },
  "Loaded Fries": { unitsSold: 4868, friesGrams: 333, breadedGrams: 0, cost: 28.720864960904116, notes: "250g cooked / 0.75; chicken grilled" },
  "Zinger Burger": { unitsSold: 794, friesGrams: 0, breadedGrams: 117, cost: 12.613893394991672, notes: "Fried fillet ~117g" },
  "Patty Burger": { unitsSold: 608, friesGrams: 0, breadedGrams: 83, cost: 8.948317536618026, notes: "Fried patty ~83g" },
}

const PACKAGING = new Set(["Ketchup Sachet", "Tissue", "Burger Box", "Fries Bucket", "Tray", "Pizza Box", "Paper Bag", "Stick", "Fork", "Butter Paper"])
const PROTEIN = new Set(["Chicken Boneless", "Burger Patty", "Zinger Fillet", "Nugget", "Tender (popcorn)", "Egg"])
const DAIRY = new Set(["Cheese 70/30", "Cheese Mozzarella 100%", "Butter", "Milk"])
const PRODUCE = new Set(["Garlic", "Lettuce", "Cabbage", "Capsicum", "Salad Mix", "Olives (sliced black)", "Jalapeno (pickled)"])
const BAKERY = new Set(["Frozen Fries", "Maida (flour)", "Bun", "Paratha", "Toast Slice", "Pita Bread", "Chowmein Noodles"])
const SAUCES = new Set(["Pizza Sauce", "Mayonnaise", "Mustard", "Sauce Blend", "Fries Sauce", "Soy Sauce", "Oyster Sauce", "Vinegar", "Hot Sauce", "Lemon Juice", "Chilli Garlic Ketchup", "Ketchup (bulk)"])

export function ingredientKind(name: string): "RAW_MATERIAL" | "PACKAGING" {
  return PACKAGING.has(name) ? "PACKAGING" : "RAW_MATERIAL"
}

export function ingredientCategory(name: string): string {
  if (PACKAGING.has(name)) return "Packaging"
  if (PROTEIN.has(name)) return "Protein"
  if (DAIRY.has(name)) return "Dairy"
  if (PRODUCE.has(name)) return "Produce"
  if (BAKERY.has(name)) return "Bakery & Carbs"
  if (SAUCES.has(name)) return "Sauces & Condiments"
  if (name === "Cooking Oil") return "Oil"
  return "Dry Goods & Spices"
}
