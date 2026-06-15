-- AlterTable
ALTER TABLE "FieldRow" ADD COLUMN "variety" TEXT;

-- CreateTable
CREATE TABLE "RowEvent" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "pickedStart" INTEGER NOT NULL,
    "pickedEnd" INTEGER NOT NULL,
    "status" "RowStatus" NOT NULL,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RowEvent_rowId_createdAt_idx" ON "RowEvent"("rowId", "createdAt");

-- AddForeignKey
ALTER TABLE "RowEvent" ADD CONSTRAINT "RowEvent_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "FieldRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
