-- CreateEnum
CREATE TYPE "RowStatus" AS ENUM ('OPEN', 'CLOSED', 'RESTING', 'PICKED_OUT', 'NEEDS_ATTENTION');

-- AlterTable
ALTER TABLE "FieldRow"
    ADD COLUMN "status" "RowStatus" NOT NULL DEFAULT 'OPEN',
    ADD COLUMN "note" TEXT;
