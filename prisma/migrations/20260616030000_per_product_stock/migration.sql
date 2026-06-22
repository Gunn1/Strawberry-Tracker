-- CreateTable: per-product on-hand stock at a location
CREATE TABLE "LocationStock" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LocationStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocationStock_locationId_productId_key" ON "LocationStock"("locationId", "productId");
CREATE INDEX "LocationStock_productId_idx" ON "LocationStock"("productId");

ALTER TABLE "LocationStock" ADD CONSTRAINT "LocationStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationStock" ADD CONSTRAINT "LocationStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate the legacy per-location stock columns into LocationStock rows.
INSERT INTO "LocationStock" ("id", "locationId", "productId", "quantity")
  SELECT gen_random_uuid(), "id", 'prod_quart', "stockQuart" FROM "Location" WHERE "stockQuart" <> 0;
INSERT INTO "LocationStock" ("id", "locationId", "productId", "quantity")
  SELECT gen_random_uuid(), "id", 'prod_asparagus', "stockAsparagus" FROM "Location" WHERE "stockAsparagus" <> 0;
INSERT INTO "LocationStock" ("id", "locationId", "productId", "quantity")
  SELECT gen_random_uuid(), "id", 'prod_rhubarb', "stockRhubarb" FROM "Location" WHERE "stockRhubarb" <> 0;

-- Drop the legacy columns.
ALTER TABLE "Location" DROP COLUMN "stockQuart", DROP COLUMN "stockAsparagus", DROP COLUMN "stockRhubarb";
