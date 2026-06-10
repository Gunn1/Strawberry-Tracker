-- AlterTable: add the customer-facing open-status banner fields
ALTER TABLE "StandSettings"
    ADD COLUMN "openStatus" TEXT NOT NULL DEFAULT 'preseason',
    ADD COLUMN "statusNote" TEXT NOT NULL DEFAULT '';
