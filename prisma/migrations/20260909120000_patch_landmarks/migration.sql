-- Landmarks describe what borders a patch's rows, and two patches in one field
-- rarely share a boundary, so they move down a level. The field's values are
-- carried onto its patches, so nothing already entered is lost.
ALTER TABLE "Patch" ADD COLUMN "farLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Patch" ADD COLUMN "nearLabel" TEXT NOT NULL DEFAULT '';

UPDATE "Patch" p
SET "farLabel" = f."farLabel", "nearLabel" = f."nearLabel"
FROM "Field" f
WHERE f.id = p."fieldId";

-- "Field"."farLabel" and "nearLabel" are deliberately left in place. They are
-- no longer in the schema, and Prisma never selects a column it does not know
-- about, but the cloudflare branch still reads them; dropping now would break
-- that branch against this same database. Drop them once this work is merged.
