-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "farLabel" TEXT NOT NULL DEFAULT '',
    "nearLabel" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- Existing patches predate fields, so give them one to belong to. The id is
-- fixed so re-running against a partly migrated database is a no-op.
INSERT INTO "Field" ("id", "name", "sortOrder", "active", "farLabel", "nearLabel", "createdAt")
VALUES ('field_default_0000000000', 'Home field', 0, true, '', '', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable: add the link, backfill it, then require it.
ALTER TABLE "Patch" ADD COLUMN "fieldId" TEXT;

UPDATE "Patch" SET "fieldId" = 'field_default_0000000000' WHERE "fieldId" IS NULL;

-- The starter field is only needed when it actually adopted something.
DELETE FROM "Field"
WHERE "id" = 'field_default_0000000000'
  AND NOT EXISTS (SELECT 1 FROM "Patch" WHERE "fieldId" = 'field_default_0000000000');

ALTER TABLE "Patch" ALTER COLUMN "fieldId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Patch_fieldId_idx" ON "Patch"("fieldId");

-- AddForeignKey
ALTER TABLE "Patch" ADD CONSTRAINT "Patch_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;
