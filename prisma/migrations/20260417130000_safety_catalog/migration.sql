-- Schema gaps vs init: Substance/PhysicalProperties extensions, Product, ProductRecommendation.
-- safety_catalog needs "Product" before SafetyCatalogItem's FK.

ALTER TABLE "Substance" ADD COLUMN IF NOT EXISTS "draegerId" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "Substance_draegerId_key" ON "Substance"("draegerId");
CREATE INDEX IF NOT EXISTS "Substance_draegerId_idx" ON "Substance"("draegerId");

ALTER TABLE "PhysicalProperties" ADD COLUMN IF NOT EXISTS "vaporPressureHPa" DOUBLE PRECISION;
ALTER TABLE "PhysicalProperties" ADD COLUMN IF NOT EXISTS "molarMassGMol" DOUBLE PRECISION;
ALTER TABLE "PhysicalProperties" ADD COLUMN IF NOT EXISTS "rawLabels" JSONB;

CREATE TABLE IF NOT EXISTS "Product" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageSrc" TEXT,
    "imageLocal" TEXT,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");
CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name");

CREATE TABLE IF NOT EXISTS "ProductRecommendation" (
    "id" SERIAL NOT NULL,
    "substanceId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "categoryGroup" TEXT,
    "category" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductRecommendation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductRecommendation_substanceId_productId_key" ON "ProductRecommendation"("substanceId", "productId");
CREATE INDEX IF NOT EXISTS "ProductRecommendation_substanceId_idx" ON "ProductRecommendation"("substanceId");
CREATE INDEX IF NOT EXISTS "ProductRecommendation_productId_idx" ON "ProductRecommendation"("productId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductRecommendation_substanceId_fkey'
  ) THEN
    ALTER TABLE "ProductRecommendation" ADD CONSTRAINT "ProductRecommendation_substanceId_fkey" FOREIGN KEY ("substanceId") REFERENCES "Substance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProductRecommendation_productId_fkey'
  ) THEN
    ALTER TABLE "ProductRecommendation" ADD CONSTRAINT "ProductRecommendation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Catálogo DS SAFETY: índice de búsqueda independiente del buscador de sustancias VOICE.
-- Si un deploy anterior creó la tabla sin FK, la quitamos y la recreamos (DB vacía en primer deploy).
DROP TABLE IF EXISTS "SafetyCatalogItem" CASCADE;

CREATE TABLE "SafetyCatalogItem" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "searchText" TEXT NOT NULL,
    "imageSrc" TEXT,
    "href" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyCatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SafetyCatalogItem_productId_key" ON "SafetyCatalogItem"("productId");
CREATE UNIQUE INDEX "SafetyCatalogItem_slug_key" ON "SafetyCatalogItem"("slug");
CREATE INDEX "SafetyCatalogItem_category_idx" ON "SafetyCatalogItem"("category");
CREATE INDEX "SafetyCatalogItem_name_idx" ON "SafetyCatalogItem"("name");

ALTER TABLE "SafetyCatalogItem" ADD CONSTRAINT "SafetyCatalogItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
