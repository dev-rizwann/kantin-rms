ALTER TABLE "OilAllocationSetting"
  ADD COLUMN "kantinSlug" TEXT,
  ADD COLUMN "name" TEXT,
  ADD COLUMN "directOilMl" DECIMAL(20,6) NOT NULL DEFAULT 0,
  ADD COLUMN "directCostInRecipe" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "directOilUnitCost" DECIMAL(14,6) NOT NULL DEFAULT 0.593750;

UPDATE "OilAllocationSetting" o
SET "kantinSlug" = r."kantinSlug",
    "name" = r."name"
FROM "Recipe" r
WHERE r."id" = o."recipeId";

ALTER TABLE "OilAllocationSetting"
  ALTER COLUMN "kantinSlug" SET NOT NULL,
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "recipeId" DROP NOT NULL;

ALTER TABLE "OilAllocationSetting"
  ADD CONSTRAINT "OilAllocationSetting_kantinSlug_fkey"
  FOREIGN KEY ("kantinSlug") REFERENCES "Kantin"("slug")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "OilAllocationSetting_kantinSlug_name_key"
  ON "OilAllocationSetting"("kantinSlug", "name");
CREATE INDEX "OilAllocationSetting_kantinSlug_idx"
  ON "OilAllocationSetting"("kantinSlug");

-- Confirmed direct-oil recipes already present in the costing workbook.
INSERT INTO "OilAllocationSetting" (
  "id", "kantinSlug", "name", "recipeId", "unitsSold",
  "friesGrams", "breadedGrams", "directOilMl", "directCostInRecipe",
  "soakFactor", "allocatedCostPerUnit", "directOilUnitCost",
  "sourceTotalOilSpend", "sourceStart", "sourceEnd", "notes"
)
SELECT
  'oil-' || md5(r."id"), r."kantinSlug", r."name", r."id",
  CASE r."name"
    WHEN 'Chicken Roll Paratha' THEN 497
    WHEN 'Chicken Chowmein (per plate)' THEN 1305
    WHEN 'Pizza (whole 8-slice)' THEN 316
  END,
  0, 0,
  CASE r."name"
    WHEN 'Chicken Roll Paratha' THEN 15
    WHEN 'Chicken Chowmein (per plate)' THEN 9
    WHEN 'Pizza (whole 8-slice)' THEN 10
  END,
  true, 1.25, 0, 0.593750, 480000,
  TIMESTAMPTZ '2025-12-27 00:00:00+05',
  TIMESTAMPTZ '2026-07-10 23:59:59+05',
  'Direct cooking oil already exists as a Cooking Oil recipe line.'
FROM "Recipe" r
WHERE r."kantinSlug" = 'h8'
  AND r."name" IN (
    'Chicken Roll Paratha',
    'Chicken Chowmein (per plate)',
    'Pizza (whole 8-slice)'
  )
ON CONFLICT ("recipeId") DO NOTHING;

-- Reasonable operating estimates for recipes that use oil but did not carry
-- an explicit Cooking Oil line in the original workbook.
INSERT INTO "OilAllocationSetting" (
  "id", "kantinSlug", "name", "recipeId", "unitsSold",
  "friesGrams", "breadedGrams", "directOilMl", "directCostInRecipe",
  "soakFactor", "allocatedCostPerUnit", "directOilUnitCost",
  "sourceTotalOilSpend", "sourceStart", "sourceEnd", "notes"
)
SELECT
  'oil-' || md5(r."id"), r."kantinSlug", r."name", r."id",
  CASE r."name"
    WHEN 'Chicken Sandwich' THEN 307
    WHEN 'Club Sandwich' THEN 208
    WHEN 'Shawarma' THEN 1077
  END,
  0, 0,
  CASE r."name"
    WHEN 'Chicken Sandwich' THEN 3
    WHEN 'Club Sandwich' THEN 4
    WHEN 'Shawarma' THEN 4
  END,
  false, 1.25, 0, 0.593750, 480000,
  TIMESTAMPTZ '2025-12-27 00:00:00+05',
  TIMESTAMPTZ '2026-07-10 23:59:59+05',
  'Estimated direct oil; adjust after a kitchen portion test.'
FROM "Recipe" r
WHERE r."kantinSlug" = 'h8'
  AND r."name" IN ('Chicken Sandwich', 'Club Sandwich', 'Shawarma')
ON CONFLICT ("recipeId") DO NOTHING;

-- Sold oil consumers that are not yet represented by complete recipes.
INSERT INTO "OilAllocationSetting" (
  "id", "kantinSlug", "name", "recipeId", "unitsSold",
  "friesGrams", "breadedGrams", "directOilMl", "directCostInRecipe",
  "soakFactor", "allocatedCostPerUnit", "directOilUnitCost",
  "sourceTotalOilSpend", "sourceStart", "sourceEnd", "notes"
)
VALUES
  ('oil-garlic-mayo-fries', 'h8', 'Garlic Mayo Fries', NULL, 2313, 147, 0, 0, false, 1.25, 0, 0.593750, 480000, TIMESTAMPTZ '2025-12-27 00:00:00+05', TIMESTAMPTZ '2026-07-10 23:59:59+05', 'POS consumer; recipe still needs linking.'),
  ('oil-plain-fries', 'h8', 'Plain Fries', NULL, 1007, 147, 0, 0, false, 1.25, 0, 0.593750, 480000, TIMESTAMPTZ '2025-12-27 00:00:00+05', TIMESTAMPTZ '2026-07-10 23:59:59+05', 'POS consumer; recipe still needs linking.'),
  ('oil-peri-peri-chips', 'h8', 'Peri Peri chips', NULL, 76, 147, 0, 0, false, 1.25, 0, 0.593750, 480000, TIMESTAMPTZ '2025-12-27 00:00:00+05', TIMESTAMPTZ '2026-07-10 23:59:59+05', 'Treated as a fried potato serving.'),
  ('oil-combo', 'h8', 'Fries + Nuggets + Tender Combo', NULL, 64, 147, 122, 0, false, 1.25, 0, 0.593750, 480000, TIMESTAMPTZ '2025-12-27 00:00:00+05', TIMESTAMPTZ '2026-07-10 23:59:59+05', 'Estimated mixed fryer load from the POS combo.'),
  ('oil-six-nuggets', 'h8', '6 Piece Nuggets', NULL, 199, 0, 114, 0, false, 1.25, 0, 0.593750, 480000, TIMESTAMPTZ '2025-12-27 00:00:00+05', TIMESTAMPTZ '2026-07-10 23:59:59+05', 'Six nuggets at approximately 19 g each.'),
  ('oil-fried-rice', 'h8', 'Fried Rice with Manchurian', NULL, 225, 0, 80, 12, false, 1.25, 0, 0.593750, 480000, TIMESTAMPTZ '2025-12-27 00:00:00+05', TIMESTAMPTZ '2026-07-10 23:59:59+05', 'Estimated 12 ml wok oil and 80 g fried Manchurian chicken per serving.'),
  ('oil-manchurian', 'h8', 'Chicken Manchurian', NULL, 8, 0, 100, 0, false, 1.25, 0, 0.593750, 480000, TIMESTAMPTZ '2025-12-27 00:00:00+05', TIMESTAMPTZ '2026-07-10 23:59:59+05', 'Estimated 100 g fried breaded chicken.'),
  ('oil-pasta', 'h8', 'Pasta', NULL, 551, 0, 0, 8, false, 1.25, 0, 0.593750, 480000, TIMESTAMPTZ '2025-12-27 00:00:00+05', TIMESTAMPTZ '2026-07-10 23:59:59+05', 'Estimated 8 ml sauté oil per serving.')
ON CONFLICT ("kantinSlug", "name") DO NOTHING;

-- Recalculate the complete pool immediately so deployment never leaves the
-- old fixed recipe amounts active.
WITH totals AS (
  SELECT
    COALESCE(MAX("sourceTotalOilSpend"), 480000)::numeric AS pool,
    COALESCE(MAX("directOilUnitCost"), 0.593750)::numeric AS direct_rate,
    COALESCE(MAX("soakFactor"), 1.25)::numeric AS breaded_factor,
    SUM("unitsSold" * "directOilMl" * "directOilUnitCost")::numeric AS direct_cost,
    SUM("unitsSold" * ("friesGrams" + "soakFactor" * "breadedGrams"))::numeric AS weighted_grams
  FROM "OilAllocationSetting"
  WHERE "kantinSlug" = 'h8'
),
rates AS (
  SELECT *,
    CASE WHEN weighted_grams > 0
      THEN GREATEST(pool - direct_cost, 0) / weighted_grams
      ELSE 0
    END AS fries_rate
  FROM totals
)
UPDATE "OilAllocationSetting" o
SET "allocatedCostPerUnit" =
  o."friesGrams" * rates.fries_rate
  + o."breadedGrams" * rates.fries_rate * rates.breaded_factor
  + CASE WHEN o."directCostInRecipe" THEN 0 ELSE o."directOilMl" * rates.direct_rate END
FROM rates
WHERE o."kantinSlug" = 'h8';

UPDATE "RecipeLine" line
SET "label" = 'Oil allocation (calibrated)',
    "fixedUnitCost" = setting."allocatedCostPerUnit",
    "quantity" = 1,
    "notes" = 'Six-month oil pool allocation'
FROM "RecipeVersion" version
JOIN "Recipe" recipe ON recipe."activeVersionId" = version."id"
JOIN "OilAllocationSetting" setting ON setting."recipeId" = recipe."id"
WHERE line."recipeVersionId" = version."id"
  AND line."kind" = 'COST_ADJUSTMENT'
  AND COALESCE(line."label", '') ~* 'oil';

INSERT INTO "RecipeLine" (
  "id", "recipeVersionId", "kind", "productId", "label", "quantity",
  "uomCode", "fixedUnitCost", "sortOrder", "notes"
)
SELECT
  'oil-line-' || md5(version."id"),
  version."id",
  'COST_ADJUSTMENT',
  NULL,
  'Oil allocation (calibrated)',
  1,
  NULL,
  setting."allocatedCostPerUnit",
  COALESCE((SELECT MAX(existing."sortOrder") + 1 FROM "RecipeLine" existing WHERE existing."recipeVersionId" = version."id"), 0),
  'Six-month oil pool allocation'
FROM "RecipeVersion" version
JOIN "Recipe" recipe ON recipe."activeVersionId" = version."id"
JOIN "OilAllocationSetting" setting ON setting."recipeId" = recipe."id"
WHERE setting."allocatedCostPerUnit" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "RecipeLine" existing
    WHERE existing."recipeVersionId" = version."id"
      AND existing."kind" = 'COST_ADJUSTMENT'
      AND COALESCE(existing."label", '') ~* 'oil'
  );
