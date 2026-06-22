-- AlterTable: tie multi-item transaction lines together
ALTER TABLE "Sale" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Sale_groupId_idx" ON "Sale"("groupId");
