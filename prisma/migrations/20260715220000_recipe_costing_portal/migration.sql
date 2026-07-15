-- Recipe & costing portal. Existing inventory and POS-sync tables are untouched.

ALTER TYPE "ProductKind" ADD VALUE IF NOT EXISTS 'SEMI_FINISHED';

ALTER TABLE "Product"
  ADD COLUMN "costingCategory" TEXT,
  ADD COLUMN "standardPackPrice" DECIMAL(14,2),
  ADD COLUMN "standardPackQty" DECIMAL(20,6),
  ADD COLUMN "costingNote" TEXT,
  ADD COLUMN "costIsEstimated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isCostingActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "RecipeKind" AS ENUM ('SEMI_FINISHED', 'MENU');
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "RecipeLineKind" AS ENUM ('PRODUCT', 'COST_ADJUSTMENT');

CREATE TABLE "Recipe" (
  "id" TEXT NOT NULL,
  "kantinSlug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "RecipeKind" NOT NULL,
  "status" "RecipeStatus" NOT NULL DEFAULT 'ACTIVE',
  "outputProductId" TEXT,
  "activeVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeVersion" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "outputQty" DECIMAL(20,6) NOT NULL,
  "outputUomCode" TEXT NOT NULL,
  "referenceSellPrice" DECIMAL(14,2),
  "targetFoodCostPct" DECIMAL(8,6) NOT NULL DEFAULT 0.33,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveTo" TIMESTAMP(3),
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipeVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeLine" (
  "id" TEXT NOT NULL,
  "recipeVersionId" TEXT NOT NULL,
  "kind" "RecipeLineKind" NOT NULL DEFAULT 'PRODUCT',
  "productId" TEXT,
  "label" TEXT,
  "quantity" DECIMAL(20,6) NOT NULL,
  "uomCode" TEXT,
  "fixedUnitCost" DECIMAL(14,6),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  CONSTRAINT "RecipeLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeAlias" (
  "id" TEXT NOT NULL,
  "kantinSlug" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "normalizedTitle" TEXT NOT NULL,
  "posItemId" BIGINT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipeAlias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OilAllocationSetting" (
  "id" TEXT NOT NULL,
  "recipeId" TEXT NOT NULL,
  "unitsSold" INTEGER NOT NULL,
  "friesGrams" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "breadedGrams" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "soakFactor" DECIMAL(10,6) NOT NULL DEFAULT 1.25,
  "allocatedCostPerUnit" DECIMAL(14,6) NOT NULL,
  "sourceTotalOilSpend" DECIMAL(14,2),
  "sourceStart" TIMESTAMP(3),
  "sourceEnd" TIMESTAMP(3),
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OilAllocationSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Recipe_activeVersionId_key" ON "Recipe"("activeVersionId");
CREATE UNIQUE INDEX "Recipe_kantinSlug_name_key" ON "Recipe"("kantinSlug", "name");
CREATE INDEX "Recipe_kantinSlug_kind_status_idx" ON "Recipe"("kantinSlug", "kind", "status");
CREATE INDEX "Recipe_outputProductId_idx" ON "Recipe"("outputProductId");
CREATE UNIQUE INDEX "RecipeVersion_recipeId_version_key" ON "RecipeVersion"("recipeId", "version");
CREATE INDEX "RecipeVersion_recipeId_effectiveFrom_idx" ON "RecipeVersion"("recipeId", "effectiveFrom");
CREATE INDEX "RecipeLine_recipeVersionId_sortOrder_idx" ON "RecipeLine"("recipeVersionId", "sortOrder");
CREATE INDEX "RecipeLine_productId_idx" ON "RecipeLine"("productId");
CREATE UNIQUE INDEX "RecipeAlias_kantinSlug_normalizedTitle_key" ON "RecipeAlias"("kantinSlug", "normalizedTitle");
CREATE UNIQUE INDEX "RecipeAlias_kantinSlug_posItemId_key" ON "RecipeAlias"("kantinSlug", "posItemId");
CREATE INDEX "RecipeAlias_recipeId_idx" ON "RecipeAlias"("recipeId");
CREATE UNIQUE INDEX "OilAllocationSetting_recipeId_key" ON "OilAllocationSetting"("recipeId");

ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_kantinSlug_fkey"
  FOREIGN KEY ("kantinSlug") REFERENCES "Kantin"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_outputProductId_fkey"
  FOREIGN KEY ("outputProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecipeVersion" ADD CONSTRAINT "RecipeVersion_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeVersion" ADD CONSTRAINT "RecipeVersion_outputUomCode_fkey"
  FOREIGN KEY ("outputUomCode") REFERENCES "UnitOfMeasure"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_activeVersionId_fkey"
  FOREIGN KEY ("activeVersionId") REFERENCES "RecipeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_recipeVersionId_fkey"
  FOREIGN KEY ("recipeVersionId") REFERENCES "RecipeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_uomCode_fkey"
  FOREIGN KEY ("uomCode") REFERENCES "UnitOfMeasure"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecipeAlias" ADD CONSTRAINT "RecipeAlias_kantinSlug_fkey"
  FOREIGN KEY ("kantinSlug") REFERENCES "Kantin"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipeAlias" ADD CONSTRAINT "RecipeAlias_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OilAllocationSetting" ADD CONSTRAINT "OilAllocationSetting_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
