-- CreateTable
CREATE TABLE "Patch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Patch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldRow" (
    "id" TEXT NOT NULL,
    "patchId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pickedStart" INTEGER NOT NULL DEFAULT 0,
    "pickedEnd" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FieldRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldRow_patchId_idx" ON "FieldRow"("patchId");

-- AddForeignKey
ALTER TABLE "FieldRow" ADD CONSTRAINT "FieldRow_patchId_fkey" FOREIGN KEY ("patchId") REFERENCES "Patch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
