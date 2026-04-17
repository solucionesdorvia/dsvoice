-- Catálogo DS SAFETY: índice de búsqueda independiente del buscador de sustancias VOICE.
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
