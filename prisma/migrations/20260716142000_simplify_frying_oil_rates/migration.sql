CREATE TABLE "FryingOilRate" (
  "id" TEXT NOT NULL,
  "kantinSlug" TEXT NOT NULL,
  "costPerGram" DECIMAL(14,6) NOT NULL,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FryingOilRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FryingOilRate_kantinSlug_key"
  ON "FryingOilRate"("kantinSlug");

ALTER TABLE "FryingOilRate"
  ADD CONSTRAINT "FryingOilRate_kantinSlug_fkey"
  FOREIGN KEY ("kantinSlug") REFERENCES "Kantin"("slug")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- One flat rate for every fried item (owner decision, 17-Jul-2026):
-- Rs 480,000 total oil spend / 5,259,014 g of food through the fryer.
INSERT INTO "FryingOilRate" ("id", "kantinSlug", "costPerGram", "notes", "updatedAt")
VALUES
  ('frying-rate-h8', 'h8', 0.091272, 'Flat oil cost per gram of food entering the fryer (Rs 480k / 5.26 t, Dec-2025..Jul-2026).', NOW())
ON CONFLICT ("kantinSlug") DO NOTHING;

-- Replace the former one-line pool adjustment on each active recipe with a
-- single explicit fryer-input weight line. Direct cooking oil remains a normal
-- recipe ingredient and is intentionally not represented here.
DELETE FROM "RecipeLine" line
USING "Recipe" recipe
WHERE recipe."activeVersionId" = line."recipeVersionId"
  AND line."kind" = 'COST_ADJUSTMENT'
  AND line."label" IN ('Oil allocation (calibrated)', 'Frying oil (allocated)', 'Deep-fry oil · Potato', 'Deep-fry oil · Breaded protein');

INSERT INTO "RecipeLine" (
  "id", "recipeVersionId", "kind", "productId", "label", "quantity",
  "uomCode", "fixedUnitCost", "sortOrder", "notes"
)
SELECT
  'fry-flat-' || md5(setting."id"),
  recipe."activeVersionId",
  'COST_ADJUSTMENT',
  NULL,
  'Deep-fry oil',
  setting."friesGrams" + setting."breadedGrams",
  NULL,
  0.091272,
  COALESCE((SELECT MAX(existing."sortOrder") + 1 FROM "RecipeLine" existing WHERE existing."recipeVersionId" = recipe."activeVersionId"), 0),
  'Automatic oil cost: total fryer-input grams × flat rate.'
FROM "OilAllocationSetting" setting
JOIN "Recipe" recipe ON recipe."id" = setting."recipeId"
WHERE (setting."friesGrams" + setting."breadedGrams") > 0
  AND recipe."activeVersionId" IS NOT NULL;

-- Non-fried recipes that previously carried a small automatic oil allocation
-- (sandwiches/shawarma griddle oil) get a REAL Cooking Oil ingredient line in
-- ml instead — visible, editable, costed from the live ingredient price.
INSERT INTO "RecipeLine" (
  "id", "recipeVersionId", "kind", "productId", "label", "quantity",
  "uomCode", "fixedUnitCost", "sortOrder", "notes"
)
SELECT
  'direct-oil-' || md5(setting."id"),
  recipe."activeVersionId",
  'PRODUCT',
  oil."id",
  NULL,
  setting."directOilMl",
  'ML',
  NULL,
  COALESCE((SELECT MAX(existing."sortOrder") + 1 FROM "RecipeLine" existing WHERE existing."recipeVersionId" = recipe."activeVersionId"), 0),
  'Direct cooking oil (converted from the removed automatic allocation).'
FROM "OilAllocationSetting" setting
JOIN "Recipe" recipe ON recipe."id" = setting."recipeId"
JOIN "Product" oil ON oil."kantinSlug" = setting."kantinSlug" AND oil."name" = 'Cooking Oil'
WHERE setting."directOilMl" > 0
  AND setting."directCostInRecipe" = false
  AND recipe."activeVersionId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "RecipeLine" existing
    WHERE existing."recipeVersionId" = recipe."activeVersionId" AND existing."productId" = oil."id"
  );
