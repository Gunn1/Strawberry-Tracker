-- CreateTable: dynamic products
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'each',
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- Seed the three existing products from the current StandSettings prices.
INSERT INTO "Product" ("id", "name", "unit", "priceCents", "sortOrder")
  VALUES ('prod_quart', 'Strawberries', 'qt', COALESCE((SELECT "quartCents" FROM "StandSettings" WHERE "id" = 'default'), 500), 0);
INSERT INTO "Product" ("id", "name", "unit", "priceCents", "sortOrder")
  VALUES ('prod_asparagus', 'Asparagus', 'lb', COALESCE((SELECT "asparagusCents" FROM "StandSettings" WHERE "id" = 'default'), 350), 1);
INSERT INTO "Product" ("id", "name", "unit", "priceCents", "sortOrder")
  VALUES ('prod_rhubarb', 'Rhubarb', 'lb', COALESCE((SELECT "rhubarbCents" FROM "StandSettings" WHERE "id" = 'default'), 300), 2);

-- Sale: add product columns, backfill from the old mode, then drop mode.
ALTER TABLE "Sale" ADD COLUMN "productId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "productName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Sale" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'each';

UPDATE "Sale" SET "productId" = 'prod_quart', "productName" = 'Strawberries', "unit" = 'qt' WHERE "mode" = 'QUART';
UPDATE "Sale" SET "productId" = 'prod_asparagus', "productName" = 'Asparagus', "unit" = 'lb' WHERE "mode" = 'ASPARAGUS';
UPDATE "Sale" SET "productId" = 'prod_rhubarb', "productName" = 'Rhubarb', "unit" = 'lb' WHERE "mode" = 'RHUBARB';

ALTER TABLE "Sale" DROP COLUMN "mode";

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Sale_productId_idx" ON "Sale"("productId");

-- StandSettings: prices now live on Product.
ALTER TABLE "StandSettings" DROP COLUMN "quartCents", DROP COLUMN "asparagusCents", DROP COLUMN "rhubarbCents";

-- Drop the now-unused enum.
DROP TYPE "SaleMode";
