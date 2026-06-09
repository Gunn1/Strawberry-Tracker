-- AlterEnum: drop FLAT, add ASPARAGUS and RHUBARB (no rows use FLAT)
BEGIN;
CREATE TYPE "SaleMode_new" AS ENUM ('QUART', 'ASPARAGUS', 'RHUBARB');
ALTER TABLE "Sale" ALTER COLUMN "mode" TYPE "SaleMode_new" USING ("mode"::text::"SaleMode_new");
ALTER TYPE "SaleMode" RENAME TO "SaleMode_old";
ALTER TYPE "SaleMode_new" RENAME TO "SaleMode";
DROP TYPE "SaleMode_old";
COMMIT;

-- AlterTable: replace flat pricing with per-pound asparagus / rhubarb prices
ALTER TABLE "StandSettings"
    DROP COLUMN "flatCents",
    DROP COLUMN "quartsPerFlat",
    ADD COLUMN "asparagusCents" INTEGER NOT NULL DEFAULT 350,
    ADD COLUMN "rhubarbCents" INTEGER NOT NULL DEFAULT 300;
