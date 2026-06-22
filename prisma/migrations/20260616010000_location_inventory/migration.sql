-- AlterTable: per-location on-hand inventory
ALTER TABLE "Location"
    ADD COLUMN "trackStock" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "stockQuart" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "stockAsparagus" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "stockRhubarb" INTEGER NOT NULL DEFAULT 0;
