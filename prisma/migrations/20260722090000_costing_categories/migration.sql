-- User-managed costing categories.
-- Product.costingCategory keeps storing the NAME (free text) so nothing about
-- existing costing changes; this table just makes the list of names first-class
-- so a category can exist with zero ingredients in it.

CREATE TABLE "CostingCategory" (
  "id"         TEXT NOT NULL,
  "kantinSlug" TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "sortOrder"  INTEGER NOT NULL DEFAULT 100,
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CostingCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CostingCategory_kantinSlug_name_key" ON "CostingCategory"("kantinSlug", "name");
CREATE INDEX "CostingCategory_kantinSlug_isActive_idx" ON "CostingCategory"("kantinSlug", "isActive");

ALTER TABLE "CostingCategory"
  ADD CONSTRAINT "CostingCategory_kantinSlug_fkey"
  FOREIGN KEY ("kantinSlug") REFERENCES "Kantin"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed 1: every category name already in use, per kantin.
INSERT INTO "CostingCategory" ("id", "kantinSlug", "name", "sortOrder", "updatedAt")
SELECT gen_random_uuid()::text, p."kantinSlug", p."costingCategory", 100, NOW()
FROM (SELECT DISTINCT "kantinSlug", "costingCategory" FROM "Product"
      WHERE "costingCategory" IS NOT NULL AND btrim("costingCategory") <> '') p
ON CONFLICT ("kantinSlug", "name") DO NOTHING;

-- Seed 2: the standard starter set for every kantin, including ones with no
-- ingredients yet (Beverages is the reason this table exists).
INSERT INTO "CostingCategory" ("id", "kantinSlug", "name", "sortOrder", "updatedAt")
SELECT gen_random_uuid()::text, k."slug", c."name", 100, NOW()
FROM "Kantin" k
CROSS JOIN (VALUES
  ('Bakery & Carbs'), ('Beverages'), ('Dairy'), ('Dry Goods & Spices'), ('Oil'),
  ('Packaging'), ('Produce'), ('Protein'), ('Sauces & Condiments'), ('Semi-finished')
) AS c("name")
ON CONFLICT ("kantinSlug", "name") DO NOTHING;
